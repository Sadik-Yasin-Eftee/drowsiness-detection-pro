/**
 * Drive — the main monitoring screen.
 *
 *   • Calls useDrowsinessDetection(true) — this kicks off the simulated face
 *     detector + drowsiness engine pipeline.
 *   • Mounts the camera preview as a corner pip so the user can see that the
 *     camera is alive.
 *   • Renders one of three view modes (Companion / Dashboard / HUD) based on
 *     the user's preference.
 *   • Shows the AlertOverlay on top when an event fires.
 *   • Renders the BottomNav.
 *
 * On unmount we end the trip, which (per the user's privacy settings) wipes
 * trip data unless they've opted to keep it.
 */

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';

import { useAppStore } from '@/store/useAppStore';
import { useDrowsinessDetection } from '@/hooks/useDrowsinessDetection';
import { CompanionMode } from '@/components/drive/CompanionMode';
import { DashboardMode } from '@/components/drive/DashboardMode';
import { HUDMode } from '@/components/drive/HUDMode';
import { AlertOverlay } from '@/components/AlertOverlay';
import { CameraDetector } from '@/components/CameraDetector';
import { BottomNav } from '@/components/BottomNav';
import { colors } from '@/lib/theme';

export default function Drive() {
  const interfaceMode = useAppStore((s) => s.interfaceMode);
  const showAlert = useAppStore((s) => s.showAlert);
  const endTrip = useAppStore((s) => s.endTrip);

  // Kick off the detection pipeline whenever this screen is mounted
  useDrowsinessDetection(true);

  // End trip when this screen unmounts (e.g. user navigates away)
  useEffect(() => () => endTrip(), [endTrip]);

  return (
    <View style={styles.root}>
      {/* The view mode fills the screen */}
      <View style={styles.modeWrap}>
        {interfaceMode === 'companion' && <CompanionMode />}
        {interfaceMode === 'dashboard' && <DashboardMode />}
        {interfaceMode === 'hud'       && <HUDMode />}
      </View>

      {/* Camera preview pip layered on top */}
      <CameraDetector active={true} />

      {/* Drowsiness alert overlay */}
      {showAlert && <AlertOverlay />}

      {/* Bottom nav */}
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgDark },
  modeWrap: { flex: 1 },
});
