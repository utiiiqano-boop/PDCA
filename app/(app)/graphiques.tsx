import React, { useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Card } from "@/components/Card";
import { BarChart, DonutChart, StatTile } from "@/components/Charts";
import { ErrorState, LoadingState } from "@/components/States";
import { listPDCA, PDCAWithActions } from "@/services/pdcaService";
import { useCompanyOptions } from "@/hooks/useCompanyOptions";
import {
  actionsByPhase,
  avgCompletionDays,
  completedVsOverdue,
  monthlyCreations,
  pdcaByDefectType,
  pdcaByDepartment,
  pdcaByPriority,
} from "@/services/analyticsService";
import { theme } from "@/theme";

export default function Graphiques() {
  const [items, setItems] = useState<PDCAWithActions[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { departments, defectTypes } = useCompanyOptions();

  const resolveDept = (id: string | null | undefined, fallback: string) => {
    if (!id) return fallback;
    return departments.find((d) => d.id === id)?.label ?? fallback;
  };
  const resolveDefect = (id: string | null | undefined, fallback: string) => {
    if (!id) return fallback;
    return defectTypes.find((d) => d.id === id)?.label ?? fallback;
  };

  const load = async () => {
    try {
      setError(null);
      setItems(await listPDCA());
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

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const avg = avgCompletionDays(items);
  const totalActions = items.reduce((s, p) => s + p.pdca_actions.length, 0);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.container}
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
    >
      {/* ── Header ───────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.title}>Graphiques</Text>
        <Text style={styles.sub}>Analyse visuelle de vos PDCA</Text>
      </View>

      {/* ── KPI tiles ────────────────────────────── */}
      <View style={styles.tiles}>
        <StatTile label="PDCA total" value={items.length} />
        <StatTile label="Actions totales" value={totalActions} />
        <StatTile label="Durée moy. (j)" value={avg} color={theme.colors.primary} />
      </View>

      {/* ── 1. Départements ──────────────────────── */}
      <ChartCard
        index={1}
        title="PDCA par département"
        hint="Répartition du volume par service"
      >
        <BarChart data={pdcaByDepartment(items, resolveDept)} />
      </ChartCard>

      {/* ── 2. Priorité ─────────────────────────── */}
      <ChartCard
        index={2}
        title="PDCA par priorité"
        hint="Urgence relative des sujets"
      >
        <DonutChart data={pdcaByPriority(items)} />
      </ChartCard>

      {/* ── 3. Type de défaut ───────────────────── */}
      <ChartCard
        index={3}
        title="PDCA par type de défaut"
        hint="Origine des non-conformités"
      >
        <BarChart data={pdcaByDefectType(items, resolveDefect)} />
      </ChartCard>

      {/* ── 4. Actions par phase ────────────────── */}
      <ChartCard
        index={4}
        title="Actions par phase P/D/C/A"
        hint="Répartition du cycle PDCA"
      >
        <BarChart data={actionsByPhase(items)} />
      </ChartCard>

      {/* ── 5. Completed vs overdue ─────────────── */}
      <ChartCard
        index={5}
        title="Terminées vs En retard"
        hint="Performance globale"
      >
        <DonutChart data={completedVsOverdue(items)} />
      </ChartCard>

      {/* ── 6. Créations mensuelles ─────────────── */}
      <ChartCard
        index={6}
        title="Créations mensuelles"
        hint="6 derniers mois"
      >
        <BarChart data={monthlyCreations(items, 6)} />
      </ChartCard>

      {/* ── 7. Durée moyenne ────────────────────── */}
      <Card>
        <View style={styles.kpiHeader}>
          <View style={styles.kpiNumber}>
            <Text style={styles.kpiIndex}>7</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.kpiTitle}>Durée moyenne de clôture</Text>
            <Text style={styles.kpiHint}>Temps moyen pour terminer une action</Text>
          </View>
        </View>

        <View style={styles.bigStatWrap}>
          <Text style={styles.bigStatValue}>{avg}</Text>
          <Text style={styles.bigStatUnit}>jours</Text>
        </View>

        <Text style={styles.bigStatMeta}>
          Basée sur{" "}
          {items.reduce(
            (s, p) =>
              s + p.pdca_actions.filter((a) => a.status === "COMPLETED").length,
            0,
          )}{" "}
          action(s) terminée(s)
        </Text>
      </Card>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function ChartCard({
  index,
  title,
  hint,
  children,
}: {
  index: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <View style={styles.kpiHeader}>
        <View style={styles.kpiNumber}>
          <Text style={styles.kpiIndex}>{index}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.kpiTitle}>{title}</Text>
          {hint ? <Text style={styles.kpiHint}>{hint}</Text> : null}
        </View>
      </View>
      <View style={{ marginTop: theme.spacing(2) }}>{children}</View>
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  container: {
    padding: theme.spacing(4),
    paddingBottom: 60,
  },

  // ── Header ────────────────────────────────────
  header: {
    marginBottom: theme.spacing(5),
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

  // ── Tiles ─────────────────────────────────────
  tiles: {
    flexDirection: "row",
    gap: theme.spacing(2),
    marginBottom: theme.spacing(3),
  },

  // ── Chart card header ─────────────────────────
  kpiHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(3),
    marginBottom: theme.spacing(1),
  },
  kpiNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  kpiIndex: {
    fontSize: theme.font.size.sm,
    fontWeight: theme.font.weight.black,
    color: theme.colors.primary,
  },
  kpiTitle: {
    fontSize: theme.font.size.base,
    fontWeight: theme.font.weight.bold,
    color: theme.colors.text,
  },
  kpiHint: {
    fontSize: theme.font.size.xs,
    color: theme.colors.textMuted,
    marginTop: 2,
  },

  // ── Big stat ──────────────────────────────────
  bigStatWrap: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: theme.spacing(2),
    marginTop: theme.spacing(4),
  },
  bigStatValue: {
    fontSize: 48,
    fontWeight: theme.font.weight.black,
    color: theme.colors.primary,
    letterSpacing: -1,
  },
  bigStatUnit: {
    fontSize: theme.font.size.lg,
    fontWeight: theme.font.weight.semibold,
    color: theme.colors.textSecondary,
  },
  bigStatMeta: {
    fontSize: theme.font.size.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing(2),
  },
});
