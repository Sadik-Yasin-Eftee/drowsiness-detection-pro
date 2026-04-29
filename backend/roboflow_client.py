"""
Roboflow inference client
══════════════════════════
Wraps the Roboflow inference-sdk to support both:
  • YOLOv8 detection models  — bounding boxes, class labels
  • RF-DETR detection models — same output format as YOLOv8
  • Classification models    — top class + confidence

Then maps model output → (left_eye_prob, right_eye_prob, face_detected) so the
PERCLOS engine receives consistent RawFaceFrame objects regardless of which
Roboflow model is active.

Class-name mapping strategy
────────────────────────────
Different Roboflow datasets use different class names.  We handle them with
broad keyword matching rather than exact equals, so new models "just work"
without code changes.

  Open-eye classes:   open, eye-open, awake, alert, nodrowsy, no-drowsy …
  Closed-eye classes: closed, eye-closed, drowsy, sleepy, sleeping, yawn …
  Right-eye hints:    right, r-eye, righteye …
  Left-eye hints:     left, l-eye, lefteye …

If a model outputs a single "drowsy / awake" class for the whole frame
(classification), we map it to equivalent eye-open probabilities and apply
a confidence-weighted scaling so the PERCLOS engine still sees realistic values.
"""

from __future__ import annotations

import asyncio
import base64
import io
import logging
import time
from dataclasses import dataclass, field
from typing import Any, Optional

from PIL import Image

from config import Settings
from engine import RawFaceFrame

logger = logging.getLogger(__name__)


# ── Class-name keyword sets ───────────────────────────────────────────────────

_OPEN_KW   = {"open", "awake", "alert", "nodrowsy", "no-drowsy", "active"}
_CLOSED_KW = {"closed", "close", "drowsy", "sleepy", "sleeping", "fatigue",
              "tired", "yawn", "yawning", "microsleep"}
_RIGHT_KW  = {"right", "r-eye", "righteye", "reye"}
_LEFT_KW   = {"left",  "l-eye", "lefteye",  "leye"}

# Whole-frame classification → canonical eye-open probability
_CLASS_TO_EYE_PROB: dict[str, float] = {
    "awake":     0.92,
    "alert":     0.92,
    "nodrowsy":  0.92,
    "no-drowsy": 0.92,
    "active":    0.92,
    "yawn":      0.65,
    "yawning":   0.65,
    "drowsy":    0.35,
    "sleepy":    0.25,
    "fatigue":   0.30,
    "tired":     0.30,
    "sleeping":  0.05,
    "closed":    0.05,
    "microsleep":0.02,
}


# ── Output data class ─────────────────────────────────────────────────────────

@dataclass
class FrameAnalysis:
    face_detected:              bool
    left_eye_open_probability:  Optional[float]
    right_eye_open_probability: Optional[float]
    pitch:              float = 0.0
    yaw:                float = 0.0
    roll:               float = 0.0
    model_used:         str   = "unknown"
    inference_time_ms:  float = 0.0
    raw_predictions:    list[dict[str, Any]] = field(default_factory=list)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _b64_to_pil(b64: str) -> Image.Image:
    """Accept data-URI or raw base64 string."""
    if "," in b64:
        b64 = b64.split(",", 1)[1]
    return Image.open(io.BytesIO(base64.b64decode(b64))).convert("RGB")


def _cls_tokens(raw: str) -> set[str]:
    """Lowercase, split on common separators into a set of tokens."""
    import re
    norm = raw.lower()
    return set(re.split(r"[-_\s]+", norm))


def _is_open(tokens: set[str]) -> bool:
    return bool(tokens & _OPEN_KW) or "open" in tokens


def _is_closed(tokens: set[str]) -> bool:
    return bool(tokens & _CLOSED_KW)


def _is_right(tokens: set[str]) -> bool:
    return bool(tokens & _RIGHT_KW)


def _is_left(tokens: set[str]) -> bool:
    return bool(tokens & _LEFT_KW)


# ── Output parsers ────────────────────────────────────────────────────────────

