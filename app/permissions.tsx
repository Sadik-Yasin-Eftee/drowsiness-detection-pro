/**
 * Permissions screen.
 *
 * This is the FIRST screen a new user sees (after the brief splash). Its job:
 *
 *   1. Explain WHY DrowsyGuard needs the camera, in plain language and
 *      in both Bangla and English.
 *   2. Promise — concretely — that nothing leaves the device.
 *   3. Ask for camera permission via expo-camera's hook (which routes to
 *      the OS permission prompt).
 *   4. Handle each branch:
 *        • granted     → continue to /onboarding
 *        • denied      → show a clear message + a "Open Settings" button
 *                         (because once denied, the OS won't re-prompt and
 *                          the user MUST go to Settings to grant access).
 *        • undetermined → "Allow camera" CTA
 *
 * We do NOT ask for the camera silently — driver-monitoring is a sensitive
 * use case, so we explain first, then prompt.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, Linking, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useCameraPermissions } from 'expo-camera';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppStore } from '@/store/useAppStore';
import { CameraIcon, LockIcon, ShieldIcon, CheckIcon, XIcon } from '@/components/Icons';
import { colors, radius } from '@/lib/theme';

export default function Permissions() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const setCameraPermission = useAppStore((s) => s.setCameraPermission);
  const setPermissionsRequested = useAppStore((s) => s.setPermissionsRequested);
  const onboardingComplete = useAppStore((s) => s.onboardingComplete);
  const [submitting, setSubmitting] = useState(false);

  // Sync OS permission state into our store whenever it changes
  useEffect(() => {
    if (!permission) return;
    setCameraPermission(
      permission.status === 'granted' ? 'granted'
      : permission.status === 'denied' && !permission.canAskAgain ? 'denied'
      : 'undetermined',
    );
  }, [permission, setCameraPermission]);

  const handleAllow = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const result = await requestPermission();
      setPermissionsRequested();
      if (result.granted) {
        setCameraPermission('granted');
        // Route based on whether onboarding has run before
        router.replace(onboardingComplete ? '/drive' : '/onboarding');
      } else if (!result.canAskAgain) {
        // OS won't re-prompt — user must go to Settings
        setCameraPermission('denied');
      } else {
        setCameraPermission('undetermined');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openSettings = () => {
    Alert.alert(
      'সেটিংস খুলুন / Open Settings',
      'ক্যামেরা অনুমতি দিতে অ্যাপ সেটিংসে যান।\nGo to app settings to grant camera permission.',
      [
        { text: 'বাতিল / Cancel', style: 'cancel' },
        { text: 'সেটিংস / Settings', onPress: () => Linking.openSettings() },
      ],
    );
  };

  const isPermanentlyDenied = permission?.status === 'denied' && !permission?.canAskAgain;

  return (
    <ScrollView contentContainerStyle={styles.scroll} style={{ backgroundColor: colors.bgDark, paddingTop: insets.top }}>
      <Animated.View entering={FadeIn.duration(300)} style={styles.iconWrap}>
        <CameraIcon size={48} color={colors.primary} />
      </Animated.View>

      <Animated.Text entering={FadeInUp.delay(100)} style={styles.titleBn}>
        ক্যামেরার অনুমতি চাই
      </Animated.Text>
      <Animated.Text entering={FadeInUp.delay(150)} style={styles.titleEn}>
        Camera Permission Required
      </Animated.Text>

      <Animated.Text entering={FadeInUp.delay(200)} style={styles.bodyBn}>
        DrowsyGuard আপনার মুখ পর্যবেক্ষণ করে চোখ বন্ধ হওয়া এবং মাথা ঝোঁকা শনাক্ত করে। এটি আপনাকে নিরাপদ রাখার একমাত্র উপায়।
      </Animated.Text>
      <Animated.Text entering={FadeInUp.delay(220)} style={styles.bodyEn}>
        DrowsyGuard watches your face for eye-closure and head-droop signs of drowsiness. This is the only way it can keep you safe.
      </Animated.Text>

      {/* Privacy promise card */}
      <Animated.View entering={FadeInUp.delay(280)} style={styles.privacyCard}>
        <View style={styles.privacyHeader}>
          <ShieldIcon size={18} color={colors.primary} />
          <Text style={styles.privacyHeaderText}>Privacy Promise</Text>
        </View>
        <PrivacyRow icon={LockIcon} bn="ক্যামেরার ছবি ফোন থেকে কোথাও যায় না" en="Video never leaves your phone" />
        <PrivacyRow icon={CheckIcon} bn="সম্পূর্ণ অন-ডিভাইস AI" en="100% on-device AI" />
        <PrivacyRow icon={CheckIcon} bn="কোনো ছবি/ভিডিও সংরক্ষণ হয় না" en="No images or video are stored" />
        <PrivacyRow icon={CheckIcon} bn="কোনো ক্লাউড আপলোড নেই" en="No cloud uploads, ever" />
      </Animated.View>

      {/* CTA */}
      <Animated.View entering={FadeInUp.delay(360)} style={styles.ctaWrap}>
        {isPermanentlyDenied ? (
          <>
            <View style={styles.deniedBanner}>
              <XIcon size={18} color={colors.danger} />
              <Text style={styles.deniedText}>
                ক্যামেরার অনুমতি বন্ধ আছে — সেটিংস থেকে চালু করুন।{'\n'}
                Camera permission is blocked — please enable it from Settings.
              </Text>
            </View>
            <Pressable onPress={openSettings} style={[styles.cta, { backgroundColor: colors.warning }]}>
              <Text style={styles.ctaText}>সেটিংস খুলুন / Open Settings</Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            onPress={handleAllow}
            disabled={submitting}
            style={[styles.cta, { backgroundColor: colors.primary, opacity: submitting ? 0.7 : 1 }]}
          >
            <CameraIcon size={18} color={colors.primaryFg} />
            <Text style={styles.ctaText}>ক্যামেরা চালু করুন / Allow Camera</Text>
          </Pressable>
        )}

        <Text style={styles.footer}>
          আপনি যেকোনো সময় ফোনের সেটিংস থেকে এই অনুমতি বাতিল করতে পারবেন।{'\n'}
          You can revoke this permission anytime from your phone's settings.
        </Text>
      </Animated.View>
    </ScrollView>
  );
}

