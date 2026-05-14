/**
 * Haptic feedback for drowsiness alerts.
 *
 * Android → React Native's built-in Vibration API (old-arch compatible,
 *           no TurboModule dependency, calls os.Vibrator directly).
 * iOS     → expo-haptics (UIKit Taptic Engine, old-arch compatible).
 *
 * startHapticLoop(level) — fires a pattern and repeats until stopHapticLoop().
 *   Level 1 → single 150 ms pulse, 3 s cycle
 *   Level 2 → double burst, 2 s cycle
 *   Level 3 → triple urgent burst, 1.2 s cycle
 */

import { Platform, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';

// Pattern: [delayMs, vibrateMs, pauseMs, vibrateMs, pauseMs, …]
// Total of each row must equal the desired cycle length so repeat loops cleanly.
const ANDROID_PATTERNS: Record<1 | 2 | 3, number[]> = {
  1: [0, 150, 2850],                       // 150 ms vib + 2850 ms rest  = 3 000 ms
  2: [0, 200, 120, 200, 1480],             // double burst               = 2 000 ms
  3: [0, 300, 100, 300, 100, 300, 100],    // triple burst               = 1 200 ms
};

let _iosInterval: ReturnType<typeof setInterval> | null = null;

// ── iOS ──────────────────────────────────────────────────────────────────────

async function _fireIos(level: 1 | 2 | 3): Promise<void> {
  try {
    if (level === 1) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (level === 2) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 200);
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 220);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 440);
    }
  } catch { /* Taptic Engine unavailable */ }
}

const IOS_INTERVAL_MS: Record<1 | 2 | 3, number> = { 1: 3000, 2: 2000, 3: 1200 };

// ── Public API ───────────────────────────────────────────────────────────────

/** Start repeating haptic/vibration for `level` until stopHapticLoop(). */
export function startHapticLoop(level: 1 | 2 | 3): void {
  stopHapticLoop();

  if (Platform.OS === 'android') {
    // repeat=true → Android loops the pattern from index 0 automatically
    Vibration.vibrate(ANDROID_PATTERNS[level], true);
  } else {
    void _fireIos(level);
    _iosInterval = setInterval(() => { void _fireIos(level); }, IOS_INTERVAL_MS[level]);
  }
}

/** Cancel the repeating pattern. */
export function stopHapticLoop(): void {
  if (Platform.OS === 'android') {
    Vibration.cancel();
  }
  if (_iosInterval !== null) {
    clearInterval(_iosInterval);
    _iosInterval = null;
  }
}

/** One-shot haptic. */
export function buzzForAlert(level: 1 | 2 | 3): void {
  if (Platform.OS === 'android') {
    Vibration.vibrate(ANDROID_PATTERNS[level]);
  } else {
    void _fireIos(level);
  }
}
