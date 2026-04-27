/**
 * Tiny i18n helpers — keep things simple and copy-paste-friendly.
 *
 * The app is bilingual (Bangla primary, English secondary) and most labels
 * are inline in components. The two helpers we share project-wide:
 */

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

/** Convert ASCII digits in a string to Bangla digits (০১২৩…) */
export function toBn(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => BN_DIGITS[parseInt(d, 10)]);
}

/** Format seconds → "H:MM:SS" (use toBn to localise) */
export function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}
