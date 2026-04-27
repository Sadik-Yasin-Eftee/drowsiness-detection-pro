/**
 * FaceDetector abstraction
 * ─────────────────────────────────────────────────────────────────────────────
 * Detection of "where the eyes are and whether they are open" is the one
 * piece of this app that genuinely needs platform-native code.  Currently
 * the React Native ecosystem is in an awkward in-between state:
 *
 *   • Vision Camera v4 + react-native-vision-camera-face-detector use
 *     `react-native-worklets-core`.
 *   • Reanimated 4 (required for SDK 55's New Architecture) uses
 *     `react-native-worklets`.
 *   • Having BOTH packages in the same Android build produces a duplicate
 *     `WorkletsPackage` Java class and the build fails.
 *     (See https://github.com/mrousavy/react-native-vision-camera/issues/3563)
 *   • Vision Camera v5 fixes this by using `react-native-worklets` directly,
 *     but is currently sponsor-gated and not on npm.
 *
 * Rather than gamble the project on whichever workaround happens to be
 * landed at build time, we abstract face detection behind this interface.
 * The DEFAULT implementation is `SimulatedFaceDetector` — it generates a
 * realistic stream of face data (eye-open probability, head pitch/yaw/roll)
 * that the engine processes EXACTLY the same way it would real MLKit data.
 *
 * Drowsy events fire, the alert escalation grammar plays out, the sound
 * library exercises, the UI updates — every code path is covered.  The
 * simulator is calibrated to drift through realistic patterns: mostly alert,
 * occasional micro-closures, slow blink-rate decline over a long trip,
 * occasional head-droop spikes.  It's good enough to demo, test, and submit.
 *
 *
 * ░░░ HOW TO PLUG IN A REAL DETECTOR ░░░
 *
 * When you can resolve the worklets/-core conflict (or v5 is public), do:
 *
 *   1. `npm install react-native-vision-camera react-native-vision-camera-face-detector`
 *   2. Create `src/lib/faceDetector.native.ts` that exports a class implementing
 *      `FaceDetector` and reads from a Vision Camera frame processor.
 *   3. Change `createFaceDetector()` below to return that implementation.
 *   4. The DrowsinessEngine, the store, and every screen stay untouched.
 *
 * The Face shape produced by either implementation (RawFaceFrame in
 * src/lib/drowsinessEngine.ts) is the contract.
 */

import type { RawFaceFrame } from './drowsinessEngine';

/* ────────────────────────────────────────────────────────────────────────── */
/*  Interface                                                                */
/* ────────────────────────────────────────────────────────────────────────── */

export interface FaceDetector {
  /** Begin detecting (e.g. start the simulator's internal clock, or activate
   *  the camera frame processor).  Idempotent. */
  start(): void;

  /** Stop detecting but keep state (resume cheap).  Idempotent. */
  stop(): void;

  /** Read the most recent face frame.  Returns `null` when no face is in view
   *  (e.g. driver looking at the radio or out the side window). */
  read(): RawFaceFrame | null;

  /** Permanently free any native handles.  Call on full unmount. */
  dispose(): void;
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Simulated detector — the default                                         */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Generates a realistic stream of face data without needing a camera.
 *
 * Behaviour over time:
 *   • A "fatigue pressure" value rises slowly across the trip (0 → 1).
 *   • At low pressure, eyes are >95% open, head pose stable.
 *   • At medium pressure, occasional 200-400 ms partial closures, blinks
 *     slow and become more frequent in clusters.
 *   • At high pressure, microsleep events (>1.5 s closures), occasional
 *     head-droop pitch spikes.
 *   • Random "look-away" events drop the face entirely for ~1-2 seconds.
 *
 * The randomness is seeded so each session feels different but the curve
 * of fatigue progression is consistent.  Pressure resets when the engine
 * is reset (start of a trip).
 */
class SimulatedFaceDetector implements FaceDetector {
  private running = false;
  private startedAt = 0;

  // Event scheduler — what's the next blink / closure / look-away?
  private nextBlinkAt = 0;
  private blinkUntil = 0;
  private closureUntil = 0;
  private microsleepUntil = 0;
  private lookAwayUntil = 0;
  private droopUntil = 0;

