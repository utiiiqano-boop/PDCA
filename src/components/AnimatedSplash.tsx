import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface Props {
  onDone: () => void;
  duration?: number;
}

const LETTERS = ["P", "D", "C", "A"];
const GOLD = "#C9A961";

export function AnimatedSplash({ onDone, duration = 4200 }: Props) {
  const scales = useRef(LETTERS.map(() => new Animated.Value(0))).current;
  const opacities = useRef(LETTERS.map(() => new Animated.Value(0))).current;
  const rotations = useRef(LETTERS.map(() => new Animated.Value(-90))).current;

  const ringScale = useRef(new Animated.Value(0)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const ringRotate = useRef(new Animated.Value(0)).current;

  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const goldLineWidth = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Letters pop one by one
    const letterAnims = LETTERS.map((_, i) =>
      Animated.sequence([
        Animated.delay(i * 320),
        Animated.parallel([
          Animated.timing(opacities[i]!, {
            toValue: 1,
            duration: 300,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.spring(scales[i]!, {
            toValue: 1,
            speed: 10,
            bounciness: 10,
            useNativeDriver: true,
          }),
          Animated.timing(rotations[i]!, {
            toValue: 0,
            duration: 480,
            easing: Easing.out(Easing.back(2)),
            useNativeDriver: true,
          }),
        ]),
      ]),
    );

    // 2. Gold ring draws + rotates slightly
    const ringAnim = Animated.sequence([
      Animated.delay(LETTERS.length * 320 + 200),
      Animated.parallel([
        Animated.timing(ringOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(ringScale, {
          toValue: 1,
          speed: 6,
          bounciness: 6,
          useNativeDriver: true,
        }),
      ]),
      // Slow rotation
      Animated.loop(
        Animated.timing(ringRotate, {
          toValue: 1,
          duration: 8000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ),
    ]);

    // 3. Subtitle + gold line
    const subtitleAnim = Animated.timing(subtitleOpacity, {
      toValue: 1,
      duration: 600,
      delay: LETTERS.length * 320 + 500,
      useNativeDriver: true,
    });

    const goldLineAnim = Animated.timing(goldLineWidth, {
      toValue: 1,
      duration: 700,
      delay: LETTERS.length * 320 + 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });

    Animated.parallel([...letterAnims, ringAnim, subtitleAnim, goldLineAnim]).start();

    // 4. Fade-out at the end
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
    ringRotate,
    subtitleOpacity,
    goldLineWidth,
    screenOpacity,
    onDone,
    duration,
  ]);

  return (
    <Animated.View style={[styles.root, { opacity: screenOpacity }]}>
      <LinearGradient
        colors={["#0A1929", "#0d2c4d", "#0f4c81"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.centerWrap}>
          {/* Gold ring */}
          <Animated.View
            style={[
              styles.ring,
              {
                opacity: ringOpacity,
                transform: [
                  { scale: ringScale },
                  {
                    rotate: ringRotate.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0deg", "360deg"],
                    }),
                  },
                ],
              },
            ]}
          />

          {/* Letters P D C A */}
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
          <Animated.Text
            style={[styles.subtitle, { opacity: subtitleOpacity }]}
          >
            GESTION INDUSTRIELLE
          </Animated.Text>
        </View>

        {/* Bottom gold line */}
        <View style={styles.bottomWrap}>
          <Animated.View
            style={[
              styles.goldLine,
              {
                transform: [
                  {
                    scaleX: goldLineWidth.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 1],
                    }),
                  },
                ],
              },
            ]}
          />
        </View>
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
  centerWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 1.5,
    borderColor: GOLD + "66",
    borderStyle: "solid",
  },
  lettersRow: {
    flexDirection: "row",
    gap: 4,
  },
  letter: {
    fontSize: 68,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 2,
    textShadowColor: GOLD + "33",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 16,
  },
  subtitle: {
    marginTop: 36,
    fontSize: 11,
    color: GOLD,
    letterSpacing: 6,
    fontWeight: "700",
  },
  bottomWrap: {
    position: "absolute",
    bottom: 56,
    alignItems: "center",
  },
  goldLine: {
    width: 60,
    height: 2,
    borderRadius: 1,
    backgroundColor: GOLD,
  },
});
