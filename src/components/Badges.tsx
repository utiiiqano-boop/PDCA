import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "@/theme";
import type { ActionStatus, Priority } from "@/types/database";
import { useTranslation } from "@/i18n/I18nProvider";

const STATUS_COLORS: Record<ActionStatus, { fg: string; bg: string }> = {
  OPEN:        { fg: theme.colors.info,    bg: theme.colors.infoSoft },
  IN_PROGRESS: { fg: theme.colors.warning, bg: theme.colors.warningSoft },
  COMPLETED:   { fg: theme.colors.success, bg: theme.colors.successSoft },
  CANCELLED:   { fg: theme.colors.textMuted, bg: theme.colors.neutralSoft },
  OVERDUE:     { fg: theme.colors.danger,  bg: theme.colors.dangerSoft },
};

const PRIORITY_COLORS: Record<Priority, { fg: string; bg: string }> = {
  LOW:    { fg: theme.colors.success, bg: theme.colors.successSoft },
  MEDIUM: { fg: "#B45309",            bg: theme.colors.warningSoft },
  HIGH:   { fg: theme.colors.danger,  bg: theme.colors.dangerSoft },
};

export function StatusBadge({ status }: { status: ActionStatus }) {
  const { t: tr } = useTranslation();
  const c = STATUS_COLORS[status];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <View style={[styles.dot, { backgroundColor: c.fg }]} />
      <Text style={[styles.txt, { color: c.fg }]}>{tr("status." + status)}</Text>
    </View>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const { t: tr } = useTranslation();
  const c = PRIORITY_COLORS[priority];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <View style={[styles.dot, { backgroundColor: c.fg }]} />
      <Text style={[styles.txt, { color: c.fg }]}>{tr("priority." + priority)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: theme.spacing(3),
    paddingVertical: 5,
    borderRadius: theme.radius.pill,
    alignSelf: "flex-start",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  txt: {
    fontSize: theme.font.size.xs,
    fontWeight: theme.font.weight.bold,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
});
