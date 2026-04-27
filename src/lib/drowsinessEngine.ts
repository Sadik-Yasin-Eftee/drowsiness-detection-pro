/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  DrowsyGuard — On-Device Drowsiness Detection Engine                     ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 *
 * This module turns the raw face-detection output from MLKit (eye-open
 * probability, head Euler angles) into the higher-level drowsiness signals
 * the rest of the app consumes:
 *
 *   • EAR-like score        — derived from MLKit's leftEyeOpen / rightEyeOpen
 *                             probabilities (MLKit doesn't return landmarks
 *                             with the lightweight detector profile we use).
 *   • PERCLOS               — the percentage of time eyes were ≥80% closed
 *                             over a rolling N-second window.  This is the
 *                             gold-standard drowsiness metric used in
 *                             automotive research (Wierwille 1994 et al.).
 *   • Blink rate            — blinks per minute over a rolling window.
 *   • Head-droop detection  — sustained pitch beyond a threshold.
 *   • Eye-closure duration  — length of the current closure event.
 *   • Alert level (0-3)     — composite decision based on the above.
 *
 * All computation is local; no frame or face data ever leaves the engine.
 *
 *   0 → safe          (no alert)
 *   1 → cautious      (gentle nudge)
 *   2 → warning       (clear alert)
 *   3 → critical      (urgent — pull over)
 */

export interface RawFaceFrame {
  /** Probability that the LEFT eye is open, 0..1, or null if unknown */
  leftEyeOpenProbability: number | null;
  /** Probability that the RIGHT eye is open, 0..1, or null if unknown */
  rightEyeOpenProbability: number | null;
  /** Euler angle X — head pitch in degrees (+down/-up) */
  pitch: number;
  /** Euler angle Y — head yaw in degrees */
  yaw: number;
  /** Euler angle Z — head roll in degrees */
  roll: number;
  /** Timestamp in ms when this frame was captured */
  timestamp: number;
}

export interface DetectionTick {
  perclos: number;          // 0..100, % of time eyes were closed in window
  blinkRate: number;        // blinks per minute
  ear: number;              // 0..1 — eye-aspect proxy (avg eye-open prob)
  eyeState: 'open' | 'closing' | 'closed';
  alertLevel: 0 | 1 | 2 | 3;
  confidence: number;       // 0..100 — how confident the engine is
  headPose: { pitch: number; yaw: number; roll: number };
  fatigueScore: number;     // 0..100 — composite
  closureDurationMs: number; // length of current closure (0 if eyes open)
  reason_bn: string | null;
  reason_en: string | null;
  faceDetected: boolean;
}

export type Sensitivity = 'conservative' | 'balanced' | 'relaxed';

export interface EngineOptions {
  sensitivity: Sensitivity;
  /** PERCLOS threshold (%) above which a level-2+ alert may fire */
  perclosThreshold: number;
  /** ms — how long the rolling PERCLOS window is (default 60s) */
  perclosWindowMs?: number;
  /** ms — how long the rolling blink-rate window is (default 60s) */
  blinkWindowMs?: number;
  /** Eye-open probability below which we count the eye as "closed" */
  closedThreshold?: number;
  /** Eye-open probability below which we count it as "closing" */
  closingThreshold?: number;
  /** Pitch threshold (deg) for head-droop alert */
  headDroopPitchDeg?: number;
}

const DEFAULTS = {
  perclosWindowMs: 60_000,
  blinkWindowMs: 60_000,
  closedThreshold: 0.30,
  closingThreshold: 0.55,
  headDroopPitchDeg: 18,
  /** Microsleep — eye closure ≥ this is a guaranteed Level-3 alert */
  microsleepMs: 1_500,
  /** Min ms between alert events (debounce) */
  minAlertGapMs: 8_000,
};

