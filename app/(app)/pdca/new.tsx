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

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "LOW", label: "Faible" },
  { value: "MEDIUM", label: "Moyenne" },
  { value: "HIGH", label: "Élevée" },
];

export default function NewPDCA() {
  const { session } = useAuth();
  const { alert, toast } = useUI();

  // Load configurable options from Supabase
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

  const priorityLabels = useMemo(() => PRIORITIES.map((p) => p.label), []);
  const priorityFromLabel = (l: string): Priority =>
    PRIORITIES.find((p) => p.label === l)?.value ?? "MEDIUM";

  const lineLabels = useMemo(() => lines.map((l) => l.label), [lines]);
  const deptLabels = useMemo(() => departments.map((d) => d.label), [departments]);
  const pilotLabels = useMemo(() => pilots.map((p) => p.label), [pilots]);
  const defectLabels = useMemo(() => defectTypes.map((d) => d.label), [defectTypes]);

  // Reset form when screen gains focus
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
    if (!editing.action.trim()) e.action = "Action requise.";
    if (!editing.pilot_name.trim()) e.pilot_name = "Pilote requis.";
    if (editing.due_date && editing.due_date < editing.opening_date)
      e.due_date = "Échéance < date d'ouverture.";
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
    if (!subject.trim()) e.subject = "Sujet requis.";
    if (!line) e.line = "Ligne requise.";
    if (line === "Autre" && !lineOther.trim()) e.lineOther = "Précisez la ligne.";
    if (!actions.length) e.actions = "Ajoutez au moins une action.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async () => {
    if (!validate()) {
      alert({ title: "Validation", message: "Veuillez corriger les erreurs." });
      return;
    }
    if (!session?.user) {
      alert({ title: "Session expirée", message: "Veuillez vous reconnecter." });
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
      toast.success(`PDCA ${created.reference} créé`);
      if (draft.department) {
        router.replace(`/(app)/department/${draft.department}`);
      } else {
        router.replace(`/(app)/pdca/${created.id}`);
      }
    } catch (err) {
      alert({ title: "Erreur", message: errorMessage(err) });
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
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
        <Text style={{ marginTop: 12, color: theme.colors.textMuted }}>
          Chargement de la configuration…
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Nouveau PDCA</Text>

        <Card>
          <Input
            label="Sujet / Non-conformité"
            value={subject}
            onChangeText={setSubject}
            required
            error={errors.subject}
          />
          <Input
            label="Description de l'écart"
            value={description}
            onChangeText={setDescription}
            multiline
          />
          <Select
            label="Ligne / Poste"
            value={line}
            options={lineLabels}
            onChange={setLine}
            required
            error={errors.line}
          />
          {line === "Autre" && (
            <Input
              label="Précisez la ligne"
              value={lineOther}
              onChangeText={setLineOther}
              required
              error={errors.lineOther}
            />
          )}
          <Select
            label="Type de défaut"
            value={defectType}
            options={defectLabels}
            onChange={setDefectType}
          />
          {defectType === "Autre" && (
            <Input
              label="Précisez le type"
              value={defectOther}
              onChangeText={setDefectOther}
            />
          )}
          <Select
            label="Priorité"
            value={PRIORITIES.find((p) => p.value === priority)?.label ?? "Moyenne"}
            options={priorityLabels}
            onChange={(l) => setPriority(priorityFromLabel(l))}
          />
          <Select
            label="Département"
            value={department}
            options={deptLabels}
            onChange={setDepartment}
          />
        </Card>

        <Text style={styles.section}>Actions</Text>
        {actionsForDisplay.length === 0 && (
          <Text style={{ color: theme.colors.textMuted, marginBottom: 8 }}>
            Aucune action. Ajoutez-en au moins une.
          </Text>
        )}

        {actionsForDisplay.map((a, i) => (
          <ActionCard
            key={a.id}
            index={i}
            action={a}
            priority={priority}
            onEdit={() => setEditing(actions[i]!)}
            onDelete={() => setActions((p) => p.filter((_, idx) => idx !== i))}
          />
        ))}

        {errors.actions ? <Text style={styles.err}>{errors.actions}</Text> : null}

        <Button
          label="+ Ajouter une action"
          variant="secondary"
          onPress={() => setEditing(emptyAction())}
          style={{ marginBottom: 16 }}
        />

        {editing && (
          <Card>
            <Text style={styles.cardTitle}>
              {actions.find((a) => a.tempId === editing.tempId)
                ? "Modifier l'action"
                : "Nouvelle action"}
            </Text>

            <Input
              label="Action"
              value={editing.action}
              required
              error={errors.action}
              onChangeText={(t) => setEditing({ ...editing, action: t })}
              multiline
            />

            <Select
              label="Pilote"
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
                label="Précisez le pilote"
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
              label="Date ouverture"
              value={editing.opening_date}
              required
              onChange={(v) =>
                setEditing({ ...editing, opening_date: v ?? todayISO() })
              }
            />
            <DateField
              label="Date de fin"
              value={editing.due_date}
              error={errors.due_date}
              onChange={(v) => setEditing({ ...editing, due_date: v })}
            />

            <Text style={styles.label}>Phase PDCA</Text>
            <PDCAProgressBar
              phase={editing.phase}
              onSelect={(p: PDCAPhase) => setEditing({ ...editing, phase: p })}
            />

            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              <Button
                label="Annuler"
                variant="secondary"
                onPress={() => setEditing(null)}
                style={{ flex: 1 }}
              />
              <Button
                label="Valider l'action"
                onPress={upsertAction}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        )}

        <View style={{ height: 24 }} />
        <Button label="Soumettre" onPress={onSubmit} loading={submitting} />
        <View style={{ height: 8 }} />
        <Button label="Réinitialiser" variant="secondary" onPress={resetAll} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: theme.colors.bg,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: theme.colors.text,
    marginBottom: 12,
  },
  section: {
    fontSize: 16,
    fontWeight: "700",
    marginVertical: 8,
    color: theme.colors.text,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
    color: theme.colors.text,
  },
  err: { color: theme.colors.danger, marginBottom: 8 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 4,
  },
});
