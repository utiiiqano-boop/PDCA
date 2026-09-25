import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { PriorityBadge, StatusBadge } from "@/components/Badges";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { ExportButton } from "@/components/ExportButton";
import { FilterBar, FilterState, applyFilters, defaultFilters } from "@/components/FilterBar";
import { listPDCAByDepartmentId, PDCAWithActions } from "@/services/pdcaService";
import { useCompanyOptions } from "@/hooks/useCompanyOptions";
import { useUI } from "@/ui/UIProvider";
import { exportCsv } from "@/services/exportService";
import { theme } from "@/theme";

const PHASE_LABELS: Record<string, string> = {
  P: "Plan",
  D: "Do",
  C: "Check",
  A: "Act",
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
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

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const mn = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${mm}/${yyyy} ${hh}:${mn}`;
  } catch {
    return iso;
  }
}

export default function DepartmentScreen() {
  const params = useLocalSearchParams<{ dept: string }>();
  const deptLabel = params.dept ? decodeURIComponent(params.dept) : "";
  const { toast, alert } = useUI();

  const { departments, loading: optsLoading } = useCompanyOptions();
  const department = useMemo(
    () => departments.find((d) => d.label === deptLabel),
    [departments, deptLabel],
  );

  const [items, setItems] = useState<PDCAWithActions[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [exportingFull, setExportingFull] = useState(false);

  const load = useCallback(async () => {
    if (!department?.id) return;
    try {
      setError(null);
      setItems(await listPDCAByDepartmentId(department.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }, [department?.id]);

  useEffect(() => {
    if (optsLoading) return;
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load, optsLoading]);

  useFocusEffect(
    useCallback(() => {
      if (!optsLoading) load();
    }, [load, optsLoading]),
  );

  const stats = useMemo(() => {
    const allActions = items.flatMap((p) => p.pdca_actions);
    return {
      total: items.length,
      open: allActions.filter((a) => a.status === "OPEN" || a.status === "IN_PROGRESS").length,
      completed: allActions.filter((a) => a.status === "COMPLETED").length,
      overdue: allActions.filter((a) => a.status === "OVERDUE").length,
    };
  }, [items]);

  const filtered = useMemo(() => applyFilters(items, filters), [items, filters]);

  // ── Export complet : une ligne par action ──────────────
  const handleExportFull = async () => {
    if (!department) return;
    try {
      setExportingFull(true);

      // Une ligne par action (si PDCA sans action → 1 ligne avec colonnes action vides)
      const rows: (string | number)[][] = [];

      for (const pdca of filtered) {
        const pdcaCols: (string | number)[] = [
          pdca.reference,
          pdca.subject,
          pdca.description ?? "",
          pdca.line,
          pdca.line_other ?? "",
          pdca.defect_type ?? "",
          pdca.defect_type_other ?? "",
          pdca.priority === "HIGH"
            ? "Élevée"
            : pdca.priority === "MEDIUM"
              ? "Moyenne"
              : "Faible",
          pdca.department ?? "",
          pdca.status,
          fmtDateTime(pdca.created_at),
          fmtDateTime(pdca.updated_at),
          pdca.pdca_actions.length,
        ];

        if (pdca.pdca_actions.length === 0) {
          rows.push([...pdcaCols, "", "", "", "", "", "", "", "", "", ""]);
        } else {
          for (const a of pdca.pdca_actions) {
            rows.push([
              ...pdcaCols,
              a.action,
              a.pilot_name,
              fmtDate(a.opening_date),
              fmtDate(a.due_date),
              a.phase,
              PHASE_LABELS[a.phase] ?? a.phase,
              `${a.progress}%`,
              a.status,
              fmtDateTime(a.completed_at),
              "",
            ]);
          }
        }
      }

      if (rows.length === 0) {
        toast.info("Aucune donnée à exporter");
        return;
      }

      await exportCsv({
        filename: `department-${department.label}-complet`,
        headers: [
          // --- PDCA ---
          "Référence",
          "Sujet",
          "Description",
          "Ligne",
          "Ligne (autre)",
          "Type de défaut",
          "Type défaut (autre)",
          "Priorité",
          "Département",
          "Statut PDCA",
          "PDCA créé le",
          "PDCA modifié le",
          "Nb actions",
          // --- Action ---
          "Action",
          "Pilote",
          "Date ouverture",
          "Date fin",
          "Phase",
          "Phase (libellé)",
          "Progression",
          "Statut action",
          "Action terminée le",
          "Commentaire",
        ],
        rows,
      });

      toast.success(`Export complet : ${rows.length} ligne(s)`);
    } catch (e) {
      alert({
        title: "Erreur d'export",
        message: e instanceof Error ? e.message : "Erreur",
      });
    } finally {
      setExportingFull(false);
    }
  };

  if (optsLoading) return <LoadingState />;

  if (!department) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
        <Stack.Screen options={{ title: deptLabel }} />
        <ErrorState message={`Département inconnu : ${deptLabel}`} />
      </View>
    );
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: department.label }} />

      {/* ── KPI ───────────────────────────────────── */}
      <View style={styles.statsRow}>
        <Stat n={stats.total} l="PDCA" />
        <Stat n={stats.open} l="En cours" />
        <Stat n={stats.completed} l="Terminées" />
        <Stat n={stats.overdue} l="En retard" danger />
      </View>

      {/* ── Filtres ───────────────────────────────── */}
      <FilterBar value={filters} onChange={setFilters} />

      {/* ── Exports ───────────────────────────────── */}
      <View style={styles.exportWrap}>
        <ExportButton
          label="📊 Exporter la vue (7 colonnes)"
          filename={`department-${department.label}-vue`}
          headers={[
            "Référence",
            "Sujet",
            "Ligne",
            "Priorité",
            "Statut",
            "Créé le",
            "Nb actions",
          ]}
          rows={() =>
            filtered.map((p) => [
              p.reference,
              p.subject,
              p.line,
              p.priority === "HIGH"
                ? "Élevée"
                : p.priority === "MEDIUM"
                  ? "Moyenne"
                  : "Faible",
              p.status,
              fmtDate(p.created_at),
              p.pdca_actions.length,
            ])
          }
        />
        <View style={{ height: theme.spacing(2) }} />
        <Button
          label="📥 Exporter tout (23 colonnes)"
          variant="secondary"
          onPress={handleExportFull}
          loading={exportingFull}
        />
        <Text style={styles.exportHint}>
          "Vue" = filtre actuel, format compact · "Tout" = tous les champs + une
          ligne par action
        </Text>
      </View>

      {/* ── Liste ─────────────────────────────────── */}
      {filtered.length === 0 ? (
        <EmptyState
          title="Aucun PDCA"
          subtitle={`Rien à afficher pour ${department.label}.`}
        />
      ) : (
        <FlatList<PDCAWithActions>
          contentContainerStyle={styles.listContent}
          data={filtered}
          keyExtractor={(it: PDCAWithActions) => it.id}
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
          renderItem={({ item }: { item: PDCAWithActions }) => (
            <Link href={`/(app)/pdca/${item.id}`} asChild>
              <Pressable>
                <Card>
                  <View style={styles.row}>
                    <Text style={styles.ref}>{item.reference}</Text>
                    <StatusBadge status={item.status} />
                  </View>
                  <Text style={styles.subject}>{item.subject}</Text>
                  <Text style={styles.meta}>
                    {item.line} • {item.pdca_actions.length} action(s)
                  </Text>
                  <View style={{ marginTop: theme.spacing(2) }}>
                    <PriorityBadge priority={item.priority} />
                  </View>
                </Card>
              </Pressable>
            </Link>
          )}
        />
      )}
    </View>
  );
}

function Stat({
  n,
  l,
  danger,
}: {
  n: number;
  l: string;
  danger?: boolean;
}) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statN, danger && { color: theme.colors.danger }]}>
        {n}
      </Text>
      <Text style={styles.statL}>{l}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  statsRow: {
    flexDirection: "row",
    padding: theme.spacing(4),
    gap: theme.spacing(3),
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  stat: { flex: 1 },
  statN: {
    fontSize: theme.font.size["2xl"],
    fontWeight: theme.font.weight.black,
    color: theme.colors.text,
  },
  statL: {
    fontSize: theme.font.size.xs,
    color: theme.colors.textMuted,
    marginTop: 2,
    fontWeight: theme.font.weight.medium,
  },
  exportWrap: {
    paddingHorizontal: theme.spacing(4),
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(3),
  },
  exportHint: {
    fontSize: theme.font.size.xs,
    color: theme.colors.textMuted,
    marginTop: theme.spacing(2),
    fontStyle: "italic",
    textAlign: "center",
  },
  listContent: {
    paddingHorizontal: theme.spacing(4),
    paddingBottom: 60,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ref: {
    fontWeight: theme.font.weight.bold,
    color: theme.colors.primary,
    fontSize: theme.font.size.base,
  },
  subject: {
    fontSize: theme.font.size.md,
    color: theme.colors.text,
    marginTop: theme.spacing(2),
    fontWeight: theme.font.weight.semibold,
  },
  meta: {
    fontSize: theme.font.size.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing(1),
  },
});
