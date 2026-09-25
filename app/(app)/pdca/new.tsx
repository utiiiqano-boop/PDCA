import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import { DateField, todayISO } from "@/components/DateField";
import { Card } from "@/components/Card";
import { ActionCard } from "@/components/ActionCard";
import { PDCAProgressBar } from "@/components/PDCAProgressBar";
import { useAuth } from "@/hooks/useAuth";
import { useUI } from "@/ui/UIProvider";
import { useTranslation } from "@/i18n/I18nProvider";
import { useCompanyOptions } from "@/hooks/useCompanyOptions";
import {
  createPDCA,
  errorMessage,
  ActionDraft,
  PDCADraft,
} from "@/services/pdcaService";
import { PHASE_TO_PROGRESS } from "@/constants/options";
import type { PDCAPhase, Priority, PDCAActionRow } from "@/types/database";
import { theme } from "@/theme";

interface ActionForm extends ActionDraft {
  tempId: string;
}

const emptyAction = (): ActionForm => ({
  tempId: Math.random().toString(36).slice(2),
  action: "",
  pilot_name: "",
  opening_date: todayISO(),
  due_date: null,
  phase: "P",
  status: "OPEN",
});

const PRIORITIES: { value: Priority; labelKey: string }[] = [
  { value: "LOW", labelKey: "priority.LOW" },
  { value: "MEDIUM", labelKey: "priority.MEDIUM" },
  { value: "HIGH", labelKey: "priority.HIGH" },
];