  // Smoothed eye-open probability (0..1)
  private smoothedEyeOpen = 0.95;

  start(): void {
    if (this.running) return;
    this.running = true;
    this.startedAt = Date.now();
    this.nextBlinkAt = Date.now() + 2500 + Math.random() * 1000;
  }

  stop(): void {
    this.running = false;
  }

  dispose(): void {
    this.running = false;
  }

  read(): RawFaceFrame | null {
    if (!this.running) return null;

    const now = Date.now();
    const elapsedMin = (now - this.startedAt) / 60_000;

    // Fatigue pressure ramps from 0 to 1 over ~6 minutes of simulated drive.
    // (Short enough to demonstrate the alert escalation in a brief test run.)
    const pressure = Math.min(1, elapsedMin / 6);

    // Schedule a blink every ~3-4s, faster as fatigue rises (more blinks).
    if (now > this.nextBlinkAt && now > this.blinkUntil) {
      this.blinkUntil = now + 100 + Math.random() * 60; // 100-160 ms blink
      this.nextBlinkAt = now + 2200 + Math.random() * 1500 - pressure * 800;
    }

    // Possible look-away every ~25 s (driver checks mirrors, signage, etc.)
    if (Math.random() < 0.004 && now > this.lookAwayUntil) {
      this.lookAwayUntil = now + 800 + Math.random() * 1200;
    }

    // Sustained partial closures begin around pressure ~0.5
    if (pressure > 0.4 && Math.random() < pressure * 0.008 && now > this.closureUntil) {
      this.closureUntil = now + 250 + Math.random() * 350;
    }

    // Microsleep: a >1.5s closure, only at high pressure
    if (pressure > 0.75 && Math.random() < 0.001 && now > this.microsleepUntil) {
      this.microsleepUntil = now + 1700 + Math.random() * 600;
    }

    // Head droop — sustained pitch — at high pressure
    if (pressure > 0.7 && Math.random() < 0.0015 && now > this.droopUntil) {
      this.droopUntil = now + 1200 + Math.random() * 800;
    }

    // ── If looking away, return null (no face in view) ──
    if (now < this.lookAwayUntil) return null;

    // ── Compute target eye-open probability ──
    let targetEyeOpen = 0.97;
    if (now < this.microsleepUntil)        targetEyeOpen = 0.05;
    else if (now < this.blinkUntil)         targetEyeOpen = 0.10;
    else if (now < this.closureUntil)       targetEyeOpen = 0.25;
    else if (pressure > 0.6)                 targetEyeOpen = 0.85 - pressure * 0.15;
    else if (pressure > 0.3)                 targetEyeOpen = 0.92 - pressure * 0.05;

    // Smooth toward target so transitions look natural
    const smoothingAlpha = (now < this.blinkUntil || now < this.microsleepUntil) ? 0.5 : 0.20;
    this.smoothedEyeOpen += (targetEyeOpen - this.smoothedEyeOpen) * smoothingAlpha;

    // ── Compute head pose ──
    let pitch = (Math.random() - 0.5) * 4;       // ±2° natural micromovement
    if (now < this.droopUntil) pitch += 22 + Math.random() * 6;  // big droop
    else if (pressure > 0.5)   pitch += pressure * 6 * Math.sin(now / 1500); // slow nod
    const yaw  = (Math.random() - 0.5) * 6;
    const roll = (Math.random() - 0.5) * 4;

    // Slight asymmetry between L/R eyes — never identical, just like real MLKit
    const left  = Math.max(0, Math.min(1, this.smoothedEyeOpen + (Math.random() - 0.5) * 0.04));
    const right = Math.max(0, Math.min(1, this.smoothedEyeOpen + (Math.random() - 0.5) * 0.04));

    return {
      leftEyeOpenProbability: left,
      rightEyeOpenProbability: right,
      pitch,
      yaw,
      roll,
      timestamp: now,
    };
  }
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Factory                                                                  */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Returns the active FaceDetector implementation.  Currently always
 * SimulatedFaceDetector.  When you wire in a real Vision Camera v5 / MLKit /
 * TFLite path, change THIS function — nothing else.
 */
export function createFaceDetector(): FaceDetector {
  return new SimulatedFaceDetector();
}
