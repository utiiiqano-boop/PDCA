import React, { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { theme } from "@/theme";
import { useTranslation } from "@/i18n/I18nProvider";

interface Props {
  visible: boolean;
  actionLabel: string;
  onCancel: () => void;
  onConfirm: (comment: string) => Promise<void>;
}

export function CancelActionModal({ visible, actionLabel, onCancel, onConfirm }: Props) {
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t: tr } = useTranslation();

  React.useEffect(() => {
    if (visible) {
      setComment("");
      setError(null);
    }
  }, [visible]);

  const submit = async () => {
    setError(null);
    if (!comment.trim()) {
      setError(tr("cancelAction.reasonRequired"));
      return;
    }
    try {
      setBusy(true);
      await onConfirm(comment.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : tr("common.unknownError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>{tr("cancelAction.title")}</Text>
            <Text style={styles.subtitle} numberOfLines={2}>
              {actionLabel}
            </Text>

            <Text style={styles.hint}>
              {tr("cancelAction.hint")}
            </Text>

            <Input
              label={tr("cancelAction.reasonLabel")}
              value={comment}
              onChangeText={setComment}
              multiline
              placeholder={tr("cancelAction.reasonPh")}
              required
            />

            {error ? <Text style={styles.err}>{error}</Text> : null}

            <Button label={tr("cancelAction.confirm")} variant="danger" onPress={submit} loading={busy} />
            <View style={{ height: 8 }} />
            <Button label={tr("cancelAction.back")} variant="secondary" onPress={onCancel} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.55)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: theme.colors.bg,
    maxHeight: "92%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 40,
  },
  title: { fontSize: 20, fontWeight: "800", color: theme.colors.danger },
  subtitle: { fontSize: 13, color: theme.colors.textMuted, marginTop: 4, fontStyle: "italic" },
  hint: {
    fontSize: 12,
    color: theme.colors.textMuted,
    backgroundColor: "#fef3c7",
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 16,
    lineHeight: 16,
  },
  err: { color: theme.colors.danger, fontSize: 13, marginTop: 8, marginBottom: 8, textAlign: "center" },
});
