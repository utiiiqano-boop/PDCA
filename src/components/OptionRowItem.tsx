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
    const trimmed = draft.trim();
    if (!trimmed || trimmed === option.label.trim()) {
      setEditing(false);
      setDraft(option.label);
      return;
    }
    try {
      setBusy(true);
      await onRename(option.id, trimmed);
      setEditing(false);
    } catch {
      // parent gère l'erreur
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
          hitSlop={4}
        >
          <Text style={styles.reorderTxt}>▲</Text>
        </Pressable>
        <Pressable
          onPress={doMoveDown}
          disabled={isLast || busy}
          style={[styles.reorderBtn, (isLast || busy) && styles.reorderBtnDisabled]}
          hitSlop={4}
        >
          <Text style={styles.reorderTxt}>▼</Text>
        </Pressable>
      </View>

      {/* Label / Edit */}
      <View style={styles.middle}>
        {editing ? (
          <View style={styles.editRow}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              autoFocus
              onSubmitEditing={save}
              style={styles.input}
              editable={!busy}
              returnKeyType="done"
              blurOnSubmit={false}
              selectTextOnFocus
              placeholder={option.label}
              placeholderTextColor={theme.colors.textMuted}
            />
            <Pressable
              onPress={save}
              disabled={busy}
              style={styles.okBtn}
              hitSlop={8}
              accessibilityLabel="Valider"
            >
              <Text style={styles.okTxt}>✓</Text>
            </Pressable>
            <Pressable
              onPress={cancel}
              disabled={busy}
              style={styles.cancelBtn}
              hitSlop={8}
              accessibilityLabel="Annuler"
            >
              <Text style={styles.cancelTxt}>✕</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => setEditing(true)}
            disabled={busy}
            style={styles.labelPressable}
          >
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
      <View style={styles.actionsCol}>
        {busy ? (
          <ActivityIndicator color={theme.colors.primary} size="small" />
        ) : (
          <>
            {/* Statut — un simple rond coloré, toujours rendu */}
            <Pressable
              onPress={toggleActive}
              style={styles.statusBtn}
              hitSlop={6}
              accessibilityLabel={option.active ? "Désactiver" : "Activer"}
            >
              <View
                style={[
                  styles.statusDot,
                  option.active ? styles.statusDotOn : styles.statusDotOff,
                ]}
              />
            </Pressable>

            {/* Supprimer — un ✕ texte, toujours rendu */}
            <Pressable
              onPress={doDelete}
              style={styles.deleteBtn}
              hitSlop={6}
              accessibilityLabel="Supprimer"
            >
              <Text style={styles.deleteTxt}>✕</Text>
            </Pressable>
          </>
        )}
      </View>
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
    minHeight: 56,
  },
  rowInactive: {
    backgroundColor: "#f9fafb",
    opacity: 0.75,
  },

  // Reorder column
  reorderCol: {
    width: 32,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  reorderBtn: {
    width: 28,
    height: 22,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.bg,
    marginVertical: 1,
  },
  reorderBtnDisabled: { opacity: 0.3 },
  reorderTxt: { fontSize: 11, color: theme.colors.text, fontWeight: "700" },

  // Middle (label or input)
  middle: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  labelPressable: {
    paddingVertical: 4,
  },
  label: {
    fontSize: 15,
    color: theme.colors.text,
    fontWeight: "600",
  },
  labelInactive: {
    textDecorationLine: "line-through",
    color: theme.colors.textMuted,
  },
  subLabel: { fontSize: 10, color: theme.colors.textMuted, marginTop: 1 },

  // Edit mode
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 6,
    backgroundColor: "#fff",
    minHeight: 36,
  },
  okBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: theme.colors.success,
    alignItems: "center",
    justifyContent: "center",
  },
  okTxt: { color: "#fff", fontWeight: "900", fontSize: 16 },
  cancelBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelTxt: { color: "#1f2937", fontWeight: "900", fontSize: 14 },

  // Actions
  actionsCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 68,
    justifyContent: "flex-end",
  },
  statusBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  statusDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  statusDotOn: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  statusDotOff: {
    backgroundColor: "transparent",
    borderColor: theme.colors.textMuted,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteTxt: {
    fontSize: 18,
    color: theme.colors.danger,
    fontWeight: "700",
    lineHeight: 20,
  },
});
