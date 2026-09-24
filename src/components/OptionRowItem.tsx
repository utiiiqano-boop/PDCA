import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { theme } from "@/theme";
import type { CompanyOption } from "@/types/companyOptions";

interface Props {
  option: CompanyOption;
  isFirst: boolean;
  isLast: boolean;
  onRename: (id: string, newLabel: string) => Promise<void>;
  onToggleActive: (id: string, active: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onMoveUp: (id: string) => Promise<void>;
  onMoveDown: (id: string) => Promise<void>;
}

export function OptionRowItem({
  option,
  isFirst,
  isLast,
  onRename,
  onToggleActive,
  onDelete,
  onMoveUp,
  onMoveDown,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(option.label);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDraft(option.label);
  }, [option.label]);

  const save = async () => {
    if (draft.trim() === option.label.trim() || !draft.trim()) {
      setEditing(false);
      setDraft(option.label);
      return;
    }
    try {
      setBusy(true);
      await onRename(option.id, draft.trim());
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    setEditing(false);
    setDraft(option.label);
  };

  const toggleActive = async () => {
    try {
      setBusy(true);
      await onToggleActive(option.id, !option.active);
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    try {
      setBusy(true);
      await onDelete(option.id);
    } finally {
      setBusy(false);
    }
  };

  const doMoveUp = async () => {
    try {
      setBusy(true);
      await onMoveUp(option.id);
    } finally {
      setBusy(false);
    }
  };

  const doMoveDown = async () => {
    try {
      setBusy(true);
      await onMoveDown(option.id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.row, !option.active && styles.rowInactive]}>
      {/* Reorder */}
      <View style={styles.reorderCol}>
        <Pressable
          onPress={doMoveUp}
          disabled={isFirst || busy}
          style={[styles.reorderBtn, (isFirst || busy) && styles.reorderBtnDisabled]}
        >
          <Text style={styles.reorderTxt}>▲</Text>
        </Pressable>
        <Pressable
          onPress={doMoveDown}
          disabled={isLast || busy}
          style={[styles.reorderBtn, (isLast || busy) && styles.reorderBtnDisabled]}
        >
          <Text style={styles.reorderTxt}>▼</Text>
        </Pressable>
      </View>

      {/* Label */}
      <View style={{ flex: 1 }}>
        {editing ? (
          <TextInput
            value={draft}
            onChangeText={setDraft}
            autoFocus
            onBlur={save}
            onSubmitEditing={save}
            style={styles.input}
            editable={!busy}
          />
        ) : (
          <Pressable onPress={() => setEditing(true)} disabled={busy}>
            <Text
              style={[styles.label, !option.active && styles.labelInactive]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
            {option.is_default ? (
              <Text style={styles.subLabel}>défaut</Text>
            ) : null}
          </Pressable>
        )}
      </View>

      {/* Actions */}
      {busy ? (
        <ActivityIndicator color={theme.colors.primary} />
      ) : (
        <View style={styles.actionsCol}>
          <Pressable onPress={toggleActive} style={styles.iconBtn}>
            <Text style={styles.icon}>{option.active ? "🟢" : "⚪"}</Text>
          </Pressable>
          <Pressable onPress={doDelete} style={styles.iconBtn}>
            <Text style={styles.icon}>🗑️</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    gap: 8,
  },
  rowInactive: {
    backgroundColor: "#f9fafb",
    opacity: 0.7,
  },
  reorderCol: { width: 28, alignItems: "center", gap: 2 },
  reorderBtn: {
    width: 26,
    height: 24,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.bg,
  },
  reorderBtnDisabled: { opacity: 0.3 },
  reorderTxt: { fontSize: 11, color: theme.colors.text },
  input: {
    fontSize: 15,
    color: theme.colors.text,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 6,
    backgroundColor: "#fff",
  },
  label: { fontSize: 15, color: theme.colors.text, fontWeight: "600" },
  labelInactive: {
    textDecorationLine: "line-through",
    color: theme.colors.textMuted,
  },
  subLabel: { fontSize: 10, color: theme.colors.textMuted, marginTop: 1 },
  actionsCol: { flexDirection: "row", gap: 4 },
  iconBtn: { padding: 6 },
  icon: { fontSize: 18 },
});
