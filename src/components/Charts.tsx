import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { theme } from "@/theme";

export interface ChartDatum {
  label: string;
  value: number;
  color?: string;
}

// ---------- Horizontal bar chart (pure RN, no SVG) ----------
export function BarChart({
  data,
  height = 22,
  showValues = true,
}: {
  data: ChartDatum[];
  height?: number;
  showValues?: boolean;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.length === 0) {
    return <Text style={styles.empty}>Aucune donnée</Text>;
  }
  return (
    <View>
      {data.map((d) => (
        <View key={d.label} style={styles.row}>
          <Text style={styles.rowLabel} numberOfLines={1}>
            {d.label}
          </Text>
          <View style={[styles.track, { height }]}>
            <View
              style={[
                styles.fill,
                {
                  height,
                  width: `${(d.value / max) * 100}%`,
                  backgroundColor: d.color ?? theme.colors.primary,
                },
              ]}
            />
          </View>
          {showValues ? <Text style={styles.rowValue}>{d.value}</Text> : null}
        </View>
      ))}
    </View>
  );
}

// ---------- Donut chart (react-native-svg) ----------
export function DonutChart({
  data,
  size = 180,
  thickness = 26,
}: {
  data: ChartDatum[];
  size?: number;
  thickness?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return <Text style={styles.empty}>Aucune donnée</Text>;
  }
  const r = (size - thickness) / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <View style={styles.donutWrap}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          {data.map((d, i) => {
            const len = (d.value / total) * circumference;
            const el = (
              <Circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                stroke={d.color ?? theme.colors.primary}
                strokeWidth={thickness}
                fill="none"
                strokeDasharray={`${len} ${circumference - len}`}
                strokeDashoffset={-offset}
              />
            );
            offset += len;
            return el;
          })}
        </G>
      </Svg>
      <View style={styles.legend}>
        {data.map((d) => (
          <View key={d.label} style={styles.legendRow}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: d.color ?? theme.colors.primary },
              ]}
            />
            <Text style={styles.legendLabel} numberOfLines={1}>
              {d.label}
            </Text>
            <Text style={styles.legendValue}>
              {d.value} ({Math.round((d.value / total) * 100)}%)
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ---------- Stat tile ----------
export function StatTile({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <View style={styles.tile}>
      <Text style={[styles.tileValue, color ? { color } : null]}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  rowLabel: {
    width: 110,
    fontSize: 13,
    color: theme.colors.text,
    paddingEnd: 8,
  },
  track: {
    flex: 1,
    backgroundColor: "#eef2f7",
    borderRadius: 4,
    overflow: "hidden",
  },
  fill: { borderRadius: 4 },
  rowValue: {
    width: 40,
    textAlign: "right",
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.text,
  },
  empty: {
    color: theme.colors.textMuted,
    textAlign: "center",
    paddingVertical: 12,
  },
  donutWrap: { alignItems: "center" },
  legend: { marginTop: 12, alignSelf: "stretch" },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  legendDot: { width: 12, height: 12, borderRadius: 6, marginEnd: 8 },
  legendLabel: { flex: 1, fontSize: 13, color: theme.colors.text },
  legendValue: { fontSize: 13, color: theme.colors.textMuted },
  tile: {
    flex: 1,
    minWidth: 120,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tileValue: { fontSize: 22, fontWeight: "800", color: theme.colors.text },
  tileLabel: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
});
