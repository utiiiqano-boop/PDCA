import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Link } from "expo-router";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import { ExportButton } from "@/components/ExportButton";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { listPDCA, PDCAWithActions } from "@/services/pdcaService";
import { getCompany, CompanyRow } from "@/services/companiesService";
import { useAuth } from "@/hooks/useAuth";
import { useFocusEffect } from "@react-navigation/native";
import { theme } from "@/theme";

export default function Dashboard() {
  const { profile, signOut } = useAuth();
  const [data, setData] = useState<PDCAWithActions[]>([]);
  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const companyId =
    (profile as { company_id?: string } | null)?.company_id ?? null;

  const loadData = useCallback(async () => {
    try {
      setData(await listPDCA());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadData();
      setLoading(false);
    })();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  useEffect(() => {
    if (!companyId) return;
    getCompany(companyId)
      .then(setCompany)
      .catch((e) => console.warn("[dashboard] getCompany failed:", e));
  }, [companyId]);

  const stats = useMemo(() => {
    const actions = data.flatMap((p) => p.pdca_actions);
    const total = actions.length;
    const cancelled = actions.filter((a) => a.status === "CANCELLED").length;
    const completed = actions.filter((a) => a.status === "COMPLETED").length;
    const overdue = actions.filter((a) => a.status === "OVERDUE").length;
    const inProgress = actions.filter((a) => a.status === "IN_PROGRESS").length;
    const open = actions.filter((a) => a.status === "OPEN").length;

    const active = total - cancelled;
    const rate = active > 0 ? Math.round((completed / active) * 100) : 0;

    // PDCA-level rate: a PDCA is "done" if all its actions are completed
    const pdcaDone = data.filter(
      (p) =>
        p.pdca_actions.length > 0 &&
        p.pdca_actions.every((a) => a.status === "COMPLETED" || a.status === "CANCELLED"),
    ).length;
    const pdcaRate = data.length > 0 ? Math.round((pdcaDone / data.length) * 100) : 0;

    return {
      pdcaTotal: data.length,
      pdcaOpen: data.filter((p) => p.status === "OPEN").length,
      pdcaInProgress: data.filter((p) => p.status === "IN_PROGRESS").length,
      pdcaCompleted: data.filter((p) => p.status === "COMPLETED").length,
      actionsTotal: total,
      actionsOpen: open,
      actionsInProgress: inProgress,
      actionsCompleted: completed,
      actionsOverdue: overdue,
      actionsCancelled: cancelled,
      rate,
      pdcaRate,
    };
  }, [data]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* ── Company header ────────────────────────────── */}
      <View style={styles.companyHeader}>
        {company?.logo_url ? (
          <Image source={{ uri: company.logo_url }} style={styles.companyLogo} />
        ) : (
          <View style={[styles.companyLogo, styles.companyLogoFallback]}>
            <Text style={styles.companyLogoText}>
              {(company?.name ?? "?").charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.companyName} numberOfLines={1}>
            {company?.name ?? "Chargement…"}
          </Text>
          <Text style={styles.companySub}>Espace PDCA</Text>
        </View>
      </View>

      <Text style={styles.hello}>Bonjour {profile?.full_name ?? ""}</Text>
      <Text style={styles.sub}>Tableau de bord</Text>

      {/* ── KPI: PDCA counts ──────────────────────────── */}
      <Card>
        <Text style={styles.cardTitle}>PDCA</Text>
        <View style={styles.bigRow}>
          <Text style={styles.bigNumber}>{stats.pdcaTotal}</Text>
          <Text style={styles.bigLabel}>Total</Text>
        </View>
        <View style={styles.grid}>
          <Stat n={stats.pdcaOpen} l="Ouverts" color={theme.colors.info} />
          <Stat n={stats.pdcaInProgress} l="En cours" color={theme.colors.warning} />
          <Stat n={stats.pdcaCompleted} l="Terminés" color={theme.colors.success} />
          <Stat
            n={stats.actionsOverdue}
            l="En retard"
            color={theme.colors.danger}
          />
        </View>
      </Card>

      {/* ── Taux de réalisation ──────────────────────── */}
      <Card>
        <Text style={styles.cardTitle}>Taux de réalisation</Text>

        <View style={styles.rateRow}>
          <Text style={styles.rateBig}>{stats.rate}%</Text>
          <Text style={styles.rateHint}>actions terminées</Text>
        </View>
        <ProgressBar value={stats.rate} label="Actions" showLabel={false} />

        <View style={{ height: 16 }} />

        <View style={styles.rateRow}>
          <Text style={styles.rateBig}>{stats.pdcaRate}%</Text>
          <Text style={styles.rateHint}>PDCA clôturés</Text>
        </View>
        <ProgressBar
          value={stats.pdcaRate}
          color={theme.colors.success}
          label="PDCA"
          showLabel={false}
        />

        <View style={styles.kpiMiniRow}>
          <MiniKpi n={stats.actionsCompleted} l="Terminées" color={theme.colors.success} />
          <MiniKpi n={stats.actionsInProgress} l="En cours" color={theme.colors.warning} />
          <MiniKpi n={stats.actionsOpen} l="Ouvertes" color={theme.colors.info} />
          <MiniKpi n={stats.actionsCancelled} l="Annulées" color={theme.colors.textMuted} />
        </View>
      </Card>

      {/* ── Quick actions ─────────────────────────────── */}
      <Link href="/(app)/pdca/new" asChild>
        <Button label="+ Nouveau PDCA" onPress={() => {}} style={{ marginBottom: 12 }} />
      </Link>
      <Link href="/(app)/pdca" asChild>
        <Button label="Voir tous les PDCA" variant="secondary" onPress={() => {}} />
      </Link>

      <View style={{ height: 24 }} />
      <ExportButton
        filename="dashboard-synthese"
        headers={["Indicateur","Valeur"]}
        rows={() => [
          ["PDCA Total", stats.pdcaTotal],
          ["PDCA Ouverts", stats.pdcaOpen],
          ["PDCA En cours", stats.pdcaInProgress],
          ["PDCA Terminés", stats.pdcaCompleted],
          ["Actions totales", stats.actionsTotal],
          ["Actions ouvertes", stats.actionsOpen],
          ["Actions en cours", stats.actionsInProgress],
          ["Actions terminées", stats.actionsCompleted],
          ["Actions en retard", stats.actionsOverdue],
          ["Actions annulées", stats.actionsCancelled],
          ["Taux réalisation actions %", stats.rate],
          ["Taux réalisation PDCA %", stats.pdcaRate],
        ]}
      />
      <View style={{ height: 12 }} />
      <Button label="Se déconnecter" variant="danger" onPress={signOut} />

      {stats.pdcaTotal === 0 && (
        <EmptyState title="Aucun PDCA" subtitle="Créez votre premier PDCA." />
      )}
    </ScrollView>
  );
}

function Stat({ n, l, color }: { n: number; l: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statN, color && { color }]}>{n}</Text>
      <Text style={styles.statL}>{l}</Text>
    </View>
  );
}

