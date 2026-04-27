/**
 * CameraDetector — mounts the front-facing expo-camera preview as a small
 * "pip" in the corner of the Drive screen.
 *
 * Why a pip and not a full-screen preview?  Because the driver should be
 * watching the road, not their own face.  The pip is purely a visual
 * confirmation that "yes, the camera is on, the system is watching."
 *
 * Why expo-camera and not Vision Camera v4?  See src/lib/faceDetector.ts —
 * Vision Camera v4 + Reanimated 4 currently break Android builds, and
 * Vision Camera v5 is sponsor-gated.  We use expo-camera for the preview
 * and the SimulatedFaceDetector for the data, with a documented swap-in
 * path when the ecosystem catches up.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CameraView } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppStore } from '@/store/useAppStore';
import { colors, radius } from '@/lib/theme';

export function CameraDetector({ active }: { active: boolean }) {
  const cameraPermission = useAppStore((s) => s.cameraPermission);
  const insets = useSafeAreaInsets();
  // Sit 8px below the status bar so the pip never overlaps the notification area
  const topOffset = insets.top + 8;

  if (cameraPermission !== 'granted') {
    return (
      <View style={[styles.warnPip, { top: topOffset }]}>
        <Text style={styles.warnText}>Camera off</Text>
      </View>
    );
  }

  return (
    <View pointerEvents="none" style={[styles.previewPip, { top: topOffset }]}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="front"
        active={active}
        mode="picture"
        mute={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  previewPip: {
    position: 'absolute',
    right: 16,
    width: 64, height: 80,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1, borderColor: colors.border,
    zIndex: 5,
    elevation: 5,
    opacity: 0.85,
  },
  warnPip: {
    position: 'absolute',
    right: 16,
    backgroundColor: colors.danger,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: radius.sm,
    zIndex: 5, elevation: 5,
  },
  warnText: { color: colors.primaryFg, fontSize: 11, fontWeight: '600' },
});
