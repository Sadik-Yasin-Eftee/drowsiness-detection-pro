/**
 * Settings — user preferences.
 *
 * Sections:
 *   • Sensitivity
 *   • Interface mode
 *   • Privacy / data sharing
 *   • Sound + night-quiet
 *   • Threshold (HUD mode only)
 *   • About
 */

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppStore, type Sensitivity, type InterfaceMode } from '@/store/useAppStore';
import { BottomNav } from '@/components/BottomNav';
import { ShieldIcon, LockIcon, VolumeIcon } from '@/components/Icons';
import { colors, radius } from '@/lib/theme';
import { toBn } from '@/lib/i18n';

export default function SettingsPage() {
  const store = useAppStore();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgDark, paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 16 }}>
        <View>
          <Text style={styles.titleBn}>
            {store.interfaceMode === 'companion' ? 'সাথীর পছন্দ' : 'সেটিংস'}
          </Text>
          <Text style={styles.titleEn}>Settings</Text>
        </View>

        {/* Sensitivity */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>সংবেদনশীলতা / Sensitivity</Text>
          <SegmentedControl<Sensitivity>
            options={[
              { val: 'conservative', label: 'সতর্ক' },
              { val: 'balanced',     label: 'স্বাভাবিক' },
              { val: 'relaxed',      label: 'শিথিল' },
            ]}
            value={store.sensitivity}
            onChange={(v) => store.setSensitivity(v)}
          />
        </View>

        {/* Interface mode */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>ইন্টারফেস মোড / Mode</Text>
          <SegmentedControl<InterfaceMode>
            options={[
              { val: 'companion', label: 'সাথী' },
              { val: 'dashboard', label: 'ড্যাশবোর্ড' },
              { val: 'hud',       label: 'HUD' },
            ]}
            value={store.interfaceMode}
            onChange={(v) => store.setInterfaceMode(v)}
          />
        </View>

        {/* Privacy */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <ShieldIcon size={16} color={colors.primary} />
            <Text style={styles.cardLabelTight}>গোপনীয়তা / Privacy</Text>
          </View>
          <View style={styles.privacyBadge}>
            <LockIcon size={14} color={colors.primary} />
            <Text style={styles.privacyBadgeText}>✅ সব তথ্য এই ডিভাইসে</Text>
          </View>
          <Toggle
            value={store.deleteDataAfterTrip}
            onChange={store.setDeleteDataAfterTrip}
            bn="ট্রিপ শেষে ডেটা মুছুন"
            en="Delete data after trip"
          />
          <Toggle
            value={store.insuranceSharing}
            onChange={store.setInsuranceSharing}
            bn="বীমা কোম্পানিতে শেয়ার"
            en="Share with insurance"
          />
          <Toggle
            value={store.employerSharing}
            onChange={store.setEmployerSharing}
            bn="নিয়োগকর্তাকে শেয়ার"
            en="Share with employer"
            warning="এটি চালু করলে আপনার নিয়োগকর্তা আপনার ড্রাইভিং ডেটা দেখতে পারবে।"
          />
        </View>

        {/* Emergency Contact */}
        <EmergencyContactCard />

        {/* Sound */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <VolumeIcon size={16} color={colors.primary} />
            <Text style={styles.cardLabelTight}>শব্দ / Sound</Text>
          </View>
          <Toggle
            value={store.soundAlerts}
            onChange={store.setSoundAlerts}
            bn="শব্দে সতর্ক করুন"
            en="Sound alerts"
          />
          <Toggle
            value={store.hapticAlerts}
            onChange={store.setHapticAlerts}
            bn="কম্পনে সতর্ক করুন"
            en="Haptic vibration alerts"
          />
          <Toggle
            value={store.nightQuiet}
            onChange={store.setNightQuiet}
            bn="রাতে শান্ত মোড"
            en="Night quiet mode"
          />
        </View>

        {/* Threshold (HUD only) */}
        {store.interfaceMode === 'hud' && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>থ্রেশহোল্ড / Thresholds</Text>
            <View style={{ marginTop: 8 }}>
              <View style={styles.sliderHeader}>
                <Text style={styles.sliderLabel}>PERCLOS Threshold</Text>
                <Text style={styles.sliderVal}>{store.perclosThreshold}%</Text>
              </View>
              {/* Simple stepper buttons (avoid extra slider dep) */}
              <View style={styles.stepperRow}>
                <Pressable
                  onPress={() => store.setPerclosThreshold(Math.max(15, store.perclosThreshold - 1))}
                  style={styles.stepBtn}
                >
                  <Text style={styles.stepBtnText}>−</Text>
                </Pressable>
                <View style={styles.stepperTrack}>
                  <View
                    style={[
                      styles.stepperFill,
                      { width: `${((store.perclosThreshold - 15) / (50 - 15)) * 100}%` },
                    ]}
                  />
                </View>
                <Pressable
                  onPress={() => store.setPerclosThreshold(Math.min(50, store.perclosThreshold + 1))}
                  style={styles.stepBtn}
                >
                  <Text style={styles.stepBtnText}>+</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* About */}
        <View style={[styles.card, { gap: 8 }]}>
          <Text style={styles.cardLabel}>সম্পর্কে / About</Text>
          <View style={styles.aboutChip}>
            <Text style={styles.aboutChipMain}>Fitzpatrick Skin Tone Scale (I–VI) ✅</Text>
            <Text style={styles.aboutChipSub}>এই AI সকল ত্বকের রঙে সমানভাবে কাজ করে।</Text>
          </View>
          <Text style={styles.aboutLine}>Engine: PERCLOS + EAR + Head-Pose</Text>
          <Text style={styles.aboutLine}>Powered by MLKit Face Detection</Text>
          <Text style={styles.aboutLine}>Version 1.0.0</Text>
        </View>
      </ScrollView>

      <BottomNav />
    </View>
  );
}

/* ───────────────────────────────────────────────────────────── */
/*  Reusable controls                                            */
/* ───────────────────────────────────────────────────────────── */

function EmergencyContactCard() {
  const saved = useAppStore((s) => s.emergencyContact);
  const setEmergencyContact = useAppStore((s) => s.setEmergencyContact);
  const [draft, setDraft] = useState(saved);

  const isDirty = draft.trim() !== saved.trim();
  const save = () => setEmergencyContact(draft.trim());

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.emergencyIcon}>🆘</Text>
        <Text style={styles.cardLabelTight}>জরুরি যোগাযোগ / Emergency Contact</Text>
      </View>
      <Text style={styles.emergencyHint}>
        Level 3 সতর্কতায় ৩০ সেকেন্ডের মধ্যে এই নম্বরে SMS পাঠানো হবে।
        {'\n'}An SMS is sent to this number on a Level 3 (critical) alert after 30s.
      </Text>
      <View style={styles.emergencyRow}>
        <TextInput
          style={styles.emergencyInput}
          value={draft}
          onChangeText={setDraft}
          onBlur={() => { if (!isDirty) return; save(); }}
          placeholder="+880 1XXX-XXXXXX"
          placeholderTextColor={colors.muted}
          keyboardType="phone-pad"
          returnKeyType="done"
          onSubmitEditing={save}
          maxLength={20}
        />
        {isDirty && (
          <Pressable onPress={save} style={styles.emergencySaveBtn}>
            <Text style={styles.emergencySaveBtnText}>সেভ</Text>
          </Pressable>
        )}
      </View>
      {saved ? (
        <Text style={styles.emergencySaved}>✓ সংরক্ষিত: {saved}</Text>
      ) : null}
    </View>
  );
}

