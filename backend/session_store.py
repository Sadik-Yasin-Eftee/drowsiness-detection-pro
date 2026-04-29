"""
In-memory session store with TTL eviction.

Each session holds one DrowsinessEngine instance so PERCLOS state
accumulates correctly across multiple API calls or WebSocket frames.

TTL eviction runs on demand (called from main.py's background task).
For multi-process / distributed deployments, replace _sessions with
a Redis-backed store; the public interface remains identical.
"""

from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass, field
from typing import Optional

from config import Settings
from engine import DrowsinessEngine, DetectionTick

logger = logging.getLogger(__name__)


@dataclass
class Session:
    id:            str
    engine:        DrowsinessEngine
    created_at:    float = field(default_factory=time.time)
    last_active:   float = field(default_factory=time.time)
    total_frames:  int   = 0
    total_alerts:  int   = 0
    # Latest tick cached for the summary endpoint
    last_tick:     Optional[DetectionTick] = None

    def touch(self) -> None:
        self.last_active = time.time()

    def record_tick(self, tick: DetectionTick, fired_alert: bool) -> None:
        self.total_frames += 1
        if fired_alert:
            self.total_alerts += 1
        self.last_tick = tick
        self.touch()

    def summary(self) -> dict:
        now = time.time()
        return {
            "session_id":       self.id,
            "created_at":       self.created_at,
            "duration_seconds": round(now - self.created_at, 1),
            "total_frames":     self.total_frames,
            "total_alerts":     self.total_alerts,
            "last_perclos":     self.last_tick.perclos     if self.last_tick else 0,
            "last_alert_level": self.last_tick.alert_level if self.last_tick else 0,
        }


class SessionStore:
    """Thread-safe (asyncio) store for active driver sessions."""

    def __init__(self, settings: Settings) -> None:
        self._settings  = settings
        self._sessions: dict[str, Session] = {}
        self._lock      = asyncio.Lock()

    # ── Engine factory ────────────────────────────────────────────────────────

    def _new_engine(self) -> DrowsinessEngine:
        s = self._settings
        return DrowsinessEngine(
            perclos_window_ms    = s.perclos_window_ms,
            blink_window_ms      = s.blink_window_ms,
            closed_threshold     = s.closed_threshold,
            closing_threshold    = s.closing_threshold,
            head_droop_pitch_deg = s.head_droop_pitch_deg,
            perclos_threshold    = s.perclos_alert_threshold,
            microsleep_ms        = s.microsleep_ms,
            min_alert_gap_ms     = s.min_alert_gap_ms,
        )

    # ── CRUD ──────────────────────────────────────────────────────────────────

    async def get_or_create(self, session_id: str) -> Session:
        async with self._lock:
            if session_id not in self._sessions:
                self._sessions[session_id] = Session(
                    id=session_id,
                    engine=self._new_engine(),
                )
                logger.info("Session created: %s", session_id)
            session = self._sessions[session_id]
            session.touch()
            return session

    async def get(self, session_id: str) -> Optional[Session]:
        async with self._lock:
            return self._sessions.get(session_id)

    async def delete(self, session_id: str) -> Optional[Session]:
        async with self._lock:
            session = self._sessions.pop(session_id, None)
            if session:
                logger.info(
                    "Session ended: %s  frames=%d  alerts=%d",
                    session_id,
                    session.total_frames,
                    session.total_alerts,
                )
            return session

    async def reset_engine(self, session_id: str) -> bool:
        """Reset the PERCLOS rolling window (new trip start)."""
        async with self._lock:
            session = self._sessions.get(session_id)
            if not session:
                return False
            session.engine.reset()
            session.total_frames = 0
            session.total_alerts = 0
            session.last_tick    = None
            session.created_at   = time.time()
            session.touch()
            return True

    # ── TTL eviction ──────────────────────────────────────────────────────────

    async def evict_expired(self) -> int:
        """Remove sessions idle longer than SESSION_TTL_SECONDS."""
        ttl = self._settings.session_ttl_seconds
        now = time.time()
        async with self._lock:
            expired = [
                sid for sid, s in self._sessions.items()
                if now - s.last_active > ttl
            ]
            for sid in expired:
                del self._sessions[sid]
        if expired:
            logger.info("Evicted %d expired sessions", len(expired))
        return len(expired)

    # ── Introspection ─────────────────────────────────────────────────────────

    async def active_count(self) -> int:
        async with self._lock:
            return len(self._sessions)

    async def summary(self, session_id: str) -> Optional[dict]:
        async with self._lock:
            session = self._sessions.get(session_id)
            return session.summary() if session else None
