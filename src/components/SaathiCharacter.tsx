/**
 * Saathi (সাথী = "companion") — the on-screen AI companion in Companion mode.
 *
 * Visual: a stylised eye that breathes when calm, scrunches when worried,
 * and shakes with concern at high alert levels.  No text, no icons — pure
 * shape + motion, so it works regardless of the user's literacy or language.
 *
 * State driver: reads `currentAlertLevel` from the store and picks one of
 * four expressions: 'calm', 'curious', 'worried', 'urgent'.
 *
 * Implementation note: we animate the WHOLE eye via a wrapper View's
 * scale + translate (which Reanimated handles natively, no SVG-prop
 * acrobatics needed).  Blinks are scaleY pulses on a separate inner
 * wrapper; the SVG itself is static.
 */

import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse } from 'react-native-svg';

import { useAppStore } from '@/store/useAppStore';
import { colors } from '@/lib/theme';

interface Props {
  size?: number;
}

export function SaathiCharacter({ size = 160 }: Props) {
  const alertLevel = useAppStore((s) => s.currentAlertLevel);

  // Three independent animated values:
  //   scale     — overall "breathing" (whole eye grows/shrinks)
  //   shake     — left/right wobble at high alert
  //   blinkY    — vertical scale (1 = eye open, 0.05 = eye closed)
  const scale  = useSharedValue(1);
  const shakeX = useSharedValue(0);
  const blinkY = useSharedValue(1);

  // Drive animations from alert level
  useEffect(() => {
    cancelAnimation(scale);
    cancelAnimation(shakeX);
    cancelAnimation(blinkY);

    if (alertLevel === 0) {
      // Calm breathing
      scale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
          withTiming(1.0,  { duration: 1800, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      );
      // Occasional blink — a quick scaleY collapse + restore every ~3.5s
      blinkY.value = withRepeat(
        withSequence(
          withTiming(1,    { duration: 3500 }),
          withTiming(0.05, { duration: 110  }),
          withTiming(1,    { duration: 110  }),
        ),
        -1,
      );
    } else if (alertLevel === 1) {
      // Curious — subtler scale, no wobble yet
      scale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 900, easing: Easing.inOut(Easing.quad) }),
          withTiming(1.0,  { duration: 900, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      );
    } else if (alertLevel === 2) {
      // Worried pulse + small shake
      scale.value = withRepeat(
        withSequence(
          withTiming(1.10, { duration: 450 }),
          withTiming(0.96, { duration: 450 }),
        ),
        -1,
      );
      shakeX.value = withRepeat(
        withSequence(
          withTiming(-3, { duration: 110 }),
          withTiming( 3, { duration: 110 }),
          withTiming( 0, { duration: 110 }),
        ),
        -1,
      );
    } else {
      // Urgent shake
      scale.value = withRepeat(
        withSequence(
          withTiming(1.14, { duration: 200 }),
          withTiming(0.94, { duration: 200 }),
        ),
        -1,
      );
      shakeX.value = withRepeat(
        withSequence(
          withTiming(-7, { duration: 80 }),
          withTiming( 7, { duration: 80 }),
          withTiming( 0, { duration: 80 }),
        ),
        -1,
      );
    }
  }, [alertLevel, scale, shakeX, blinkY]);

  // Outer wrapper — scale (breathing) + translateX (shake)
  const outerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: shakeX.value },
      { scale: scale.value },
    ],
  }));

  // Inner wrapper — scaleY for blinks
  const innerStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: blinkY.value }],
  }));

  // Eye colour shifts with alert state
  const eyeColor =
    alertLevel === 3 ? colors.coral : alertLevel === 2 ? colors.warning : colors.primary;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={outerStyle}>
        <Animated.View style={innerStyle}>
          <Svg width={size} height={size} viewBox="0 0 100 100">
            <Ellipse
              cx={50} cy={50} rx={40} ry={28}
              fill="#F8FAFC"
              stroke={eyeColor}
              strokeWidth={3}
            />
            <Circle cx={50} cy={52} r={14} fill={eyeColor} />
            <Circle cx={50} cy={52} r={6} fill="#0F172A" />
            <Circle cx={46} cy={48} r={2.5} fill="#F8FAFC" opacity={0.9} />
          </Svg>
        </Animated.View>
      </Animated.View>
    </View>
  );
}
