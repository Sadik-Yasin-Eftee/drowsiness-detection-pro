import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import Svg, { Ellipse, Circle } from 'react-native-svg';

import { useAppStore } from '@/store/useAppStore';
import { colors, radius } from '@/lib/theme';
import { toBn } from '@/lib/i18n';
import { alertSounds } from '@/lib/alertSounds';
import { stopHapticLoop } from '@/lib/haptics';

export function AlertOverlay() {
  const currentAlert = useAppStore((s) => s.currentAlert);
  const interfaceMode = useAppStore((s) => s.interfaceMode);
  const dismissAlert = useAppStore((s) => s.dismissAlert);
  const flagFalseAlarm = useAppStore((s) => s.flagFalseAlarm);
  const router = useRouter();

  // AlertOverlay is conditionally rendered ({showAlert && <AlertOverlay />}), so
  // it unmounts when the alert is dismissed. Stop loops in the cleanup so they
  // halt even though the component never re-renders with currentAlert = null.
  useEffect(() => {
    return () => {
      alertSounds.stopLoop();
      stopHapticLoop();
    };
  }, []);

  if (!currentAlert) return null;

  const goRest = () => {
    dismissAlert();
    router.push('/rest-stops');
  };

  if (interfaceMode === 'companion') {
    return <CompanionAlert alert={currentAlert} onDismiss={dismissAlert} onRest={goRest} onFlag={flagFalseAlarm} />;
  }
  if (interfaceMode === 'dashboard') {
    return <DashboardAlert alert={currentAlert} onDismiss={dismissAlert} onRest={goRest} />;
  }
  return <HudAlert alert={currentAlert} onDismiss={dismissAlert} onRest={goRest} onFlag={flagFalseAlarm} />;
}

