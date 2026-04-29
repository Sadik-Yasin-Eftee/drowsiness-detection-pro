"""Pydantic schemas for all API request / response bodies."""

from __future__ import annotations
from typing import Any, Literal, Optional
from pydantic import BaseModel, Field


# ── Shared sub-models ─────────────────────────────────────────────────────────

class HeadPose(BaseModel):
    pitch: float = 0.0   # head nod  (+down / −up)
    yaw:   float = 0.0   # head turn (+right / −left)
    roll:  float = 0.0   # head tilt


class DetectionBox(BaseModel):
    """One bounding-box prediction returned by the model."""
    cls:        str
    confidence: float
    x: float
    y: float
    width:  float
    height: float


# ── REST: POST /api/v1/analyze ────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    frame:      str = Field(..., description="Base64-encoded JPEG (with or without data URI prefix)")
    session_id: str = Field(..., description="Trip / session UUID — used to track PERCLOS state across calls")
    timestamp_ms: Optional[int] = Field(None, description="Client capture timestamp (ms); server time used when omitted")
    model: Optional[Literal["yolov8", "rfdetr"]] = Field(None, description="Override the active model for this request")


class AnalyzeResponse(BaseModel):
    session_id:   str
    timestamp_ms: int

    # ── Raw detection ─────────────────────────────────────────────────────────
    face_detected:             bool
    left_eye_open_probability:  Optional[float] = None
    right_eye_open_probability: Optional[float] = None

    # ── Engine outputs (PERCLOS pipeline) ─────────────────────────────────────
    perclos:              int             # 0-100 %
    blink_rate:           int             # blinks / min
    ear:                  float           # eye-aspect-ratio proxy 0-1
    eye_state:            Literal["open", "closing", "closed"]
    alert_level:          Literal[0, 1, 2, 3]
    confidence:           int             # engine confidence 0-100
    head_pose:            HeadPose
    fatigue_score:        int             # composite 0-100
    closure_duration_ms:  int

    # ── Alert event ───────────────────────────────────────────────────────────
    should_alert: bool
    reason_bn:    Optional[str] = None   # Bengali alert string
    reason_en:    Optional[str] = None   # English alert string

    # ── Meta ──────────────────────────────────────────────────────────────────
    model_used:          str
    inference_time_ms:   float
    raw_predictions:     Optional[list[DetectionBox]] = None


# ── REST: GET /api/v1/session/{session_id} ────────────────────────────────────

class SessionSummary(BaseModel):
    session_id:       str
    created_at:       float
    duration_seconds: float
    total_frames:     int
    total_alerts:     int
    last_perclos:     int
    last_alert_level: int


# ── REST: GET /api/v1/models ──────────────────────────────────────────────────

class ModelInfo(BaseModel):
    id:          str
    type:        str
    active:      bool
    description: str


class ModelsResponse(BaseModel):
    active: str
    models: list[ModelInfo]


# ── WebSocket: /api/v1/stream/{session_id} ────────────────────────────────────

class StreamFrame(BaseModel):
    """Client → Server WebSocket message."""
    type: Literal["frame", "ping", "end"] = "frame"
    data: Optional[str] = None    # base64 JPEG  (required when type == "frame")
    ts:   Optional[int] = None    # client timestamp ms
    model: Optional[Literal["yolov8", "rfdetr"]] = None


class StreamResult(BaseModel):
    """Server → Client WebSocket message."""
    type: Literal["result", "pong", "summary", "error"] = "result"

    # Populated for type == "result"
    face_detected:    Optional[bool]  = None
    perclos:          Optional[int]   = None
    blink_rate:       Optional[int]   = None
    ear:              Optional[float] = None
    eye_state:        Optional[str]   = None
    alert_level:      Optional[int]   = None
    confidence:       Optional[int]   = None
    fatigue_score:    Optional[int]   = None
    closure_duration_ms: Optional[int] = None
    should_alert:     Optional[bool]  = None
    reason_bn:        Optional[str]   = None
    reason_en:        Optional[str]   = None
    model_used:       Optional[str]   = None
    inference_time_ms: Optional[float] = None

    # Populated for type == "summary"
    summary: Optional[dict[str, Any]] = None

    # Populated for type == "error"
    error: Optional[str] = None
