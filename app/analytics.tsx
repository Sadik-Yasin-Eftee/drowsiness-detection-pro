/**
 * Analytics — weekly drowsiness summary.
 *
 * Shows:
 *   • Score for the week (1-5 stars)
 *   • Daily event counts as a small bar chart
 *   • Heatmap of risk hours
 *   • Personal baseline vs. average PERCLOS
 *   • A safety tip in Bangla and English
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppStore } from '@/store/useAppStore';
import { BottomNav } from '@/components/BottomNav';
import { colors, radius } from '@/lib/theme';
import { toBn } from '@/lib/i18n';

export default function Analytics() {
  const weeklyData = useAppStore((s) => s.weeklyData);
  const drowsinessEvents = useAppStore((s) => s.drowsinessEvents);
  const insets = useSafeAreaInsets();

  // Combine current trip events with last week's data
  const todayEvents = drowsinessEvents.filter((e) => !e.flaggedFalseAlarm).length;
  const maxDay = Math.max(1, ...weeklyData.dailyEvents.map((d) => d.count));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgDark, paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 16 }}>
        <View style={styles.header}>
          <Text style={styles.titleBn}>সাপ্তাহিক বিশ্লেষণ</Text>
          <Text style={styles.titleEn}>Weekly Analytics</Text>
        </View>

        {/* Week score */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>এই সপ্তাহের স্কোর / Week Score</Text>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Text key={i} style={[styles.star, { opacity: i <= weeklyData.weekScore ? 1 : 0.25 }]}>★</Text>
            ))}
          </View>
          <Text style={styles.cardSub}>
            {weeklyData.weekScore >= 4 ? 'চমৎকার! / Excellent!' :
             weeklyData.weekScore >= 3 ? 'ভালো / Good' :
             weeklyData.weekScore >= 2 ? 'উন্নতি দরকার / Needs improvement' : 'সাবধান হোন / Be careful'}
          </Text>
        </View>

        {/* Daily events chart */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>দৈনিক সতর্কতা / Daily Alerts</Text>
          <View style={styles.barChart}>
            {weeklyData.dailyEvents.map((d) => (
              <View key={d.day} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, {
                    height: `${(d.count / maxDay) * 100}%`,
                    backgroundColor: d.count >= 2 ? colors.coral : d.count >= 1 ? colors.warning : colors.primary,
                  }]} />
                </View>
                <Text style={styles.barLabel}>{d.day_bn}</Text>
                <Text style={styles.barCount}>{toBn(String(d.count))}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>বর্তমান ট্রিপ / This Trip</Text>
          <View style={styles.statsRow}>
            <Stat val={toBn(String(todayEvents))} label="সতর্কতা" />
            <Stat val={`${toBn(String(weeklyData.totalEvents))}`} label="সপ্তাহে" />
            <Stat val={`${toBn(String(weeklyData.averagePerclos))}%`} label="গড় PERCLOS" />
          </View>
        </View>

        {/* Personal baseline */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>ব্যক্তিগত বেসলাইন / Personal Baseline</Text>
          <View style={styles.baselineRow}>
            <Text style={styles.baselineNum}>{toBn(String(weeklyData.personalBaseline))}%</Text>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={styles.baselineTrack}>
                <View style={[styles.baselineFill, { width: `${(weeklyData.averagePerclos / 60) * 100}%` }]} />
                <View style={[styles.baselineMarker, { left: `${(weeklyData.personalBaseline / 60) * 100}%` }]} />
              </View>
              <View style={styles.baselineLabels}>
                <Text style={styles.baselineLabel}>আপনার বেসলাইন</Text>
                <Text style={styles.baselineLabel}>সপ্তাহের গড়</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Peak risk times */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>উচ্চ ঝুঁকির সময় / Peak Risk Times</Text>
          <View style={{ gap: 6, marginTop: 8 }}>
            {weeklyData.peakRiskTimes.map((t) => (
              <View key={t} style={styles.riskRow}>
                <View style={styles.riskDot} />
                <Text style={styles.riskText}>{t}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Tip */}
        <View style={[styles.card, styles.tipCard]}>
          <Text style={styles.tipHeader}>💡 পরামর্শ / Tip</Text>
          <Text style={styles.tipBn}>{weeklyData.tip_bn}</Text>
          <Text style={styles.tipEn}>{weeklyData.tip_en}</Text>
        </View>
      </ScrollView>
      <BottomNav />
    </View>
  );
}

function Stat({ val, label }: { val: string; label: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={styles.statBig}>{val}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 4, paddingBottom: 4 },
  titleBn: { color: colors.foreground, fontSize: 20, fontWeight: '800' },
  titleEn: { color: colors.muted, fontSize: 13 },

  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: colors.border },
  cardLabel: { color: colors.muted, fontSize: 13, marginBottom: 8 },
  cardSub:   { color: colors.muted, fontSize: 12, marginTop: 4 },

  starRow: { flexDirection: 'row', gap: 4 },
  star: { color: colors.warning, fontSize: 28 },

  barChart: { flexDirection: 'row', height: 110, alignItems: 'flex-end', gap: 6, marginTop: 4 },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barTrack: { width: '100%', height: 80, justifyContent: 'flex-end', backgroundColor: colors.bgDark, borderRadius: 4, overflow: 'hidden' },
  barFill: { width: '100%', minHeight: 4 },
  barLabel: { color: colors.muted, fontSize: 11 },
  barCount: { color: colors.foreground, fontSize: 11, fontWeight: '700' },

  statsRow: { flexDirection: 'row' },
  statBig: { color: colors.foreground, fontSize: 22, fontWeight: '800' },
  statLabel: { color: colors.muted, fontSize: 11, marginTop: 4 },

  baselineRow: { flexDirection: 'row', alignItems: 'center' },
  baselineNum: { color: colors.primary, fontSize: 28, fontWeight: '800' },
  baselineTrack: { height: 8, backgroundColor: colors.bgDark, borderRadius: 4, position: 'relative', overflow: 'hidden' },
  baselineFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: colors.primaryAlpha20 },
  baselineMarker: { position: 'absolute', top: -2, width: 3, height: 12, backgroundColor: colors.primary },
  baselineLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  baselineLabel: { color: colors.muted, fontSize: 10 },

  riskRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  riskDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.coral },
  riskText: { color: colors.foreground, fontSize: 13 },

  tipCard: { borderColor: colors.primary, backgroundColor: colors.primaryAlpha10 },
  tipHeader: { color: colors.primary, fontSize: 14, fontWeight: '700', marginBottom: 6 },
  tipBn: { color: colors.foreground, fontSize: 14, lineHeight: 22 },
  tipEn: { color: colors.muted, fontSize: 12, marginTop: 6, lineHeight: 18 },
});
