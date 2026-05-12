/**
 * Haptic feedback for drowsiness alerts.
 *
 * Uses react-native-haptic-feedback — works on both iOS (Core Haptics /
 * Taptic Engine) and Android (VibrationEffect + HapticFeedback API).
 *
 * startHapticLoop(level) — fires a pattern and repeats until stopHapticLoop().
 *   Level 1 → gentle single pulse every 3 s
 *   Level 2 → double warning burst every 2 s
 *   Level 3 → triple urgent burst every 1.2 s
 */

import RNHapticFeedback from 'react-native-haptic-feedback';

const OPTIONS = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: true,
};

let _loopInterval: ReturnType<typeof setInterval> | null = null;

function _firePulse(level: 1 | 2 | 3): void {
  if (level === 1) {
    RNHapticFeedback.trigger('impactLight', OPTIONS);
  } else if (level === 2) {
    RNHapticFeedback.trigger('notificationWarning', OPTIONS);
    setTimeout(() => RNHapticFeedback.trigger('impactMedium', OPTIONS), 200);
  } else {
    RNHapticFeedback.trigger('notificationError', OPTIONS);
    setTimeout(() => RNHapticFeedback.trigger('impactHeavy', OPTIONS), 220);
    setTimeout(() => RNHapticFeedback.trigger('impactHeavy', OPTIONS), 440);
  }
}

const INTERVAL_MS: Record<1 | 2 | 3, number> = { 1: 3000, 2: 2000, 3: 1200 };

/** Start repeating haptic pattern for `level` until stopHapticLoop(). */
export function startHapticLoop(level: 1 | 2 | 3): void {
  stopHapticLoop();
  _firePulse(level);
  _loopInterval = setInterval(() => _firePulse(level), INTERVAL_MS[level]);
}

/** Cancel the repeating haptic pattern. */
export function stopHapticLoop(): void {
  if (_loopInterval !== null) {
    clearInterval(_loopInterval);
    _loopInterval = null;
  }
}

/** One-shot haptic (kept for backwards compat). */
export function buzzForAlert(level: 1 | 2 | 3): void {
  _firePulse(level);
}
