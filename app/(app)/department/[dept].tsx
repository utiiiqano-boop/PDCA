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
import { Card } from "@/components/Card";
import { PriorityBadge, StatusBadge } from "@/components/Badges";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import {
  FilterBar,
  FilterState,
  applyFilters,
  defaultFilters,
} from "@/components/FilterBar";
import { ExportButton } from "@/components/ExportButton";
import {
  listPDCAByDepartmentId,
  PDCAWithActions,
} from "@/services/pdcaService";
import { useCompanyOptions } from "@/hooks/useCompanyOptions";
import { theme } from "@/theme";

export default function DepartmentScreen() {
  const params = useLocalSearchParams<{ dept: string }>();
  const deptLabel = params.dept ? decodeURIComponent(params.dept) : "";

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
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <Stack.Screen options={{ title: department.label }} />

      <View style={styles.statsRow}>
        <Stat n={stats.total} l="PDCA" />
        <Stat n={stats.open} l="Actions ouvertes" />
        <Stat n={stats.completed} l="Terminées" />
        <Stat n={stats.overdue} l="En retard" danger />
      </View>

      <FilterBar value={filters} onChange={setFilters} />

      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <ExportButton
          filename={`department-${department.label}`}
          headers={["Référence","Sujet","Ligne","Priorité","Statut","Créé le","Nb actions"]}
          rows={() =>
            filtered.map((p) => [
              p.reference,
              p.subject,
              p.line,
              p.priority,
              p.status,
              new Date(p.created_at).toLocaleDateString("fr-FR"),
              p.pdca_actions.length,
            ])
          }
        />
      </View>

      {filtered.length === 0 ? (
        <EmptyState
          title="Aucun PDCA"
          subtitle={`Rien à afficher pour ${department.label}.`}
        />
      ) : (
        <FlatList<PDCAWithActions>
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
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
                  <View style={{ marginTop: 8 }}>
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
  statsRow: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  stat: { flex: 1 },
  statN: { fontSize: 22, fontWeight: "800", color: theme.colors.text },
  statL: { fontSize: 12, color: theme.colors.textMuted },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ref: { fontWeight: "700", color: theme.colors.primary },
  subject: { fontSize: 15, color: theme.colors.text, marginTop: 6 },
  meta: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4 },
});
