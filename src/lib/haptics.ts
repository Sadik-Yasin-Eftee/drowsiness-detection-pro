/**
 * Haptic feedback for drowsiness alerts.
 *
 * Why: in noisy cars or when the user has muted the phone, sound alone won't
 * cut through. Haptics are an essential second channel.
 *
 * Pattern design:
 *   • Level 1 → single soft tap        (Selection)
 *   • Level 2 → medium notification    (Warning)
 *   • Level 3 → strong + repeated tap  (Error → tap → tap)  -- ~600 ms total
 *
 * We don't use repeating timers — Android & iOS handle short patterns well,
 * and a long buzz would be more startling than helpful.
 */

import * as Haptics from 'expo-haptics';

export async function buzzForAlert(level: 1 | 2 | 3) {
  try {
    if (level === 1) {
      await Haptics.selectionAsync();
    } else if (level === 2) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      // two follow-up taps for urgency, lightly spaced
      setTimeout(() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); }, 220);
      setTimeout(() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); }, 440);
    }
  } catch {
    /* haptics unsupported — silently fail */
  }
}
