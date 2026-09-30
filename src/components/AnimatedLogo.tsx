import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { theme } from "@/theme";

interface Props {
  /** "P" logo size */
  logoSize?: number;
  /** "PDCA" letters size */
  titleSize?: number;
  /** subtitle text */
  subtitle?: string;
}

export function AnimatedLogo({
  logoSize = 72,
  titleSize = 40,
  subtitle = "Gestion industrielle",
}: Props) {
  // Pulse for logo "P"
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.06,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.delay(400),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  // Letters : P, D, C, A — each with its own animated value
  const letters = ["P", "D", "C", "A"];
  const letterAnims = useRef(letters.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const animations = letterAnims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(800 + i * 150),
          Animated.timing(anim, {
            toValue: -10,
            duration: 220,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true,
          }),
          Animated.delay(1400 - i * 150),
        ]),
      ),
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [letterAnims]);

  return (
    <View style={styles.wrap}>
      <Animated.View
        style={[
          styles.logoBox,
          {
            width: logoSize,
            height: logoSize,
            borderRadius: logoSize / 4,
            transform: [{ scale: pulse }],
          },
        ]}
      >
        <Text style={[styles.logoText, { fontSize: logoSize * 0.55 }]}>P</Text>
      </Animated.View>

      <View style={styles.lettersRow}>
        {letters.map((l, i) => (
          <Animated.Text
            key={l}
            style={[
              styles.letter,
              {
                fontSize: titleSize,
                transform: [{ translateY: letterAnims[i]! }],
              },
            ]}
          >
            {l}
          </Animated.Text>
        ))}
      </View>

      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", marginBottom: theme.spacing(8) },
  logoBox: {
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing(4),
    ...theme.shadow.md,
  },
  logoText: {
    fontWeight: theme.font.weight.black,
    color: "#fff",
    letterSpacing: 1,
  },
  lettersRow: {
    flexDirection: "row",
    gap: 4,
    marginBottom: theme.spacing(2),
  },
  letter: {
    fontWeight: theme.font.weight.black,
    color: theme.colors.primary,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: theme.font.size.base,
    color: theme.colors.textMuted,
    letterSpacing: 1,
  },
});
