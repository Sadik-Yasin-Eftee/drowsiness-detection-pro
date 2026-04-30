/**
 * Haptic feedback for drowsiness alerts.
 *
 * startHapticLoop(level) — fires a vibration pattern and repeats on an
 *   interval until stopHapticLoop() is called.
 * stopHapticLoop()       — cancels the repeating pattern immediately.
 *
 * Repeat intervals by level:
 *   Level 1 → gentle pulse every 3 s  (early reminder)
 *   Level 2 → warning burst every 2 s (needs attention)
 *   Level 3 → urgent burst every 1.2 s (critical — microsleep)
 */

import * as Haptics from 'expo-haptics';

let _hapticInterval: ReturnType<typeof setInterval> | null = null;

// ── Single-shot patterns ──────────────────────────────────────────────────────

async function _firePattern(level: 1 | 2 | 3): Promise<void> {
  try {
    if (level === 1) {
      await Haptics.selectionAsync();
    } else if (level === 2) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      // Level 3: strong triple burst
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setTimeout(() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); }, 200);
      setTimeout(() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); }, 400);
    }
  } catch { /* haptics unsupported */ }
}

// ── Looping API ───────────────────────────────────────────────────────────────

const HAPTIC_INTERVAL: Record<1 | 2 | 3, number> = {
  1: 3000,
  2: 2000,
  3: 1200,
};

/** Start repeating the haptic pattern for `level` until stopHapticLoop(). */
export function startHapticLoop(level: 1 | 2 | 3): void {
  stopHapticLoop();
  void _firePattern(level);   // fire immediately
  _hapticInterval = setInterval(() => { void _firePattern(level); }, HAPTIC_INTERVAL[level]);
}

/** Cancel the repeating haptic pattern. */
export function stopHapticLoop(): void {
  if (_hapticInterval !== null) {
    clearInterval(_hapticInterval);
    _hapticInterval = null;
  }
}

// ── One-shot (kept for backwards compat) ─────────────────────────────────────

export async function buzzForAlert(level: 1 | 2 | 3): Promise<void> {
  await _firePattern(level);
}
