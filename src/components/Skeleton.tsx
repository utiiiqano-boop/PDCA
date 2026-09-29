import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, ViewStyle } from "react-native";
import { theme } from "@/theme";

interface BoxProps {
  width?: number | string;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}

export function SkeletonBox({ width = "100%", height = 16, radius = 6, style }: BoxProps) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.75,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as number | `${number}%`,
          height,
          borderRadius: radius,
          backgroundColor: theme.colors.divider,
          opacity,
        },
        style,
      ]}
    />
  );
}

/** Skeleton for a list card (PDCA-style) */
export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <SkeletonBox width={8} height={8} radius={4} />
        <SkeletonBox width={120} height={12} />
      </View>
      <SkeletonBox width="80%" height={18} style={{ marginTop: 12 }} />
      <View style={[styles.row, { marginTop: 12, gap: 8 }]}>
        <SkeletonBox width={70} height={20} radius={999} />
        <SkeletonBox width={90} height={20} radius={999} />
      </View>
      <View style={{ marginTop: 16 }}>
        <SkeletonBox height={8} radius={999} />
      </View>
      <View style={[styles.row, { marginTop: 12, justifyContent: "space-between" }]}>
        <SkeletonBox width={60} height={16} radius={999} />
        <SkeletonBox width={50} height={12} />
      </View>
    </View>
  );
}

/** Skeleton for a list of cards */
export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

/** Skeleton for a header (title + subtitle) */
export function SkeletonHeader() {
  return (
    <View style={styles.header}>
      <SkeletonBox width={180} height={24} />
      <SkeletonBox width={100} height={12} style={{ marginTop: 8 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing(4),
    marginBottom: theme.spacing(3),
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  list: {
    paddingHorizontal: theme.spacing(4),
    paddingTop: theme.spacing(2),
  },
  header: {
    paddingHorizontal: theme.spacing(4),
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(3),
  },
});
