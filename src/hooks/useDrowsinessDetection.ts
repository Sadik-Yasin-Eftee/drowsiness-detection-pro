/**
 * useDrowsinessDetection
 * ─────────────────────────────────────────────────────────────────────────────
 * Owns the full detection pipeline:
 *
 *   1. Creates a DrowsinessEngine (stays alive for the trip).
 *   2. Exposes `onFaceResult(frame)` — called by CameraDetector from the
 *      react-native-vision-camera frame processor (via runOnJS) on every
 *      camera frame (~30 FPS). The engine processes each frame immediately,
 *      no polling or network round-trip needed.
 *   3. Mirrors each engine tick into the Zustand store.
 *   4. Fires sound + haptics when a drowsiness event is confirmed.
 */

import { useCallback, useEffect, useRef } from 'react';

import { useAppStore, type DrowsinessEvent } from '@/store/useAppStore';
import { DrowsinessEngine, type RawFaceFrame } from '@/lib/drowsinessEngine';
import { DrowsinessPrediction } from '@/lib/drowsinessPrediction';
import { alertSounds } from '@/lib/alertSounds';
import { startHapticLoop } from '@/lib/haptics';

export function useDrowsinessDetection(active: boolean) {
  const sensitivity      = useAppStore((s) => s.sensitivity);
  const perclosThreshold = useAppStore((s) => s.perclosThreshold);
  const soundAlerts      = useAppStore((s) => s.soundAlerts);
  const hapticAlerts     = useAppStore((s) => s.hapticAlerts);
  const nightQuiet       = useAppStore((s) => s.nightQuiet);
  const tripActive       = useAppStore((s) => s.tripActive);

  const startTrip          = useAppStore((s) => s.startTrip);
  const incrementTripTime  = useAppStore((s) => s.incrementTripTime);
  const updateDetection    = useAppStore((s) => s.updateDetection);
  const addDrowsinessEvent = useAppStore((s) => s.addDrowsinessEvent);
  const setShowAlert       = useAppStore((s) => s.setShowAlert);

  // ── Engine — one instance per mount, reconfigured when prefs change ──────
  const engineRef = useRef<DrowsinessEngine | null>(null);
  if (engineRef.current === null) {
    engineRef.current = new DrowsinessEngine({ sensitivity, perclosThreshold });
  }
  useEffect(() => {
    engineRef.current?.reconfigure({ sensitivity, perclosThreshold });
  }, [sensitivity, perclosThreshold]);

  // ── Prediction — one instance per mount, reset with each trip ───────────
  const predictionRef = useRef<DrowsinessPrediction>(new DrowsinessPrediction());

  // ── Refs to latest prefs for the hot-path callback ───────────────────────
  // Using refs avoids stale closures without recreating onFaceResult on every
  // store update (which would cause the frame processor dep to change 30×/s).
  const soundAlertsRef  = useRef(soundAlerts);
  const hapticAlertsRef = useRef(hapticAlerts);
  const nightQuietRef   = useRef(nightQuiet);
  useEffect(() => { soundAlertsRef.current  = soundAlerts;  }, [soundAlerts]);
  useEffect(() => { hapticAlertsRef.current = hapticAlerts; }, [hapticAlerts]);
  useEffect(() => { nightQuietRef.current   = nightQuiet;   }, [nightQuiet]);

  // ── Frame callback — called by CameraDetector via runOnJS @ ~30 FPS ─────
  const onFaceResult = useCallback((frame: RawFaceFrame | null) => {
    const engine = engineRef.current;
    if (!engine) return;

    const tick = engine.process(frame);

    const nextRiskEtaMin = tick.faceDetected && tick.alertLevel === 0
      ? predictionRef.current.update(tick.fatigueScore)
      : null;

    updateDetection({
      nextRiskEtaMin,
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
        id:                  `evt-${Date.now()}`,
        timestamp:           Date.now(),
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

      if (soundAlertsRef.current)  void alertSounds.startLoop(tick.alertLevel as 1 | 2 | 3, { nightQuiet: nightQuietRef.current });
      if (hapticAlertsRef.current) startHapticLoop(tick.alertLevel as 1 | 2 | 3);
    }
  }, [updateDetection, addDrowsinessEvent, setShowAlert]);

  // ── Trip lifecycle ────────────────────────────────────────────────────────
  useEffect(() => {
    if (active && !tripActive) {
      engineRef.current?.reset();
      predictionRef.current.reset();
      startTrip();
    }
  }, [active, tripActive, startTrip]);

  useEffect(() => {
    if (!active || !tripActive) return;
    const id = setInterval(() => incrementTripTime(), 1000);
    return () => clearInterval(id);
  }, [active, tripActive, incrementTripTime]);

  return { onFaceResult };
}
