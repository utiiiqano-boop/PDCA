import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Card } from "@/components/Card";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { listHistory, HistoryEntry } from "@/services/pdcaService";
import { theme } from "@/theme";

const EVENT_LABELS: Record<string, string> = {
  PDCA_CREATED: "PDCA créé",
  PDCA_CANCELLED: "PDCA annulé",
  ACTION_CREATED: "Action créée",
  ACTION_UPDATED: "Action modifiée",
  ACTION_COMPLETED: "Action clôturée",
  ACTION_CANCELLED: "Action annulée",
  PHASE_CHANGED: "Phase modifiée",
  PILOT_CHANGED: "Pilote modifié",
  DUE_DATE_CHANGED: "Échéance modifiée",
  PRIORITY_CHANGED: "Priorité modifiée",
};

const EVENT_COLORS: Record<string, string> = {
  PDCA_CREATED: "#0f4c81",
  PDCA_CANCELLED: "#dc2626",
  ACTION_CREATED: "#0284c7",
  ACTION_COMPLETED: "#16a34a",
  ACTION_CANCELLED: "#dc2626",
  PHASE_CHANGED: "#f59e0b",
  PILOT_CHANGED: "#7c3aed",
  DUE_DATE_CHANGED: "#f59e0b",
};

const FILTERS = [
  { key: "ALL", label: "Tous" },
  { key: "ACTION_CREATED", label: "Créations" },
  { key: "ACTION_COMPLETED", label: "Clôtures" },
  { key: "ACTION_CANCELLED", label: "Annulations" },
  { key: "PHASE_CHANGED", label: "Phases" },
  { key: "PILOT_CHANGED", label: "Pilotes" },
  { key: "DUE_DATE_CHANGED", label: "Échéances" },
];

function fmt(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mn = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mn}`;
}

export default function HistoriqueScreen() {
  const [items, setItems] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("ALL");

  const load = async () => {
    try {
      setError(null);
      setItems(await listHistory(500));
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
    if (filter === "ALL") return items;
    return items.filter((h) => h.event_type === filter);
  }, [items, filter]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View style={styles.header}>
        <Text style={styles.title}>Historique</Text>
        <Text style={styles.sub}>{filtered.length} événement(s)</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {filtered.length === 0 ? (
        <EmptyState
          title="Aucun événement"
          subtitle={filter === "ALL" ? undefined : "Aucun événement pour ce filtre."}
        />
      ) : (
        <FlatList<HistoryEntry>
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          data={filtered}
          keyExtractor={(it: HistoryEntry) => it.id}
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
          renderItem={({ item }: { item: HistoryEntry }) => {
            const label = EVENT_LABELS[item.event_type] ?? item.event_type;
            const color = EVENT_COLORS[item.event_type] ?? theme.colors.primary;
            const hasChange = Boolean(item.old_value) || Boolean(item.new_value);
            return (
              <Card>
                <View style={styles.eventHeader}>
                  <View style={[styles.badge, { backgroundColor: color + "22", borderColor: color }]}>
                    <Text style={[styles.badgeTxt, { color }]}>{label}</Text>
                  </View>
                  <Text style={styles.date}>{fmt(item.created_at)}</Text>
                </View>

                {hasChange ? (
                  <Text style={styles.change}>
                    {item.old_value ?? "—"} → {item.new_value ?? "—"}
                  </Text>
                ) : null}

                {item.comment ? (
                  <Text style={styles.comment}>« {item.comment} »</Text>
                ) : null}

                {item.pdca_reference ? (
                  <Text style={styles.ref}>PDCA {item.pdca_reference}</Text>
                ) : null}
              </Card>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { padding: 16, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: "800", color: theme.colors.text },
  sub: { color: theme.colors.textMuted, marginTop: 4 },

  chips: { gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipTxt: { fontSize: 13, color: theme.colors.text },
  chipTxtActive: { color: "#fff", fontWeight: "700" },

  eventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeTxt: { fontSize: 12, fontWeight: "700" },
  date: { fontSize: 11, color: theme.colors.textMuted },
  change: { fontSize: 14, color: theme.colors.text, marginTop: 4, fontWeight: "600" },
  comment: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 6,
    fontStyle: "italic",
  },
  ref: { fontSize: 11, color: theme.colors.primary, marginTop: 6 },
});
