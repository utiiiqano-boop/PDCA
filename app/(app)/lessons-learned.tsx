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
import { useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { FilterBar, FilterState, defaultFilters } from "@/components/FilterBar";
import { ExportButton } from "@/components/ExportButton";
import { useAuth } from "@/hooks/useAuth";
import { useUI } from "@/ui/UIProvider";
import {
  LessonLearned,
  LessonInsert,
  createLesson,
  deleteLesson,
  listLessons,
} from "@/services/lessonsService";
import { listPDCA, PDCAWithActions } from "@/services/pdcaService";
import { theme } from "@/theme";

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return iso;
  }
}

export default function LessonsLearnedScreen() {
  // ── 1. ALL HOOKS FIRST ────────────────────────────────
  const { session } = useAuth();
  const { toast, confirm, alert } = useUI();
  const { pdcaId: pdcaIdParam } = useLocalSearchParams<{ pdcaId?: string }>();

  const [items, setItems] = useState<LessonLearned[]>([]);
  const [pdcas, setPdcas] = useState<PDCAWithActions[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [showForm, setShowForm] = useState(false);

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

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, []),
  );

  useEffect(() => {
    if (pdcaIdParam) setShowForm(true);
  }, [pdcaIdParam]);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((ll) =>
      `${ll.title} ${ll.problem ?? ""} ${ll.solution ?? ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [items, filters.search]);

  // ── 2. EARLY RETURNS ──────────────────────────────────
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  // ── 3. UI ─────────────────────────────────────────────
  const ListHeader = (
    <View>
      <View style={styles.statsRow}>
        <View style={styles.statPill}>
          <View
            style={[styles.statDot, { backgroundColor: theme.colors.primary }]}
          />
          <Text style={styles.statTxt}>
            {items.length} leçon{items.length > 1 ? "s" : ""} enregistrée
            {items.length > 1 ? "s" : ""}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Lessons Learned</Text>
        <Text style={styles.sub}>
          Retours d'expérience des PDCA clôturés
        </Text>
      </View>

      {/* Add button */}
      <View style={styles.addWrap}>
        <Button
          label="+ Nouvelle leçon"
          onPress={() => setShowForm(true)}
        />
      </View>

      {/* Export */}
      <View style={styles.exportWrap}>
        <ExportButton
          label="📊 Exporter la vue (7 colonnes)"
          filename="lessons-learned"
          headers={[
            "Titre",
            "Problème",
            "Cause",
            "Solution",
            "Résultat",
            "Standardisation",
            "Créé le",
          ]}
          rows={() =>
            filtered.map((l) => [
              l.title,
              l.problem ?? "",
              l.cause ?? "",
              l.solution ?? "",
              l.result ?? "",
              l.standardization ?? "",
              fmtDate(l.created_at),
            ])
          }
        />
      </View>

      {/* Search */}
      <FilterBar
        value={filters}
        onChange={setFilters}
        showPriority={false}
        showStatus={false}
        placeholder="Rechercher une leçon…"
      />

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          title="Aucune leçon"
          subtitle="Enregistrez vos retours d'expérience après chaque PDCA clôturé."
          icon="💡"
        />
      ) : (
        <FlatList<LessonLearned>
          data={filtered}
          keyExtractor={(it: LessonLearned) => it.id}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={styles.listContent}
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
                {/* Header */}
                <View style={styles.cardHead}>
                  <View style={styles.titleWrap}>
                    <Text style={styles.cardIcon}>💡</Text>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                  </View>
                </View>

                {/* PDCA link */}
                {pdca ? (
                  <View style={styles.pdcaTag}>
                    <Text style={styles.pdcaTagTxt}>
                      {pdca.reference} · {pdca.subject}
                    </Text>
                  </View>
                ) : null}

                {/* Content */}
                {item.problem ? (
                  <Block label="Problème" value={item.problem} />
                ) : null}
                {item.cause ? <Block label="Cause" value={item.cause} /> : null}
                {item.solution ? (
                  <Block label="Solution" value={item.solution} />
                ) : null}
                {item.result ? <Block label="Résultat" value={item.result} /> : null}
                {item.standardization ? (
                  <Block label="Standardisation" value={item.standardization} />
                ) : null}

                {/* Footer */}
                <View style={styles.cardFooter}>
                  <Text style={styles.date}>{fmtDate(item.created_at)}</Text>
                  <Pressable
                    onPress={async () => {
                      const ok = await confirm({
                        title: "Supprimer cette leçon ?",
                        message: "Cette action est irréversible.",
                        confirmLabel: "Supprimer",
                        destructive: true,
                      });
                      if (!ok) return;
                      try {
                        await deleteLesson(item.id);
                        toast.info("Leçon supprimée");
                        await load();
                      } catch (e) {
                        alert({
                          title: "Erreur",
                          message: e instanceof Error ? e.message : "Erreur",
                        });
                      }
                    }}
                    style={styles.deleteBtn}
                  >
                    <Text style={styles.deleteTxt}>Supprimer</Text>
                  </Pressable>
                </View>
              </Card>
            );
          }}
        />
      )}

      {/* Modal */}
      <LessonForm
        visible={showForm}
        pdcas={pdcas}
        initialPdcaId={pdcaIdParam}
        onClose={() => setShowForm(false)}
        onSubmit={async (payload) => {
          if (!session?.user) return;
          try {
            await createLesson({ ...payload, created_by: session.user.id });
            setShowForm(false);
            toast.success("Leçon enregistrée");
            await load();
          } catch (e) {
            alert({
              title: "Erreur",
              message: e instanceof Error ? e.message : "Erreur",
            });
          }
        }}
      />
    </View>
  );
}

function Block({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.block}>
      <Text style={styles.blockLabel}>{label}</Text>
      <Text style={styles.blockValue}>{value}</Text>
    </View>
  );
}

function LessonForm({
  visible,
  pdcas,
  initialPdcaId,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  pdcas: PDCAWithActions[];
  initialPdcaId?: string;
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

  const references = pdcas.map((p) => `${p.reference} — ${p.subject}`);

  // Pre-fill when opened with a pdcaId (from PhaseCompleteModal redirect)
  useEffect(() => {
    if (!visible) return;
    if (initialPdcaId) {
      const match = pdcas.find((p) => p.id === initialPdcaId);
      if (match) setPdcaRef(`${match.reference} — ${match.subject}`);
    }
  }, [visible, initialPdcaId, pdcas]);

  const reset = () => {
    setTitle("");
    setPdcaRef(null);
    setProblem("");
    setCause("");
    setSolution("");
    setResult("");
    setStandardization("");
  };

  const submit = async () => {
    if (!title.trim()) {
      Alert.alert("Validation", "Titre obligatoire.");
      return;
    }
    setBusy(true);
    try {
      const pdca = pdcaRef
        ? pdcas.find((p) => `${p.reference} — ${p.subject}` === pdcaRef)
        : null;
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
      <ScrollView
        style={styles.modalRoot}
        contentContainerStyle={styles.modalBody}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.modalTitle}>Nouvelle leçon apprise</Text>
        <Text style={styles.modalSub}>
          Capturez ce qui a fonctionné (ou non) pour les prochains PDCA
        </Text>

        <Input label="Titre" value={title} onChangeText={setTitle} required />
        <Select
          label="PDCA associé"
          value={pdcaRef}
          options={references}
          onChange={setPdcaRef}
          placeholder="Aucun (facultatif)"
        />
        <Input
          label="Problème"
          value={problem}
          onChangeText={setProblem}
          multiline
        />
        <Input label="Cause" value={cause} onChangeText={setCause} multiline />
        <Input
          label="Solution"
          value={solution}
          onChangeText={setSolution}
          multiline
        />
        <Input
          label="Résultat"
          value={result}
          onChangeText={setResult}
          multiline
        />
        <Input
          label="Standardisation"
          value={standardization}
          onChangeText={setStandardization}
          multiline
        />

        <View style={{ height: theme.spacing(3) }} />
        <Button label="Enregistrer" onPress={submit} loading={busy} />
        <View style={{ height: theme.spacing(2) }} />
        <Button label="Annuler" variant="secondary" onPress={onClose} />
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },

  // ── Header ────────────────────────────────────
  header: {
    paddingHorizontal: theme.spacing(4),
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(3),
  },
  title: {
    fontSize: theme.font.size["2xl"],
    fontWeight: theme.font.weight.black,
    color: theme.colors.text,
  },
  sub: {
    fontSize: theme.font.size.base,
    color: theme.colors.textMuted,
    marginTop: theme.spacing(1),
  },
  addWrap: {
    paddingHorizontal: theme.spacing(4),
    marginBottom: theme.spacing(2),
  },
  exportWrap: {
    paddingHorizontal: theme.spacing(4),
    marginBottom: theme.spacing(3),
  },

  // ── Stats ─────────────────────────────────────
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing(4),
    gap: theme.spacing(3),
    marginBottom: theme.spacing(4),
    flexWrap: "wrap",
  },
  statPill: { flexDirection: "row", alignItems: "center", gap: 6 },
  statDot: { width: 8, height: 8, borderRadius: 4 },
  statTxt: {
    fontSize: theme.font.size.sm,
    color: theme.colors.textMuted,
    fontWeight: theme.font.weight.medium,
  },

  // ── List ──────────────────────────────────────
  listContent: {
    paddingHorizontal: theme.spacing(4),
    paddingBottom: 60,
  },

  // ── Card ──────────────────────────────────────
  cardHead: { marginBottom: theme.spacing(3) },
  titleWrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing(2),
  },
  cardIcon: { fontSize: 20 },
  cardTitle: {
    flex: 1,
    fontSize: theme.font.size.md,
    fontWeight: theme.font.weight.bold,
    color: theme.colors.text,
    lineHeight: 22,
  },

  pdcaTag: {
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(2),
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing(3),
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  pdcaTagTxt: {
    fontSize: theme.font.size.xs,
    color: theme.colors.primary,
    fontWeight: theme.font.weight.semibold,
  },

  // ── Blocks ────────────────────────────────────
  block: {
    marginBottom: theme.spacing(3),
    paddingLeft: theme.spacing(3),
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.divider,
  },
  blockLabel: {
    fontSize: 10,
    fontWeight: theme.font.weight.bold,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  blockValue: {
    fontSize: theme.font.size.base,
    color: theme.colors.text,
    lineHeight: 20,
  },

  // ── Footer ────────────────────────────────────
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: theme.spacing(3),
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  date: {
    fontSize: theme.font.size.xs,
    color: theme.colors.textMuted,
    fontWeight: theme.font.weight.medium,
  },
  deleteBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  deleteTxt: {
    color: theme.colors.danger,
    fontWeight: theme.font.weight.semibold,
    fontSize: theme.font.size.sm,
  },

  // ── Modal ─────────────────────────────────────
  modalRoot: { flex: 1, backgroundColor: theme.colors.bg },
  modalBody: { padding: theme.spacing(5), paddingBottom: 60 },
  modalTitle: {
    fontSize: theme.font.size["2xl"],
    fontWeight: theme.font.weight.black,
    color: theme.colors.text,
  },
  modalSub: {
    fontSize: theme.font.size.base,
    color: theme.colors.textMuted,
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(5),
  },
});
