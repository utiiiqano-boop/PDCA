import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Link } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { PriorityBadge, StatusBadge } from "@/components/Badges";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { ExportButton } from "@/components/ExportButton";
import { FilterBar, FilterState, applyFilters, defaultFilters } from "@/components/FilterBar";
import { listPDCA, PDCAWithActions } from "@/services/pdcaService";
import { theme } from "@/theme";
import { useTranslation } from "@/i18n/I18nProvider";

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

export default function PDCAList() {
  const [items, setItems] = useState<PDCAWithActions[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const { t: tr } = useTranslation();

  const load = useCallback(async () => {
    try {
      setError(null);
      setItems(await listPDCA());
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

  const filtered = useMemo(() => applyFilters(items, filters), [items, filters]);

  const stats = useMemo(() => {
    const open = items.filter((p) => p.status === "OPEN").length;
    const progress = items.filter((p) => p.status === "IN_PROGRESS").length;
    const done = items.filter((p) => p.status === "COMPLETED").length;
    const overdue = items
      .flatMap((p) => p.pdca_actions)
      .filter((a) => a.status === "OVERDUE").length;
    return { total: items.length, open, progress, done, overdue };
  }, [items]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <View style={styles.container}>
      {/* ── Header ───────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{tr("pdcaList.title")}</Text>
          <Text style={styles.sub}>
            {filtered.length} / {items.length} PDCA
          </Text>
        </View>
      </View>

      {/* ── Stats compactes ─────────────────────────── */}
      <View style={styles.statsRow}>
        <StatPill label={tr("pdcaList.statTotal")} value={stats.total} color={theme.colors.primary} />
        <StatPill label={tr("statusFilter.OPEN")} value={stats.open} color={theme.colors.info} />
        <StatPill
          label={tr("statusFilter.IN_PROGRESS")}
          value={stats.progress}
          color={theme.colors.warning}
        />
        <StatPill
          label={tr("statusFilter.COMPLETED")}
          value={stats.done}
          color={theme.colors.success}
        />
        <StatPill
          label={tr("statusFilter.OVERDUE")}
          value={stats.overdue}
          color={theme.colors.danger}
        />
      </View>

      {/* ── Actions : nouveau + export ──────────────── */}
      <View style={styles.actionsRow}>
        <View style={{ flex: 1 }}>
          <Link href="/(app)/pdca/new" asChild>
            <Button label={`+ ${tr("pdcaList.new")}`} onPress={() => {}} />
          </Link>
        </View>
      </View>

      <View style={styles.exportWrap}>
        <ExportButton
          label={tr("pdcaList.exportBtn")}
          filename="pdca-list"
          headers={[
            tr("department.hRef"),
            tr("department.hSubject"),
            tr("department.hLine"),
            tr("department.hDepartment"),
            tr("department.hPriority"),
            tr("pdcaList.hStatusShort"),
            tr("pdcaList.hCreatedAt"),
            tr("department.hActionsCount"),
          ]}
          rows={() =>
            filtered.map((p) => [
              p.reference,
              p.subject,
              p.line,
              p.department ?? "",
              p.priority === "HIGH"
                ? tr("priority.HIGH")
                : p.priority === "MEDIUM"
                  ? tr("priority.MEDIUM")
                  : tr("priority.LOW"),
              p.status,
              fmtDate(p.created_at),
              p.pdca_actions.length,
            ])
          }
        />
      </View>

      {/* ── Filtres ─────────────────────────────────── */}
      <FilterBar value={filters} onChange={setFilters} />

      {/* ── Liste ────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <EmptyState
          title={tr("pdcaList.empty")}
          subtitle={tr("pdcaList.emptySub")}
          icon="📋"
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
          renderItem={({ item }: { item: PDCAWithActions }) => {
            const doneCount = item.pdca_actions.filter(
              (a) => a.status === "COMPLETED",
            ).length;
            const totalActions = item.pdca_actions.length;
            const pct = totalActions > 0 ? Math.round((doneCount / totalActions) * 100) : 0;

            return (
              <Link href={`/(app)/pdca/${item.id}`} asChild>
                <Pressable>
                  <Card>
                    {/* Header : ref + statut */}
                    <View style={styles.cardHeader}>
                      <Text style={styles.ref}>{item.reference}</Text>
                      <StatusBadge status={item.status} />
                    </View>

                    {/* Sujet */}
                    <Text style={styles.subject} numberOfLines={2}>
                      {item.subject}
                    </Text>

                    {/* Meta chips */}
                    <View style={styles.chipsRow}>
                      <MetaChip icon="🏭" label={item.line} />
                      {item.department ? (
                        <MetaChip icon="🏢" label={item.department} />
                      ) : null}
                    </View>

                    {/* Progress */}
                    {totalActions > 0 ? (
                      <View style={styles.progressWrap}>
                        <View style={styles.progressTrack}>
                          <View
                            style={[
                              styles.progressFill,
                              {
                                width: `${pct}%`,
                                backgroundColor:
                                  pct === 100
                                    ? theme.colors.success
                                    : theme.colors.primary,
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.progressTxt}>
                          {doneCount}/{totalActions} · {pct}%
                        </Text>
                      </View>
                    ) : null}

                    {/* Footer : priorité + date */}
                    <View style={styles.cardFooter}>
                      <PriorityBadge priority={item.priority} />
                      <Text style={styles.date}>{fmtDate(item.created_at)}</Text>
                    </View>
                  </Card>
                </Pressable>
              </Link>
            );
          }}
        />
      )}
    </View>
  );
}

function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={styles.statPill}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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
    fontSize: theme.font.size.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing(1),
    fontWeight: theme.font.weight.medium,
  },

  // ── Stats pills ───────────────────────────────
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing(4),
    gap: theme.spacing(2),
    marginBottom: theme.spacing(4),
  },
  statPill: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing(2),
    alignItems: "center",
  },
  statValue: {
    fontSize: theme.font.size.lg,
    fontWeight: theme.font.weight.black,
  },
  statLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 1,
    fontWeight: theme.font.weight.medium,
  },

  // ── Buttons row ───────────────────────────────
  actionsRow: {
    paddingHorizontal: theme.spacing(4),
    marginBottom: theme.spacing(2),
  },
  exportWrap: {
    paddingHorizontal: theme.spacing(4),
    marginBottom: theme.spacing(3),
  },

  // ── Liste ─────────────────────────────────────
  listContent: {
    paddingHorizontal: theme.spacing(4),
    paddingBottom: 60,
  },

  // ── Card PDCA ─────────────────────────────────
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing(2),
  },
  ref: {
    fontWeight: theme.font.weight.bold,
    color: theme.colors.primary,
    fontSize: theme.font.size.sm,
    letterSpacing: 0.3,
  },
  subject: {
    fontSize: theme.font.size.md,
    color: theme.colors.text,
    fontWeight: theme.font.weight.semibold,
    lineHeight: 20,
    marginBottom: theme.spacing(3),
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing(2),
    marginBottom: theme.spacing(3),
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: theme.colors.neutralSoft,
    paddingHorizontal: theme.spacing(2),
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    maxWidth: "100%",
  },
  metaChipIcon: { fontSize: 11 },
  metaChipTxt: {
    fontSize: theme.font.size.xs,
    color: theme.colors.textSecondary,
    fontWeight: theme.font.weight.medium,
  },

  // ── Progress ──────────────────────────────────
  progressWrap: {
    marginBottom: theme.spacing(3),
  },
  progressTrack: {
    height: 6,
    backgroundColor: theme.colors.divider,
    borderRadius: theme.radius.pill,
    overflow: "hidden",
    marginBottom: theme.spacing(1),
  },
  progressFill: {
    height: 6,
    borderRadius: theme.radius.pill,
  },
  progressTxt: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: theme.font.weight.medium,
    textAlign: "right",
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
});
