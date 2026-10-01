import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "@/theme";

interface Props {
  onDone: () => void;
  duration?: number;
}

const LETTERS = ["P", "D", "C", "A"];

export function AnimatedSplash({ onDone, duration = 5000 }: Props) {
  // Letters : scale + opacity + rotate
  const scales = useRef(LETTERS.map(() => new Animated.Value(0))).current;
  const opacities = useRef(LETTERS.map(() => new Animated.Value(0))).current;
  const rotations = useRef(LETTERS.map(() => new Animated.Value(-90))).current;

  // Ring animation
  const ringScale = useRef(new Animated.Value(0)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;

  // Subtitle
  const subtitleOpacity = useRef(new Animated.Value(0)).current;

  // Whole screen fade-out at the end
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Letters pop one by one
    const letterAnims = LETTERS.map((_, i) =>
      Animated.sequence([
        Animated.delay(i * 350),
        Animated.parallel([
          Animated.timing(opacities[i]!, {
            toValue: 1,
            duration: 260,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.spring(scales[i]!, {
            toValue: 1,
            speed: 12,
            bounciness: 14,
            useNativeDriver: true,
          }),
          Animated.timing(rotations[i]!, {
            toValue: 0,
            duration: 420,
            easing: Easing.out(Easing.back(2)),
            useNativeDriver: true,
          }),
        ]),
      ]),
    );

    // 2. Ring draws around after letters
    const ringAnim = Animated.sequence([
      Animated.delay(LETTERS.length * 350 + 200),
      Animated.parallel([
        Animated.timing(ringOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(ringScale, {
          toValue: 1,
          speed: 8,
          bounciness: 8,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(ringOpacity, {
        toValue: 0,
        duration: 600,
        delay: 400,
        useNativeDriver: true,
      }),
    ]);

    // 3. Subtitle
    const subtitleAnim = Animated.timing(subtitleOpacity, {
      toValue: 1,
      duration: 500,
      delay: LETTERS.length * 350 + 500,
      useNativeDriver: true,
    });

    Animated.parallel([...letterAnims, ringAnim, subtitleAnim]).start();

    // 4. Screen fade-out before onDone
    const fadeTimer = setTimeout(() => {
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => onDone());
    }, duration - 400);

    return () => clearTimeout(fadeTimer);
  }, [
    scales,
    opacities,
    rotations,
    ringOpacity,
    ringScale,
    subtitleOpacity,
    screenOpacity,
    onDone,
    duration,
  ]);

  return (
    <Animated.View style={[styles.root, { opacity: screenOpacity }]}>
      <LinearGradient
        colors={[theme.colors.primary, "#062a4a", "#000814"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Ring (cycle PDCA) */}
        <Animated.View
          style={[
            styles.ring,
            {
              opacity: ringOpacity,
              transform: [{ scale: ringScale }],
            },
          ]}
        />

        {/* Letters */}
        <View style={styles.lettersRow}>
          {LETTERS.map((l, i) => (
            <Animated.Text
              key={l}
              style={[
                styles.letter,
                {
                  opacity: opacities[i]!,
                  transform: [
                    { scale: scales[i]! },
                    {
                      rotate: rotations[i]!.interpolate({
                        inputRange: [-90, 0],
                        outputRange: ["-90deg", "0deg"],
                      }),
                    },
                  ],
                },
              ]}
            >
              {l}
            </Animated.Text>
          ))}
        </View>

        {/* Subtitle */}
        <Animated.Text style={[styles.subtitle, { opacity: subtitleOpacity }]}>
          GESTION INDUSTRIELLE
        </Animated.Text>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  gradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: "#ffffff33",
  },
  lettersRow: {
    flexDirection: "row",
    gap: 6,
  },
  letter: {
    fontSize: 62,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 2,
    textShadowColor: "#0f4c8155",
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
  },
  subtitle: {
    marginTop: 24,
    fontSize: 12,
    color: "#ffffffaa",
    letterSpacing: 4,
    fontWeight: "700",
  },
});
