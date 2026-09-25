import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/Card";
import { PriorityBadge, StatusBadge } from "@/components/Badges";
import { PDCAProgressBar } from "@/components/PDCAProgressBar";
import { theme } from "@/theme";
import { useTranslation } from "@/i18n/I18nProvider";
import type { PDCAPhase, PDCAActionRow, Priority } from "@/types/database";

interface Props {
  index: number;
  action: PDCAActionRow;
  priority?: Priority;
  onEdit?: () => void;
  onDelete?: () => void;
  onPhaseChange?: (p: PDCAPhase) => void;
}

export function ActionCard({ index, action, priority, onEdit, onDelete, onPhaseChange }: Props) {
  const { t: tr } = useTranslation();
  return (
    <Card>
      <View style={styles.head}>
        <Text style={styles.title}>{tr("pdcaForm.actionLabel")} {index + 1}</Text>
        <StatusBadge status={action.status} />
      </View>

      <Text style={styles.label}>{tr("pdcaForm.actionLabel")}</Text>
      <Text style={styles.value}>{action.action}</Text>

      <Text style={styles.label}>{tr("pdcaDetail.pilot")}</Text>
      <Text style={styles.value}>{action.pilot_name}</Text>

      <View style={{ flexDirection: "row", gap: 16, marginTop: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{tr("pdcaDetail.openingDate")}</Text>
          <Text style={styles.value}>{action.opening_date}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{tr("pdcaDetail.dueDate")}</Text>
          <Text style={styles.value}>{action.due_date ?? "—"}</Text>
        </View>
      </View>

      {priority ? (
        <View style={{ marginTop: 8 }}>
          <Text style={styles.label}>{tr("pdcaDetail.priority")}</Text>
          <PriorityBadge priority={priority} />
        </View>
      ) : null}

      <View style={{ marginTop: 12 }}>
        <PDCAProgressBar phase={action.phase} onSelect={onPhaseChange} />
      </View>

      {(onEdit || onDelete) && (
        <View style={styles.row}>
          {onEdit && (
            <Pressable onPress={onEdit} style={[styles.btn, styles.btnGhost]}>
              <Text style={styles.btnGhostTxt}>{tr("common.edit")}</Text>
            </Pressable>
          )}
          {onDelete && (
            <Pressable onPress={onDelete} style={[styles.btn, styles.btnDanger]}>
              <Text style={styles.btnDangerTxt}>{tr("common.delete")}</Text>
            </Pressable>
          )}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  title: { fontSize: 15, fontWeight: "700", color: theme.colors.text },
  label: { fontSize: 12, color: theme.colors.textMuted, marginTop: 8 },
  value: { fontSize: 15, color: theme.colors.text, marginTop: 2 },
  row: { flexDirection: "row", gap: 8, marginTop: 12 },
  btn: { flex: 1, paddingVertical: 10, borderRadius: theme.radius.md, alignItems: "center" },
  btnGhost: { borderWidth: 1, borderColor: theme.colors.border },
  btnGhostTxt: { color: theme.colors.text, fontWeight: "600" },
  btnDanger: { borderWidth: 1, borderColor: theme.colors.danger },
  btnDangerTxt: { color: theme.colors.danger, fontWeight: "600" },
});
