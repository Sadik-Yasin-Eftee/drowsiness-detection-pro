/**
 * useDrowsinessDetection
 * ─────────────────────────────────────────────────────────────────────────────
 * The single hook the Drive screen calls. It:
 *
 *   1. Owns a long-lived DrowsinessEngine instance (re-uses across renders).
 *   2. Pulls a stream of "raw face frames" from the active FaceDetector
 *      (see src/lib/faceDetector.ts) at ~10 FPS.
 *   3. Feeds each frame to the engine, mirrors the engine's tick into the
 *      zustand store, and dispatches sound + haptics on alert events.
 *
 * Why is detection abstracted behind a "FaceDetector" interface?  Because the
 * actual on-device CV pipeline is a moving target in the React Native
 * ecosystem right now (Reanimated 4's `react-native-worklets` and Vision
 * Camera v4's `react-native-worklets-core` currently conflict on Android,
 * and Vision Camera v5 is sponsor-only).  By isolating the detector we can
 * ship a working app today on the SimulatedFaceDetector and swap in a real
 * one (MLKit, on-device TFLite, etc.) the moment that conflict is resolved
 * — without touching the engine, store, or UI.
 *
 * The hook does NOT touch the camera permission — that's handled in the
 * permissions flow before Drive ever mounts.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';

import { useAppStore, type DrowsinessEvent } from '@/store/useAppStore';
import { DrowsinessEngine } from '@/lib/drowsinessEngine';
import { createFaceDetector, type FaceDetector } from '@/lib/faceDetector';
import { alertSounds } from '@/lib/alertSounds';
import { buzzForAlert } from '@/lib/haptics';

const DETECT_INTERVAL_MS = 100; // ~10 FPS — plenty of resolution for PERCLOS.

export function useDrowsinessDetection(active: boolean) {
  const sensitivity = useAppStore((s) => s.sensitivity);
  const perclosThreshold = useAppStore((s) => s.perclosThreshold);
  const soundAlerts = useAppStore((s) => s.soundAlerts);
  const nightQuiet = useAppStore((s) => s.nightQuiet);
  const tripActive = useAppStore((s) => s.tripActive);

  const startTrip = useAppStore((s) => s.startTrip);
  const incrementTripTime = useAppStore((s) => s.incrementTripTime);
  const updateDetection = useAppStore((s) => s.updateDetection);
  const addDrowsinessEvent = useAppStore((s) => s.addDrowsinessEvent);
  const setShowAlert = useAppStore((s) => s.setShowAlert);

  // ── Engine instance — created once, reconfigured on prefs change ──
  const engineRef = useRef<DrowsinessEngine | null>(null);
  if (engineRef.current === null) {
    engineRef.current = new DrowsinessEngine({ sensitivity, perclosThreshold });
  }
  useEffect(() => {
    engineRef.current?.reconfigure({ sensitivity, perclosThreshold });
  }, [sensitivity, perclosThreshold]);

  // ── Detector instance ──
  // createFaceDetector picks the active implementation (simulated by default;
  // see src/lib/faceDetector.ts for the swap-in path).
  const detectorRef = useRef<FaceDetector | null>(null);

  // ── Process one frame from the detector ──────────────────────────
  const handleDetection = useCallback(() => {
    const engine = engineRef.current;
    const detector = detectorRef.current;
    if (!engine || !detector) return;

    const face = detector.read();
    const tick = engine.process(face);

    // Push live numbers into the store (UI re-renders read these)
    updateDetection({
      perclosScore: tick.perclos,
      blinkRate: tick.blinkRate,
      eyeAspectRatio: tick.ear,
      eyeState: tick.eyeState,
      currentAlertLevel: tick.alertLevel,
      headPose: tick.headPose,
      aiConfidence: tick.confidence,
      fatigueScore: tick.fatigueScore,
      faceDetected: tick.faceDetected,
      eyeStateTimeline: [
        ...useAppStore.getState().eyeStateTimeline.slice(-29),
        { timestamp: Date.now(), state: tick.eyeState },
      ],
    });

    // Fire an alert event if the engine says so
    if (engine.shouldFireAlertEvent(tick) && tick.reason_bn && tick.reason_en) {
      const event: DrowsinessEvent = {
        id: `evt-${Date.now()}`,
        timestamp: Date.now(),
        perclosAtTrigger: tick.perclos,
        eyeClosureDuration: tick.closureDurationMs / 1000,
        confidence: tick.confidence,
        alertLevel: tick.alertLevel as 1 | 2 | 3,
        reason_bn: tick.reason_bn,
        reason_en: tick.reason_en,
        dismissed: false,
        flaggedFalseAlarm: false,
      };
      addDrowsinessEvent(event);
      setShowAlert(true, event);

      // Multi-channel feedback
      if (soundAlerts) {
        void alertSounds.play(tick.alertLevel as 1 | 2 | 3, { nightQuiet });
      }
      void buzzForAlert(tick.alertLevel as 1 | 2 | 3);
    }
  }, [updateDetection, addDrowsinessEvent, setShowAlert, soundAlerts, nightQuiet]);

  // ── Detector lifecycle ───────────────────────────────────────────
  // Start/stop the detector with the active flag.  We also restart it on
  // sensitivity / threshold change so the simulated detector can pick up the
  // new "drowsiness pressure" at the next tick boundary.
  useEffect(() => {
    if (!active) return;

    if (!detectorRef.current) {
      detectorRef.current = createFaceDetector();
    }
    detectorRef.current.start();

    const id = setInterval(handleDetection, DETECT_INTERVAL_MS);
    return () => {
      clearInterval(id);
      detectorRef.current?.stop();
    };
  }, [active, handleDetection]);

  // Free the detector on full unmount
  useEffect(() => () => {
    detectorRef.current?.dispose();
    detectorRef.current = null;
  }, []);

  // ── Trip lifecycle ────────────────────────────────────────────────
  useEffect(() => {
    if (active && !tripActive) {
      engineRef.current?.reset();
      startTrip();
    }
  }, [active, tripActive, startTrip]);

  // 1-Hz trip timer
  useEffect(() => {
    if (!active || !tripActive) return;
    const id = setInterval(() => incrementTripTime(), 1000);
    return () => clearInterval(id);
  }, [active, tripActive, incrementTripTime]);

  // We no longer need to expose a frame processor — the detector pulls from
  // the camera (or simulates) on its own. The Drive screen just mounts the
  // CameraDetector preview and trusts this hook to drive the data.
  return {};
}
