/**
 * Haptic feedback for drowsiness alerts.
 *
 * Android: uses the native Vibration API for reliable vibration control.
 *   expo-haptics calls are not guaranteed on all Android OEMs; Vibration is.
 * iOS: uses expo-haptics (Taptic Engine).
 *
 * startHapticLoop(level) — fires a vibration pattern and repeats until
 *   stopHapticLoop() is called.
 *   Level 1 → gentle single pulse every ~3 s
 *   Level 2 → double burst every ~2 s
 *   Level 3 → triple urgent burst every ~1.2 s
 */

import { Platform, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';

let _hapticInterval: ReturnType<typeof setInterval> | null = null;

// ── Patterns for Android Vibration.vibrate(pattern, repeat) ─────────────────
// Pattern: [delay, vib, pause, vib, pause, …]
const ANDROID_PATTERNS: Record<1 | 2 | 3, number[]> = {
  1: [0, 120, 2880],               // 120ms vib, 2.88s quiet → ~3s cycle
  2: [0, 180, 120, 180, 1520],     // double burst, 1.52s quiet → ~2s cycle
  3: [0, 280, 100, 280, 100, 280, 460], // triple burst, 0.46s quiet → ~1.5s cycle
};

// ── iOS single-shot patterns ─────────────────────────────────────────────────
async function _fireIosPattern(level: 1 | 2 | 3): Promise<void> {
  try {
    if (level === 1) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (level === 2) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setTimeout(() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); }, 220);
      setTimeout(() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); }, 440);
    }
  } catch { /* Taptic Engine unavailable */ }
}

const IOS_INTERVAL: Record<1 | 2 | 3, number> = { 1: 3000, 2: 2000, 3: 1200 };

// ── Public API ───────────────────────────────────────────────────────────────

/** Start repeating the haptic pattern for `level` until stopHapticLoop(). */
export function startHapticLoop(level: 1 | 2 | 3): void {
  stopHapticLoop();

  if (Platform.OS === 'android') {
    Vibration.vibrate(ANDROID_PATTERNS[level], true /* repeat */);
  } else {
    void _fireIosPattern(level);
    _hapticInterval = setInterval(() => { void _fireIosPattern(level); }, IOS_INTERVAL[level]);
  }
}

/** Cancel the repeating haptic pattern. */
export function stopHapticLoop(): void {
  if (Platform.OS === 'android') {
    Vibration.cancel();
  }
  if (_hapticInterval !== null) {
    clearInterval(_hapticInterval);
    _hapticInterval = null;
  }
}

/** One-shot haptic (kept for backwards compat). */
export async function buzzForAlert(level: 1 | 2 | 3): Promise<void> {
  if (Platform.OS === 'android') {
    const pattern = ANDROID_PATTERNS[level];
    Vibration.vibrate(pattern);
  } else {
    await _fireIosPattern(level);
  }
}
