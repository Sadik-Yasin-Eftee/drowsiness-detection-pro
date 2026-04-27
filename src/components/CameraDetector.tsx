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

import { useAppStore } from '@/store/useAppStore';
import { colors, radius } from '@/lib/theme';

export function CameraDetector({ active }: { active: boolean }) {
  const cameraPermission = useAppStore((s) => s.cameraPermission);

  if (cameraPermission !== 'granted') {
    return (
      <View style={styles.warnPip}>
        <Text style={styles.warnText}>Camera off</Text>
      </View>
    );
  }

  return (
    <View pointerEvents="none" style={styles.previewPip}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="front"
        active={active}
        // No photo / video / audio — we just need the live preview
        mode="picture"
        mute={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // A tiny corner preview — visible just enough to confirm "camera is on"
  // without distracting the driver.
  previewPip: {
    position: 'absolute',
    top: 16, right: 16,
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
    top: 16, right: 16,
    backgroundColor: colors.danger,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: radius.sm,
    zIndex: 5, elevation: 5,
  },
  warnText: { color: colors.primaryFg, fontSize: 11, fontWeight: '600' },
});
