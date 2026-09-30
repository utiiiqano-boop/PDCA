import React, { useEffect, useRef } from "react";
import { Animated, ViewStyle } from "react-native";

interface Props {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  offsetY?: number;
  style?: ViewStyle;
}

export function FadeInView({
  children,
  delay = 0,
  duration = 500,
  offsetY = 20,
  style,
}: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(offsetY)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, duration, opacity, translateY]);

  return (
    <Animated.View
      style={[{ opacity, transform: [{ translateY }] }, style]}
    >
      {children}
    </Animated.View>
  );
}