function MiniKpi({ n, l, color }: { n: number; l: string; color?: string }) {
  return (
    <View style={styles.miniKpi}>
      <Text style={[styles.miniKpiN, color && { color }]}>{n}</Text>
      <Text style={styles.miniKpiL}>{l}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: theme.colors.bg,
    flexGrow: 1,
    paddingBottom: 40,
  },
  companyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    padding: 12,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  companyLogo: { width: 48, height: 48, borderRadius: 10 },
  companyLogoFallback: {
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  companyLogoText: { color: "#fff", fontWeight: "800", fontSize: 22 },
  companyName: { fontSize: 16, fontWeight: "800", color: theme.colors.text },
  companySub: { fontSize: 12, color: theme.colors.textMuted },

  hello: { fontSize: 22, fontWeight: "700", color: theme.colors.text },
  sub: { color: theme.colors.textMuted, marginBottom: 16 },

  cardTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  bigRow: { flexDirection: "row", alignItems: "baseline", marginBottom: 12 },
  bigNumber: {
    fontSize: 42,
    fontWeight: "800",
    color: theme.colors.primary,
    marginRight: 8,
  },
  bigLabel: { fontSize: 14, color: theme.colors.textMuted, fontWeight: "600" },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  stat: { minWidth: 90, flex: 1 },
  statN: { fontSize: 22, fontWeight: "700", color: theme.colors.text },
  statL: { fontSize: 12, color: theme.colors.textMuted },

  rateRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 6,
  },
  rateBig: {
    fontSize: 32,
    fontWeight: "800",
    color: theme.colors.primary,
    marginRight: 8,
  },
  rateHint: { fontSize: 13, color: theme.colors.textMuted, fontWeight: "600" },

  kpiMiniRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  miniKpi: { flex: 1, alignItems: "center" },
  miniKpiN: { fontSize: 18, fontWeight: "800", color: theme.colors.text },
  miniKpiL: { fontSize: 11, color: theme.colors.textMuted, textAlign: "center" },
});
