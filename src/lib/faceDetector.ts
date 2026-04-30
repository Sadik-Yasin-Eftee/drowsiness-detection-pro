/**
 * FaceDetector abstraction
 * ─────────────────────────────────────────────────────────────────────────────
 * The DEFAULT implementation is BackendDetector, which POSTs frames to the
 * FastAPI backend (Roboflow inference) for face/drowsiness analysis.
 *
 * Data flow:
 *   CameraView.ref.takePictureAsync({ base64: true })
 *     → POST ${BACKEND_URL}/api/v1/analyze
 *     → left_eye_open_probability, right_eye_open_probability, head_pose
 *     → RawFaceFrame
 *     → DrowsinessEngine.process()
 *
 * Capture rate: ~3 FPS (333ms). The backend returns full head-pose including
 * pitch, so all alert levels (PERCLOS, eye-closure, head-droop) are active.
 *
 * SimulatedFaceDetector is kept as a named export for unit tests / web preview.
 */

import React from 'react';
import type { CameraView } from 'expo-camera';
import type { RawFaceFrame } from './drowsinessEngine';
import { BACKEND_URL, BACKEND_CAPTURE_INTERVAL_MS } from './backendConfig';

/* ────────────────────────────────────────────────────────────────────────── */
/*  Interface                                                                */
/* ────────────────────────────────────────────────────────────────────────── */

export interface FaceDetector {
  start(): void;
  stop(): void;
  read(): RawFaceFrame | null;
  dispose(): void;
  /** Register the live camera ref used for frame capture (MLKitFaceDetector). */
  setCameraRef?: (ref: React.RefObject<CameraView | null>) => void;
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  BackendDetector — Roboflow via FastAPI backend                           */
/* ────────────────────────────────────────────────────────────────────────── */

export class BackendDetector implements FaceDetector {
  private active = false;
  private capturing = false;
  private cameraRef: React.RefObject<CameraView | null> | null = null;
  private latest: RawFaceFrame | null = null;
  private captureTimer: ReturnType<typeof setTimeout> | null = null;
  private sessionId = '';

  setCameraRef(ref: React.RefObject<CameraView | null>): void {
    this.cameraRef = ref;
  }

  start(): void {
    if (this.active) return;
    this.active = true;
    this.sessionId = `session-${Date.now()}`;
    void this.captureLoop();
  }

  stop(): void {
    this.active = false;
    if (this.captureTimer) {
      clearTimeout(this.captureTimer);
      this.captureTimer = null;
    }
    this.latest = null;
  }

  read(): RawFaceFrame | null {
    return this.latest;
  }

  dispose(): void {
    this.stop();
    if (this.sessionId) {
      fetch(`${BACKEND_URL}/api/v1/session/${this.sessionId}`, { method: 'DELETE' })
        .catch(() => {});
    }
    this.cameraRef = null;
  }

  private async captureLoop(): Promise<void> {
    if (!this.active) return;
    if (!this.capturing && this.cameraRef?.current) {
      this.capturing = true;
      try {
        await this.doCapture();
      } catch {
        // Camera not ready or network error — keep latest frame, retry
      } finally {
        this.capturing = false;
      }
    }
    if (this.active) {
      this.captureTimer = setTimeout(() => void this.captureLoop(), BACKEND_CAPTURE_INTERVAL_MS);
    }
  }

