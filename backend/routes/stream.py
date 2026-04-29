"""
WS /api/v1/stream/{session_id}  — real-time frame streaming

Message protocol (JSON over WebSocket):

  Client → Server
  ───────────────
  { "type": "frame", "data": "<base64-jpeg>", "ts": 1718000000000, "model": "yolov8" }
  { "type": "ping" }
  { "type": "end" }

  Server → Client
  ───────────────
  { "type": "result", "face_detected": true, "perclos": 15, "alert_level": 0, … }
  { "type": "pong" }
  { "type": "summary", "session_id": "…", "total_frames": 240, … }
  { "type": "error",   "detail": "…" }
"""

from __future__ import annotations

import json
import logging
import time
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from routes.analyze import _build_response

router = APIRouter(tags=["stream"])
logger = logging.getLogger(__name__)


def _err(detail: str) -> str:
    return json.dumps({"type": "error", "detail": detail})


@router.websocket("/stream/{session_id}")
async def stream_session(session_id: str, websocket: WebSocket) -> None:
    """
    Persistent WebSocket for a single driver session.

    The client sends one frame at a time; the server responds with a full
    analysis result before the client should send the next frame.  This
    back-pressure model keeps latency predictable on slow connections.
    """
    await websocket.accept()
    logger.info("WS connected: session=%s", session_id)

    roboflow = websocket.app.state.roboflow
    store    = websocket.app.state.store
    settings = websocket.app.state.settings

    try:
        while True:
            raw = await websocket.receive_text()

            try:
                msg: dict[str, Any] = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_text(_err("Invalid JSON"))
                continue

            msg_type = msg.get("type", "frame")

            # ── ping / keepalive ──────────────────────────────────────────────
            if msg_type == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
                continue

            # ── end session ───────────────────────────────────────────────────
            if msg_type == "end":
                session = await store.delete(session_id)
                payload: dict[str, Any] = {"type": "summary"}
                if session:
                    payload.update(session.summary())
                else:
                    payload["session_id"] = session_id
                await websocket.send_text(json.dumps(payload))
                break

            # ── frame analysis ────────────────────────────────────────────────
            if msg_type != "frame":
                await websocket.send_text(_err(f"Unknown message type: {msg_type!r}"))
                continue

            frame_b64 = msg.get("data", "")
            if not frame_b64:
                await websocket.send_text(_err("Missing 'data' field"))
                continue

            ts_ms    = int(msg.get("ts", time.time() * 1000))
            model_id = settings.active_model_id(msg.get("model"))

            try:
                analysis   = await roboflow.analyze_frame(frame_b64, model_id)
                session    = await store.get_or_create(session_id)
                face_frame = roboflow.to_raw_face_frame(analysis, timestamp_ms=ts_ms)
                tick       = session.engine.process(face_frame)
                fired      = session.engine.should_fire_alert_event(tick)
                session.record_tick(tick, fired)

                resp = _build_response(session_id, ts_ms, analysis, tick, fired)
                result_dict = resp.model_dump()
                result_dict["type"] = "result"
                # Flatten head_pose into top-level for convenience
                if "head_pose" in result_dict and isinstance(result_dict["head_pose"], dict):
                    result_dict["head_pose"] = result_dict["head_pose"]

                await websocket.send_text(json.dumps(result_dict, default=str))

            except Exception:
                logger.exception("Frame processing error: session=%s", session_id)
                await websocket.send_text(_err("Frame processing failed"))

    except WebSocketDisconnect:
        logger.info("WS disconnected: session=%s", session_id)
    except Exception:
        logger.exception("WS error: session=%s", session_id)
        try:
            await websocket.close(code=1011)
        except Exception:
            pass
