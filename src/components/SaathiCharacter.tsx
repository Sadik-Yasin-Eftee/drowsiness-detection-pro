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

  const scale  = useSharedValue(1);
  const shakeX = useSharedValue(0);
  const blinkY = useSharedValue(1);

  useEffect(() => {
    cancelAnimation(scale);
    cancelAnimation(shakeX);
    cancelAnimation(blinkY);

    if (alertLevel === 0) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
          withTiming(1.0,  { duration: 1800, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      );
      blinkY.value = withRepeat(
        withSequence(
          withTiming(1,    { duration: 3500 }),
          withTiming(0.05, { duration: 110  }),
          withTiming(1,    { duration: 110  }),
        ),
        -1,
      );
    } else if (alertLevel === 1) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 900, easing: Easing.inOut(Easing.quad) }),
          withTiming(1.0,  { duration: 900, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      );
    } else if (alertLevel === 2) {
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

  const outerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: shakeX.value },
      { scale: scale.value },
    ],
  }));

  const innerStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: blinkY.value }],
  }));

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
