/**
 * CameraDetector — frame-capture bridge + status pill.
 *
 * The CameraView is embedded INSIDE the status pill, covered by an opaque
 * layer so it is never visible to the user. This is the only approach that
 * reliably hides Android's SurfaceView, which bypasses overflow:hidden and
 * opacity:0 at the hardware compositor level.
 *
 * The CameraView is always rendered (not gated on permission) so that
 * cameraRef.current is populated before the detector's first capture tick —
 * fixing the race where onboarding → Drive navigation left the detector with
 * a null ref until the user visited Settings and came back.
 *
 * Status colours on the visible pill:
 *   green  → face detected, monitoring active
 *   amber  → camera on, no face in view
 *   red    → camera permission not granted
 */

import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CameraView } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppStore } from '@/store/useAppStore';
import { colors, radius } from '@/lib/theme';

interface Props {
  active: boolean;
  onCameraReady?: (ref: React.RefObject<CameraView | null>) => void;
}

export function CameraDetector({ active, onCameraReady }: Props) {
  const cameraPermission = useAppStore((s) => s.cameraPermission);
  const faceDetected     = useAppStore((s) => s.faceDetected);
  const insets           = useSafeAreaInsets();
  const cameraRef        = useRef<CameraView>(null);

  // Pass the ref once on mount — detector stores it for takePictureAsync.
  // Running unconditionally (not inside an `if (permitted)`) ensures the ref
  // is set before the first capture tick regardless of onboarding flow order.
  useEffect(() => {
    onCameraReady?.(cameraRef);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const permitted  = cameraPermission === 'granted';
  const dotColor   = !permitted ? colors.danger
                   : faceDetected ? colors.primary
                   : colors.warning;
  const label      = !permitted ? 'Camera off'
                   : faceDetected ? 'Monitoring'
                   : 'No face';

  return (
    <View
      pointerEvents="none"
      style={[styles.pill, { top: insets.top + 8 }]}
    >
      {/*
        CameraView sits at the very bottom of the pill's z-stack.
        An opaque cover is layered on top so the camera surface — including
        any capture freeze — is completely hidden from the user.
        Using active={permitted && active} so the camera only runs when
        permission is granted and the Drive screen is foregrounded.
      */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        facing="front"
        active={permitted && active}
        mode="picture"
        mute={true}
      />

      {/* Opaque cover — hides the camera surface + any capture flicker */}
      <View style={[StyleSheet.absoluteFillObject, styles.cover]} />

      {/* Visible status content */}
      <View style={styles.content}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    height: 28,
    minWidth: 90,
    borderRadius: radius.pill,
    overflow: 'hidden',
    zIndex: 5,
    elevation: 5,
  },
  cover: {
    backgroundColor: 'rgba(10, 14, 26, 0.80)',
    borderRadius: radius.pill,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    zIndex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
