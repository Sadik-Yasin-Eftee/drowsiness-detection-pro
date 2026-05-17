import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

import { useAppStore } from '@/store/useAppStore';
import { colors, radius } from '@/lib/theme';

const TWO_HOURS_SEC = 2 * 60 * 60;
const SNOOZE_SEC = 30 * 60;

function useBreakReminderVisible() {
  const tripElapsed             = useAppStore((s) => s.tripElapsedSeconds);
  const breakReminderDismissedAt = useAppStore((s) => s.breakReminderDismissedAt);
  const currentAlertLevel       = useAppStore((s) => s.currentAlertLevel);

  if (currentAlertLevel > 0) return false;
  if (tripElapsed < TWO_HOURS_SEC) return false;
  if (breakReminderDismissedAt === null) return true;

  const secondsSinceDismissal = (Date.now() - breakReminderDismissedAt) / 1000;
  return secondsSinceDismissal >= SNOOZE_SEC;
}

/** Companion / Saathi style — warm-background card */
export function BreakReminderCard() {
  const dismiss = useAppStore((s) => s.dismissBreakReminder);
  const visible = useBreakReminderVisible();
  if (!visible) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.cardIcon}>☕</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>বিরতির সময় হয়েছে!</Text>
        <Text style={styles.cardSub}>২ ঘণ্টা হয়ে গেছে। একটু থামুন, বিশ্রাম নিন।</Text>
      </View>
      <Pressable onPress={dismiss} style={styles.cardBtn} hitSlop={8}>
        <Text style={styles.cardBtnText}>ঠিক আছে</Text>
      </Pressable>
    </View>
  );
}

/** Dashboard style — subtle strip between ring and stats */
export function BreakReminderStrip() {
  const dismiss = useAppStore((s) => s.dismissBreakReminder);
  const visible = useBreakReminderVisible();
  if (!visible) return null;

  return (
    <View style={styles.strip}>
      <Text style={styles.stripText}>☕ ২ ঘণ্টা পার হয়েছে — বিরতি নিন</Text>
      <Pressable onPress={dismiss} hitSlop={8}>
        <Text style={styles.stripDismiss}>✕</Text>
      </Pressable>
    </View>
  );
}

/** HUD style — compact single-line banner at bottom */
export function BreakReminderHUD() {
  const dismiss = useAppStore((s) => s.dismissBreakReminder);
  const visible = useBreakReminderVisible();
  if (!visible) return null;

  return (
    <View style={styles.hud}>
      <Text style={styles.hudText}>BREAK RECOMMENDED — 2 h elapsed</Text>
      <Pressable onPress={dismiss} hitSlop={8}>
        <Text style={styles.hudDismiss}>DISMISS</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.warning,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: 320,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  cardIcon: { fontSize: 22 },
  cardTitle: { color: '#1E293B', fontSize: 14, fontWeight: '700' },
  cardSub:   { color: '#64748B', fontSize: 12, marginTop: 2 },
  cardBtn: {
    backgroundColor: colors.warning,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cardBtnText: { color: '#000', fontSize: 12, fontWeight: '700' },

  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  stripText:    { color: colors.warning, fontSize: 13, fontWeight: '600', flex: 1 },
  stripDismiss: { color: colors.warning, fontSize: 14, fontWeight: '700', marginLeft: 8 },

  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderTopWidth: 1,
    borderTopColor: colors.warning,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  hudText:    { color: colors.warning, fontSize: 10, fontWeight: '700', letterSpacing: 0.5, flex: 1 },
  hudDismiss: { color: colors.warning, fontSize: 10, fontWeight: '700' },
});
