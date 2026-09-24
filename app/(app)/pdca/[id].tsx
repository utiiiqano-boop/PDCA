import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Card } from "@/components/Card";
import { ActionCard } from "@/components/ActionCard";
import { PriorityBadge, StatusBadge } from "@/components/Badges";
import { Button } from "@/components/Button";
import { ErrorState, LoadingState } from "@/components/States";
import { EditActionModal } from "@/components/EditActionModal";
import { PhaseCompleteModal } from "@/components/PhaseCompleteModal";
import { CancelActionModal } from "@/components/CancelActionModal";
import { ActionPhotos } from "@/components/ActionPhotos";
import { SignatureView } from "@/components/SignatureView";
import {
  getPDCA,
  cancelPDCA,
  updateActionWithComment,
  cancelActionWithComment,
  applyPhaseChange,
  PDCAWithActions,
} from "@/services/pdcaService";
import {
  saveActionSignature,
  getActionSignature,
} from "@/services/signatureService";
import { useAuth } from "@/hooks/useAuth";
import { useUI } from "@/ui/UIProvider";
import type {
  PDCAPhase,
  PDCAActionRow,
  ActionSignatureRow,
  SignaturePoint,
} from "@/types/database";
import { theme } from "@/theme";

export default function PDCADetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, profile } = useAuth();
  const { alert, confirm, toast } = useUI();

  const [item, setItem] = useState<PDCAWithActions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingAction, setEditingAction] = useState<PDCAActionRow | null>(null);
  const [completingAction, setCompletingAction] = useState<PDCAActionRow | null>(null);
  const [cancellingAction, setCancellingAction] = useState<PDCAActionRow | null>(null);
  const [signatureByAction, setSignatureByAction] = useState<
    Record<string, ActionSignatureRow>
  >({});

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      setItem(await getPDCA(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }, [id]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  // Load signatures whenever the item changes
  useEffect(() => {
    if (!item) return;
    let cancelled = false;
    (async () => {
      const map: Record<string, ActionSignatureRow> = {};
      for (const a of item.pdca_actions) {
        try {
          const s = await getActionSignature(a.id);
          if (s) map[a.id] = s;
        } catch {
          // ignore
        }
      }
      if (!cancelled) setSignatureByAction(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [item]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!item) return <ErrorState message="PDCA introuvable." />;

  const signerName = profile?.full_name ?? "Utilisateur";

  const handlePhaseChange = (action: PDCAActionRow, next: PDCAPhase) => {
    if (next === "A") {
      setCompletingAction(action);
      return;
    }
    if (next === action.phase) return;
    if (!session?.user) return;
    applyPhaseChange({
      actionId: action.id,
      phase: next,
      previousPhase: action.phase,
      userId: session.user.id,
    })
      .then(() => load())
      .catch((e) =>
        alert({ title: "Erreur", message: e instanceof Error ? e.message : "Erreur" }),
      );
  };

  const persistSignature = async (
    actionId: string,
    paths: number[][] | null,
  ) => {
    if (!session?.user || !paths || paths.length === 0) return;
    await saveActionSignature(
      actionId,
      paths as unknown as SignaturePoint[][],
      signerName,
      session.user.id,
    );
  };

  const handleJustClose = async (
    comment: string,
    signaturePaths: number[][] | null,
  ) => {
    if (!completingAction || !session?.user) return;
    await applyPhaseChange({
      actionId: completingAction.id,
      phase: "A",
      previousPhase: completingAction.phase,
      userId: session.user.id,
      comment,
    });
    await persistSignature(completingAction.id, signaturePaths);
    setCompletingAction(null);
    toast.success("Action clôturée");
    await load();
  };

  const handleCloseWithLesson = async (
    comment: string,
    signaturePaths: number[][] | null,
  ) => {
    if (!completingAction || !session?.user) return;
    await applyPhaseChange({
      actionId: completingAction.id,
      phase: "A",
      previousPhase: completingAction.phase,
      userId: session.user.id,
      comment,
    });
    await persistSignature(completingAction.id, signaturePaths);
    const pdcaId = item.id;
    setCompletingAction(null);
    toast.success("Action clôturée — redirection vers Leçons apprises");
    await load();
    router.push(`/(app)/lessons-learned?pdcaId=${pdcaId}`);
  };

  const onCancel = async () => {
    const ok = await confirm({
      title: "Annuler ce PDCA ?",
      message: "Le PDCA sera marqué comme annulé. Réversible côté base.",
      confirmLabel: "Annuler le PDCA",
      destructive: true,
    });
    if (!ok || !session?.user) return;
    try {
      await cancelPDCA(item.id, session.user.id);
      toast.info("PDCA annulé");
      await load();
    } catch (e) {
      alert({ title: "Erreur", message: e instanceof Error ? e.message : "Erreur" });
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card>
        <View style={styles.row}>
          <Text style={styles.ref}>{item.reference}</Text>
          <StatusBadge status={item.status} />
        </View>
        <Text style={styles.subject}>{item.subject}</Text>
        <Text style={styles.meta}>
          {item.line} • {item.department ?? "—"} • {item.defect_type ?? "—"}
        </Text>
        <View style={{ marginTop: 8 }}>
          <PriorityBadge priority={item.priority} />
        </View>
      </Card>

      <Text style={styles.section}>Actions ({item.pdca_actions.length})</Text>
      {item.pdca_actions.map((a, i) => (
        <View key={a.id}>
          <ActionCard
            index={i}
            action={a}
            priority={item.priority}
            onPhaseChange={(next) => handlePhaseChange(a, next)}
            onEdit={() => setEditingAction(a)}
          />
          <ActionPhotos actionId={a.id} />
          {signatureByAction[a.id] ? (
            <SignatureView signature={signatureByAction[a.id]!} />
          ) : null}
          <View style={styles.actionButtons}>
            {a.status !== "CANCELLED" && a.status !== "COMPLETED" ? (
              <Button
                label="Annuler l'action"
                variant="secondary"
                onPress={() => setCancellingAction(a)}
              />
            ) : (
              <Text style={styles.statusLabel}>
                {a.status === "COMPLETED" ? "✓ Terminée" : "⊘ Annulée"}
              </Text>
            )}
          </View>
        </View>
      ))}

      {item.status !== "CANCELLED" ? (
        <View style={{ marginTop: 12 }}>
          <Button label="Annuler ce PDCA" variant="danger" onPress={onCancel} />
        </View>
      ) : (
        <Text style={styles.cancelled}>Ce PDCA est annulé.</Text>
      )}

      <EditActionModal
        visible={!!editingAction}
        action={editingAction}
        onCancel={() => setEditingAction(null)}
        onSave={async (next, comment) => {
          if (!editingAction || !session?.user) return;
          await updateActionWithComment(
            editingAction.id,
            next,
            {
              pilot_name: editingAction.pilot_name,
              due_date: editingAction.due_date,
            },
            comment,
            session.user.id,
          );
          setEditingAction(null);
          toast.success("Action mise à jour");
          await load();
        }}
      />

      <PhaseCompleteModal
        visible={!!completingAction}
        actionLabel={completingAction?.action ?? ""}
        signerName={signerName}
        onCancel={() => setCompletingAction(null)}
        onJustClose={handleJustClose}
        onCloseWithLesson={handleCloseWithLesson}
      />

      <CancelActionModal
        visible={!!cancellingAction}
        actionLabel={cancellingAction?.action ?? ""}
        onCancel={() => setCancellingAction(null)}
        onConfirm={async (comment) => {
          if (!cancellingAction || !session?.user) return;
          await cancelActionWithComment(cancellingAction.id, comment, session.user.id);
          setCancellingAction(null);
          toast.info("Action annulée");
          await load();
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: theme.colors.bg, paddingBottom: 60 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  ref: { fontWeight: "700", color: theme.colors.primary },
  subject: { fontSize: 17, fontWeight: "600", marginTop: 8, color: theme.colors.text },
  meta: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4 },
  section: { fontSize: 16, fontWeight: "700", marginVertical: 8, color: theme.colors.text },
  actionButtons: { marginTop: -4, marginBottom: 12, paddingHorizontal: 4 },
  statusLabel: { textAlign: "center", color: theme.colors.textMuted, fontWeight: "700" },
  cancelled: { marginTop: 12, textAlign: "center", color: theme.colors.textMuted, fontWeight: "700" },
});
