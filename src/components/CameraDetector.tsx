/**
 * CameraDetector — front-facing camera pip + frame-capture bridge.
 *
 * Renders a small corner pip so the driver can confirm the camera is live.
 * When `onCameraReady` is provided, passes its camera ref to the caller so
 * the MLKitFaceDetector can call takePictureAsync() on each capture cycle.
 *
 * The pip border colour reflects real-time detection state:
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
  /** Called once on mount with the stable CameraView ref. MLKitFaceDetector
   *  stores this ref and uses it for frame capture. */
  onCameraReady?: (ref: React.RefObject<CameraView | null>) => void;
}

export function CameraDetector({ active, onCameraReady }: Props) {
  const cameraPermission = useAppStore((s) => s.cameraPermission);
  const faceDetected = useAppStore((s) => s.faceDetected);
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const topOffset = insets.top + 8;

  // Pass the stable ref object to the parent once — the detector will use
  // cameraRef.current whenever it needs to capture a frame.
  useEffect(() => {
    onCameraReady?.(cameraRef);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (cameraPermission !== 'granted') {
    return (
      <View style={[styles.warnPip, { top: topOffset }]}>
        <Text style={styles.warnText}>Camera off</Text>
      </View>
    );
  }

  const borderColor = faceDetected ? colors.primary : colors.warning;

  return (
    <View pointerEvents="none" style={[styles.previewPip, { top: topOffset, borderColor }]}>
      <CameraView
        ref={cameraRef}
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
    borderWidth: 2,
    zIndex: 5,
    elevation: 5,
    opacity: 0.9,
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
