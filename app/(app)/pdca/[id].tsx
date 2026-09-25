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
import { useTranslation } from "@/i18n/I18nProvider";
import type {
  PDCAPhase,
  PDCAActionRow,
  ActionSignatureRow,
  SignaturePoint,
} from "@/types/database";
import { theme } from "@/theme";

const PHASE_STEPS: { key: PDCAPhase; phaseKey: string; pct: number }[] = [
  { key: "P", phaseKey: "PLAN", pct: 25 },
  { key: "D", phaseKey: "DO", pct: 50 },
  { key: "C", phaseKey: "CHECK", pct: 75 },
  { key: "A", phaseKey: "ACT", pct: 100 },
];

export default function PDCADetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, profile } = useAuth();
  const { alert, confirm, toast } = useUI();
  const { t: tr } = useTranslation();

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
      setError(e instanceof Error ? e.message : tr("common.error"));
    }
  }, [id]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  useEffect(() => {
    if (!item) return;
    let cancelled = false;
    (async () => {
      const map: Record<string, ActionSignatureRow> = {};
      for (const a of item.pdca_actions) {
        try {
          const s = await getActionSignature(a.id);
          if (s) map[a.id] = s;
        } catch {}
      }
      if (!cancelled) setSignatureByAction(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [item]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!item) return <ErrorState message={tr("pdcaDetailScreen.notFound")} />;

  const signerName = profile?.full_name ?? tr("pdcaDetailScreen.defaultUser");

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
        alert({ title: tr("common.error"), message: e instanceof Error ? e.message : tr("common.error") }),
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
    toast.success(tr("pdcaDetailScreen.actionClosed"));
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
    toast.success(tr("pdcaDetailScreen.actionClosedRedirect"));
    await load();
    router.push(`/(app)/lessons-learned?pdcaId=${pdcaId}`);
  };

  const onCancel = async () => {
    const ok = await confirm({
      title: tr("pdcaDetailScreen.cancelConfirm"),
      message: tr("pdcaDetailScreen.cancelConfirmSub"),
      confirmLabel: tr("pdcaDetailScreen.cancelConfirmLabel"),
      destructive: true,
    });
    if (!ok || !session?.user) return;
    try {
      await cancelPDCA(item.id, session.user.id);
      toast.info(tr("pdcaDetailScreen.pdcaCancelled"));
      await load();
    } catch (e) {
      alert({ title: tr("common.error"), message: e instanceof Error ? e.message : tr("common.error") });
    }
  };

  // Compute progress from actions
  const totalActions = item.pdca_actions.length;
  const completedActions = item.pdca_actions.filter(
    (a) => a.status === "COMPLETED",
  ).length;
  const progressPct =
    totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* ── Header PDCA ──────────────────────────────── */}
      <Card>
        <View style={styles.headRow}>
          <Text style={styles.ref}>{item.reference}</Text>
          <StatusBadge status={item.status} />
        </View>
        <Text style={styles.subject}>{item.subject}</Text>
        {item.description ? (
          <Text style={styles.description}>{item.description}</Text>
        ) : null}

        <View style={styles.metaRow}>
          <MetaChip icon="🏭" label={item.line} />
          {item.department ? (
            <MetaChip icon="🏢" label={item.department} />
          ) : null}
          {item.defect_type ? (
            <MetaChip icon="🔍" label={item.defect_type} />
          ) : null}
        </View>

        <View style={styles.priorityRow}>
          <PriorityBadge priority={item.priority} />
        </View>

        {/* Global progress bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>{tr("pdcaDetailScreen.globalProgress")}</Text>
            <Text style={styles.progressPct}>{progressPct}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${progressPct}%` }]}
            />
          </View>
          <Text style={styles.progressMeta}>
            {completedActions} / {totalActions} {completedActions > 1 ? tr("pdcaDetailScreen.completedOfMany") : tr("pdcaDetailScreen.completedOf")}
          </Text>
        </View>

        {/* PDCA phase overview */}
        <View style={styles.phasesRow}>
          {PHASE_STEPS.map((p) => (
            <View key={p.key} style={styles.phaseItem}>
              <View style={styles.phaseDot}>
                <Text style={styles.phaseDotTxt}>{p.key}</Text>
              </View>
              <Text style={styles.phaseLbl}>{tr("phase." + p.phaseKey)}</Text>
              <Text style={styles.phasePct}>{p.pct}%</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* ── Actions list ─────────────────────────────── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{tr("pdcaDetailScreen.actionsTitle")}</Text>
        <View style={styles.sectionCount}>
          <Text style={styles.sectionCountTxt}>{totalActions}</Text>
        </View>
      </View>

      {item.pdca_actions.length === 0 ? (
        <Card>
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyTitle}>{tr("pdcaDetailScreen.noActions")}</Text>
            <Text style={styles.emptyTxt}>
              {tr("pdcaDetailScreen.noActionsSub")}
            </Text>
          </View>
        </Card>
      ) : (
        item.pdca_actions.map((a, i) => (
          <View key={a.id} style={styles.actionWrap}>
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

            {a.status !== "CANCELLED" && a.status !== "COMPLETED" ? (
              <View style={styles.actionBtnWrap}>
                <Button
                  label={tr("pdcaDetailScreen.cancelAction")}
                  variant="secondary"
                  size="sm"
                  onPress={() => setCancellingAction(a)}
                />
              </View>
            ) : (
              <View style={styles.statusBanner}>
                <Text style={styles.statusBannerTxt}>
                  {a.status === "COMPLETED"
                    ? tr("pdcaDetailScreen.actionDone")
                    : tr("pdcaDetailScreen.actionCancelled")}
                </Text>
              </View>
            )}
          </View>
        ))
      )}

      {/* ── Danger zone ─────────────────────────────── */}
      {item.status !== "CANCELLED" ? (
        <View style={styles.dangerWrap}>
          <Button label={tr("pdcaDetailScreen.cancelPdca")} variant="danger" onPress={onCancel} />
        </View>
      ) : (
        <View style={styles.cancelledBanner}>
          <Text style={styles.cancelledTxt}>{tr("pdcaDetailScreen.cancelledBanner")}</Text>
        </View>
      )}

      {/* ── Modals ───────────────────────────────────── */}
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
          toast.success(tr("pdcaDetailScreen.actionUpdated"));
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
          toast.info(tr("pdcaDetailScreen.actionCancelledToast"));
          await load();
        }}
      />
    </ScrollView>
  );
}

