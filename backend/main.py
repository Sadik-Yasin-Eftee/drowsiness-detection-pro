"""
DrowsyGuard FastAPI backend — entry point
"""

from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import Settings
from roboflow_client import RoboflowClient
from routes.analyze import router as analyze_router
from routes.stream import router as stream_router
from session_store import SessionStore

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

_TTL_EVICTION_INTERVAL = 300  # seconds


async def _eviction_loop(store: SessionStore) -> None:
    while True:
        await asyncio.sleep(_TTL_EVICTION_INTERVAL)
        evicted = await store.evict_expired()
        if evicted:
            logger.info("TTL eviction: removed %d stale sessions", evicted)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = Settings()  # type: ignore[call-arg]
    roboflow = RoboflowClient(settings)
    store    = SessionStore(settings)

    app.state.settings = settings
    app.state.roboflow = roboflow
    app.state.store    = store

    logger.info(
        "DrowsyGuard backend starting — model=%s  api_url=%s",
        settings.active_model,
        settings.roboflow_api_url,
    )

    eviction_task = asyncio.create_task(_eviction_loop(store))

    try:
        yield
    finally:
        eviction_task.cancel()
        try:
            await eviction_task
        except asyncio.CancelledError:
            pass
        logger.info("DrowsyGuard backend shut down")


app = FastAPI(
    title="DrowsyGuard API",
    description=(
        "Real-time drowsiness detection backend. "
        "Accepts camera frames, runs Roboflow inference, "
        "and returns PERCLOS-based alert signals."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# Allow Expo dev client (localhost) and production origins.
# Tighten `allow_origins` in production via env.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(analyze_router, prefix="/api/v1")
app.include_router(stream_router,  prefix="/api/v1")


# ── Utility endpoints ─────────────────────────────────────────────────────────

@app.get("/health", tags=["meta"])
async def health() -> dict:
    store: SessionStore = app.state.store
    return {
        "status":          "ok",
        "active_sessions": await store.active_count(),
    }


@app.get("/", tags=["meta"])
async def root() -> dict:
    settings: Settings = app.state.settings
    return {
        "service":      "DrowsyGuard API",
        "version":      "1.0.0",
        "active_model": settings.active_model,
        "docs":         "/docs",
    }
