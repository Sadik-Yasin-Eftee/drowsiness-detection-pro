import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useAppStore } from '@/store/useAppStore';
import { SaathiCharacter } from '@/components/SaathiCharacter';
import { LockIcon } from '@/components/Icons';
import { BreakReminderCard } from '@/components/drive/BreakReminderBanner';
import { colors, radius } from '@/lib/theme';
import { toBn, formatTime } from '@/lib/i18n';

const MESSAGES = {
  safe: [
    'আপনি ভালো করছেন! নিরাপদে চলুন।',
    'সব ঠিক আছে। আমি পাশে আছি।',
    'আপনার চোখ খোলা। মনোযোগ ঠিক আছে।',
    'দারুণ! নিরাপদ গাড়ি চালাচ্ছেন।',
    'চলুন সতর্কে থাকি। আপনি ভালো আছেন।',
  ],
  watch: [
    'সামান্য ক্লান্তির লক্ষণ দেখছি।',
    'একটু সতর্ক থাকুন। পানি পান করুন।',
    'চোখ ভারী হচ্ছে? একটু বিরতি নিন।',
    'গান ছেড়ে দিন বা জানালা খুলুন।',
    'একটু সতেজ থাকার চেষ্টা করুন।',
  ],
  danger: [
    'আপনার চোখ বন্ধ হয়ে যাচ্ছে...',
    'বিশ্রাম নেওয়া দরকার। থামুন।',
    'বিপজ্জনক! নিরাপদ স্থানে থামান।',
    'অনুগ্রহ করে এখনই থামুন।',
  ],
  noFace: [
    'আপনার মুখ দেখছি না।',
    'ক্যামেরার দিকে তাকান।',
    'মুখ সামনে রাখুন।',
  ],
} as const;

type MsgState = keyof typeof MESSAGES;

function SaathiBubble({ msgState }: { msgState: MsgState }) {
  const [text, setText] = useState<string>(MESSAGES[msgState][0]);
  const opacity = useSharedValue(1);
  const stateRef = useRef<MsgState>(msgState);
  const idxRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let t1: ReturnType<typeof setTimeout>;
    let t2: ReturnType<typeof setTimeout>;

    stateRef.current = msgState;
    idxRef.current = 0;
    setText(MESSAGES[msgState][0]);
    opacity.value = 1;

    const cycle = () => {
      t1 = setTimeout(() => {
        if (cancelled) return;
        opacity.value = withTiming(0, { duration: 350 });
        t2 = setTimeout(() => {
          if (cancelled) return;
          const pool = MESSAGES[stateRef.current];
          idxRef.current = (idxRef.current + 1) % pool.length;
          setText(pool[idxRef.current]);
          opacity.value = withTiming(1, { duration: 350 });
          cycle();
        }, 380);
      }, 7000);
    };

    cycle();
    return () => {
      cancelled = true;
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [msgState]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[styles.bubble, animStyle]}>
      <Text style={styles.bubbleText}>{text}</Text>
    </Animated.View>
  );
}

export function CompanionMode() {
  const perclos        = useAppStore((s) => s.perclosScore);
  const tripElapsed    = useAppStore((s) => s.tripElapsedSeconds);
  const faceDetected   = useAppStore((s) => s.faceDetected);
  const alertLevel     = useAppStore((s) => s.currentAlertLevel);
  const nextRiskEtaMin = useAppStore((s) => s.nextRiskEtaMin);

  const msgState: MsgState =
    !faceDetected ? 'noFace'
    : perclos > 40 ? 'danger'
    : perclos > 20 ? 'watch'
    : 'safe';

  const statusLabel =
    msgState === 'noFace'  ? 'মুখ দেখছি না'
    : msgState === 'danger'  ? 'বিশ্রাম নিন'
    : msgState === 'watch'   ? 'সতর্ক থাকুন'
    : 'নিরাপদ';

  const statusColor =
    msgState === 'danger'  ? colors.coral
    : msgState === 'watch'   ? colors.warning
    : msgState === 'noFace'  ? colors.muted
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
        {/* Smart break reminder — shown after 2h, re-appears every 30 min */}
        <BreakReminderCard />

        {/* Conversational bubble above the eye */}
        <SaathiBubble msgState={msgState} />

        {/* Saathi eye character */}
        <SaathiCharacter size={200} />

        {/* Status label below the eye */}
        <Text style={[styles.statusLabel, { color: statusColor }]}>
          {statusLabel}
        </Text>

        {alertLevel === 0 && nextRiskEtaMin !== null && (
          <View style={[
            styles.etaChip,
            nextRiskEtaMin <= 5 ? styles.etaChipUrgent : styles.etaChipNormal,
          ]}>
            <Text style={[
              styles.etaText,
              nextRiskEtaMin <= 5 ? styles.etaTextUrgent : styles.etaTextNormal,
            ]}>
              {nextRiskEtaMin <= 2
                ? '⚠️ ঝুঁকি আসছে!'
                : `⏱ পরের ঝুঁকি: ~${toBn(String(nextRiskEtaMin))} মিনিটে`}
            </Text>
          </View>
        )}
      </View>
    </View>
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

  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingHorizontal: 16,
    paddingBottom: 54,
  },

  bubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    maxWidth: 280,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  bubbleText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
    color: '#1E293B',
  },

  statusLabel: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.3,
  },

  etaChip: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, marginTop: 4,
  },
  etaChipNormal: { backgroundColor: colors.primaryAlpha10, borderColor: colors.primary },
  etaChipUrgent: { backgroundColor: 'rgba(239,68,68,0.12)', borderColor: colors.danger },
  etaText: { fontSize: 13, fontWeight: '600' },
  etaTextNormal: { color: colors.primary },
  etaTextUrgent: { color: colors.danger },
});
