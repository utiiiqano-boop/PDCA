import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "@/theme";

interface Props {
  icon: string;
  label: string;
  value: number | string;
  color?: string;
  trend?: {
    value: number;
    label: string;
  };
}

export function StatCard({ icon, label, value, color, trend }: Props) {
  const accent = color ?? theme.colors.primary;
  const isPositive = trend ? trend.value > 0 : false;
  const isNegative = trend ? trend.value < 0 : false;
  const trendColor = isPositive
    ? theme.colors.success
    : isNegative
      ? theme.colors.danger
      : theme.colors.textMuted;
  const trendArrow = isPositive ? "↑" : isNegative ? "↓" : "→";

  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>{icon}</Text>
      </View>

      <Text style={[styles.value, { color: accent }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>

      {trend ? (
        <View style={styles.trendRow}>
          <Text style={[styles.trendArrow, { color: trendColor }]}>
            {trendArrow}
          </Text>
          <Text style={[styles.trendTxt, { color: trendColor }]}>
            {Math.abs(trend.value)} {trend.label}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing(4),
    borderWidth: 1,
    borderColor: theme.colors.divider,
    shadowColor: "#0f4c81",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing(3),
  },
  icon: { fontSize: 18 },
  value: {
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: "700",
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: theme.spacing(2),
  },
  trendArrow: {
    fontSize: 12,
    fontWeight: "900",
  },
  trendTxt: {
    fontSize: 11,
    fontWeight: "700",
  },
});