def _parse_detection(
    predictions: list[dict],
    image_w: int,
    image_h: int,
) -> tuple[Optional[float], Optional[float], bool]:
    """
    Parse bounding-box predictions → (left_prob, right_prob, face_detected).

    Assignment strategy:
      1. If class name contains left/right hint → assign directly.
      2. Otherwise use x-coordinate: in a mirrored front-facing camera the
         driver's anatomical left eye appears on the RIGHT side of the frame.
         x > image_w/2  → left eye
         x < image_w/2  → right eye
    """
    if not predictions:
        return None, None, False

    face_detected = False
    left_buckets:  list[float] = []
    right_buckets: list[float] = []

    for pred in predictions:
        raw_cls = pred.get("class", "")
        tokens  = _cls_tokens(raw_cls)
        conf    = float(pred.get("confidence", 0.5))
        cx      = float(pred.get("x", image_w / 2))

        if "face" in tokens:
            face_detected = True
            continue

        open_eye   = _is_open(tokens)
        closed_eye = _is_closed(tokens)
        if not (open_eye or closed_eye):
            continue

        face_detected = True
        # Eye-open probability: high confidence + open class → near 1.0
        prob = conf if open_eye else (1.0 - conf)

        if _is_right(tokens):
            right_buckets.append(prob)
        elif _is_left(tokens):
            left_buckets.append(prob)
        else:
            # Fallback: position-based assignment (mirrored camera)
            if cx >= image_w / 2:
                left_buckets.append(prob)
            else:
                right_buckets.append(prob)

    def _avg(bucket: list[float]) -> Optional[float]:
        return sum(bucket) / len(bucket) if bucket else None

    left_prob  = _avg(left_buckets)
    right_prob = _avg(right_buckets)

    # Mirror missing eye from the detected one
    if left_prob is not None and right_prob is None:
        right_prob = left_prob
    elif right_prob is not None and left_prob is None:
        left_prob = right_prob

    return left_prob, right_prob, face_detected


def _parse_classification(result: dict) -> tuple[Optional[float], Optional[float], bool]:
    """
    Parse whole-frame classification output → (left_prob, right_prob, face_detected).

    Roboflow classification format:
      { "top": "drowsy", "confidence": 0.87,
        "predictions": {"0": {"class": "awake", "confidence": 0.13},
                        "1": {"class": "drowsy", "confidence": 0.87}} }
    """
    top_raw = result.get("top", "").lower().replace("_", "-").replace(" ", "-")
    conf    = float(result.get("confidence", 0.5))

    # Map known classes; fall back to a neutral guess
    base_prob = _CLASS_TO_EYE_PROB.get(top_raw)
    if base_prob is None:
        tokens = _cls_tokens(top_raw)
        base_prob = 0.90 if _is_open(tokens) else (0.10 if _is_closed(tokens) else 0.55)

    # Scale: high confidence pushes probability further from neutral (0.5)
    scaled = 0.5 + (base_prob - 0.5) * conf
    scaled = max(0.0, min(1.0, scaled))

    face_detected = top_raw not in {"no-face", "noface", "no_face", "background"}
    return (scaled, scaled, face_detected) if face_detected else (None, None, False)


# ── Main client ───────────────────────────────────────────────────────────────

class RoboflowClient:
    """
    Async wrapper around the synchronous inference-sdk InferenceHTTPClient.

    Blocking inference calls are offloaded to a thread pool so they don't
    block the FastAPI event loop.
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._sdk_client: Any = None   # InferenceHTTPClient, lazily created

    def _sdk(self):
        """Lazily build the inference-sdk client (sync, called from thread pool)."""
        if self._sdk_client is None:
            from inference_sdk import InferenceHTTPClient  # noqa: PLC0415
            self._sdk_client = InferenceHTTPClient(
                api_url=self._settings.roboflow_api_url,
                api_key=self._settings.roboflow_api_key,
            )
        return self._sdk_client

    def _run_inference_sync(self, pil_image: Image.Image, model_id: str) -> dict:
        """Synchronous inference call — runs in executor."""
        return self._sdk().infer(pil_image, model_id=model_id)

    async def analyze_frame(
        self,
        image_b64: str,
        model_id:  str,
    ) -> FrameAnalysis:
        """
        Decode a base64 JPEG, run Roboflow inference, and return a FrameAnalysis.
        Never raises — returns a no-face FrameAnalysis on any error.
        """
        t0 = time.perf_counter()
        try:
            pil = _b64_to_pil(image_b64)
            image_w, image_h = pil.size

            loop   = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None, self._run_inference_sync, pil, model_id
            )

            elapsed_ms = (time.perf_counter() - t0) * 1000
            raw_preds  = result.get("predictions", []) if isinstance(result, dict) else []

            # Determine output format: list → detection, dict → classification
            if isinstance(raw_preds, list):
                left_p, right_p, face_det = _parse_detection(
                    raw_preds, image_w, image_h
                )
            else:
                left_p, right_p, face_det = _parse_classification(result)

            return FrameAnalysis(
                face_detected              = face_det,
                left_eye_open_probability  = left_p,
                right_eye_open_probability = right_p,
                model_used                 = model_id,
                inference_time_ms          = round(elapsed_ms, 1),
                raw_predictions            = raw_preds if isinstance(raw_preds, list) else [],
            )

        except Exception:
            logger.exception("Roboflow inference failed for model=%s", model_id)
            return FrameAnalysis(
                face_detected              = False,
                left_eye_open_probability  = None,
                right_eye_open_probability = None,
                model_used                 = model_id,
                inference_time_ms          = round((time.perf_counter() - t0) * 1000, 1),
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