function MetaChip({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.metaChip}>
      <Text style={styles.metaChipIcon}>{icon}</Text>
      <Text style={styles.metaChipTxt} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing(4),
    backgroundColor: theme.colors.bg,
    paddingBottom: 60,
  },

  // ── Header ────────────────────────────────────
  headRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing(2),
  },
  ref: {
    fontWeight: theme.font.weight.bold,
    color: theme.colors.primary,
    fontSize: theme.font.size.base,
    letterSpacing: 0.3,
  },
  subject: {
    fontSize: theme.font.size.xl,
    fontWeight: theme.font.weight.bold,
    color: theme.colors.text,
    marginTop: theme.spacing(1),
    lineHeight: 26,
  },
  description: {
    fontSize: theme.font.size.base,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing(2),
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing(2),
    marginTop: theme.spacing(4),
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: theme.colors.neutralSoft,
    paddingHorizontal: theme.spacing(2),
    paddingVertical: 5,
    borderRadius: theme.radius.pill,
    maxWidth: "100%",
  },
  metaChipIcon: { fontSize: 12 },
  metaChipTxt: {
    fontSize: theme.font.size.xs,
    color: theme.colors.textSecondary,
    fontWeight: theme.font.weight.medium,
  },
  priorityRow: { marginTop: theme.spacing(3) },

  // ── Progress ──────────────────────────────────
  progressSection: {
    marginTop: theme.spacing(5),
    paddingTop: theme.spacing(5),
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: theme.spacing(2),
  },
  progressLabel: {
    fontSize: theme.font.size.sm,
    fontWeight: theme.font.weight.semibold,
    color: theme.colors.textSecondary,
  },
  progressPct: {
    fontSize: theme.font.size.lg,
    fontWeight: theme.font.weight.black,
    color: theme.colors.primary,
  },
  progressTrack: {
    height: 8,
    backgroundColor: theme.colors.divider,
    borderRadius: theme.radius.pill,
    overflow: "hidden",
  },
  progressFill: {
    height: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
  },
  progressMeta: {
    fontSize: theme.font.size.xs,
    color: theme.colors.textMuted,
    marginTop: theme.spacing(2),
    fontWeight: theme.font.weight.medium,
  },

  // ── Phases overview ───────────────────────────
  phasesRow: {
    flexDirection: "row",
    marginTop: theme.spacing(4),
    justifyContent: "space-between",
  },
  phaseItem: { alignItems: "center", flex: 1 },
  phaseDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing(1),
  },
  phaseDotTxt: {
    fontSize: theme.font.size.base,
    fontWeight: theme.font.weight.black,
    color: theme.colors.primary,
  },
  phaseLbl: {
    fontSize: theme.font.size.xs,
    color: theme.colors.text,
    fontWeight: theme.font.weight.semibold,
  },
  phasePct: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
  },

  // ── Section header ────────────────────────────
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(2),
    marginTop: theme.spacing(6),
    marginBottom: theme.spacing(3),
  },
  sectionTitle: {
    fontSize: theme.font.size.sm,
    fontWeight: theme.font.weight.bold,
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  sectionCount: {
    paddingHorizontal: theme.spacing(2),
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primarySoft,
  },
  sectionCountTxt: {
    fontSize: theme.font.size.xs,
    fontWeight: theme.font.weight.bold,
    color: theme.colors.primary,
  },

  // ── Empty ─────────────────────────────────────
  emptyBox: { alignItems: "center", paddingVertical: theme.spacing(4) },
  emptyIcon: { fontSize: 40, marginBottom: theme.spacing(3) },
  emptyTitle: {
    fontSize: theme.font.size.lg,
    fontWeight: theme.font.weight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing(1),
  },
  emptyTxt: {
    fontSize: theme.font.size.base,
    color: theme.colors.textMuted,
    textAlign: "center",
  },

  // ── Action wrapper ────────────────────────────
  actionWrap: { marginBottom: theme.spacing(3) },
  actionBtnWrap: { marginTop: -theme.spacing(2), marginBottom: theme.spacing(3) },
  statusBanner: {
    marginTop: -theme.spacing(2),
    marginBottom: theme.spacing(3),
    paddingVertical: theme.spacing(2),
    paddingHorizontal: theme.spacing(3),
    backgroundColor: theme.colors.neutralSoft,
    borderRadius: theme.radius.md,
    alignItems: "center",
  },
  statusBannerTxt: {
    fontSize: theme.font.size.sm,
    fontWeight: theme.font.weight.bold,
    color: theme.colors.textSecondary,
  },

  // ── Danger ────────────────────────────────────
  dangerWrap: {
    marginTop: theme.spacing(6),
    paddingTop: theme.spacing(5),
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  cancelledBanner: {
    marginTop: theme.spacing(6),
    paddingVertical: theme.spacing(3),
    paddingHorizontal: theme.spacing(4),
    backgroundColor: theme.colors.dangerSoft,
    borderRadius: theme.radius.md,
    alignItems: "center",
  },
  cancelledTxt: {
    fontSize: theme.font.size.base,
    fontWeight: theme.font.weight.bold,
    color: theme.colors.danger,
  },
});