/* ────────────────────────────────────────────────────────────────────────── */
/*  Engine                                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

interface ClosedSample {
  t: number;     // timestamp ms
  closed: boolean; // true if both eyes were considered closed
}

interface BlinkSample {
  t: number;
}

export class DrowsinessEngine {
  private opts: Required<EngineOptions>;
  private samples: ClosedSample[] = [];
  private blinks: BlinkSample[] = [];
  private wasClosed = false;
  private closureStartedAt: number | null = null;
  private lastAlertAt = 0;
  private lastFaceSeenAt = 0;

  constructor(options: EngineOptions) {
    this.opts = {
      perclosWindowMs: DEFAULTS.perclosWindowMs,
      blinkWindowMs: DEFAULTS.blinkWindowMs,
      closedThreshold: DEFAULTS.closedThreshold,
      closingThreshold: DEFAULTS.closingThreshold,
      headDroopPitchDeg: DEFAULTS.headDroopPitchDeg,
      ...options,
    };
  }

  /** Update sensitivity / threshold at runtime (e.g. user tweaks slider) */
  reconfigure(patch: Partial<EngineOptions>) {
    this.opts = { ...this.opts, ...patch };
  }

  /** Reset all rolling state — call when a new trip starts */
  reset() {
    this.samples = [];
    this.blinks = [];
    this.wasClosed = false;
    this.closureStartedAt = null;
    this.lastAlertAt = 0;
    this.lastFaceSeenAt = 0;
  }

  /**
   * Feed one raw face frame, get back a DetectionTick.
   * If `face` is null, the camera saw nobody — we still produce a tick
   * but with faceDetected=false so the UI can prompt the driver.
   */
  process(face: RawFaceFrame | null): DetectionTick {
    const now = face?.timestamp ?? Date.now();

    if (face) {
      this.lastFaceSeenAt = now;
    }

    // Compute average eye-open probability (EAR proxy)
    let ear = 1.0;
    let confidence = 0;
    let eyeState: 'open' | 'closing' | 'closed' = 'open';
    let isClosed = false;

    if (
      face &&
      face.leftEyeOpenProbability !== null &&
      face.rightEyeOpenProbability !== null
    ) {
      const left = face.leftEyeOpenProbability;
      const right = face.rightEyeOpenProbability;
      ear = (left + right) / 2;
      // confidence = how far the probability is from the ambiguous middle (0.5)
      confidence = Math.min(100, Math.round(Math.abs(ear - 0.5) * 200 + 50));
      isClosed = ear < this.opts.closedThreshold;
      if (ear < this.opts.closedThreshold) eyeState = 'closed';
      else if (ear < this.opts.closingThreshold) eyeState = 'closing';
      else eyeState = 'open';
    } else if (face) {
      // We see a face but MLKit did not report eye probs — happens at oblique
      // angles. Be conservative and treat as 'unknown' but don't punish.
      confidence = 30;
    }

    // Update rolling closure samples
    this.samples.push({ t: now, closed: isClosed });
    this.samples = this.samples.filter((s) => now - s.t <= this.opts.perclosWindowMs);

    // Detect a blink edge: was-open → now-closed
    if (face) {
      if (isClosed && !this.wasClosed) {
        this.closureStartedAt = now;
      } else if (!isClosed && this.wasClosed) {
        // closure ended → register blink
        this.blinks.push({ t: now });
        this.closureStartedAt = null;
      }
      this.wasClosed = isClosed;
    } else {
      // No face — clear closure tracking so we don't false-trigger when the
      // driver looks away briefly.
      this.wasClosed = false;
      this.closureStartedAt = null;
    }
    this.blinks = this.blinks.filter((b) => now - b.t <= this.opts.blinkWindowMs);

    // PERCLOS = % of samples that are closed in the window
    const perclos = this.samples.length === 0
      ? 0
      : Math.round((this.samples.filter((s) => s.closed).length / this.samples.length) * 100);

    // Blink rate per minute
    const windowSec = Math.max(1, this.opts.blinkWindowMs / 1000);
    const blinkRate = Math.round((this.blinks.length / windowSec) * 60);

    // Current closure duration
    const closureDurationMs = this.closureStartedAt ? now - this.closureStartedAt : 0;

    const headPose = face
      ? { pitch: face.pitch, yaw: face.yaw, roll: face.roll }
      : { pitch: 0, yaw: 0, roll: 0 };

    // ── Decision logic ────────────────────────────────────────────────────
    // Level 3 (critical) wins immediately:
    //   • Microsleep — eye closure ≥ 1.5s
    //   • Sustained head-droop with high PERCLOS
    // Level 2 (warning):
    //   • PERCLOS above user threshold for the rolling window
    //   • Blink rate abnormally low (<6/min) AND elevated PERCLOS
    // Level 1 (cautious):
    //   • PERCLOS approaching threshold (within 70%)
    //   • Mild head-droop on its own
    // Otherwise → 0.

    const droop = Math.abs(headPose.pitch) > this.opts.headDroopPitchDeg;
    let alertLevel: 0 | 1 | 2 | 3 = 0;
    let reason_bn: string | null = null;
    let reason_en: string | null = null;

    if (closureDurationMs >= DEFAULTS.microsleepMs) {
      alertLevel = 3;
      reason_bn = 'মাইক্রোস্লিপ! চোখ অনেকক্ষণ বন্ধ ছিল।';
      reason_en = 'Microsleep — eyes closed too long!';
    } else if (droop && perclos > this.opts.perclosThreshold * 0.6) {
      alertLevel = 3;
      reason_bn = 'মাথা ঝুঁকে পড়ছে — এখনই থামুন!';
      reason_en = 'Head dropping — pull over now!';
    } else if (perclos >= this.opts.perclosThreshold) {
      alertLevel = 2;
      reason_bn = 'আপনার চোখ বেশি বন্ধ থাকছে।';
      reason_en = 'Eyes closing too often.';
    } else if (blinkRate > 0 && blinkRate < 6 && perclos > this.opts.perclosThreshold * 0.5) {
      alertLevel = 2;
      reason_bn = 'ব্লিংক রেট কমে গেছে — আপনি ক্লান্ত।';
      reason_en = 'Blink rate dropped — you may be tired.';
    } else if (droop) {
      alertLevel = 1;
      reason_bn = 'মাথা একটু ঝুঁকছে — সতর্ক হোন।';
      reason_en = 'Head tilting — stay alert.';
    } else if (perclos >= this.opts.perclosThreshold * 0.7) {
      alertLevel = 1;
      reason_bn = 'আপনার চোখ ভারী হচ্ছে।';
      reason_en = 'Eyes getting heavy.';
    }

    // Debounce alerts: clear reason if we've fired recently
    const allowEvent = now - this.lastAlertAt > DEFAULTS.minAlertGapMs;
    if (alertLevel >= 2 && allowEvent) {
      this.lastAlertAt = now;
    } else if (alertLevel >= 2 && !allowEvent) {
      // Keep alertLevel for the UI ring colour, but suppress the event reason
      reason_bn = null;
      reason_en = null;
    }

    // Composite fatigue score (0..100) — visual indicator only, does not gate alerts
    const blinkDeviation = Math.abs(blinkRate - 17) / 17; // 17 ≈ healthy baseline
    const headInstability =
      (Math.abs(headPose.pitch) + Math.abs(headPose.yaw) + Math.abs(headPose.roll)) / 90;
    const fatigueScore = Math.min(
      100,
      Math.max(0, Math.round((perclos / 100) * 50 + blinkDeviation * 25 + headInstability * 25)),
    );

    return {
      perclos,
      blinkRate,
      ear: Number(ear.toFixed(2)),
      eyeState,
      alertLevel,
      confidence,
      headPose,
      fatigueScore,
      closureDurationMs,
      reason_bn,
      reason_en,
      faceDetected: face !== null,
    };
  }

  /** True if the event from the latest tick should fire an alert overlay */
  shouldFireAlertEvent(tick: DetectionTick): boolean {
    return (tick.alertLevel >= 2 && !!tick.reason_bn);
  }
}
