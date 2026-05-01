"""
MediaPipe Face Mesh inference client
══════════════════════════════════════
Replaces the Roboflow inference backend with on-device MediaPipe Face Mesh,
which requires no API key, no network, and runs in ~5–20ms per frame.

Pipeline:
  base64 JPEG → PIL → numpy → MediaPipe FaceMesh
    → 468 3D face landmarks
    → EAR (Eye Aspect Ratio) per eye
    → left/right eye-open probability (0.0–1.0)
    → FrameAnalysis → PERCLOS engine

EAR formula (Soukupová & Čech 2016):
  EAR = (‖p2−p6‖ + ‖p3−p5‖) / (2 · ‖p1−p4‖)

EAR ≈ 0.30 → eye open
EAR ≈ 0.10 → eye closing
EAR ≈ 0.00 → eye fully closed

We normalise EAR to a 0–1 probability using a sigmoid-like mapping
so the downstream PERCLOS engine receives values consistent with what
it expects from the old ML-Kit / Roboflow backends.
"""

from __future__ import annotations

import asyncio
import base64
import io
import logging
import math
import time
from dataclasses import dataclass, field
from typing import Any, Optional

import mediapipe as mp
import numpy as np
from PIL import Image

from config import Settings
from engine import RawFaceFrame

logger = logging.getLogger(__name__)

# ── MediaPipe landmark indices ────────────────────────────────────────────────
# Six-point EAR landmarks per eye (order: outer-corner, top1, top2,
#                                         inner-corner, bot1, bot2)
_LEFT_EYE_IDX  = [362, 385, 387, 263, 373, 380]
_RIGHT_EYE_IDX = [33,  160, 158, 133, 153, 144]

# EAR → probability calibration:
# EAR values observed in practice:
#   fully open  ≈ 0.28–0.35
#   half-closed ≈ 0.15–0.22
#   fully closed ≈ 0.00–0.08
_EAR_OPEN   = 0.28   # EAR at which we call the eye "open"   (→ prob ≈ 1.0)
_EAR_CLOSED = 0.06   # EAR at which we call the eye "closed" (→ prob ≈ 0.0)


# ── Output data class ─────────────────────────────────────────────────────────

@dataclass
class FrameAnalysis:
    face_detected:              bool
    left_eye_open_probability:  Optional[float]
    right_eye_open_probability: Optional[float]
    pitch:              float = 0.0
    yaw:                float = 0.0
    roll:               float = 0.0
    model_used:         str   = "mediapipe-facemesh"
    inference_time_ms:  float = 0.0
    raw_predictions:    list[dict[str, Any]] = field(default_factory=list)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _b64_to_pil(b64: str) -> Image.Image:
    if "," in b64:
        b64 = b64.split(",", 1)[1]
    img = Image.open(io.BytesIO(base64.b64decode(b64)))
    # Apply EXIF rotation so MediaPipe always receives an upright face.
    # Android cameras embed orientation in EXIF; PIL won't auto-rotate without this.
    try:
        from PIL import ImageOps
        img = ImageOps.exif_transpose(img)
    except Exception:
        pass
    return img.convert("RGB")


def _dist(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.linalg.norm(a - b))


def _ear(landmarks: list, indices: list[int], w: int, h: int) -> float:
    """Eye Aspect Ratio from six MediaPipe landmarks."""
    pts = np.array(
        [[landmarks[i].x * w, landmarks[i].y * h] for i in indices],
        dtype=np.float32,
    )
    # p1=pts[0] (outer), p4=pts[3] (inner)
    # p2=pts[1], p6=pts[5] (upper/lower pair 1)
    # p3=pts[2], p5=pts[4] (upper/lower pair 2)
    A = _dist(pts[1], pts[5])
    B = _dist(pts[2], pts[4])
    C = _dist(pts[0], pts[3])
    return (A + B) / (2.0 * C) if C > 1e-6 else 0.0


def _ear_to_prob(ear_val: float) -> float:
    """Map EAR → eye-open probability in [0, 1] via linear clamp."""
    p = (ear_val - _EAR_CLOSED) / (_EAR_OPEN - _EAR_CLOSED)
    return max(0.0, min(1.0, p))


