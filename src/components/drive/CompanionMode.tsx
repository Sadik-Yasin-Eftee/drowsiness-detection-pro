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
import { colors, radius } from '@/lib/theme';
import { toBn, formatTime } from '@/lib/i18n';

const MESSAGES = {
  safe: [
    'আপনি ভালো করছেন। নিরাপদ থাকুন। 😊',
    'সব ঠিক আছে। আমি পাশে আছি। 🛡️',
    'আপনার চোখ খোলা এবং মনোযোগ ঠিক আছে।',
    'দারুণ! নিরাপদ গাড়ি চালাচ্ছেন।',
    'চলুন সতর্কে থাকি। আপনি ভালো আছেন। ✅',
  ],
  watch: [
    '⚠️ সামান্য ক্লান্তির লক্ষণ দেখছি।',
    'একটু সতর্ক থাকুন। পানি পান করুন।',
    'চোখ ভারী হচ্ছে? একটু বিরতি নিন।',
    'গান ছেড়ে দিন বা জানালা খুলুন।',
    'একটু সতেজ থাকার চেষ্টা করুন।',
  ],
  danger: [
    '🛑 বিশ্রাম নেওয়া দরকার। থামুন।',
    'আপনার চোখ বন্ধ হয়ে যাচ্ছে!',
    'বিপজ্জনক! নিরাপদ স্থানে থামান।',
    '⚠️ অনুগ্রহ করে এখনই থামুন।',
  ],
  noFace: [
    '👀 আপনার মুখ দেখছি না।',
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

  const bubbleBg =
    msgState === 'danger' ? 'rgba(239,68,68,0.15)'
    : msgState === 'watch' ? 'rgba(245,158,11,0.15)'
    : msgState === 'noFace' ? 'rgba(100,116,139,0.15)'
    : 'rgba(20,184,166,0.12)';

  const bubbleBorder =
    msgState === 'danger' ? colors.danger
    : msgState === 'watch' ? colors.warning
    : msgState === 'noFace' ? colors.muted
    : colors.primary;

  const textColor =
    msgState === 'danger' ? colors.danger
    : msgState === 'watch' ? colors.warning
    : msgState === 'noFace' ? colors.muted
    : colors.foreground;

  return (
    <Animated.View style={[styles.bubble, { backgroundColor: bubbleBg, borderColor: bubbleBorder, shadowColor: bubbleBorder }, animStyle]}>
      <Text style={[styles.bubbleText, { color: textColor }]}>{text}</Text>
      {/* Downward tip pointing toward Saathi */}
      <View style={[styles.bubbleTip, { borderTopColor: bubbleBg }]} />
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
        <SaathiBubble msgState={msgState} />
        <SaathiCharacter size={200} />
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
    gap: 24,
    paddingHorizontal: 16,
    // The topBar above this view (~54px) shifts the mathematical center downward.
    // Equal paddingBottom pulls the content back toward true screen center.
    paddingBottom: 54,
  },

  bubble: {
    borderWidth: 1.5,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 12,
    maxWidth: 280,
    alignItems: 'center',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  bubbleText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },
  bubbleTip: {
    position: 'absolute',
    bottom: -11,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 11,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
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
