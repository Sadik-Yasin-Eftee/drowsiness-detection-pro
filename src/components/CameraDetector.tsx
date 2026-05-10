/**
 * CameraDetector — on-device face detection via expo-camera + ML Kit
 *
 * Captures a still frame every 400 ms with CameraView.takePictureAsync,
 * passes the URI to @react-native-ml-kit/face-detection (pure native bridge,
 * no network), then maps the result to RawFaceFrame and calls onFaceResult.
 * The camera preview is hidden behind an opaque pill indicator.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CameraView } from 'expo-camera';
import FaceDetection from '@react-native-ml-kit/face-detection';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppStore } from '@/store/useAppStore';
import { colors, radius } from '@/lib/theme';
import type { RawFaceFrame } from '@/lib/drowsinessEngine';

const CAPTURE_INTERVAL_MS = 400;

interface Props {
  active: boolean;
  onFaceResult: (frame: RawFaceFrame | null) => void;
}

export function CameraDetector({ active, onFaceResult }: Props) {
  const cameraPermission = useAppStore((s) => s.cameraPermission);
  const faceDetected     = useAppStore((s) => s.faceDetected);
  const insets           = useSafeAreaInsets();

  const cameraRef       = useRef<CameraView | null>(null);
  const capturingRef    = useRef(false);
  const onFaceResultRef = useRef(onFaceResult);
  onFaceResultRef.current = onFaceResult;

  const doCapture = useCallback(async () => {
    if (capturingRef.current || !cameraRef.current) return;
    capturingRef.current = true;
    let photoUri: string | undefined;
    try {
      const photo = await (cameraRef.current as any).takePictureAsync({
        quality: 0.4,
        shutterSound: false,
        skipProcessing: true,
      });
      photoUri = photo?.uri;
      if (!photoUri) return;

      const faces = await FaceDetection.detect(photoUri, {
        classificationMode: 'all',
        performanceMode: 'fast',
      });

      if (faces.length > 0) {
        const f = faces[0];
        onFaceResultRef.current({
          leftEyeOpenProbability:  f.leftEyeOpenProbability  ?? null,
          rightEyeOpenProbability: f.rightEyeOpenProbability ?? null,
          pitch: f.rotationX,
          yaw:   f.rotationY,
          roll:  f.rotationZ,
          timestamp: Date.now(),
        });
      } else {
        onFaceResultRef.current(null);
      }
    } catch (err) {
      console.warn('[CameraDetector] capture error:', err);
    } finally {
      capturingRef.current = false;
      if (photoUri) {
        try {
          const FS = require('expo-file-system/legacy') as { deleteAsync: (uri: string) => Promise<void> };
          void FS.deleteAsync(photoUri);
        } catch {}
      }
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const schedule = () => {
      if (cancelled) return;
      setTimeout(async () => {
        await doCapture();
        if (!cancelled) schedule();
      }, CAPTURE_INTERVAL_MS);
    };
    // small initial delay so the camera has time to warm up
    const warmup = setTimeout(() => { if (!cancelled) schedule(); }, 800);
    return () => {
      cancelled = true;
      clearTimeout(warmup);
    };
  }, [active, doCapture]);

  const permitted = cameraPermission === 'granted';
  const dotColor  = !permitted ? colors.danger
                  : faceDetected ? colors.primary
                  : colors.warning;
  const label     = !permitted ? 'Camera off'
                  : faceDetected ? 'Monitoring'
                  : 'No face';

  return (
    <>
      {/* Camera rendered off-screen — Android SurfaceView punches through any
          overlay, so the only way to hide the shutter flicker is to position
          the view outside the visible viewport entirely. */}
      {permitted && active ? (
        <CameraView
          ref={cameraRef}
          style={styles.offScreen}
          facing="front"
          flash="off"
          animateShutter={false}
        />
      ) : null}

      <View
        pointerEvents="none"
        style={[styles.pill, { top: insets.top + 8 }]}
      >
        <View style={[StyleSheet.absoluteFillObject, styles.cover]} />
        <View style={styles.content}>
          <View style={[styles.dot, { backgroundColor: dotColor }]} />
          <Text style={styles.label}>{label}</Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  offScreen: {
    position: 'absolute',
    top: -9999,
    left: -9999,
    width: 100,
    height: 100,
  },

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
    backgroundColor: colors.bgDark,
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
