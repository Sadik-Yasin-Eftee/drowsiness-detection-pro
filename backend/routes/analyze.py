"""
POST  /api/v1/analyze        — single-frame drowsiness analysis (REST)
GET   /api/v1/session/{id}   — session summary
DELETE /api/v1/session/{id}  — end session + return summary
POST  /api/v1/session/{id}/reset — reset engine rolling window (new trip)
GET   /api/v1/models         — list configured Roboflow models
"""

from __future__ import annotations

import base64
import io
import logging
import time
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from PIL import Image, ImageOps

logger = logging.getLogger(__name__)

from schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    DetectionBox,
    HeadPose,
    ModelInfo,
    ModelsResponse,
    SessionSummary,
)

router = APIRouter(tags=["analyze"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _deps(request: Request):
    return (
        request.app.state.roboflow,
        request.app.state.store,
        request.app.state.settings,
    )


def _build_response(
    session_id:    str,
    timestamp_ms:  int,
    analysis,
    tick,
    fired_alert:   bool,
) -> AnalyzeResponse:
    raw_boxes = [
        DetectionBox(
            cls        = p.get("class", ""),
            confidence = p.get("confidence", 0.0),
            x          = p.get("x", 0.0),
            y          = p.get("y", 0.0),
            width      = p.get("width", 0.0),
            height     = p.get("height", 0.0),
        )
        for p in (analysis.raw_predictions or [])
    ]
    return AnalyzeResponse(
        session_id                 = session_id,
        timestamp_ms               = timestamp_ms,
        face_detected              = tick.face_detected,
        left_eye_open_probability  = analysis.left_eye_open_probability,
        right_eye_open_probability = analysis.right_eye_open_probability,
        perclos                    = tick.perclos,
        blink_rate                 = tick.blink_rate,
        ear                        = tick.ear,
        eye_state                  = tick.eye_state,
        alert_level                = tick.alert_level,
        confidence                 = tick.confidence,
        head_pose                  = HeadPose(**tick.head_pose),
        fatigue_score              = tick.fatigue_score,
        closure_duration_ms        = tick.closure_duration_ms,
        should_alert               = fired_alert,
        reason_bn                  = tick.reason_bn,
        reason_en                  = tick.reason_en,
        model_used                 = analysis.model_used,
        inference_time_ms          = analysis.inference_time_ms,
        raw_predictions            = raw_boxes or None,
    )


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/analyze", response_model=AnalyzeResponse, summary="Analyze one camera frame")
async def analyze_frame(body: AnalyzeRequest, request: Request) -> AnalyzeResponse:
    """
    Submit a single base64-encoded JPEG frame for drowsiness analysis.

    The `session_id` groups frames belonging to the same trip.  PERCLOS state
    accumulates across calls with the same session ID so the engine sees a
    realistic rolling window.

    Use distinct session IDs for different drivers or trips.
    """
    roboflow, store, settings = _deps(request)

    model_id = settings.active_model_id(body.model)
    ts_ms    = body.timestamp_ms or int(time.time() * 1000)

    # Run Roboflow inference (offloaded to thread pool inside client)
    analysis = await roboflow.analyze_frame(body.frame, model_id)

    # Feed result into the session's PERCLOS engine
    session    = await store.get_or_create(body.session_id)
    face_frame = roboflow.to_raw_face_frame(analysis, timestamp_ms=ts_ms)
    tick       = session.engine.process(face_frame)
    fired      = session.engine.should_fire_alert_event(tick)
    session.record_tick(tick, fired)

    return _build_response(body.session_id, ts_ms, analysis, tick, fired)


@router.get(
    "/session/{session_id}",
    response_model=SessionSummary,
    summary="Get session summary",
)
async def get_session(session_id: str, request: Request) -> SessionSummary:
    """Return PERCLOS statistics for an active session."""
    _, store, _ = _deps(request)
    data = await store.summary(session_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionSummary(**data)


@router.delete(
    "/session/{session_id}",
    response_model=SessionSummary,
    summary="End a session",
)
async def delete_session(session_id: str, request: Request) -> SessionSummary:
    """End a session and return its final summary."""
    _, store, _ = _deps(request)
    session = await store.delete(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionSummary(**session.summary())


@router.post(
    "/session/{session_id}/reset",
    summary="Reset engine rolling window",
    response_model=dict,
)
async def reset_session(session_id: str, request: Request) -> dict:
    """
    Reset the PERCLOS rolling window without deleting the session.
    Call this at the start of each new trip segment.
    """
    _, store, _ = _deps(request)
    ok = await store.reset_engine(session_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"ok": True, "session_id": session_id}


@router.get("/models", response_model=ModelsResponse, summary="List configured models")
async def list_models(request: Request) -> ModelsResponse:
    """Return the currently configured Roboflow model IDs."""
    _, _, settings = _deps(request)
    models = [
        ModelInfo(
            id          = settings.yolov8_model_id,
            type        = "yolov8",
            active      = settings.active_model in ("yolov8", "auto"),
            description = "YOLOv8 object detection — eye state bounding boxes",
        ),
        ModelInfo(
            id          = settings.rfdetr_model_id,
            type        = "rfdetr",
            active      = settings.active_model == "rfdetr",
            description = "RF-DETR real-time detection transformer",
        ),
    ]
    return ModelsResponse(active=settings.active_model, models=models)


@router.post("/debug/frame", summary="Debug: inspect a frame without running inference")
async def debug_frame(body: AnalyzeRequest) -> dict:
    """
    Decodes the incoming base64 frame, applies EXIF rotation, and returns
    image metadata so you can confirm what the backend actually receives.
    """
    try:
        raw = body.frame
        if "," in raw:
            raw = raw.split(",", 1)[1]
        img = Image.open(io.BytesIO(base64.b64decode(raw)))
        exif_info = {}
        try:
            exif_raw = img.getexif()
            exif_info = {str(k): str(v) for k, v in exif_raw.items()} if exif_raw else {}
        except Exception:
            pass
        orig_size = img.size
        img_rotated = ImageOps.exif_transpose(img)
        rotated_size = img_rotated.size
        mode = img.mode
        logger.info(
            "DEBUG FRAME: original=%s rotated=%s mode=%s exif_keys=%s",
            orig_size, rotated_size, mode, list(exif_info.keys())[:5],
        )
        return {
            "original_size": orig_size,
            "after_exif_rotate_size": rotated_size,
            "mode": mode,
            "exif_orientation_tag": exif_info.get("274"),  # 274 = Orientation
            "frame_bytes": len(raw),
        }
    except Exception as exc:
        return {"error": str(exc)}
