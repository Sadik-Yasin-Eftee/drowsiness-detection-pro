/**
 * BottomNav — persistent tab bar on Drive, RestStops, Analytics and Settings.
 *
 * Uses expo-router's `usePathname` for active-state and `router.push` for
 * navigation.  We avoid expo-router's built-in <Tabs> here because the FE
 * design uses a custom non-standard layout (rounded pills, Bangla labels)
 * that's easier to render manually.
 */

import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CarIcon, MapPinIcon, ChartIcon, SettingsIcon } from './Icons';
import { colors, radius } from '@/lib/theme';
import { useAppStore } from '@/store/useAppStore';

const TABS = [
  { path: '/drive',      bn: 'ড্রাইভ',     en: 'Drive',     Icon: CarIcon },
  { path: '/rest-stops', bn: 'বিশ্রাম',   en: 'Rest',       Icon: MapPinIcon },
  { path: '/analytics',  bn: 'বিশ্লেষণ',  en: 'Analytics',  Icon: ChartIcon },
  { path: '/settings',   bn: 'সেটিংস',    en: 'Settings',   Icon: SettingsIcon },
] as const;

export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const language = useAppStore((s) => s.language);

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {TABS.map(({ path, bn, en, Icon }) => {
        const active = pathname.startsWith(path);
        const tint = active ? colors.primary : colors.muted;
        return (
          <Pressable
            key={path}
            onPress={() => router.replace(path as any)}
            style={styles.tab}
            android_ripple={{ color: colors.primaryAlpha20, borderless: true, radius: 32 }}
          >
            <Icon size={22} color={tint} />
            <Text style={[styles.label, { color: tint }]}>
              {language === 'bn' ? bn : en}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.bgDark,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    gap: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
});
