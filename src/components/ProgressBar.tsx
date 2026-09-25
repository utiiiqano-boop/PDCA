import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "@/theme";
import { useTranslation } from "@/i18n/I18nProvider";

interface Props {
  value: number; // 0-100
  color?: string;
  height?: number;
  showLabel?: boolean;
  label?: string;
}

export function ProgressBar({
  value,
  color,
  height = 10,
  showLabel = true,
  label,
}: Props) {
  const { t: tr } = useTranslation();
  const clamped = Math.max(0, Math.min(100, value));
  const fillColor = color ?? theme.colors.primary;

  return (
    <View style={styles.wrap}>
      {showLabel ? (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label ?? tr("common.realization")}</Text>
          <Text style={[styles.pct, { color: fillColor }]}>{clamped}%</Text>
        </View>
      ) : null}
      <View style={[styles.track, { height }]}>
        <View
          style={[
            styles.fill,
            { width: `${clamped}%`, height, backgroundColor: fillColor },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginVertical: 4 },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  label: { fontSize: 12, color: theme.colors.textMuted, fontWeight: "600" },
  pct: { fontSize: 14, fontWeight: "800" },
  track: {
    backgroundColor: "#eef2f7",
    borderRadius: 999,
    overflow: "hidden",
  },
  fill: { borderRadius: 999 },
});
