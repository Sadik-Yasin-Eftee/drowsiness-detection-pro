/**
 * Root layout — wraps the entire app.
 *
 * Responsibilities, top to bottom:
 *   1. GestureHandlerRootView   — required by Reanimated v4 + gesture libs
 *   2. SafeAreaProvider         — provides safe-area insets to the BottomNav
 *   3. Hydrate the persisted store before showing any UI (prevents flicker)
 *   4. StatusBar styling
 *   5. Splash-screen control — keep the OS splash until we know whether to
 *      route to permissions / onboarding / drive
 *   6. Stack navigator with no header (each screen owns its chrome)
 */

import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as KeepAwake from 'expo-keep-awake';

import { useAppStore } from '@/store/useAppStore';
import { colors } from '@/lib/theme';

// Keep the OS splash visible until we hydrate prefs
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const hydrate = useAppStore((s) => s.hydrate);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      await hydrate();
      setReady(true);
      await SplashScreen.hideAsync().catch(() => {});
    })();

    // Keep the screen on while the app is in the foreground — driving safety
    KeepAwake.activateKeepAwakeAsync().catch(() => {});
    return () => { KeepAwake.deactivateKeepAwake().catch(() => {}); };
  }, [hydrate]);

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: colors.bgDark }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor={colors.bgDark} />
        <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: colors.bgDark } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="permissions" />
          <Stack.Screen name="onboarding/index" />
          <Stack.Screen name="drive" />
          <Stack.Screen name="rest-stops" />
          <Stack.Screen name="analytics" />
          <Stack.Screen name="settings" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
