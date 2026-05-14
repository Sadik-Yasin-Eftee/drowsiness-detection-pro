/**
 * Haptic feedback for drowsiness alerts.
 *
 * react-native-haptic-feedback v3 and @mhpdev/react-native-haptics both
 * use TurboModuleRegistry (New Architecture), which resolves to null when
 * newArchEnabled=false — all calls silently do nothing.
 *
 * We use the APIs that are guaranteed to work with Old Architecture:
 *   Android → React Native's built-in Vibration API (no library, no arch req)
 *   iOS     → expo-haptics (Taptic Engine via UIKit, fully compatible)
 *
 * startHapticLoop(level) — fires a pattern and repeats until stopHapticLoop().
 *   Level 1 → single pulse every 3 s
 *   Level 2 → double burst every 2 s
 *   Level 3 → triple urgent burst every 1.2 s
 */

import { Platform, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';

// Android vibration patterns: [delay, vibrate, pause, vibrate, …] in ms
const ANDROID_PATTERNS: Record<1 | 2 | 3, number[]> = {
  1: [0, 150, 0],                          // single 150 ms pulse
  2: [0, 200, 120, 200, 0],                // double burst
  3: [0, 300, 100, 300, 100, 300, 0],      // triple urgent burst
};

// How long each full pattern cycle takes (ms) — used as the repeat interval
const ANDROID_CYCLE_MS: Record<1 | 2 | 3, number> = {
  1: 3000,
  2: 2000,
  3: 1200,
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

/** Start repeating haptic/vibration pattern for `level` until stopHapticLoop(). */
export function startHapticLoop(level: 1 | 2 | 3): void {
  stopHapticLoop();

  if (Platform.OS === 'android') {
    // Vibration.vibrate with repeat=true loops the pattern automatically
    Vibration.vibrate(ANDROID_PATTERNS[level], /* repeat */ true);
    // Re-issue after each cycle so timing stays accurate across devices
    const cycle = ANDROID_CYCLE_MS[level];
    _iosInterval = setInterval(() => {
      Vibration.cancel();
      Vibration.vibrate(ANDROID_PATTERNS[level], true);
    }, cycle * 4); // re-sync every 4 cycles to prevent drift
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

/** One-shot haptic (kept for backwards compat). */
export function buzzForAlert(level: 1 | 2 | 3): void {
  if (Platform.OS === 'android') {
    Vibration.vibrate(ANDROID_PATTERNS[level]);
  } else {
    void _fireIos(level);
  }
}
