import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Card } from "@/components/Card";
import { ExportButton } from "@/components/ExportButton";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { FilterBar, FilterState, defaultFilters } from "@/components/FilterBar";
import {
  LessonLearned,
  LessonInsert,
  createLesson,
  deleteLesson,
  listLessons,
} from "@/services/lessonsService";
import { listPDCA, PDCAWithActions } from "@/services/pdcaService";
import { useLocalSearchParams } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useUI } from "@/ui/UIProvider";
import { theme } from "@/theme";

export default function LessonsLearnedScreen() {
  const { session } = useAuth();
  const { alert, toast } = useUI();
  const [items, setItems] = useState<LessonLearned[]>([]);
  const [pdcas, setPdcas] = useState<PDCAWithActions[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [showForm, setShowForm] = useState(false);
  const { pdcaId } = useLocalSearchParams<{ pdcaId?: string }>();

  useEffect(() => {
    if (pdcaId) setShowForm(true);
  }, [pdcaId]);

  const load = async () => {
    try {
      setError(null);
      const [ll, ps] = await Promise.all([listLessons(), listPDCA()]);
      setItems(ll);
      setPdcas(ps);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((ll) =>
      `${ll.title} ${ll.problem ?? ""} ${ll.solution ?? ""}`.toLowerCase().includes(q),
    );
  }, [items, filters.search]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <FilterBar
        value={filters}
        onChange={setFilters}
        showPriority={false}
        showStatus={false}
        placeholder="Rechercher une leçon…"
      />
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <Button label="+ Nouvelle leçon" onPress={() => setShowForm(true)} />
        <View style={{ height: 8 }} />
        <ExportButton
          filename="lessons-learned"
          headers={["Titre","Problème","Cause","Solution","Résultat","Standardisation","Créé le"]}
          rows={() => filtered.map((l) => [
            l.title,
            l.problem ?? "",
            l.cause ?? "",
            l.solution ?? "",
            l.result ?? "",
            l.standardization ?? "",
            new Date(l.created_at).toLocaleDateString("fr-FR"),
          ])}
        />
      </View>

      {filtered.length === 0 ? (
        <EmptyState title="Aucune leçon" subtitle="Enregistrez vos retours d'expérience." />
      ) : (
        <FlatList<LessonLearned>
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          data={filtered}
          keyExtractor={(it: LessonLearned) => it.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await load();
                setRefreshing(false);
              }}
            />
          }
          renderItem={({ item }: { item: LessonLearned }) => {
            const pdca = pdcas.find((p) => p.id === item.pdca_id);
            return (
              <Card>
                <Text style={styles.title}>{item.title}</Text>
                {pdca ? (
                  <Text style={styles.ref}>
                    {pdca.reference} • {pdca.subject}
                  </Text>
                ) : null}
                {item.problem ? (
                  <Text style={styles.block}>
                    <Text style={styles.blockLabel}>Problème : </Text>
                    {item.problem}
                  </Text>
                ) : null}
                {item.cause ? (
                  <Text style={styles.block}>
                    <Text style={styles.blockLabel}>Cause : </Text>
                    {item.cause}
                  </Text>
                ) : null}
                {item.solution ? (
                  <Text style={styles.block}>
                    <Text style={styles.blockLabel}>Solution : </Text>
                    {item.solution}
                  </Text>
                ) : null}
                {item.result ? (
                  <Text style={styles.block}>
                    <Text style={styles.blockLabel}>Résultat : </Text>
                    {item.result}
                  </Text>
                ) : null}
                {item.standardization ? (
                  <Text style={styles.block}>
                    <Text style={styles.blockLabel}>Standardisation : </Text>
                    {item.standardization}
                  </Text>
                ) : null}
                <View style={{ marginTop: 10 }}>
                  <Button
                    label="Supprimer"
                    variant="danger"
                    onPress={async () => {
                      try {
                        await deleteLesson(item.id);
                        await load();
                      } catch (e) {
                        alert({ title: "Erreur", message: e instanceof Error ? e.message : "Erreur" });
                      }
                    }}
                  />
                </View>
              </Card>
            );
          }}
        />
      )}

      <LessonForm
        visible={showForm}
        pdcas={pdcas}
        onClose={() => setShowForm(false)}
        onSubmit={async (payload) => {
          if (!session?.user) return;
          try {
            await createLesson({ ...payload, created_by: session.user.id });
            setShowForm(false);
            await load();
          } catch (e) {
            alert({ title: "Erreur", message: e instanceof Error ? e.message : "Erreur" });
          }
        }}
      />
    </View>
  );
}

function LessonForm({
  visible,
  pdcas,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  pdcas: PDCAWithActions[];
  onClose: () => void;
  onSubmit: (payload: Omit<LessonInsert, "created_by">) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [pdcaRef, setPdcaRef] = useState<string | null>(null);
  const [problem, setProblem] = useState("");
  const [cause, setCause] = useState("");
  const [solution, setSolution] = useState("");
  const [result, setResult] = useState("");
  const [standardization, setStandardization] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setTitle("");
    setPdcaRef(null);
    setProblem("");
    setCause("");
    setSolution("");
    setResult("");
    setStandardization("");
  };

  const references = pdcas.map((p) => `${p.reference} — ${p.subject}`);

  const submit = async () => {
    if (!title.trim()) {
      alert({ title: "Validation", message: "Titre obligatoire." });
      return;
    }
    setBusy(true);
    try {
      const pdca = pdcaRef ? pdcas.find((p) => `${p.reference} — ${p.subject}` === pdcaRef) : null;
      await onSubmit({
        title: title.trim(),
        pdca_id: pdca?.id ?? null,
        problem: problem.trim() || null,
        cause: cause.trim() || null,
        solution: solution.trim() || null,
        result: result.trim() || null,
        standardization: standardization.trim() || null,
      });
      reset();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ScrollView contentContainerStyle={styles.modalBody}>
        <Text style={styles.modalTitle}>Nouvelle leçon apprise</Text>

        <Input label="Titre" value={title} onChangeText={setTitle} required />
        <Select
          label="PDCA associé"
          value={pdcaRef}
          options={references}
          onChange={setPdcaRef}
        />
        <Input label="Problème" value={problem} onChangeText={setProblem} multiline />
        <Input label="Cause" value={cause} onChangeText={setCause} multiline />
        <Input label="Solution" value={solution} onChangeText={setSolution} multiline />
        <Input label="Résultat" value={result} onChangeText={setResult} multiline />
        <Input
          label="Standardisation"
          value={standardization}
          onChangeText={setStandardization}
          multiline
        />

        <View style={{ height: 12 }} />
        <Button label="Enregistrer" onPress={submit} loading={busy} />
        <View style={{ height: 8 }} />
        <Button label="Annuler" variant="secondary" onPress={onClose} />
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: "700", color: theme.colors.text },
  ref: { fontSize: 12, color: theme.colors.primary, marginTop: 4 },
  block: { fontSize: 13, color: theme.colors.text, marginTop: 6 },
  blockLabel: { fontWeight: "700" },
  modalBody: { padding: 20, paddingBottom: 60, backgroundColor: theme.colors.bg },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: theme.colors.text,
    marginBottom: 16,
  },
});
