/**
 * Splash / route gate.
 *
 * After the brief logo animation, we route to:
 *   • /permissions  — first launch, or camera permission lost / denied
 *   • /onboarding   — permissions OK but onboarding never completed
 *   • /drive        — returning user, all set
 *
 * We ALWAYS run the permissions screen at least once before onboarding so
 * the user sees the privacy promises BEFORE we ask for the camera.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Ellipse, Circle } from 'react-native-svg';

import { useAppStore } from '@/store/useAppStore';
import { colors } from '@/lib/theme';

export default function Splash() {
  const router = useRouter();
  const onboardingComplete = useAppStore((s) => s.onboardingComplete);
  const permissionsRequested = useAppStore((s) => s.permissionsRequested);
  const cameraPermission = useAppStore((s) => s.cameraPermission);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!permissionsRequested || cameraPermission !== 'granted') {
        router.replace('/permissions');
      } else if (!onboardingComplete) {
        router.replace('/onboarding');
      } else {
        router.replace('/drive');
      }
    }, 1800);
    return () => clearTimeout(t);
  }, [permissionsRequested, cameraPermission, onboardingComplete, router]);

  return (
    <View style={styles.root}>
      <Animated.View entering={FadeIn.duration(600)} style={styles.inner}>
        <View style={styles.logo}>
          <Svg width={56} height={56} viewBox="0 0 100 100">
            <Ellipse cx={50} cy={50} rx={40} ry={28} fill="none" stroke={colors.primary} strokeWidth={4} />
            <Circle cx={50} cy={52} r={14} fill={colors.primary} />
            <Circle cx={50} cy={52} r={6} fill={colors.bgDark} />
            <Circle cx={46} cy={48} r={3} fill="#F8FAFC" opacity={0.9} />
          </Svg>
        </View>
        <Text style={styles.title}>DrowsyGuard</Text>
        <Text style={styles.bn}>আপনার নিরাপত্তা, আমাদের অঙ্গীকার</Text>
        <Text style={styles.en}>Your safety, our commitment</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgDark, alignItems: 'center', justifyContent: 'center' },
  inner: { alignItems: 'center', gap: 12 },
  logo: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primaryAlpha20,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { color: colors.primaryFg, fontSize: 30, fontWeight: '800', marginTop: 8 },
  bn:    { color: colors.muted, fontSize: 16, marginTop: 4 },
  en:    { color: colors.muted, fontSize: 13 },
});
