import React, { useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { SignaturePad, SignaturePadHandle } from "@/components/SignaturePad";
import { theme } from "@/theme";
import { useTranslation } from "@/i18n/I18nProvider";

interface Props {
  visible: boolean;
  actionLabel: string;
  signerName: string;
  onCancel: () => void;
  onJustClose: (comment: string, signaturePaths: number[][] | null) => Promise<void>;
  onCloseWithLesson: (
    comment: string,
    signaturePaths: number[][] | null,
  ) => Promise<void>;
}

export function PhaseCompleteModal({
  visible,
  actionLabel,
  signerName,
  onCancel,
  onJustClose,
  onCloseWithLesson,
}: Props) {
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const padRef = useRef<SignaturePadHandle>(null);
  const { t: tr } = useTranslation();

  React.useEffect(() => {
    if (visible) {
      setComment("");
      setError(null);
      padRef.current?.clear();
    }
  }, [visible]);

  const submit = async (withLesson: boolean) => {
    setError(null);
    if (!comment.trim()) {
      setError(tr("phaseComplete.commentRequired"));
      return;
    }
    const paths = padRef.current?.getPaths() ?? [];
    if (paths.length === 0) {
      setError(tr("phaseComplete.signatureRequired"));
      return;
    }
    try {
      setBusy(true);
      const serialized = paths as unknown as number[][];
      if (withLesson) await onCloseWithLesson(comment.trim(), serialized);
      else await onJustClose(comment.trim(), serialized);
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
            <Text style={styles.title}>{tr("phaseComplete.title")}</Text>
            <Text style={styles.subtitle} numberOfLines={2}>
              {actionLabel}
            </Text>

            <Text style={styles.hint}>
              {tr("phaseComplete.hint")}
            </Text>

            <Input
              label={tr("phaseComplete.commentLabel")}
              value={comment}
              onChangeText={setComment}
              multiline
              placeholder={tr("phaseComplete.commentPh")}
              required
            />

            <Text style={styles.label}>
              {tr("phaseComplete.signatureOf")} {signerName} <Text style={{ color: theme.colors.danger }}>*</Text>
            </Text>
            <SignaturePad ref={padRef} width={300} height={160} />

            <View style={{ height: 8 }} />
            <Button
              label={tr("signature.clear")}
              variant="secondary"
              onPress={() => padRef.current?.clear()}
            />

            {error ? <Text style={styles.err}>{error}</Text> : null}

            <View style={{ height: 12 }} />
            <Button
              label={tr("phaseComplete.closeWithLesson")}
              onPress={() => submit(true)}
              loading={busy}
            />
            <View style={{ height: 8 }} />
            <Button
              label={tr("phaseComplete.justClose")}
              variant="secondary"
              onPress={() => submit(false)}
              loading={busy}
            />
            <View style={{ height: 8 }} />
            <Button label={tr("common.cancel")} variant="secondary" onPress={onCancel} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: theme.colors.bg,
    maxHeight: "94%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 40,
  },
  title: { fontSize: 20, fontWeight: "800", color: theme.colors.text },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 4,
    fontStyle: "italic",
  },
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
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 6,
  },
  err: {
    color: theme.colors.danger,
    fontSize: 13,
    marginTop: 8,
    marginBottom: 8,
    textAlign: "center",
  },
});
