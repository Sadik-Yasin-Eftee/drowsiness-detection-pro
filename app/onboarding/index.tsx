import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppStore } from '@/store/useAppStore';
import { EyeIcon, LockIcon } from '@/components/Icons';
import { colors, radius } from '@/lib/theme';

const SENSITIVITIES = [
  { val: 'conservative' as const, emoji: '🛡️', bn: 'বেশি সতর্ক', en: 'Extra Careful', desc: 'ছোট লক্ষণেও সতর্ক করব' },
  { val: 'balanced'     as const, emoji: '⚖️', bn: 'স্বাভাবিক',  en: 'Balanced',      desc: 'সুষম পর্যবেক্ষণ' },
  { val: 'relaxed'      as const, emoji: '🎯', bn: 'একটু সতর্ক', en: 'Relaxed',        desc: 'শুধু স্পষ্ট লক্ষণে' },
];
const MODES = [
  { val: 'companion' as const, emoji: '😊', bn: 'সাথী মোড',       en: 'Companion', desc: 'বন্ধুর মতো' },
  { val: 'dashboard' as const, emoji: '📊', bn: 'ড্যাশবোর্ড মোড', en: 'Dashboard', desc: 'পরিষ্কার তথ্য' },
  { val: 'hud'       as const, emoji: '🖥️', bn: 'HUD মোড',        en: 'Technical', desc: 'বিস্তারিত ডেটা' },
];

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sensitivity    = useAppStore((s) => s.sensitivity);
  const interfaceMode  = useAppStore((s) => s.interfaceMode);
  const setSensitivity = useAppStore((s) => s.setSensitivity);
  const setInterfaceMode      = useAppStore((s) => s.setInterfaceMode);
  const setOnboardingComplete = useAppStore((s) => s.setOnboardingComplete);
  const [step, setStep] = useState(0);

  const finish = () => {
    setOnboardingComplete();
    router.replace('/drive');
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scrollInner}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Step 0 — Meet Saathi */}
        {step === 0 && (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.stepCentered}>
            <View style={styles.iconWrap}>
              <EyeIcon size={64} color={colors.primary} />
            </View>
            <Text style={styles.titleBn}>আমি সাথী। আপনার গাড়িতে আপনার পাশে থাকব।</Text>
            <Text style={styles.titleEn}>I'm Saathi, your driving companion.</Text>
          </Animated.View>
        )}

        {/* Step 1 — Privacy */}
        {step === 1 && (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.stepCentered}>
            <View style={styles.iconWrap}>
              <LockIcon size={48} color={colors.primary} />
            </View>
            <Text style={styles.titleBn}>আমি শুধু আপনার ফোনে কাজ করি। আপনার ছবি কোথাও যায় না।</Text>
            <Text style={styles.titleEn}>100% on-device processing. No images leave your phone.</Text>
            <View style={styles.chipRow}>
              <View style={styles.chip}><Text style={styles.chipText}>কোনো ক্লাউড নেই</Text></View>
              <View style={styles.chip}><Text style={styles.chipText}>কোনো ট্র্যাকিং নেই</Text></View>
            </View>
          </Animated.View>
        )}

        {/* Step 2 — Pick sensitivity + mode */}
        {step === 2 && (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.step2Wrap}>
            <Text style={styles.step2Title}>আপনার অভিজ্ঞতা বেছে নিন</Text>

            <Text style={styles.sectionLabel}>সংবেদনশীলতা</Text>
            <View style={styles.cardGroup}>
              {SENSITIVITIES.map((item) => (
                <Pressable
                  key={item.val}
                  onPress={() => setSensitivity(item.val)}
                  style={[styles.optionCard, sensitivity === item.val && styles.optionCardActive]}
                >
                  <View style={[styles.emojiWrap, sensitivity === item.val && styles.emojiWrapActive]}>
                    <Text style={styles.emoji}>{item.emoji}</Text>
                  </View>
                  <View style={styles.cardText}>
                    <Text style={styles.cardTitle}>
                      {item.bn}{' '}
                      <Text style={styles.cardTitleEn}>/ {item.en}</Text>
                    </Text>
                    <Text style={styles.cardDesc}>{item.desc}</Text>
                  </View>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.sectionLabel, { marginTop: 8 }]}>ইন্টারফেস মোড</Text>
            <View style={styles.cardGroup}>
              {MODES.map((item) => (
                <Pressable
                  key={item.val}
                  onPress={() => setInterfaceMode(item.val)}
                  style={[styles.optionCard, interfaceMode === item.val && styles.optionCardActive]}
                >
                  <View style={[styles.emojiWrap, interfaceMode === item.val && styles.emojiWrapActive]}>
                    <Text style={styles.emoji}>{item.emoji}</Text>
                  </View>
                  <View style={styles.cardText}>
                    <Text style={styles.cardTitle}>
                      {item.bn}{' '}
                      <Text style={styles.cardTitleEn}>/ {item.en}</Text>
                    </Text>
                    <Text style={styles.cardDesc}>{item.desc}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {/* Dots + CTA */}
      <View style={styles.footer}>
        <View style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>
        <Pressable
          onPress={() => (step < 2 ? setStep(step + 1) : finish())}
          style={styles.nextBtn}
        >
          <Text style={styles.nextBtnText}>{step < 2 ? 'পরবর্তী' : 'শুরু করুন'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: colors.bgDark },
  scrollInner: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 32 },

  // Steps 0 & 1 — vertically centred
  stepCentered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },

  iconWrap: {
    width: 128, height: 128, borderRadius: 64,
    backgroundColor: colors.primaryAlpha20,
    alignItems: 'center', justifyContent: 'center',
  },
  titleBn: { color: colors.foreground, fontSize: 20, fontWeight: '700', textAlign: 'center', lineHeight: 30 },
  titleEn: { color: colors.muted, fontSize: 14, textAlign: 'center', marginTop: -12 },

  chipRow: { flexDirection: 'row', gap: 8 },
  chip:    { backgroundColor: colors.primaryAlpha20, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  chipText:{ color: colors.primary, fontSize: 13 },

  // Step 2 — full-width, top-aligned
  step2Wrap: {
    alignSelf: 'stretch',   // fills the scroll view width
    gap: 0,
  },
  step2Title: {
    color: colors.foreground,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 28,
  },
  sectionLabel: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  cardGroup: { gap: 10, marginBottom: 8 },

  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.xl,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  optionCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryAlpha10,
  },

  emojiWrap: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center',
  },
  emojiWrapActive: {
    backgroundColor: colors.primaryAlpha20,
  },
  emoji: { fontSize: 26 },

  cardText:    { flex: 1 },
  cardTitle:   { color: colors.foreground, fontSize: 15, fontWeight: '700' },
  cardTitleEn: { color: colors.muted, fontWeight: '400', fontSize: 13 },
  cardDesc:    { color: colors.muted, fontSize: 13, marginTop: 3 },

  // Footer
  footer:      { paddingHorizontal: 24, paddingBottom: 32, paddingTop: 8, gap: 16 },
  dots:        { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot:         { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.muted },
  dotActive:   { backgroundColor: colors.primary },
  nextBtn:     { paddingVertical: 16, borderRadius: radius.lg, backgroundColor: colors.primary, alignItems: 'center' },
  nextBtnText: { color: colors.primaryFg, fontSize: 18, fontWeight: '700' },
});
