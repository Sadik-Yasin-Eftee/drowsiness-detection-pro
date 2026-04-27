/**
 * RestStops — list of nearby rest areas.
 *
 * Per the project brief, the live map integration is deferred for now. We
 * render a static SVG illustration in place of a real map and a list of
 * curated example stops along common Bangladeshi highways. When the map
 * feature is added later, swap out the <FakeMap/> for a real <MapView/>.
 */

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArrowLeftIcon, MapPinIcon } from '@/components/Icons';
import { BottomNav } from '@/components/BottomNav';
import { colors, radius } from '@/lib/theme';

const STOPS = [
  { name_bn: 'ঢাকা-চট্টগ্রাম রেস্ট এরিয়া', dist: '৩.৫ কিমি', time: '~৫ মিনিট',  amenities: ['🚻', '🍽️', '⛽', '🅿️'] },
  { name_bn: 'কুমিল্লা সার্ভিস স্টেশন',     dist: '৮.২ কিমি', time: '~১২ মিনিট', amenities: ['🚻', '🍽️', '🅿️'] },
  { name_bn: 'ফেনী হাইওয়ে রেস্ট পয়েন্ট',  dist: '১৫.০ কিমি', time: '~২০ মিনিট', amenities: ['🚻', '⛽'] },
];

export default function RestStops() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgDark, paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={10}
          >
            <ArrowLeftIcon size={22} color={colors.foreground} />
          </Pressable>
          <Text style={styles.title}>কাছের বিশ্রামের জায়গা</Text>
        </View>

        {/* Placeholder map (real map integration is deferred) */}
        <FakeMap />

        <View style={{ paddingHorizontal: 16, gap: 12, marginTop: 16 }}>
          {STOPS.map((stop) => (
            <View key={stop.name_bn} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stopName}>{stop.name_bn}</Text>
                  <Text style={styles.stopMeta}>{stop.dist} • {stop.time}</Text>
                </View>
                <MapPinIcon size={18} color={colors.coral} />
              </View>
              <View style={styles.amenityRow}>
                {stop.amenities.map((a, i) => (
                  <Text key={`${stop.name_bn}-a-${i}`} style={{ fontSize: 18 }}>{a}</Text>
                ))}
              </View>
              <Pressable
                onPress={() => setSelected(stop.name_bn)}
                style={[styles.cta, { backgroundColor: colors.coral }]}
              >
                <Text style={styles.ctaText}>
                  {selected === stop.name_bn ? 'নেভিগেশন শুরু করছি…' : 'এখানে থামুন'}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>

        <Text style={styles.disclaimer}>
          ℹ️ লাইভ ম্যাপ সংযোগ পরবর্তী রিলিজে আসবে।{'\n'}
          Live map integration coming in a future release.
        </Text>
      </ScrollView>

      <BottomNav />
    </View>
  );
}

function FakeMap() {
  return (
    <View style={styles.mapWrap}>
      <Svg width="100%" height={180} viewBox="0 0 300 180">
        <Path d="M 0 90 Q 75 36 150 90 T 300 90"  stroke={colors.primary} strokeWidth={3} strokeDasharray="8 4" fill="none" />
        <Path d="M 0 120 Q 100 72 200 120 T 300 108" stroke={colors.muted}   strokeWidth={1.5} fill="none" />
      </Svg>
      {STOPS.map((_, i) => (
        <View
          key={`pin-${i}`}
          style={[styles.pin, { left: `${20 + i * 30}%`, top: `${30 + i * 15}%` }]}
        >
          <Text style={styles.pinText}>{i + 1}</Text>
        </View>
      ))}
      <View style={styles.youAreHere}>
        <Text style={styles.youAreHereText}>📍 আপনার অবস্থান</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  backBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.foreground, fontSize: 18, fontWeight: '700' },

  mapWrap: {
    marginHorizontal: 16,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    height: 192, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.border,
    position: 'relative',
  },
  pin: {
    position: 'absolute',
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.coral,
    alignItems: 'center', justifyContent: 'center',
  },
  pinText: { color: colors.primaryFg, fontSize: 12, fontWeight: '800' },
  youAreHere: { position: 'absolute', bottom: 8, left: 8, backgroundColor: colors.primaryAlpha20, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  youAreHereText: { color: colors.primary, fontSize: 12 },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: 14,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  stopName: { color: colors.foreground, fontSize: 15, fontWeight: '700' },
  stopMeta: { color: colors.muted, fontSize: 13, marginTop: 2 },
  amenityRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  cta: { paddingVertical: 12, borderRadius: radius.md, alignItems: 'center' },
  ctaText: { color: colors.primaryFg, fontWeight: '700' },

  disclaimer: { color: colors.muted, fontSize: 11, textAlign: 'center', paddingHorizontal: 24, marginTop: 24, lineHeight: 18 },
});
