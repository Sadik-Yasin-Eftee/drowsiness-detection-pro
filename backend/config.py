"""Application settings — loaded from .env via pydantic-settings."""

from __future__ import annotations
from typing import Literal
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # ── Roboflow ──────────────────────────────────────────────────────────────
    roboflow_api_key: str = Field(default="", description="Roboflow API key")
    roboflow_api_url: str = Field(
        default="https://detect.roboflow.com",
        description="Inference endpoint — use http://localhost:9001 for local server",
    )

    # Model IDs (workspace/model-slug/version from universe.roboflow.com)
    yolov8_model_id: str = Field(default="driver-drowsiness-detection/1")
    rfdetr_model_id: str = Field(default="rf-detr-drowsiness/1")
    active_model: Literal["yolov8", "rfdetr", "auto"] = Field(default="yolov8")

    # ── PERCLOS engine ────────────────────────────────────────────────────────
    perclos_window_ms: int = Field(default=60_000, ge=5_000)
    blink_window_ms: int = Field(default=60_000, ge=5_000)
    closed_threshold: float = Field(default=0.30, ge=0.0, le=1.0)
    closing_threshold: float = Field(default=0.55, ge=0.0, le=1.0)
    perclos_alert_threshold: int = Field(default=30, ge=5, le=100)
    head_droop_pitch_deg: float = Field(default=18.0, ge=5.0, le=45.0)
    microsleep_ms: int = Field(default=1_500, ge=500)
    min_alert_gap_ms: int = Field(default=8_000, ge=1_000)

    # ── Session management ────────────────────────────────────────────────────
    session_ttl_seconds: int = Field(default=7_200, ge=60)

    # ── Server ────────────────────────────────────────────────────────────────
    host: str = Field(default="0.0.0.0")
    port: int = Field(default=8000, ge=1, le=65535)
    log_level: str = Field(default="info")

    def active_model_id(self, override: str | None = None) -> str:
        if override == "rfdetr":
            return self.rfdetr_model_id
        if override == "yolov8":
            return self.yolov8_model_id
        return (
            self.rfdetr_model_id
            if self.active_model == "rfdetr"
            else self.yolov8_model_id
        )

    @property
    def is_hosted(self) -> bool:
        return "detect.roboflow.com" in self.roboflow_api_url
