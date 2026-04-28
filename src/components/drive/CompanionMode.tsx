import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { useAppStore } from '@/store/useAppStore';
import { SaathiCharacter } from '@/components/SaathiCharacter';
import { LockIcon, ZapIcon, MapPinIcon, InfoIcon } from '@/components/Icons';
import { colors, radius } from '@/lib/theme';
import { toBn, formatTime } from '@/lib/i18n';

export function CompanionMode() {
  const perclos = useAppStore((s) => s.perclosScore);
  const tripElapsed = useAppStore((s) => s.tripElapsedSeconds);
  const faceDetected = useAppStore((s) => s.faceDetected);
  const router = useRouter();

  const statusText =
    !faceDetected ? '👀 আপনার মুখ দেখছি না'
    : perclos > 40 ? '🛑 বিশ্রাম নিন'
    : perclos > 20 ? '⚠️ সতর্ক থাকুন'
    : '✅ নিরাপদ';

  const statusColor =
    !faceDetected ? colors.muted
    : perclos > 40 ? colors.coral
    : perclos > 20 ? colors.warning
    : colors.primary;

  return (
    <View style={[styles.root, { backgroundColor: colors.bgWarm }]}>
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <LockIcon size={14} color={colors.primary} />
          <Text style={styles.onDevice}>On-device</Text>
        </View>
        <Text style={styles.timer}>{toBn(formatTime(tripElapsed))}</Text>
      </View>

      <View style={styles.centre}>
        <SaathiCharacter size={170} />
        <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
      </View>

      <View style={styles.actions}>
        <ActionBtn label="ভুল সতর্কতা" Icon={ZapIcon} onPress={() => {}} />
        <ActionBtn label="বিশ্রামের জায়গা" Icon={MapPinIcon} onPress={() => router.push('/rest-stops')} />
        <ActionBtn label="কেন সতর্ক?" Icon={InfoIcon} onPress={() => router.push('/analytics')} />
      </View>
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
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  onDevice:  { color: colors.primary, fontSize: 12, fontWeight: '600' },
  timer:     { color: colors.textDark, fontSize: 14, fontVariant: ['tabular-nums'], fontWeight: '600' },

  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24, paddingHorizontal: 16 },
  statusText: { fontSize: 22, fontWeight: '800', textAlign: 'center' },

  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 24, paddingBottom: 16, paddingTop: 8,
  },
  actionBtn: {
    minWidth: 56, minHeight: 48,
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  actionLabel: { color: colors.muted, fontSize: 11 },
});
