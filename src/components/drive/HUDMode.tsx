/**
 * HUDMode — the engineering / power-user view.
 *
 * Shows raw PERCLOS, AI confidence, alert level chip, head-pose gauges,
 * a 30-sample eye-state timeline, and current trip metrics.  English-first
 * because this mode is for users who want technical detail.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';

import { useAppStore } from '@/store/useAppStore';
import { colors, radius } from '@/lib/theme';
import { toBn, formatTime } from '@/lib/i18n';

export function HUDMode() {
  const {
    perclosScore, aiConfidence, currentAlertLevel, eyeStateTimeline,
    headPose, eyeAspectRatio, blinkRate, tripElapsedSeconds, drowsinessEvents,
    perclosThreshold, sensitivity,
  } = useAppStore();

  const perclosColor =
    perclosScore > 40 ? colors.danger :
    perclosScore > 20 ? colors.warning :
    colors.primary;

  const levelBg =
    currentAlertLevel >= 3 ? 'rgba(239,68,68,0.20)' :
    currentAlertLevel >= 2 ? 'rgba(245,158,11,0.20)' :
    colors.primaryAlpha20;

  // Pad the timeline to always show 30 cells
  const timeline = eyeStateTimeline.slice(-30);
  const padding = Math.max(0, 30 - timeline.length);

  return (
    <View style={styles.root}>
      <View style={styles.centreContent}>
        {/* Top: PERCLOS + chips */}
        <View style={styles.topRow}>
          <View>
            <Text style={[styles.bigPercent, { color: perclosColor }]}>{toBn(String(perclosScore))}%</Text>
            <Text style={styles.eng}>PERCLOS</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <View style={[styles.chip, { backgroundColor: colors.primaryAlpha20 }]}>
              <Text style={[styles.chipText, { color: colors.primary }]}>
                AI Confidence: {toBn(String(Math.round(aiConfidence)))}%
              </Text>
            </View>
            <View style={[styles.chip, { backgroundColor: levelBg }]}>
              <Text style={[styles.chipText, { color: colors.foreground }]}>
                Level {toBn(String(currentAlertLevel))}
              </Text>
            </View>
          </View>
        </View>

        {/* Eye-state timeline */}
        <View>
          <Text style={styles.engLabel}>Eye State Timeline (30s)</Text>
          <View style={styles.timeline}>
            {timeline.map((entry, i) => (
              <View
                key={`t-${i}`}
                style={[
                  styles.timeBar,
                  {
                    backgroundColor:
                      entry.state === 'open'    ? colors.primary :
                      entry.state === 'closing' ? colors.warning :
                      colors.danger,
                    height: entry.state === 'open' ? 18 : entry.state === 'closing' ? 14 : 10,
                  },
                ]}
              />
            ))}
            {Array.from({ length: padding }).map((_, i) => (
              <View key={`pad-${i}`} style={[styles.timeBar, { backgroundColor: colors.border, height: 18, opacity: 0.3 }]} />
            ))}
          </View>
        </View>

        {/* Head-pose gauges */}
        <View style={styles.gaugeRow}>
          <Gauge label="Pitch" value={headPose.pitch} max={30} />
          <Gauge label="Yaw"   value={headPose.yaw}   max={45} />
          <Gauge label="Roll"  value={headPose.roll}  max={20} />
        </View>

        {/* Bottom metrics grid */}
        <View style={styles.metricGrid}>
          <Metric label="Trip"        value={toBn(formatTime(tripElapsedSeconds))} />
          <Metric label="EAR / Blink" value={`${toBn(String(eyeAspectRatio))} / ${toBn(String(Math.round(blinkRate)))}`} />
          <Metric label="Events"      value={toBn(String(drowsinessEvents.length))} />
        </View>

        <Text style={styles.footer}>
          Sensitivity: {sensitivity} | Threshold: {toBn(String(perclosThreshold))}%
        </Text>
      </View>
    </View>
  );
}

function Gauge({ label, value, max }: { label: string; value: number; max: number }) {
  const norm = Math.max(-1, Math.min(1, value / max));   // -1..1
  const angle = -90 + ((norm + 1) / 2) * 180;            // -90..90 deg
  const rad = (angle * Math.PI) / 180;
  const tipColor =
    Math.abs(value) > max * 0.7 ? colors.danger :
    Math.abs(value) > max * 0.4 ? colors.warning :
    colors.primary;
  return (
    <View style={styles.gauge}>
      <Svg width={56} height={32} viewBox="0 0 56 32">
        <Path d="M 4 28 A 24 24 0 0 1 52 28" fill="none" stroke={colors.border} strokeWidth={3} />
        <Line
          x1={28} y1={28}
          x2={28 + Math.cos(rad) * 20}
          y2={28 + Math.sin(rad) * 20}
          stroke={tipColor} strokeWidth={2} strokeLinecap="round"
        />
      </Svg>
      <Text style={styles.gaugeLabel}>{label}: {toBn(String(Math.round(value)))}°</Text>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgDark, paddingHorizontal: 12, paddingVertical: 16 },
  centreContent: { flex: 1, justifyContent: 'center', gap: 16 },

  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  bigPercent: { fontSize: 48, fontWeight: '800', fontVariant: ['tabular-nums'] },
  eng: { color: colors.muted, fontSize: 11 },

  chip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  chipText: { fontSize: 11, fontVariant: ['tabular-nums'] },

  engLabel: { color: colors.muted, fontSize: 11, marginBottom: 4 },
  timeline: {
    flexDirection: 'row', gap: 2, height: 24, alignItems: 'flex-end',
    backgroundColor: colors.card, borderRadius: 6, padding: 4, overflow: 'hidden',
  },
  timeBar: { flex: 1, minWidth: 4, borderRadius: 2 },

  gaugeRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: colors.card, borderRadius: radius.lg, padding: 12 },
  gauge: { alignItems: 'center' },
  gaugeLabel: { color: colors.muted, fontSize: 10, fontVariant: ['tabular-nums'], marginTop: 2 },

  metricGrid: { flexDirection: 'row', gap: 8 },
  metric: { flex: 1, backgroundColor: colors.card, borderRadius: 8, padding: 8, alignItems: 'center' },
  metricLabel: { color: colors.muted, fontSize: 10 },
  metricValue: { color: colors.foreground, fontSize: 14, fontVariant: ['tabular-nums'], fontWeight: '600' },

  footer: { textAlign: 'center', color: colors.muted, fontSize: 10, marginTop: 8 },
});
