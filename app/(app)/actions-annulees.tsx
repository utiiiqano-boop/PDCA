import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { StatusBadge } from "@/components/Badges";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { ExportButton } from "@/components/ExportButton";
import { FilterBar, FilterState, defaultFilters } from "@/components/FilterBar";
import { listCancelledActions, CancelledAction } from "@/services/pdcaService";
import { theme } from "@/theme";
import { useTranslation } from "@/i18n/I18nProvider";

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
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

export default function ActionsAnnuleesScreen() {
  // ── 1. ALL HOOKS FIRST ────────────────────────────────
  const [items, setItems] = useState<CancelledAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const { t: tr } = useTranslation();

  const load = useCallback(async () => {
    try {
      setError(null);
      setItems(await listCancelledActions());
    } catch (e) {
      setError(e instanceof Error ? e.message : tr("common.error"));
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((a) => {
      const hay = `${a.action} ${a.pilot_name} ${a.pdca_reference ?? ""} ${
        a.pdca_subject ?? ""
      }`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, filters.search]);

  const byPilot = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of items) {
      const k = a.pilot_name || "—";
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);
  }, [items]);

  // ── 2. NOW we can have early returns ──────────────────
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  // ── 3. Derived values (non-hook) ──────────────────────
  const ListHeader = (
    <View>
      <View style={styles.statsRow}>
        <View style={styles.statPill}>
          <View
            style={[styles.statDot, { backgroundColor: theme.colors.danger }]}
          />
          <Text style={styles.statTxt}>
            {items.length} {items.length > 1 ? tr("cancelledActions.countMany") : tr("cancelledActions.countOne")}
          </Text>
        </View>
        {byPilot.length > 0 ? (
          <View style={styles.statPill}>
            <View
              style={[styles.statDot, { backgroundColor: theme.colors.textMuted }]}
            />
            <Text style={styles.statTxt}>
              {tr("cancelledActions.top")} : {byPilot[0]?.label} ({byPilot[0]?.value})
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{tr("cancelledActions.title")}</Text>
        <Text style={styles.sub}>
          {tr("cancelledActions.subtitle")}
        </Text>
      </View>

      {/* Export */}
      <View style={styles.exportWrap}>
        <ExportButton
          label={tr("cancelledActions.exportBtn")}
          filename="actions-annulees"
          headers={[
            tr("pdcaList.title"),
            tr("department.hSubject"),
            tr("department.hAction"),
            tr("department.hPilot"),
            tr("department.hOpenDate"),
            tr("department.hDueDate"),
            tr("status.OPEN").replace("Ouvert","Statut"),
          ]}
          rows={() =>
            filtered.map((a) => [
              a.pdca_reference ?? "",
              a.pdca_subject ?? "",
              a.action,
              a.pilot_name,
              a.opening_date,
              a.due_date ?? "",
              a.status,
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
        placeholder={tr("cancelledActions.searchPh")}
      />

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          title={tr("cancelledActions.empty")}
          subtitle={tr("cancelledActions.emptySub")}
          icon="🚫"
        />
      ) : (
        <FlatList<CancelledAction>
          data={filtered}
          keyExtractor={(it: CancelledAction) => it.id}
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
          renderItem={({ item }: { item: CancelledAction }) => (
            <Card>
              <View style={styles.cardHead}>
                <Text style={styles.ref}>
                  {item.pdca_reference ?? "PDCA"}
                </Text>
                <StatusBadge status={item.status} />
              </View>

              <Text style={styles.pdcaSubject} numberOfLines={1}>
                {item.pdca_subject ?? "—"}
              </Text>

              <View style={styles.actionBox}>
                <Text style={styles.actionLbl}>{tr("cancelledActions.actionLbl")}</Text>
                <Text style={styles.actionTxt}>{item.action}</Text>
              </View>

              <View style={styles.metaGrid}>
                <MetaItem icon="👤" label={tr("department.hPilot")} value={item.pilot_name} />
                <MetaItem
                  icon="📅"
                  label={tr("department.hOpenDate")}
                  value={fmtDate(item.opening_date)}
                />
                <MetaItem
                  icon="⏰"
                  label={tr("department.hDueDate")}
                  value={fmtDate(item.due_date)}
                />
              </View>

              <View style={styles.ctaWrap}>
                <Button
                  label={tr("cancelledActions.seePdca")}
                  variant="secondary"
                  size="sm"
                  onPress={() => router.push(`/(app)/pdca/${item.pdca_id}`)}
                />
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}

function MetaItem({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaIcon}>{icon}</Text>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.metaLabel}>{label}</Text>
        <Text style={styles.metaValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },

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
    lineHeight: 20,
  },
  exportWrap: {
    paddingHorizontal: theme.spacing(4),
    marginBottom: theme.spacing(3),
  },

  statsRow: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing(4),
    gap: theme.spacing(3),
    marginBottom: theme.spacing(4),
    flexWrap: "wrap",
  },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statDot: { width: 8, height: 8, borderRadius: 4 },
  statTxt: {
    fontSize: theme.font.size.sm,
    color: theme.colors.textMuted,
    fontWeight: theme.font.weight.medium,
  },

  listContent: {
    paddingHorizontal: theme.spacing(4),
    paddingBottom: 60,
  },

  cardHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing(2),
  },
  ref: {
    fontWeight: theme.font.weight.bold,
    color: theme.colors.danger,
    fontSize: theme.font.size.sm,
    letterSpacing: 0.3,
  },
  pdcaSubject: {
    fontSize: theme.font.size.base,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing(3),
    fontWeight: theme.font.weight.medium,
  },

  actionBox: {
    backgroundColor: theme.colors.dangerSoft,
    borderRadius: theme.radius.md,
    padding: theme.spacing(3),
    marginBottom: theme.spacing(3),
    borderStartWidth: 3,
    borderStartColor: theme.colors.danger,
  },
  actionLbl: {
    fontSize: 10,
    fontWeight: theme.font.weight.bold,
    color: theme.colors.danger,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  actionTxt: {
    fontSize: theme.font.size.base,
    color: theme.colors.text,
    fontWeight: theme.font.weight.semibold,
    lineHeight: 20,
  },

  metaGrid: {
    flexDirection: "row",
    gap: theme.spacing(3),
    paddingTop: theme.spacing(3),
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  metaItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
  },
  metaIcon: { fontSize: 12 },
  metaLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontWeight: theme.font.weight.bold,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  metaValue: {
    fontSize: theme.font.size.sm,
    color: theme.colors.text,
    fontWeight: theme.font.weight.semibold,
    marginTop: 1,
  },

  ctaWrap: {
    marginTop: theme.spacing(4),
  },
});
