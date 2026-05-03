/**
 * DrowsinessPrediction
 * ─────────────────────────────────────────────────────────────────────────────
 * Maintains a rolling buffer of fatigueScore samples and uses linear regression
 * to project when the driver's fatigue will cross a risk threshold.
 *
 * Returns an ETA in minutes, or null when:
 *   • Not enough data yet (< MIN_SAMPLES)
 *   • Fatigue is flat or declining
 *   • Fatigue is already at/above the risk threshold
 *   • Projected ETA is unreasonably far out (> MAX_ETA_MIN)
 *   • No face has been detected recently (unreliable baseline)
 *
 * fatigueScore range: 0–100 (composite of PERCLOS, blink-rate, head instability)
 * RISK_THRESHOLD = 65 — empirically the point at which Level-2 alerts follow
 * within ~2 minutes on a genuinely drowsy driver.
 */

const SAMPLE_WINDOW_MS      = 4 * 60_000; // keep last 4 min of samples
const MIN_SAMPLES           = 20;          // ~30–40 s of data at 3 FPS backend
const RISK_THRESHOLD        = 65;          // fatigueScore → "risk incoming"
const MAX_ETA_MIN           = 45;          // cap: beyond this, trend is too uncertain
const MIN_SLOPE_PER_MIN     = 0.4;         // ignore flat/near-flat trends

interface Sample {
  t: number; // ms
  v: number; // fatigueScore
}

export class DrowsinessPrediction {
  private samples: Sample[] = [];

  /** Clear all history — call when a new trip starts. */
  reset(): void {
    this.samples = [];
  }

  /**
   * Feed the latest fatigueScore (from DetectionTick).
   * Only call when faceDetected === true so stale-face gaps don't corrupt slope.
   * Returns ETA in whole minutes, or null.
   */
  update(fatigueScore: number): number | null {
    const now = Date.now();
    this.samples.push({ t: now, v: fatigueScore });

    // Prune to rolling window
    this.samples = this.samples.filter((s) => now - s.t <= SAMPLE_WINDOW_MS);

    // Already in the danger zone — no prediction needed
    if (fatigueScore >= RISK_THRESHOLD) return null;

    // Need enough history for a reliable slope
    if (this.samples.length < MIN_SAMPLES) return null;

    // Linear regression: t (independent) → fatigueScore (dependent)
    const n     = this.samples.length;
    const tMean = this.samples.reduce((s, p) => s + p.t, 0) / n;
    const vMean = this.samples.reduce((s, p) => s + p.v, 0) / n;

    let num = 0;
    let den = 0;
    for (const p of this.samples) {
      const dt = p.t - tMean;
      num += dt * (p.v - vMean);
      den += dt * dt;
    }

    if (den < 1e-6) return null;

    const slopePerMs  = num / den;
    const slopePerMin = slopePerMs * 60_000;

    // Flat or declining — no risk on the horizon
    if (slopePerMin < MIN_SLOPE_PER_MIN) return null;

    const etaMin = (RISK_THRESHOLD - fatigueScore) / slopePerMin;

    if (etaMin <= 0 || etaMin > MAX_ETA_MIN) return null;

    return Math.round(etaMin);
  }
}