function PrivacyRow({
  icon: Icon, bn, en,
}: { icon: React.ComponentType<{ size?: number; color?: string }>; bn: string; en: string }) {
  return (
    <View style={styles.privacyRow}>
      <Icon size={16} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={styles.privacyBn}>{bn}</Text>
        <Text style={styles.privacyEn}>{en}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 24, flexGrow: 1, justifyContent: 'center' },

  iconWrap: {
    alignSelf: 'center',
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: colors.primaryAlpha20,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },

  titleBn: { color: colors.foreground, fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  titleEn: { color: colors.muted, fontSize: 14, textAlign: 'center', marginBottom: 20 },

  bodyBn: { color: colors.foreground, fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 8 },
  bodyEn: { color: colors.muted, fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 24 },

  privacyCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 16,
    gap: 12,
    marginBottom: 24,
    borderWidth: 1, borderColor: colors.border,
  },
  privacyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  privacyHeaderText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  privacyRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  privacyBn: { color: colors.foreground, fontSize: 14 },
  privacyEn: { color: colors.muted, fontSize: 11 },

  ctaWrap: { gap: 12 },
  cta: {
    flexDirection: 'row', gap: 8,
    paddingVertical: 16, borderRadius: radius.lg,
    alignItems: 'center', justifyContent: 'center',
  },
  ctaText: { color: colors.primaryFg, fontSize: 16, fontWeight: '700' },
  footer: { color: colors.muted, fontSize: 11, textAlign: 'center', marginTop: 8, lineHeight: 16 },

  deniedBanner: {
    flexDirection: 'row', gap: 10,
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderRadius: radius.md, padding: 12,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)',
  },
  deniedText: { color: colors.foreground, fontSize: 12, lineHeight: 18, flex: 1 },
});
