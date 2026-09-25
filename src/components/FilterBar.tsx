import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { theme } from "@/theme";
import { useTranslation } from "@/i18n/I18nProvider";

export type StatusFilter =
  | "ALL"
  | "OPEN"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "OVERDUE"
  | "CANCELLED";

export type PriorityFilter = "ALL" | "LOW" | "MEDIUM" | "HIGH";

export interface FilterState {
  search: string;
  status: StatusFilter;
  priority: PriorityFilter;
}

export const defaultFilters: FilterState = {
  search: "",
  status: "ALL",
  priority: "ALL",
};

interface Props {
  value: FilterState;
  onChange: (next: FilterState) => void;
  showPriority?: boolean;
  showStatus?: boolean;
  placeholder?: string;
}

export function FilterBar({
  value,
  onChange,
  showPriority = true,
  showStatus = true,
  placeholder,
}: Props) {
  const { t: tr } = useTranslation();
  const ph = placeholder ?? tr("filter.searchPh");
  const statuses: StatusFilter[] = ["ALL", "OPEN", "IN_PROGRESS", "COMPLETED", "OVERDUE"];
  const priorities: PriorityFilter[] = ["ALL", "LOW", "MEDIUM", "HIGH"];

  return (
    <View style={styles.wrap}>
      <TextInput
        value={value.search}
        onChangeText={(t) => onChange({ ...value, search: t })}
        placeholder={ph}
        placeholderTextColor={theme.colors.textMuted}
        style={styles.search}
      />

      {showStatus ? (
        <>
          <Text style={styles.rowLabel}>{tr("filter.status")}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {statuses.map((s) => {
              const active = value.status === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => onChange({ ...value, status: s })}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>
                    {tr("statusFilter." + s)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      ) : null}

      {showPriority ? (
        <>
          <Text style={styles.rowLabel}>{tr("filter.priority")}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {priorities.map((p) => {
              const active = value.priority === p;
              return (
                <Pressable
                  key={p}
                  onPress={() => onChange({ ...value, priority: p })}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>
                    {tr("priorityFilter." + p)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      ) : null}
    </View>
  );
}

export function applyFilters<
  T extends {
    reference: string;
    subject: string;
    status: string;
    priority: string;
  },
>(items: T[], f: FilterState): T[] {
  const q = f.search.trim().toLowerCase();
  return items.filter((it) => {
    if (f.status !== "ALL" && it.status !== f.status) return false;
    if (f.priority !== "ALL" && it.priority !== f.priority) return false;
    if (q) {
      const hay = `${it.reference} ${it.subject}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

const styles = StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 8, backgroundColor: theme.colors.bg },
  search: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    minHeight: 44,
    backgroundColor: theme.colors.surface,
    fontSize: 15,
    color: theme.colors.text,
  },
  rowLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textMuted,
    marginTop: 10,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chips: { gap: 8, paddingEnd: 16 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipTxt: { fontSize: 13, color: theme.colors.text },
  chipTxtActive: { color: "#fff", fontWeight: "700" },
});
