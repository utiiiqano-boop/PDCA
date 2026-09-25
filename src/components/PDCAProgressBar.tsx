import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@/theme";
import type { PDCAPhase } from "@/types/database";
import { PHASE_TO_PROGRESS } from "@/constants/options";
import { useTranslation } from "@/i18n/I18nProvider";

const PHASES: PDCAPhase[] = ["P", "D", "C", "A"];

interface Props {
  phase: PDCAPhase;
  onSelect?: (p: PDCAPhase) => void;
}

const PHASE_KEY: Record<PDCAPhase, string> = { P: "PLAN", D: "DO", C: "CHECK", A: "ACT" };

export function PDCAProgressBar({ phase, onSelect }: Props) {
  const { t: tr } = useTranslation();
  const activeIdx = PHASES.indexOf(phase);
  const progress = PHASE_TO_PROGRESS[phase];

  return (
    <View style={styles.wrap}>
      <View style={styles.track}>
        {PHASES.map((p, i) => {
          const active = i <= activeIdx;
          return (
            <Pressable
              key={p}
              disabled={!onSelect}
              onPress={() => onSelect?.(p)}
              style={styles.segmentTouch}
              accessibilityRole="button"
              accessibilityLabel={`${tr("phase." + PHASE_KEY[p])} (${PHASE_TO_PROGRESS[p]}%)`}
            >
              <View style={[styles.dot, active && styles.dotActive]} />
              <Text style={[styles.phase, active && styles.phaseActive]}>{p}</Text>
            </Pressable>
          );
        })}
        <View style={[styles.line, { left: "6%" , right: "6%" }]} pointerEvents="none" />
      </View>
      <View style={styles.labels}>
        {PHASES.map((p) => (
          <Text key={p} style={styles.pct}>{PHASE_TO_PROGRESS[p]}%</Text>
        ))}
      </View>
      <Text style={styles.current}>
        {tr("phase.current")} : <Text style={{ fontWeight: "700" }}>{phase}</Text> — {tr("phase." + PHASE_KEY[phase])} ({progress}%)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 8 },
  track: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", position: "relative" },
  segmentTouch: { alignItems: "center", width: 48 },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: "#cbd5e1" },
  dotActive: { backgroundColor: theme.colors.primary },
  phase: { marginTop: 6, fontSize: 14, fontWeight: "600", color: theme.colors.textMuted },
  phaseActive: { color: theme.colors.primary },
  line: { position: "absolute", top: 7, height: 2, backgroundColor: "#e2e8f0", zIndex: -1 },
  labels: { flexDirection: "row", justifyContent: "space-between", marginTop: 2, paddingHorizontal: 4 },
  pct: { fontSize: 11, color: theme.colors.textMuted, width: 48, textAlign: "center" },
  current: { marginTop: 8, fontSize: 13, color: theme.colors.text },
});