function CompanionAlert({
  alert, onDismiss, onRest, onFlag,
}: { alert: NonNullable<ReturnType<typeof useAppStore.getState>['currentAlert']>;
     onDismiss: () => void; onRest: () => void; onFlag: () => void }) {
  return (
    <Animated.View entering={FadeIn.duration(200)} style={[styles.fullScreen, { backgroundColor: colors.bgWarm }]}>
      <Animated.View entering={FadeIn.delay(100).springify()} style={styles.companionInner}>
        <View style={styles.companionEyeWrap}>
          <Svg width={64} height={64} viewBox="0 0 100 100">
            <Ellipse cx={50} cy={50} rx={40} ry={28} fill="#F8FAFC" stroke={colors.primary} strokeWidth={3} />
            <Circle cx={50} cy={52} r={14} fill={colors.primary} />
            <Circle cx={50} cy={52} r={6} fill="#0F172A" />
            <Circle cx={46} cy={48} r={2.5} fill="#F8FAFC" opacity={0.85} />
          </Svg>
        </View>

        <Text style={[styles.companionTitle, { color: colors.textDark }]}>{alert.reason_bn}</Text>
        <Text style={[styles.companionSub, { color: colors.muted }]}>{alert.reason_en}</Text>

        <View style={styles.companionActions}>
          <Pressable onPress={onDismiss} style={[styles.bigBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.bigBtnText}>ঠিক আছি, ধন্যবাদ ✓</Text>
          </Pressable>
          <Pressable onPress={onRest} style={[styles.bigBtn, { backgroundColor: colors.coral }]}>
            <Text style={styles.bigBtnText}>বিশ্রাম দরকার</Text>
          </Pressable>
        </View>

        <Pressable onPress={onFlag} hitSlop={10}>
          <Text style={styles.linkUnderline}>ভুল সতর্কতা হিসেবে চিহ্নিত করুন</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

function DashboardAlert({
  alert, onDismiss, onRest,
}: { alert: NonNullable<ReturnType<typeof useAppStore.getState>['currentAlert']>;
     onDismiss: () => void; onRest: () => void }) {
  return (
    <Animated.View entering={FadeIn.duration(200)} style={[styles.fullScreen, { backgroundColor: colors.overlay, justifyContent: 'flex-end' }]}>
      <Animated.View entering={SlideInDown.springify().damping(20)} style={styles.dashSheet}>
        <Text style={styles.dashTitle}>{alert.reason_bn}</Text>
        <Text style={styles.dashSub}>
          {alert.reason_en} — PERCLOS {alert.perclosAtTrigger}%
        </Text>

        <View style={styles.confidenceRow}>
          <Text style={styles.confidenceLabel}>নিশ্চিততা:</Text>
          <View style={styles.confidenceTrack}>
            <View style={[styles.confidenceFill, { width: `${alert.confidence}%` }]} />
          </View>
          <Text style={styles.confidenceVal}>{Math.round(alert.confidence)}%</Text>
        </View>

        <View style={styles.dashBtnRow}>
          <Pressable onPress={onDismiss} style={[styles.dashBtn, styles.dashBtnGhost]}>
            <Text style={styles.dashBtnGhostText}>ঠিক আছি</Text>
          </Pressable>
          <Pressable onPress={onRest} style={[styles.dashBtn, { backgroundColor: colors.coral }]}>
            <Text style={styles.bigBtnText}>বিশ্রাম নিন</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

function HudAlert({
  alert, onDismiss, onRest, onFlag,
}: { alert: NonNullable<ReturnType<typeof useAppStore.getState>['currentAlert']>;
     onDismiss: () => void; onRest: () => void; onFlag: () => void }) {
  return (
    <Animated.View entering={FadeIn.duration(150)} style={styles.fullScreen}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.danger, opacity: 0.10 }]} />
      <View style={styles.hudCard}>
        <Text style={styles.hudHeader}>DROWSINESS DETECTED</Text>

        <View style={styles.hudGrid}>
          <HudCell label="PERCLOS"     value={`${alert.perclosAtTrigger}%`} />
          <HudCell label="Eye closure" value={`${alert.eyeClosureDuration.toFixed(1)}s`} />
          <HudCell label="Confidence"  value={`${Math.round(alert.confidence)}%`} />
          <HudCell label="Alert Level" value={String(alert.alertLevel)} />
        </View>

        <Text style={styles.hudReason}>{alert.reason_bn}</Text>

        <View style={styles.hudActions}>
          <Pressable onPress={onDismiss} style={[styles.hudBtn, { borderColor: colors.border }]}>
            <Text style={[styles.hudBtnText, { color: colors.foreground }]}>DISMISS</Text>
          </Pressable>
          <Pressable onPress={onFlag} style={[styles.hudBtn, { borderColor: colors.warning }]}>
            <Text style={[styles.hudBtnText, { color: colors.warning }]}>FALSE ALARM</Text>
          </Pressable>
          <Pressable onPress={onRest} style={[styles.hudBtn, { backgroundColor: colors.coral, borderColor: colors.coral }]}>
            <Text style={[styles.hudBtnText, { color: colors.primaryFg }]}>REST</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

function HudCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.hudCell}>
      <Text style={styles.hudCellLabel}>{label}</Text>
      <Text style={styles.hudCellValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    elevation: 999,
  },

  companionInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  companionEyeWrap: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: colors.primaryAlpha20,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  companionTitle: { fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  companionSub:   { fontSize: 14, textAlign: 'center', marginBottom: 32 },
  companionActions: { width: '100%', maxWidth: 320, gap: 12, marginBottom: 24 },

  bigBtn: { paddingVertical: 16, borderRadius: radius.lg, alignItems: 'center' },
  bigBtnText: { color: colors.primaryFg, fontSize: 16, fontWeight: '700' },

  linkUnderline: { color: colors.muted, textDecorationLine: 'underline', fontSize: 13 },

  dashSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24,
    borderTopWidth: 4, borderTopColor: colors.coral,
  },
  dashTitle: { color: colors.foreground, fontSize: 20, fontWeight: '800', marginBottom: 4 },
  dashSub:   { color: colors.muted, fontSize: 13, marginBottom: 12 },
  confidenceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  confidenceLabel: { color: colors.muted, fontSize: 13 },
  confidenceTrack: { flex: 1, height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' },
  confidenceFill:  { height: '100%', backgroundColor: colors.primary },
  confidenceVal:   { color: colors.foreground, fontSize: 13, fontVariant: ['tabular-nums'] },
  dashBtnRow: { flexDirection: 'row', gap: 12 },
  dashBtn: { flex: 1, paddingVertical: 14, borderRadius: radius.lg, alignItems: 'center' },
  dashBtnGhost: { borderWidth: 1, borderColor: colors.border },
  dashBtnGhostText: { color: colors.foreground, fontWeight: '700' },

  hudCard: {
    margin: 16,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.5)',
    padding: 20,
    alignSelf: 'center',
    width: '90%',
    maxWidth: 380,
    marginTop: '40%',
  },
  hudHeader: { color: colors.danger, fontSize: 16, fontWeight: '800', textAlign: 'center', marginBottom: 16, letterSpacing: 1 },
  hudGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  hudCell: { flexBasis: '48%', backgroundColor: colors.bgDark, borderRadius: 6, padding: 8 },
  hudCellLabel: { color: colors.muted, fontSize: 10, fontVariant: ['tabular-nums'] },
  hudCellValue: { color: colors.foreground, fontSize: 14, fontVariant: ['tabular-nums'], fontWeight: '600' },
  hudReason: { color: colors.muted, fontSize: 13, textAlign: 'center', marginBottom: 14 },
  hudActions: { flexDirection: 'row', gap: 8 },
  hudBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  hudBtnText: { fontSize: 12, fontWeight: '700' },
});
