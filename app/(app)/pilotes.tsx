import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Card } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import { ExportButton } from "@/components/ExportButton";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { listPilotSummaries, PilotSummary } from "@/services/pdcaService";
import { theme } from "@/theme";
import { useTranslation } from "@/i18n/I18nProvider";

function rateColor(rate: number): string {
  if (rate >= 80) return theme.colors.success;
  if (rate >= 50) return theme.colors.primary;
  if (rate >= 20) return theme.colors.warning;
  return theme.colors.danger;
}

function rateTone(rate: number): "success" | "primary" | "warning" | "danger" {
  if (rate >= 80) return "success";
  if (rate >= 50) return "primary";
  if (rate >= 20) return "warning";
  return "danger";
}

export default function PilotesScreen() {
  const [items, setItems] = useState<PilotSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t: tr } = useTranslation();

  const load = useCallback(async () => {
    try {
      setError(null);
      setItems(await listPilotSummaries());
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

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const totalActions = items.reduce((s, p) => s + p.total_actions, 0);
  const totalCompleted = items.reduce((s, p) => s + p.completed_actions, 0);
  const totalOverdue = items.reduce((s, p) => s + p.overdue_actions, 0);
  const globalRate =
    totalActions > 0 ? Math.round((totalCompleted / totalActions) * 100) : 0;

  const ListHeader = (
    <View>
      {/* Stats */}
      <View style={styles.statsRow}>
        <StatPill
          icon="👥"
          label={tr("pilotesScreen.statPilots")}
          value={items.length}
          color={theme.colors.primary}
        />
        <StatPill
          icon="📋"
          label={tr("pilotesScreen.statActions")}
          value={totalActions}
          color={theme.colors.info}
        />
        <StatPill
          icon="✓"
          label={tr("pilotesScreen.statCompleted")}
          value={totalCompleted}
          color={theme.colors.success}
        />
        <StatPill
          icon="⚠"
          label={tr("pilotesScreen.statOverdue")}
          value={totalOverdue}
          color={theme.colors.danger}
        />
      </View>

      {/* Global rate */}
      <Card style={styles.globalCard}>
        <View style={styles.globalHeader}>
          <Text style={styles.globalLabel}>{tr("pilotesScreen.globalRate")}</Text>
          <Text style={[styles.globalPct, { color: rateColor(globalRate) }]}>
            {globalRate}%
          </Text>
        </View>
        <ProgressBar
          value={globalRate}
          color={rateColor(globalRate)}
          label=""
          showLabel={false}
        />
      </Card>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{tr("pilotesScreen.title")}</Text>
        <Text style={styles.sub}>
          {tr("pilotesScreen.subtitle")}
        </Text>
      </View>

      {/* Export */}
      <View style={styles.exportWrap}>
        <ExportButton
          label={tr("pilotesScreen.exportBtn")}
          filename="pilotes"
          headers={[
            tr("pilotesScreen.hPilot"),
            tr("pilotesScreen.hPdcaCount"),
            tr("pilotesScreen.hActionsTotal"),
            tr("pilotesScreen.hCompleted"),
            tr("pilotesScreen.hInProgress"),
            tr("pilotesScreen.hOpen"),
            tr("pilotesScreen.hOverdue"),
            tr("pilotesScreen.hCancelled"),
            tr("pilotesScreen.hRate"),
          ]}
          rows={() =>
            items.map((p) => [
              p.pilot_name,
              p.pdca_ids.length,
              p.total_actions,
              p.completed_actions,
              p.in_progress_actions,
              p.open_actions,
              p.overdue_actions,
              p.cancelled_actions,
              p.completion_rate,
            ])
          }
        />
      </View>

      {/* List */}
      {items.length === 0 ? (
        <EmptyState
          title={tr("pilotesScreen.empty")}
          subtitle={tr("pilotesScreen.emptySub")}
          icon="👤"
        />
      ) : (
        <FlatList<PilotSummary>
          contentContainerStyle={styles.listContent}
          data={items}
          keyExtractor={(it: PilotSummary) => it.key}
          ListHeaderComponent={ListHeader}
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
          renderItem={({ item }: { item: PilotSummary }) => (
            <Card>
              {/* Head: avatar + nom + meta */}
              <View style={styles.pilotHead}>
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: rateColor(item.completion_rate) },
                  ]}
                >
                  <Text style={styles.avatarTxt}>
                    {item.pilot_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.pilotName} numberOfLines={2}>
                    {item.pilot_name}
                  </Text>
                  <View style={styles.metaRow}>
                    <Badge
                      label={`${item.pdca_ids.length} ${tr("pilotesScreen.pdcaCount")}`}
                      tone="primary"
                    />
                    <Badge
                      label={`${item.total_actions} ${item.total_actions > 1 ? tr("pilotesScreen.actionCountMany") : tr("pilotesScreen.actionCount")}`}
                      tone="neutral"
                    />
                  </View>
                </View>
              </View>

              {/* Progress */}
              <View style={styles.progressWrap}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>{tr("pilotesScreen.rateTitle")}</Text>
                  <Text
                    style={[
                      styles.progressPct,
                      { color: rateColor(item.completion_rate) },
                    ]}
                  >
                    {item.completion_rate}%
                  </Text>
                </View>
                <ProgressBar
                  value={item.completion_rate}
                  color={rateColor(item.completion_rate)}
                  label=""
                  showLabel={false}
                />
              </View>

              {/* Metrics grid */}
              <View style={styles.metrics}>
                <Metric
                  n={item.completed_actions}
                  l={tr("pilotesScreen.metricCompleted")}
                  color={theme.colors.success}
                />
                <Metric
                  n={item.in_progress_actions}
                  l={tr("pilotesScreen.metricInProgress")}
                  color={theme.colors.warning}
                />
                <Metric
                  n={item.open_actions}
                  l={tr("pilotesScreen.metricOpen")}
                  color={theme.colors.info}
                />
                <Metric
                  n={item.overdue_actions}
                  l={tr("pilotesScreen.metricLate")}
                  color={theme.colors.danger}
                />
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}

function StatPill({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Metric({
  n,
  l,
  color,
}: {
  n: number;
  l: string;
  color?: string;
}) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricN, color && { color }]}>{n}</Text>
      <Text style={styles.metricL}>{l}</Text>
    </View>
  );
}

function Badge({
  label,
  tone,
}: {
  label: string;
  tone: "primary" | "neutral";
}) {
  const map = {
    primary: { fg: theme.colors.primary, bg: theme.colors.primarySoft },
    neutral: { fg: theme.colors.textSecondary, bg: theme.colors.neutralSoft },
  };
  const c = map[tone];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeTxt, { color: c.fg }]}>{label}</Text>
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
    fontSize: theme.font.size.base,
    color: theme.colors.textMuted,
    marginTop: theme.spacing(1),
  },
  exportWrap: {
    paddingHorizontal: theme.spacing(4),
    marginBottom: theme.spacing(3),
  },

  // ── Stats ─────────────────────────────────────
  statsRow: {
    flexDirection: "row",
    gap: theme.spacing(2),
    marginBottom: theme.spacing(4),
    flexWrap: "wrap",
  },
  statPill: {
    flex: 1,
    minWidth: 80,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing(2),
    alignItems: "center",
  },
  statIcon: { fontSize: 16, marginBottom: 4 },
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

  // ── Global card ───────────────────────────────
  globalCard: {
    marginBottom: theme.spacing(4),
  },
  globalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: theme.spacing(3),
  },
  globalLabel: {
    fontSize: theme.font.size.sm,
    fontWeight: theme.font.weight.semibold,
    color: theme.colors.textSecondary,
  },
  globalPct: {
    fontSize: theme.font.size["2xl"],
    fontWeight: theme.font.weight.black,
  },

  // ── List ──────────────────────────────────────
  listContent: {
    paddingHorizontal: theme.spacing(4),
    paddingBottom: 60,
  },

  // ── Card pilote ───────────────────────────────
  pilotHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(3),
    marginBottom: theme.spacing(4),
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTxt: {
    color: "#fff",
    fontWeight: theme.font.weight.black,
    fontSize: theme.font.size.xl,
  },
  pilotName: {
    fontSize: theme.font.size.md,
    fontWeight: theme.font.weight.bold,
    color: theme.colors.text,
  },
  metaRow: {
    flexDirection: "row",
    gap: theme.spacing(1),
    marginTop: theme.spacing(1),
    flexWrap: "wrap",
  },
  badge: {
    paddingHorizontal: theme.spacing(2),
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
  },
  badgeTxt: {
    fontSize: 10,
    fontWeight: theme.font.weight.bold,
    letterSpacing: 0.3,
  },

  // ── Progress ──────────────────────────────────
  progressWrap: {
    marginBottom: theme.spacing(4),
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: theme.spacing(2),
  },
  progressLabel: {
    fontSize: theme.font.size.xs,
    color: theme.colors.textMuted,
    fontWeight: theme.font.weight.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  progressPct: {
    fontSize: theme.font.size.lg,
    fontWeight: theme.font.weight.black,
  },

  // ── Metrics ───────────────────────────────────
  metrics: {
    flexDirection: "row",
    paddingTop: theme.spacing(3),
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    gap: theme.spacing(2),
  },
  metric: { flex: 1, alignItems: "center" },
  metricN: {
    fontSize: theme.font.size.lg,
    fontWeight: theme.font.weight.black,
    color: theme.colors.text,
  },
  metricL: {
    fontSize: 10,
    color: theme.colors.textMuted,
    textAlign: "center",
    marginTop: 2,
    fontWeight: theme.font.weight.medium,
  },
});
