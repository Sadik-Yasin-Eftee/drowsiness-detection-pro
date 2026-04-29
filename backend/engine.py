"""
DrowsyGuard PERCLOS Engine — Python
════════════════════════════════════
Exact mirror of src/lib/drowsinessEngine.ts.

Turns raw per-frame face data (eye-open probabilities, head Euler angles) into
the higher-level drowsiness signals the API returns:

  • EAR proxy          — average of left + right eye-open probability
  • PERCLOS            — % of rolling window where eyes were "closed"
  • Blink rate         — blinks/min in rolling window
  • Eye-closure dur.   — length of current continuous closure
  • Head-droop flag    — pitch beyond threshold
  • Alert level 0-3   — composite decision
  • Fatigue score      — visual 0-100 composite

Alert escalation:
  0  safe       no alert
  1  cautious   approaching thresholds
  2  warning    driver should take a break
  3  critical   microsleep / pull over now
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class RawFaceFrame:
    left_eye_open_probability:  Optional[float]   # 0-1 or None
    right_eye_open_probability: Optional[float]   # 0-1 or None
    pitch: float = 0.0                            # head nod  (°)
    yaw:   float = 0.0                            # head turn (°)
    roll:  float = 0.0                            # head tilt (°)
    timestamp_ms: int = field(
        default_factory=lambda: int(time.time() * 1000)
    )


@dataclass
class DetectionTick:
    perclos:             int             # 0-100
    blink_rate:          int             # blinks/min
    ear:                 float           # 0.0-1.0
    eye_state:           str             # 'open' | 'closing' | 'closed'
    alert_level:         int             # 0-3
    confidence:          int             # 0-100
    head_pose:           dict            # {pitch, yaw, roll}
    fatigue_score:       int             # 0-100
    closure_duration_ms: int
    reason_bn:           Optional[str]
    reason_en:           Optional[str]
    face_detected:       bool


class DrowsinessEngine:
    """Stateful PERCLOS engine.  One instance per driver session."""

    _MICROSLEEP_MS    = 1_500
    _MIN_ALERT_GAP_MS = 8_000

    def __init__(
        self,
        perclos_window_ms:   int   = 60_000,
        blink_window_ms:     int   = 60_000,
        closed_threshold:    float = 0.30,
        closing_threshold:   float = 0.55,
        head_droop_pitch_deg:float = 18.0,
        perclos_threshold:   int   = 30,
        microsleep_ms:       int   = 1_500,
        min_alert_gap_ms:    int   = 8_000,
    ) -> None:
        self.perclos_window_ms    = perclos_window_ms
        self.blink_window_ms      = blink_window_ms
        self.closed_threshold     = closed_threshold
        self.closing_threshold    = closing_threshold
        self.head_droop_pitch_deg = head_droop_pitch_deg
        self.perclos_threshold    = perclos_threshold
        self._microsleep_ms       = microsleep_ms
        self._min_alert_gap_ms    = min_alert_gap_ms

        # Rolling state
        self._samples:  list[tuple[int, bool]] = []  # (t_ms, is_closed)
        self._blinks:   list[int]              = []  # t_ms of blink endings
        self._was_closed         = False
        self._closure_started_at: Optional[int] = None
        self._last_alert_at      = 0

    def reset(self) -> None:
        self._samples.clear()
        self._blinks.clear()
        self._was_closed = False
        self._closure_started_at = None
        self._last_alert_at = 0

    def reconfigure(self, **kwargs: object) -> None:
        for key, val in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, val)

    # ── Main processing method ────────────────────────────────────────────────

    def process(self, face: Optional[RawFaceFrame]) -> DetectionTick:
        now = face.timestamp_ms if face else int(time.time() * 1000)

        # ── Derive EAR proxy ──────────────────────────────────────────────────
        ear        = 1.0
        confidence = 0
        eye_state  = "open"
        is_closed  = False

        l = face.left_eye_open_probability  if face else None
        r = face.right_eye_open_probability if face else None

        if face and l is not None and r is not None:
            ear        = (l + r) / 2.0
            confidence = min(100, round(abs(ear - 0.5) * 200 + 50))
            is_closed  = ear < self.closed_threshold
            if ear < self.closed_threshold:
                eye_state = "closed"
            elif ear < self.closing_threshold:
                eye_state = "closing"
            else:
                eye_state = "open"
        elif face:
            # Face visible but eye probs not available (oblique angle)
            confidence = 30

        # ── Rolling closure samples ───────────────────────────────────────────
        self._samples.append((now, is_closed))
        self._samples = [
            (t, c) for t, c in self._samples
            if now - t <= self.perclos_window_ms
        ]

        # ── Blink edge detection ──────────────────────────────────────────────
        if face:
            if is_closed and not self._was_closed:
                self._closure_started_at = now
            elif not is_closed and self._was_closed:
                self._blinks.append(now)
                self._closure_started_at = None
            self._was_closed = is_closed
        else:
            self._was_closed = False
            self._closure_started_at = None

        self._blinks = [t for t in self._blinks if now - t <= self.blink_window_ms]

        # ── Derived metrics ───────────────────────────────────────────────────
        if self._samples:
            closed_n = sum(1 for _, c in self._samples if c)
            perclos  = round(closed_n / len(self._samples) * 100)
        else:
            perclos = 0

        window_sec = max(1.0, self.blink_window_ms / 1000.0)
        blink_rate = round(len(self._blinks) / window_sec * 60)

        closure_duration_ms = (
            now - self._closure_started_at if self._closure_started_at else 0
        )

        head_pose = (
            {"pitch": face.pitch, "yaw": face.yaw, "roll": face.roll}
            if face else
            {"pitch": 0.0, "yaw": 0.0, "roll": 0.0}
        )
        droop = abs(head_pose["pitch"]) > self.head_droop_pitch_deg

        # ── Alert decision tree ───────────────────────────────────────────────
        alert_level = 0
        reason_bn: Optional[str] = None
        reason_en: Optional[str] = None

        if closure_duration_ms >= self._microsleep_ms:
            alert_level = 3
            reason_bn   = "মাইক্রোস্লিপ! চোখ অনেকক্ষণ বন্ধ ছিল।"
            reason_en   = "Microsleep — eyes closed too long!"
        elif droop and perclos > self.perclos_threshold * 0.6:
            alert_level = 3
            reason_bn   = "মাথা ঝুঁকে পড়ছে — এখনই থামুন!"
            reason_en   = "Head dropping — pull over now!"
        elif perclos >= self.perclos_threshold:
            alert_level = 2
            reason_bn   = "আপনার চোখ বেশি বন্ধ থাকছে।"
            reason_en   = "Eyes closing too often."
        elif 0 < blink_rate < 6 and perclos > self.perclos_threshold * 0.5:
            alert_level = 2
            reason_bn   = "ব্লিংক রেট কমে গেছে — আপনি ক্লান্ত।"
            reason_en   = "Blink rate dropped — you may be tired."
        elif droop:
            alert_level = 1
            reason_bn   = "মাথা একটু ঝুঁকছে — সতর্ক হোন।"
            reason_en   = "Head tilting — stay alert."
        elif perclos >= self.perclos_threshold * 0.7:
            alert_level = 1
            reason_bn   = "আপনার চোখ ভারী হচ্ছে।"
            reason_en   = "Eyes getting heavy."

        # Debounce: suppress reason text if another alert fired recently
        allow_event = (now - self._last_alert_at) > self._min_alert_gap_ms
        if alert_level >= 2 and allow_event:
            self._last_alert_at = now
        elif alert_level >= 2 and not allow_event:
            reason_bn = None
            reason_en = None

        # ── Fatigue score (visual indicator only) ─────────────────────────────
        blink_dev      = abs(blink_rate - 17) / 17 if blink_rate > 0 else 1.0
        head_instab    = (
            abs(head_pose["pitch"]) + abs(head_pose["yaw"]) + abs(head_pose["roll"])
        ) / 90.0
        fatigue_score = min(100, max(0, round(
            (perclos / 100) * 50 + blink_dev * 25 + head_instab * 25
        )))

        return DetectionTick(
            perclos             = perclos,
            blink_rate          = blink_rate,
            ear                 = round(ear, 3),
            eye_state           = eye_state,
            alert_level         = alert_level,
            confidence          = confidence,
            head_pose           = head_pose,
            fatigue_score       = fatigue_score,
            closure_duration_ms = closure_duration_ms,
            reason_bn           = reason_bn,
            reason_en           = reason_en,
            face_detected       = face is not None,
        )

    def should_fire_alert_event(self, tick: DetectionTick) -> bool:
        return tick.alert_level >= 2 and bool(tick.reason_bn)
