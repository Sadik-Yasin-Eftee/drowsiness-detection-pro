/**
 * Theme tokens for DrowsyGuard.
 *
 * These mirror the FE's Tailwind/CSS variable palette so the mobile app feels
 * identical to the Lovable web preview.  We expose two surfaces:
 *
 *   • `dark`  — the default screen palette (bg-bg-dark in the FE)
 *   • `warm`  — the Companion-mode "saathi" palette (bg-bg-warm)
 *
 * Component code reads via `colors.<token>` rather than hard-coding hex.
 */

export const colors = {
  // Dark surface (default app)
  bgDark: '#0F1729',
  card: '#1A2238',
  border: '#2A3550',
  foreground: '#F1F5F9',
  muted: '#64748B',

  // Warm surface (Companion mode)
  bgWarm: '#FFF7ED',
  textDark: '#1E293B',

  // Brand
  primary: '#14B8A6',          // teal-500 — calm, trustworthy
  primaryFg: '#FFFFFF',
  primaryAlpha10: 'rgba(20,184,166,0.10)',
  primaryAlpha20: 'rgba(20,184,166,0.20)',

  // Status
  warning: '#F59E0B',          // amber-500
  danger:  '#EF4444',          // red-500
  coral:   '#FB7185',          // rose-400 — softer than danger

  // Misc
  overlay: 'rgba(15,23,41,0.78)',
} as const;

export const fonts = {
  // Use system fonts — no font loading delay, looks native, supports Bangla
  // out of the box on both iOS (San Francisco) and Android (Roboto / Noto Sans).
  bangla: undefined as string | undefined,
  english: undefined as string | undefined,
  mono: undefined as string | undefined,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
} as const;

export const spacing = (n: number) => n * 4;