def _head_pose(landmarks: list, w: int, h: int) -> tuple[float, float, float]:
    """
    Rough head-pose estimate (pitch, yaw, roll in degrees) from MediaPipe
    Face Mesh landmarks using a simplified PnP approach.

    Landmark indices used:
      1  = nose tip
      33 = left eye outer corner (viewer left)
      263= right eye outer corner (viewer right)
      61 = mouth left corner
      291= mouth right corner
      199= chin
    """
    try:
        nose   = np.array([landmarks[1].x * w,   landmarks[1].y * h,   landmarks[1].z * w])
        l_eye  = np.array([landmarks[33].x * w,  landmarks[33].y * h,  landmarks[33].z * w])
        r_eye  = np.array([landmarks[263].x * w, landmarks[263].y * h, landmarks[263].z * w])
        m_left = np.array([landmarks[61].x * w,  landmarks[61].y * h,  landmarks[61].z * w])
        m_right= np.array([landmarks[291].x * w, landmarks[291].y * h, landmarks[291].z * w])
        chin   = np.array([landmarks[199].x * w, landmarks[199].y * h, landmarks[199].z * w])

        eye_mid  = (l_eye + r_eye) / 2
        face_vec = chin - eye_mid
        eye_vec  = r_eye - l_eye

        # Pitch: how much the face tilts forward/back
        pitch = math.degrees(math.atan2(face_vec[2], face_vec[1]))
        # Yaw: left-right turn
        yaw   = math.degrees(math.atan2(nose[2] - eye_mid[2], nose[0] - eye_mid[0]))
        # Roll: head tilt
        roll  = math.degrees(math.atan2(eye_vec[1], eye_vec[0]))

        return round(pitch, 1), round(yaw, 1), round(roll, 1)
    except Exception:
        return 0.0, 0.0, 0.0


# ── Main client ───────────────────────────────────────────────────────────────

class RoboflowClient:
    """
    Drop-in replacement for the old Roboflow inference client.
    Uses MediaPipe FaceMesh — runs entirely locally, no API key required.

    The class name is kept as RoboflowClient so main.py / routes need no changes.
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._face_mesh = mp.solutions.face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            refine_landmarks=True,   # iris landmarks for finer eye tracking
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )
        logger.info("MediaPipe FaceMesh initialised (no API key required)")

    async def analyze_frame(
        self,
        image_b64: str,
        model_id:  str = "mediapipe-facemesh",   # ignored — kept for API compat
    ) -> FrameAnalysis:
        """
        Decode a base64 JPEG, run FaceMesh inference, and return a FrameAnalysis.
        Runs the blocking MediaPipe call in a thread pool to avoid blocking the event loop.
        """
        t0 = time.perf_counter()
        try:
            pil = _b64_to_pil(image_b64)
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(None, self._infer_sync, pil)
            result.inference_time_ms = round((time.perf_counter() - t0) * 1000, 1)
            return result
        except Exception:
            logger.exception("MediaPipe FaceMesh inference failed")
            return FrameAnalysis(
                face_detected=False,
                left_eye_open_probability=None,
                right_eye_open_probability=None,
                inference_time_ms=round((time.perf_counter() - t0) * 1000, 1),
            )

    def _infer_sync(self, pil: Image.Image) -> FrameAnalysis:
        """Blocking inference — called from thread pool."""
        # Try the image as-is first, then rotate if no face found.
        # Android skipProcessing=true delivers frames from the preview surface
        # which can be 90° or 270° off-display-orientation depending on device.
        for angle in (0, 90, 270):
            candidate = pil if angle == 0 else pil.rotate(angle, expand=True)
            w, h = candidate.size
            rgb = np.array(candidate, dtype=np.uint8)
            results = self._face_mesh.process(rgb)
            if results.multi_face_landmarks:
                break
        else:
            return FrameAnalysis(
                face_detected=False,
                left_eye_open_probability=None,
                right_eye_open_probability=None,
            )

        lm = results.multi_face_landmarks[0].landmark

        left_ear  = _ear(lm, _LEFT_EYE_IDX,  w, h)
        right_ear = _ear(lm, _RIGHT_EYE_IDX, w, h)
        left_prob  = _ear_to_prob(left_ear)
        right_prob = _ear_to_prob(right_ear)
        pitch, yaw, roll = _head_pose(lm, w, h)

        logger.debug(
            "FaceMesh: left_ear=%.3f (%.2f) right_ear=%.3f (%.2f) pitch=%.1f",
            left_ear, left_prob, right_ear, right_prob, pitch,
        )

        return FrameAnalysis(
            face_detected=True,
            left_eye_open_probability=left_prob,
            right_eye_open_probability=right_prob,
            pitch=pitch,
            yaw=yaw,
            roll=roll,
            model_used="mediapipe-facemesh",
        )

    def to_raw_face_frame(
        self,
        analysis:     FrameAnalysis,
        timestamp_ms: Optional[int] = None,
    ) -> Optional[RawFaceFrame]:
        """Convert a FrameAnalysis to the engine's RawFaceFrame input."""
        if not analysis.face_detected:
            return None
        return RawFaceFrame(
            left_eye_open_probability  = analysis.left_eye_open_probability,
            right_eye_open_probability = analysis.right_eye_open_probability,
            pitch        = analysis.pitch,
            yaw          = analysis.yaw,
            roll         = analysis.roll,
            timestamp_ms = timestamp_ms or int(time.time() * 1000),
        )
