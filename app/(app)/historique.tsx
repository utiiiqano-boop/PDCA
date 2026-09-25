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
import { ExportButton } from "@/components/ExportButton";
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

const EVENT_COLORS: Record<string, { fg: string; bg: string }> = {
  PDCA_CREATED:     { fg: theme.colors.primary, bg: theme.colors.primarySoft },
  PDCA_CANCELLED:   { fg: theme.colors.danger,  bg: theme.colors.dangerSoft },
  ACTION_CREATED:   { fg: theme.colors.info,    bg: theme.colors.infoSoft },
  ACTION_COMPLETED: { fg: theme.colors.success, bg: theme.colors.successSoft },
  ACTION_CANCELLED: { fg: theme.colors.danger,  bg: theme.colors.dangerSoft },
  PHASE_CHANGED:    { fg: "#B45309",            bg: theme.colors.warningSoft },
  PILOT_CHANGED:    { fg: "#7C3AED",            bg: "#EDE9FE" },
  DUE_DATE_CHANGED: { fg: "#B45309",            bg: theme.colors.warningSoft },
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
    <View style={styles.container}>
      {/* ── Header ───────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.title}>Historique</Text>
        <Text style={styles.sub}>{filtered.length} événement(s)</Text>
      </View>

      {/* ── Filtres ──────────────────────────────── */}
      <View style={styles.filtersWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
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
      </View>

      {/* ── Export ───────────────────────────────── */}
      <View style={styles.exportWrap}>
        <ExportButton
          filename="historique"
          headers={[
            "Date",
            "Type",
            "Ancienne valeur",
            "Nouvelle valeur",
            "Commentaire",
            "PDCA",
          ]}
          rows={() =>
            filtered.map((h) => [
              fmt(h.created_at),
              EVENT_LABELS[h.event_type] ?? h.event_type,
              h.old_value ?? "",
              h.new_value ?? "",
              h.comment ?? "",
              h.pdca_reference ?? "",
            ])
          }
        />
      </View>

      {/* ── Liste ────────────────────────────────── */}
      {filtered.length === 0 ? (
        <EmptyState
          title="Aucun événement"
          subtitle={
            filter === "ALL"
              ? undefined
              : "Aucun événement pour ce filtre."
          }
        />
      ) : (
        <FlatList<HistoryEntry>
          contentContainerStyle={styles.listContent}
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
            const colors =
              EVENT_COLORS[item.event_type] ?? {
                fg: theme.colors.primary,
                bg: theme.colors.primarySoft,
              };
            const hasChange =
              Boolean(item.old_value) || Boolean(item.new_value);
            return (
              <Card>
                <View style={styles.eventHeader}>
                  <View
                    style={[styles.badge, { backgroundColor: colors.bg }]}
                  >
                    <Text style={[styles.badgeTxt, { color: colors.fg }]}>
                      {label}
                    </Text>
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
  container: { flex: 1, backgroundColor: theme.colors.bg },

  header: {
    paddingHorizontal: theme.spacing(4),
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(2),
  },
  title: {
    fontSize: theme.font.size["2xl"],
    fontWeight: theme.font.weight.black,
    color: theme.colors.text,
  },
  sub: {
    color: theme.colors.textMuted,
    marginTop: theme.spacing(1),
    fontSize: theme.font.size.base,
  },

  // Filtres : hauteur fixe, padding vertical pour ne pas clipper
  filtersWrap: {
    height: 56,
    justifyContent: "center",
    backgroundColor: theme.colors.bg,
  },
  filtersContent: {
    paddingHorizontal: theme.spacing(4),
    gap: theme.spacing(2),
    alignItems: "center",
  },
  chip: {
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(2),
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    height: 36,
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipTxt: {
    fontSize: theme.font.size.sm,
    color: theme.colors.text,
    fontWeight: theme.font.weight.semibold,
  },
  chipTxtActive: { color: "#fff" },

  exportWrap: {
    paddingHorizontal: theme.spacing(4),
    paddingBottom: theme.spacing(3),
  },

  listContent: {
    paddingHorizontal: theme.spacing(4),
    paddingBottom: 60,
  },

  eventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing(3),
  },
  badge: {
    paddingHorizontal: theme.spacing(3),
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
  },
  badgeTxt: {
    fontSize: theme.font.size.xs,
    fontWeight: theme.font.weight.bold,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  date: {
    fontSize: theme.font.size.xs,
    color: theme.colors.textMuted,
    fontWeight: theme.font.weight.medium,
  },
  change: {
    fontSize: theme.font.size.base,
    color: theme.colors.text,
    marginTop: theme.spacing(1),
    fontWeight: theme.font.weight.semibold,
  },
  comment: {
    fontSize: theme.font.size.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing(2),
    fontStyle: "italic",
  },
  ref: {
    fontSize: theme.font.size.xs,
    color: theme.colors.primary,
    marginTop: theme.spacing(2),
    fontWeight: theme.font.weight.semibold,
  },
});