function SegmentedControl<T extends string>({
  options, value, onChange,
}: { options: { val: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.segWrap}>
      {options.map((o) => {
        const active = value === o.val;
        return (
          <Pressable
            key={o.val}
            onPress={() => onChange(o.val)}
            style={[styles.seg, active && styles.segActive]}
          >
            <Text style={[styles.segText, active && styles.segTextActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Toggle({
  value, onChange, bn, en, warning,
}: { value: boolean; onChange: (v: boolean) => void; bn: string; en: string; warning?: string }) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleBn}>{bn}</Text>
        <Text style={styles.toggleEn}>{en}</Text>
        {warning ? <Text style={styles.toggleWarning}>⚠️ {warning}</Text> : null}
      </View>
      <Pressable
        onPress={() => onChange(!value)}
        style={[styles.switch, value ? styles.switchOn : styles.switchOff]}
      >
        <View style={[styles.switchKnob, value ? styles.switchKnobOn : styles.switchKnobOff]} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  titleBn: { color: colors.foreground, fontSize: 22, fontWeight: '800' },
  titleEn: { color: colors.muted, fontSize: 13, marginTop: 2 },

  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardLabel: { color: colors.muted, fontSize: 13, marginBottom: 12 },
  cardLabelTight: { color: colors.foreground, fontSize: 14, fontWeight: '700' },

  // Segmented control
  segWrap: { flexDirection: 'row', gap: 6 },
  seg: { flex: 1, paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.bgDark, alignItems: 'center' },
  segActive: { backgroundColor: colors.primary },
  segText: { color: colors.foreground, fontSize: 13, fontWeight: '600' },
  segTextActive: { color: colors.primaryFg },

  // Toggle row
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  toggleBn: { color: colors.foreground, fontSize: 14 },
  toggleEn: { color: colors.muted, fontSize: 11 },
  toggleWarning: { color: colors.warning, fontSize: 11, marginTop: 2 },
  switch: { width: 48, height: 28, borderRadius: 14, justifyContent: 'center', padding: 2 },
  switchOn: { backgroundColor: colors.primary },
  switchOff: { backgroundColor: colors.border },
  switchKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  switchKnobOn: { alignSelf: 'flex-end' },
  switchKnobOff: { alignSelf: 'flex-start' },

  // Privacy badge
  privacyBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primaryAlpha20, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginBottom: 8, alignSelf: 'flex-start' },
  privacyBadgeText: { color: colors.primary, fontSize: 12 },

  // Stepper
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  sliderLabel: { color: colors.muted, fontSize: 12 },
  sliderVal: { color: colors.foreground, fontSize: 12, fontVariant: ['tabular-nums'] },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.bgDark, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  stepBtnText: { color: colors.foreground, fontSize: 20, fontWeight: '700' },
  stepperTrack: { flex: 1, height: 8, backgroundColor: colors.bgDark, borderRadius: 4, overflow: 'hidden' },
  stepperFill: { height: '100%', backgroundColor: colors.primary },

  aboutChip: { backgroundColor: colors.primaryAlpha10, padding: 12, borderRadius: 8 },
  aboutChipMain: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  aboutChipSub:  { color: colors.muted, fontSize: 11, marginTop: 4 },
  aboutLine: { color: colors.muted, fontSize: 11 },

  // Emergency contact
  emergencyIcon: { fontSize: 16 },
  emergencyHint: { color: colors.muted, fontSize: 12, marginBottom: 10, lineHeight: 18 },
  emergencyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emergencyInput: {
    flex: 1,
    backgroundColor: colors.bgDark,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.foreground,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  emergencySaveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  emergencySaveBtnText: { color: colors.primaryFg, fontWeight: '700', fontSize: 14 },
  emergencySaved: { color: colors.primary, fontSize: 12, marginTop: 6 },
});