  private async doCapture(): Promise<void> {
    const camera = this.cameraRef?.current;
    if (!camera) return;

    const photo = await (camera as any).takePictureAsync({
      quality: 0.4,
      skipProcessing: true,
      base64: true,
    });

    if (!photo?.base64) return;

    try {
      const resp = await fetch(`${BACKEND_URL}/api/v1/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frame: photo.base64,
          session_id: this.sessionId,
          timestamp_ms: Date.now(),
        }),
      });

      if (!resp.ok) return;

      const data = await resp.json() as {
        face_detected: boolean;
        left_eye_open_probability: number | null;
        right_eye_open_probability: number | null;
        head_pose: { pitch: number; yaw: number; roll: number };
      };

      if (data.face_detected) {
        this.latest = {
          leftEyeOpenProbability:  data.left_eye_open_probability  ?? null,
          rightEyeOpenProbability: data.right_eye_open_probability ?? null,
          pitch: data.head_pose?.pitch ?? 0,
          yaw:   data.head_pose?.yaw   ?? 0,
          roll:  data.head_pose?.roll  ?? 0,
          timestamp: Date.now(),
        };
      } else {
        this.latest = null;
      }
    } finally {
      try {
        const FS = require('expo-file-system') as typeof import('expo-file-system');
        void FS.deleteAsync(photo.uri, { idempotent: true });
      } catch { /* OS will clean cache */ }
    }
  }
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  SimulatedFaceDetector — kept for tests / web preview                    */
/* ────────────────────────────────────────────────────────────────────────── */

export class SimulatedFaceDetector implements FaceDetector {
  private running = false;
  private startedAt = 0;
  private nextBlinkAt = 0;
  private blinkUntil = 0;
  private closureUntil = 0;
  private microsleepUntil = 0;
  private lookAwayUntil = 0;
  private droopUntil = 0;
  private smoothedEyeOpen = 0.95;

  start(): void {
    if (this.running) return;
    this.running = true;
    this.startedAt = Date.now();
    this.nextBlinkAt = Date.now() + 2500 + Math.random() * 1000;
  }

  stop(): void { this.running = false; }
  dispose(): void { this.running = false; }

  read(): RawFaceFrame | null {
    if (!this.running) return null;
    const now = Date.now();
    const elapsedMin = (now - this.startedAt) / 60_000;
    const pressure = Math.min(1, elapsedMin / 6);

    if (now > this.nextBlinkAt && now > this.blinkUntil) {
      this.blinkUntil  = now + 100 + Math.random() * 60;
      this.nextBlinkAt = now + 2200 + Math.random() * 1500 - pressure * 800;
    }
    if (Math.random() < 0.004 && now > this.lookAwayUntil)
      this.lookAwayUntil = now + 800 + Math.random() * 1200;
    if (pressure > 0.4 && Math.random() < pressure * 0.008 && now > this.closureUntil)
      this.closureUntil = now + 250 + Math.random() * 350;
    if (pressure > 0.75 && Math.random() < 0.001 && now > this.microsleepUntil)
      this.microsleepUntil = now + 1700 + Math.random() * 600;
    if (pressure > 0.7 && Math.random() < 0.0015 && now > this.droopUntil)
      this.droopUntil = now + 1200 + Math.random() * 800;

    if (now < this.lookAwayUntil) return null;

    let targetEyeOpen = 0.97;
    if (now < this.microsleepUntil)  targetEyeOpen = 0.05;
    else if (now < this.blinkUntil)  targetEyeOpen = 0.10;
    else if (now < this.closureUntil)targetEyeOpen = 0.25;
    else if (pressure > 0.6)         targetEyeOpen = 0.85 - pressure * 0.15;
    else if (pressure > 0.3)         targetEyeOpen = 0.92 - pressure * 0.05;

    const alpha = (now < this.blinkUntil || now < this.microsleepUntil) ? 0.5 : 0.20;
    this.smoothedEyeOpen += (targetEyeOpen - this.smoothedEyeOpen) * alpha;

    let pitch = (Math.random() - 0.5) * 4;
    if (now < this.droopUntil) pitch += 22 + Math.random() * 6;
    else if (pressure > 0.5)   pitch += pressure * 6 * Math.sin(now / 1500);
    const yaw  = (Math.random() - 0.5) * 6;
    const roll = (Math.random() - 0.5) * 4;

    const left  = Math.max(0, Math.min(1, this.smoothedEyeOpen + (Math.random() - 0.5) * 0.04));
    const right = Math.max(0, Math.min(1, this.smoothedEyeOpen + (Math.random() - 0.5) * 0.04));

    return { leftEyeOpenProbability: left, rightEyeOpenProbability: right, pitch, yaw, roll, timestamp: now };
  }
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Factory                                                                  */
/* ────────────────────────────────────────────────────────────────────────── */

export function createFaceDetector(): FaceDetector {
  return new BackendDetector();
}