export default function NewPDCA() {
  const { session } = useAuth();
  const { alert, toast } = useUI();
  const { t: tr } = useTranslation();
  const { lines, departments, pilots, defectTypes, loading: optsLoading } =
    useCompanyOptions();

  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [line, setLine] = useState<string | null>(null);
  const [lineOther, setLineOther] = useState("");
  const [defectType, setDefectType] = useState<string | null>(null);
  const [defectOther, setDefectOther] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [department, setDepartment] = useState<string | null>(null);

  const [pilotOther, setPilotOther] = useState("");
  const [pilotIsOther, setPilotIsOther] = useState(false);
  const [actions, setActions] = useState<ActionForm[]>([]);
  const [editing, setEditing] = useState<ActionForm | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const priorityLabels = useMemo(
    () => PRIORITIES.map((p) => tr(p.labelKey)),
    [tr],
  );
  const priorityFromLabel = (l: string): Priority =>
    PRIORITIES.find((p) => tr(p.labelKey) === l)?.value ?? "MEDIUM";
  const priorityLabel = (v: Priority) => tr("priority." + v);

  const lineLabels = useMemo(() => lines.map((l) => l.label), [lines]);
  const deptLabels = useMemo(() => departments.map((d) => d.label), [departments]);
  const pilotLabels = useMemo(() => pilots.map((p) => p.label), [pilots]);
  const defectLabels = useMemo(() => defectTypes.map((d) => d.label), [defectTypes]);

  useFocusEffect(
    React.useCallback(() => {
      setSubject("");
      setDescription("");
      setLine(null);
      setLineOther("");
      setDefectType(null);
      setDefectOther("");
      setPriority("MEDIUM");
      setDepartment(null);
      setPilotOther("");
      setPilotIsOther(false);
      setActions([]);
      setEditing(null);
      setErrors({});
      setSubmitting(false);
      return undefined;
    }, []),
  );

  const resetAll = () => {
    setSubject("");
    setDescription("");
    setLine(null);
    setLineOther("");
    setDefectType(null);
    setDefectOther("");
    setPriority("MEDIUM");
    setDepartment(null);
    setPilotOther("");
    setPilotIsOther(false);
    setActions([]);
    setEditing(null);
    setErrors({});
  };

  const upsertAction = () => {
    if (!editing) return;
    const e: Record<string, string> = {};
    if (!editing.action.trim()) e.action = tr("pdcaForm.actionRequired");
    if (!editing.pilot_name.trim()) e.pilot_name = tr("pdcaForm.pilotRequired");
    if (editing.due_date && editing.due_date < editing.opening_date)
      e.due_date = tr("pdcaForm.dueBeforeOpening");
    setErrors(e);
    if (Object.keys(e).length) return;

    setActions((prev) => {
      const idx = prev.findIndex((a) => a.tempId === editing.tempId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = editing;
        return copy;
      }
      return [...prev, editing];
    });
    setEditing(null);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!subject.trim()) e.subject = tr("pdcaForm.subjectRequired");
    if (!line) e.line = tr("pdcaForm.lineRequired");
    if (line === "Autre" && !lineOther.trim()) e.lineOther = tr("pdcaForm.lineOtherRequired");
    if (!actions.length) e.actions = tr("pdcaForm.atLeastOneAction");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async () => {
    if (!validate()) {
      alert({ title: tr("pdcaForm.validationTitle"), message: tr("pdcaForm.fixErrors") });
      return;
    }
    if (!session?.user) {
      alert({ title: tr("pdcaForm.sessionExpiredTitle"), message: tr("pdcaForm.sessionExpiredMsg") });
      return;
    }

    const draft: PDCADraft = {
      subject: subject.trim(),
      description: description.trim() || null,
      line: line!,
      line_other: line === "Autre" ? lineOther.trim() : null,
      defect_type: defectType,
      defect_type_other: defectType === "Autre" ? defectOther.trim() : null,
      priority,
      department,
      actions: actions.map(({ tempId, ...rest }) => rest),
    };

    try {
      setSubmitting(true);
      const created = await createPDCA(draft, session.user.id);
      toast.success(`${tr("pdcaForm.created")} — ${created.reference}`);
      if (draft.department) {
        router.replace(`/(app)/department/${draft.department}`);
      } else {
        router.replace(`/(app)/pdca/${created.id}`);
      }
    } catch (err) {
      alert({ title: tr("common.error"), message: errorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  };

  const actionsForDisplay: PDCAActionRow[] = actions.map((a) => ({
    id: a.tempId,
    pdca_id: "",
    action: a.action,
    pilot_id: null,
    pilot_name: a.pilot_name,
    opening_date: a.opening_date,
    due_date: a.due_date,
    phase: a.phase,
    progress: PHASE_TO_PROGRESS[a.phase],
    status: a.status,
    company_id: null,
    created_at: "",
    updated_at: "",
    completed_at: null,
  }));

  if (optsLoading) {
    return (
      <View style={styles.centerWrap}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
        <Text style={styles.loadingTxt}>{tr("pdcaForm.loadingConfig")}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ───────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.title}>{tr("pdcaForm.title")}</Text>
          <Text style={styles.subtitle}>{tr("pdcaForm.subtitle")}</Text>
        </View>

        {/* ── Section 1 : Informations générales ──────── */}
        <SectionLabel index={1} label={tr("pdcaForm.section1")} />
        <Card>
          <Input
            label={tr("pdcaForm.subject")}
            value={subject}
            onChangeText={setSubject}
            required
            error={errors.subject}
            placeholder={tr("pdcaForm.subjectPh")}
          />
          <Input
            label={tr("pdcaForm.description")}
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder={tr("pdcaForm.descriptionPh")}
            hint={tr("pdcaForm.descriptionHint")}
            containerStyle={{ marginBottom: theme.spacing(3) }}
          />
        </Card>

        {/* ── Section 2 : Classement ─────────────────── */}
        <SectionLabel index={2} label={tr("pdcaForm.section2")} />
        <Card>
          <Select
            label={tr("pdcaForm.line")}
            value={line}
            options={lineLabels}
            onChange={setLine}
            required
            error={errors.line}
          />
          {line === "Autre" && (
            <Input
              label={tr("pdcaForm.lineOther")}
              value={lineOther}
              onChangeText={setLineOther}
              required
              error={errors.lineOther}
            />
          )}
          <Select
            label={tr("pdcaForm.department")}
            value={department}
            options={deptLabels}
            onChange={setDepartment}
          />
          <Select
            label={tr("pdcaForm.defectType")}
            value={defectType}
            options={defectLabels}
            onChange={setDefectType}
          />
          {defectType === "Autre" && (
            <Input
              label={tr("pdcaForm.defectTypeOther")}
              value={defectOther}
              onChangeText={setDefectOther}
            />
          )}
          <Select
            label={tr("pdcaForm.priority")}
            value={priorityLabel(priority)}
            options={priorityLabels}
            onChange={(l) => setPriority(priorityFromLabel(l))}
          />
        </Card>

        {/* ── Section 3 : Actions ────────────────────── */}
        <SectionLabel
          index={3}
          label={tr("pdcaForm.section3")}
          badge={actions.length > 0 ? String(actions.length) : undefined}
        />

        {actionsForDisplay.length === 0 ? (
          <Card>
            <View style={styles.emptyActions}>
              <Text style={styles.emptyActionsIcon}>📝</Text>
              <Text style={styles.emptyActionsTitle}>{tr("pdcaForm.noActions")}</Text>
              <Text style={styles.emptyActionsTxt}>
                {tr("pdcaForm.noActionsSub")}
              </Text>
            </View>
          </Card>
        ) : (
          actionsForDisplay.map((a, i) => (
            <ActionCard
              key={a.id}
              index={i}
              action={a}
              priority={priority}
              onEdit={() => setEditing(actions[i]!)}
              onDelete={() => setActions((p) => p.filter((_, idx) => idx !== i))}
            />
          ))
        )}

        {errors.actions ? <Text style={styles.err}>{errors.actions}</Text> : null}

        <Button
          label={tr("pdcaForm.addAction")}
          variant="secondary"
          onPress={() => setEditing(emptyAction())}
          style={{ marginTop: theme.spacing(1) }}
        />

        {/* ── Form action (dans une card inline) ─────── */}
        {editing && (
          <View style={{ marginTop: theme.spacing(4) }}>
            <SectionLabel
              label={
                actions.find((a) => a.tempId === editing.tempId)
                  ? tr("pdcaForm.modifyAction")
                  : tr("pdcaForm.newAction")
              }
            />
            <Card>
              <Input
                label={tr("pdcaForm.actionLabel")}
                value={editing.action}
                required
                error={errors.action}
                onChangeText={(t) => setEditing({ ...editing, action: t })}
                multiline
                placeholder={tr("pdcaForm.actionPh")}
              />

              <Select
                label={tr("pdcaForm.pilot")}
                value={pilotIsOther ? "Autre" : editing.pilot_name}
                options={pilotLabels}
                required
                error={errors.pilot_name}
                onChange={(v) => {
                  const isOther = v === "Autre";
                  setPilotIsOther(isOther);
                  if (!isOther) {
                    setPilotOther("");
                    setEditing({ ...editing, pilot_name: v });
                  } else {
                    setEditing({ ...editing, pilot_name: "Autre" });
                  }
                }}
              />
              {pilotIsOther && (
                <Input
                  label={tr("pdcaForm.pilotOther")}
                  value={pilotOther}
                  onChangeText={(text) => {
                    setPilotOther(text);
                    setEditing({
                      ...editing,
                      pilot_name: text.trim() || "Autre",
                    });
                  }}
                  required
                />
              )}

              <DateField
                label={tr("pdcaForm.openingDate")}
                value={editing.opening_date}
                required
                onChange={(v) =>
                  setEditing({ ...editing, opening_date: v ?? todayISO() })
                }
              />
              <DateField
                label={tr("pdcaForm.dueDate")}
                value={editing.due_date}
                error={errors.due_date}
                onChange={(v) => setEditing({ ...editing, due_date: v })}
              />

              <Text style={styles.phaseLabel}>{tr("pdcaForm.phase")}</Text>
              <PDCAProgressBar
                phase={editing.phase}
                onSelect={(p: PDCAPhase) => setEditing({ ...editing, phase: p })}
              />

              <View style={styles.editActions}>
                <View style={{ flex: 1 }}>
                  <Button
                    label={tr("common.cancel")}
                    variant="secondary"
                    onPress={() => setEditing(null)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button label={tr("pdcaForm.validateAction")} onPress={upsertAction} />
                </View>
              </View>
            </Card>
          </View>
        )}

        {/* ── Actions finales ────────────────────────── */}
        <View style={{ height: theme.spacing(6) }} />
        <Button label={tr("pdcaForm.submit")} onPress={onSubmit} loading={submitting} />
        <View style={{ height: theme.spacing(2) }} />
        <Button label={tr("pdcaForm.reset")} variant="secondary" onPress={resetAll} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SectionLabel({
  index,
  label,
  badge,
}: {
  index?: number;
  label: string;
  badge?: string;
}) {
  return (
    <View style={styles.sectionLabelWrap}>
      {index !== undefined ? (
        <View style={styles.sectionBadge}>
          <Text style={styles.sectionBadgeTxt}>{index}</Text>
        </View>
      ) : null}
      <Text style={styles.sectionLabelTxt}>{label}</Text>
      {badge ? (
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeTxt}>{badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.bg,
  },
  loadingTxt: {
    marginTop: theme.spacing(3),
    color: theme.colors.textMuted,
    fontSize: theme.font.size.base,
  },
  container: {
    padding: theme.spacing(4),
    paddingBottom: 60,
  },
  header: {
    marginBottom: theme.spacing(6),
  },
  title: {
    fontSize: theme.font.size["2xl"],
    fontWeight: theme.font.weight.black,
    color: theme.colors.text,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: theme.font.size.base,
    color: theme.colors.textMuted,
    marginTop: theme.spacing(1),
    lineHeight: 20,
  },
  sectionLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(2),
    marginTop: theme.spacing(4),
    marginBottom: theme.spacing(3),
  },
  sectionBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionBadgeTxt: {
    color: "#fff",
    fontSize: theme.font.size.xs,
    fontWeight: theme.font.weight.bold,
  },
  sectionLabelTxt: {
    fontSize: theme.font.size.sm,
    fontWeight: theme.font.weight.bold,
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  countBadge: {
    paddingHorizontal: theme.spacing(2),
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primarySoft,
  },
  countBadgeTxt: {
    fontSize: theme.font.size.xs,
    fontWeight: theme.font.weight.bold,
    color: theme.colors.primary,
  },
  emptyActions: {
    alignItems: "center",
    paddingVertical: theme.spacing(4),
  },
  emptyActionsIcon: { fontSize: 40, marginBottom: theme.spacing(3) },
  emptyActionsTitle: {
    fontSize: theme.font.size.lg,
    fontWeight: theme.font.weight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing(1),
  },
  emptyActionsTxt: {
    fontSize: theme.font.size.base,
    color: theme.colors.textMuted,
    textAlign: "center",
  },
  err: {
    color: theme.colors.danger,
    fontSize: theme.font.size.sm,
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
    fontWeight: theme.font.weight.medium,
  },
  phaseLabel: {
    fontSize: theme.font.size.base,
    fontWeight: theme.font.weight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing(2),
    marginTop: theme.spacing(1),
  },
  editActions: {
    flexDirection: "row",
    gap: theme.spacing(2),
    marginTop: theme.spacing(4),
  },
});
