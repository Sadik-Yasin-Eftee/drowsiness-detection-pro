/**
 * Haptic feedback for drowsiness alerts.
 *
 * Uses @mhpdev/react-native-haptics — a Turbo Module that runs on the UI thread
 * for instant feedback on both iOS (Taptic Engine) and Android.
 *
 * startHapticLoop(level) — fires a pattern and repeats until stopHapticLoop().
 *   Level 1 → gentle single pulse every 3 s
 *   Level 2 → double warning burst every 2 s
 *   Level 3 → triple error burst every 1.2 s
 */

import { Platform } from 'react-native';
import Haptics from '@mhpdev/react-native-haptics';

let _loopInterval: ReturnType<typeof setInterval> | null = null;

async function _firePulse(level: 1 | 2 | 3): Promise<void> {
  try {
    if (level === 1) {
      await Haptics.impact('light');
    } else if (level === 2) {
      await Haptics.notification('warning');
      setTimeout(() => { void Haptics.impact('medium'); }, 180);
    } else {
      await Haptics.notification('error');
      setTimeout(() => { void Haptics.impact('heavy'); }, 200);
      setTimeout(() => { void Haptics.impact('heavy'); }, 420);
    }
  } catch { /* Taptic Engine / vibrator unavailable */ }
}

async function _fireAndroidPulse(level: 1 | 2 | 3): Promise<void> {
  try {
    if (level === 1) {
      await Haptics.androidHaptics('virtual-key');
    } else if (level === 2) {
      await Haptics.androidHaptics('confirm');
      setTimeout(() => { void Haptics.androidHaptics('confirm'); }, 200);
    } else {
      await Haptics.androidHaptics('reject');
      setTimeout(() => { void Haptics.androidHaptics('reject'); }, 220);
      setTimeout(() => { void Haptics.androidHaptics('reject'); }, 440);
    }
  } catch { /* vibrator unavailable */ }
}

const INTERVAL_MS: Record<1 | 2 | 3, number> = { 1: 3000, 2: 2000, 3: 1200 };

/** Start repeating haptic pattern for `level` until stopHapticLoop(). */
export function startHapticLoop(level: 1 | 2 | 3): void {
  stopHapticLoop();
  const fire = Platform.OS === 'android' ? _fireAndroidPulse : _firePulse;
  void fire(level);
  _loopInterval = setInterval(() => { void fire(level); }, INTERVAL_MS[level]);
}

/** Cancel the repeating haptic pattern. */
export function stopHapticLoop(): void {
  if (_loopInterval !== null) {
    clearInterval(_loopInterval);
    _loopInterval = null;
  }
}

/** One-shot haptic (kept for backwards compat). */
export async function buzzForAlert(level: 1 | 2 | 3): Promise<void> {
  const fire = Platform.OS === 'android' ? _fireAndroidPulse : _firePulse;
  await fire(level);
}
