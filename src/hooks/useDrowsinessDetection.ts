/**
 * useDrowsinessDetection
 * ─────────────────────────────────────────────────────────────────────────────
 * Owns the full detection pipeline:
 *
 *   1. Creates a DrowsinessEngine (stays alive for the trip).
 *   2. Creates an MLKitFaceDetector and polls its `read()` at ~10 Hz.
 *      Because ML Kit captures at ~4 FPS, frames are timestamped and the hook
 *      skips re-processing the same frame (deduplication via lastTimestamp).
 *   3. Exposes `registerCamera(ref)` — called by CameraDetector once it mounts
 *      so the detector can call takePictureAsync() on the live camera.
 *   4. Mirrors each engine tick into the Zustand store.
 *   5. Fires sound + haptics when a drowsiness event is confirmed.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { CameraView } from 'expo-camera';

import { useAppStore, type DrowsinessEvent } from '@/store/useAppStore';
import { DrowsinessEngine } from '@/lib/drowsinessEngine';
import { createFaceDetector, type FaceDetector } from '@/lib/faceDetector';
import { alertSounds } from '@/lib/alertSounds';
import { buzzForAlert } from '@/lib/haptics';

const POLL_INTERVAL_MS = 100; // 10 Hz — reads the latest ML Kit frame, if any

export function useDrowsinessDetection(active: boolean) {
  const sensitivity      = useAppStore((s) => s.sensitivity);
  const perclosThreshold = useAppStore((s) => s.perclosThreshold);
  const soundAlerts      = useAppStore((s) => s.soundAlerts);
  const nightQuiet       = useAppStore((s) => s.nightQuiet);
  const tripActive       = useAppStore((s) => s.tripActive);

  const startTrip         = useAppStore((s) => s.startTrip);
  const incrementTripTime = useAppStore((s) => s.incrementTripTime);
  const updateDetection   = useAppStore((s) => s.updateDetection);
  const addDrowsinessEvent = useAppStore((s) => s.addDrowsinessEvent);
  const setShowAlert      = useAppStore((s) => s.setShowAlert);

  // ── Engine — one instance per mount, reconfigured on prefs change ──────
  const engineRef = useRef<DrowsinessEngine | null>(null);
  if (engineRef.current === null) {
    engineRef.current = new DrowsinessEngine({ sensitivity, perclosThreshold });
  }
  useEffect(() => {
    engineRef.current?.reconfigure({ sensitivity, perclosThreshold });
  }, [sensitivity, perclosThreshold]);

  // ── Detector — MLKitFaceDetector by default ─────────────────────────────
  const detectorRef = useRef<FaceDetector | null>(null);

  // Track the timestamp of the last frame we fed to the engine.
  // ML Kit produces one frame every ~250ms; the poll runs at 100ms, so without
  // deduplication the engine would process the same frame 2-3 times per capture.
  const lastFrameTs = useRef<number>(0);

  // ── Process one poll tick ───────────────────────────────────────────────
  const handleDetection = useCallback(() => {
    const engine   = engineRef.current;
    const detector = detectorRef.current;
    if (!engine || !detector) return;

    const face = detector.read();

    // Skip if this is the same frame we already processed
    if (face !== null && face.timestamp <= lastFrameTs.current) return;
    if (face !== null) lastFrameTs.current = face.timestamp;

    const tick = engine.process(face);

    updateDetection({
      perclosScore:      tick.perclos,
      blinkRate:         tick.blinkRate,
      eyeAspectRatio:    tick.ear,
      eyeState:          tick.eyeState,
      currentAlertLevel: tick.alertLevel,
      headPose:          tick.headPose,
      aiConfidence:      tick.confidence,
      fatigueScore:      tick.fatigueScore,
      faceDetected:      tick.faceDetected,
      eyeStateTimeline: [
        ...useAppStore.getState().eyeStateTimeline.slice(-29),
        { timestamp: Date.now(), state: tick.eyeState },
      ],
    });

    if (engine.shouldFireAlertEvent(tick) && tick.reason_bn && tick.reason_en) {
      const event: DrowsinessEvent = {
        id: `evt-${Date.now()}`,
        timestamp: Date.now(),
        perclosAtTrigger:    tick.perclos,
        eyeClosureDuration:  tick.closureDurationMs / 1000,
        confidence:          tick.confidence,
        alertLevel:          tick.alertLevel as 1 | 2 | 3,
        reason_bn:           tick.reason_bn,
        reason_en:           tick.reason_en,
        dismissed:           false,
        flaggedFalseAlarm:   false,
      };
      addDrowsinessEvent(event);
      setShowAlert(true, event);

      if (soundAlerts) void alertSounds.play(tick.alertLevel as 1 | 2 | 3, { nightQuiet });
      void buzzForAlert(tick.alertLevel as 1 | 2 | 3);
    }
  }, [updateDetection, addDrowsinessEvent, setShowAlert, soundAlerts, nightQuiet]);

  // ── Detector lifecycle ──────────────────────────────────────────────────
  useEffect(() => {
    if (!active) return;

    if (!detectorRef.current) {
      detectorRef.current = createFaceDetector();
    }
    detectorRef.current.start();

    const id = setInterval(handleDetection, POLL_INTERVAL_MS);
    return () => {
      clearInterval(id);
      detectorRef.current?.stop();
    };
  }, [active, handleDetection]);

  useEffect(() => () => {
    detectorRef.current?.dispose();
    detectorRef.current = null;
  }, []);

  // ── Trip lifecycle ──────────────────────────────────────────────────────
  useEffect(() => {
    if (active && !tripActive) {
      engineRef.current?.reset();
      startTrip();
    }
  }, [active, tripActive, startTrip]);

  useEffect(() => {
    if (!active || !tripActive) return;
    const id = setInterval(() => incrementTripTime(), 1000);
    return () => clearInterval(id);
  }, [active, tripActive, incrementTripTime]);

  // ── Camera registration ─────────────────────────────────────────────────
  // CameraDetector calls this once it mounts, passing its stable CameraView ref.
  // The MLKitFaceDetector stores the ref and uses it for takePictureAsync().
  const registerCamera = useCallback((ref: React.RefObject<CameraView | null>) => {
    detectorRef.current?.setCameraRef?.(ref);
  }, []);

  return { registerCamera };
}
