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

/**
 * Vibration patterns: [delayMs, onMs, offMs, onMs, offMs, …]
 * Each row's sum equals the cycle length so repeat loops cleanly.
 *
 * L1  — single soft pulse       (3 000 ms cycle) — gentle heads-up
 * L2  — two firm taps           (2 000 ms cycle) — clear warning
 * L3  — five rapid buzz pulses  (1 200 ms cycle) — urgent alarm feel
 *
 * The escalation is felt in three ways simultaneously:
 *   • duration of each on-burst grows  (150 → 300 → 100×5)
 *   • number of pulses grows           (1 → 2 → 5)
 *   • cycle repeats faster             (3 s → 2 s → 1.2 s)
 */
const ANDROID_PATTERNS: Record<1 | 2 | 3, number[]> = {
  1: [0, 150, 2850],                                    // 3 000 ms
  2: [0, 300, 150, 300, 1250],                          // 2 000 ms
  3: [0, 100, 60, 100, 60, 100, 60, 100, 60, 100, 460], // 1 200 ms
};

let _iosInterval: ReturnType<typeof setInterval> | null = null;

// ── iOS ──────────────────────────────────────────────────────────────────────

async function _fireIos(level: 1 | 2 | 3): Promise<void> {
  try {
    if (level === 1) {
      // Single light tap — gentle nudge
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (level === 2) {
      // Two firm taps — clear warning
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 200);
    } else {
      // Five rapid buzzes — urgent alarm
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 160);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 320);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 480);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 640);
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
