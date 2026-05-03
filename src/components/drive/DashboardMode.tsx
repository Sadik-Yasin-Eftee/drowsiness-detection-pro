import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';

import { useAppStore } from '@/store/useAppStore';
import { LockIcon, ZapIcon, MapPinIcon, InfoIcon } from '@/components/Icons';
import { colors, radius } from '@/lib/theme';
import { toBn, formatTime } from '@/lib/i18n';

export function DashboardMode() {
  const perclosScore       = useAppStore((s) => s.perclosScore);
  const blinkRate          = useAppStore((s) => s.blinkRate);
  const eyeState           = useAppStore((s) => s.eyeState);
  const currentAlertLevel  = useAppStore((s) => s.currentAlertLevel);
  const aiConfidence       = useAppStore((s) => s.aiConfidence);
  const tripElapsedSeconds = useAppStore((s) => s.tripElapsedSeconds);
  const drowsinessEvents   = useAppStore((s) => s.drowsinessEvents);
  const nextRiskEtaMin     = useAppStore((s) => s.nextRiskEtaMin);
  const router = useRouter();

  const ringColor =
    currentAlertLevel >= 3 ? colors.danger :
    currentAlertLevel >= 2 ? colors.warning :
    colors.primary;

  const statusText =
    currentAlertLevel >= 3 ? 'বিপদ!' :
    currentAlertLevel >= 2 ? 'সতর্কতা!' :
    'পর্যবেক্ষণ করছি';

  const pulse = useSharedValue(1);
  useEffect(() => {
    cancelAnimation(pulse);
    if (currentAlertLevel >= 3) {
      pulse.value = withRepeat(withSequence(
        withTiming(1.06, { duration: 220 }),
        withTiming(0.97, { duration: 220 }),
      ), -1);
    } else if (currentAlertLevel >= 2) {
      pulse.value = withRepeat(withSequence(
        withTiming(1.04, { duration: 480 }),
        withTiming(0.98, { duration: 480 }),
      ), -1);
    } else {
      pulse.value = withRepeat(withSequence(
        withTiming(1.02, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
        withTiming(1.00, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
      ), -1);
    }
  }, [currentAlertLevel, pulse]);

  const ringStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <View style={styles.lockBadge}>
          <LockIcon size={12} color={colors.primary} />
          <Text style={styles.lockText}>সব তথ্য আপনার ডিভাইসে</Text>
        </View>
        <Text style={styles.timer}>{toBn(formatTime(tripElapsedSeconds))}</Text>
      </View>

      <View style={styles.centreContent}>
        <View style={styles.ringWrap}>
          <Animated.View
            style={[
              styles.ring,
              { borderColor: ringColor, shadowColor: ringColor },
              ringStyle,
            ]}
          >
            <Text style={styles.ringPercent}>{toBn(String(perclosScore))}%</Text>
            <Text style={[styles.ringStatus, { color: ringColor }]}>{statusText}</Text>
            <Text style={styles.ringConfidence}>AI: {toBn(`${Math.round(aiConfidence)}%`)}</Text>
          </Animated.View>
        </View>

        <View style={styles.statsGrid}>
          <Stat label="ব্লিংক রেট" value={`${toBn(String(Math.round(blinkRate)))}/মিনিট`} />
          <Stat label="চোখ" value={
            eyeState === 'open' ? 'খোলা ✓' : eyeState === 'closing' ? 'বন্ধ হচ্ছে ⚠' : 'বন্ধ ✗'
          } />
          <Stat label="PERCLOS" value={`${toBn(String(perclosScore))}%`} />
          <Stat label="সতর্কতা" value={toBn(String(drowsinessEvents.length))} />
          {currentAlertLevel === 0 && (
            <Stat
              label="পরের ঝুঁকি"
              value={
                nextRiskEtaMin === null ? '—'
                : nextRiskEtaMin <= 2   ? '⚠️ আসছে!'
                : `~${toBn(String(nextRiskEtaMin))} মিনিট`
              }
              highlight={nextRiskEtaMin !== null && nextRiskEtaMin <= 5}
            />
          )}
        </View>
      </View>

      <View style={styles.actions}>
        <ActionBtn label="ভুল সতর্কতা" Icon={ZapIcon} onPress={() => {}} />
        <ActionBtn label="বিশ্রাম" Icon={MapPinIcon} onPress={() => router.push('/rest-stops')} />
        <ActionBtn label="কেন সতর্ক?" Icon={InfoIcon} onPress={() => router.push('/analytics')} />
      </View>
    </View>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={[styles.stat, highlight && styles.statHighlight]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, highlight && styles.statValueHighlight]}>{value}</Text>
    </View>
  );
}

function ActionBtn({
  label, Icon, onPress,
}: { label: string; Icon: React.ComponentType<{ size?: number; color?: string }>; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.actionBtn}>
      <Icon size={22} color={colors.muted} />
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgDark, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  lockBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primaryAlpha20, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  lockText: { color: colors.primary, fontSize: 12 },
  timer: { color: colors.muted, fontSize: 14, fontVariant: ['tabular-nums'] },

  centreContent: { flex: 1, justifyContent: 'center', gap: 24 },
  ringWrap: { alignItems: 'center' },
  ring: {
    width: 192, height: 192, borderRadius: 96,
    borderWidth: 3,
    alignItems: 'center', justifyContent: 'center',
    shadowOpacity: 0.4, shadowRadius: 20,
    backgroundColor: 'rgba(20,184,166,0.05)',
  },
  ringPercent:    { fontSize: 40, fontWeight: '800', color: colors.foreground, fontVariant: ['tabular-nums'] },
  ringStatus:     { fontSize: 16, fontWeight: '700', marginTop: 4 },
  ringConfidence: { fontSize: 12, color: colors.muted, marginTop: 4 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  stat: { flexBasis: '48%', backgroundColor: colors.card, borderRadius: radius.lg, padding: 12 },
  statHighlight: { backgroundColor: 'rgba(239,68,68,0.10)', borderWidth: 1, borderColor: colors.danger },
  statLabel: { color: colors.muted, fontSize: 12 },
  statValue: { color: colors.foreground, fontSize: 16, fontWeight: '700', marginTop: 2 },
  statValueHighlight: { color: colors.danger },

  actions: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 8 },
  actionBtn: { alignItems: 'center', minHeight: 48, gap: 4 },
  actionLabel: { color: colors.muted, fontSize: 11 },
});
