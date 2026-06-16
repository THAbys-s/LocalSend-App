// src/components/RadarAnimation.tsx
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withDelay,
  withSequence, withTiming, Easing,
} from 'react-native-reanimated';
import { useTheme } from '../hooks/useTheme';

interface Props {
  size?:   number;
  active?: boolean;
}

function Wave({ size, delay, color }: { size: number; delay: number; color: string }) {
  const scale   = useSharedValue(0.15);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.15, { duration: 0 }),
          withTiming(1, { duration: 2400, easing: Easing.out(Easing.quad) })
        ),
        -1,
        false
      )
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0, { duration: 0 }),
          withTiming(0.4, { duration: 400 }),
          withTiming(0, { duration: 2000 })
        ),
        -1,
        false
      )
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity:    opacity.value,
  }));

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        {
          borderRadius:  size / 2,
          borderWidth:   1.5,
          borderColor:   color,
          width:         size,
          height:        size,
          alignSelf:     'center',
          top:           0,
        },
        style,
      ]}
    />
  );
}

export function RadarAnimation({ size = 260, active = true }: Props) {
  const { colors } = useTheme();

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Static rings */}
      {[0.9, 0.65, 0.42].map((r, i) => (
        <View
          key={i}
          style={{
            position:     'absolute',
            width:        size * r,
            height:       size * r,
            borderRadius: (size * r) / 2,
            borderWidth:  1,
            borderColor:  colors.primary + '28',
          }}
        />
      ))}

      {/* Animated waves */}
      {active && [0, 700, 1400].map((delay, i) => (
        <Wave key={i} size={size * 0.88} delay={delay} color={colors.primary} />
      ))}

      {/* Center glow */}
      <View style={{
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: colors.primary + '25',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: colors.primary }} />
      </View>
    </View>
  );
}
