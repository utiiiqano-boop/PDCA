import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Link, router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { ProgressBar } from "@/components/ProgressBar";
import { PriorityBadge, StatusBadge } from "@/components/Badges";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { listPDCA, PDCAWithActions } from "@/services/pdcaService";
import { getCompany, CompanyRow } from "@/services/companiesService";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n/I18nProvider";
import { theme } from "@/theme";

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}`;
  } catch {
    return iso;
  }
}

function greetingKey(): "greetingMorning" | "greetingAfternoon" | "greetingEvening" {
  const h = new Date().getHours();
  if (h < 12) return "greetingMorning";
  if (h < 18) return "greetingAfternoon";
  return "greetingEvening";
}

export default function Dashboard() {
  // ── 1. HOOKS ──────────────────────────────────────────
  const { profile, signOut } = useAuth();
  const { t: tr } = useTranslation();
  const [data, setData] = useState<PDCAWithActions[]>([]);
  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
    getCompany(companyId).then(setCompany).catch(console.warn);
  }, [companyId]);

  // ── 2. STATS ──────────────────────────────────────────
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

    const pdcaDone = data.filter(
      (p) =>
        p.pdca_actions.length > 0 &&
        p.pdca_actions.every(
          (a) => a.status === "COMPLETED" || a.status === "CANCELLED",
        ),
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

  // ── 3. OVERDUE PREVIEW ────────────────────────────────
  const overdueActions = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return data
      .flatMap((p) =>
        p.pdca_actions.map((a) => ({ pdca: p, action: a })),
      )
      .filter(
        ({ action }) =>
          action.status === "OVERDUE" ||
          (action.due_date &&
            action.due_date < today &&
            action.status !== "COMPLETED" &&
            action.status !== "CANCELLED"),
      )
      .slice(0, 3);
  }, [data]);

  // ── 4. RECENT PDCA ────────────────────────────────────
  const recentPdcas = useMemo(() => data.slice(0, 4), [data]);

  // ── 5. EARLY RETURNS ──────────────────────────────────
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  // ── 6. UI ─────────────────────────────────────────────
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await loadData();
            setRefreshing(false);
          }}
        />
      }
    >
      {/* ── Company header ─────────────────────────── */}
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
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.companyName} numberOfLines={1}>
            {company?.name ?? "Chargement…"}
          </Text>
          <Text style={styles.companySub}>{tr("dashboard.companySub")}</Text>
        </View>
      </View>

      {/* ── Greeting ───────────────────────────────── */}
      <View style={styles.greetingWrap}>
        <Text style={styles.greeting}>
          {tr(`dashboard.${greetingKey()}`)}, {profile?.full_name?.split(" ")[0] ?? ""}
        </Text>
        <Text style={styles.greetingSub}>
          {tr("dashboard.todayStatus")}
        </Text>
      </View>

      {/* ── KPI hero ───────────────────────────────── */}
      <Card style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroLabel}>{tr("dashboard.totalPDCA")}</Text>
            <Text style={styles.heroValue}>{stats.pdcaTotal}</Text>
          </View>
          <View style={styles.heroIcon}>
            <Text style={styles.heroIconTxt}>📊</Text>
          </View>
        </View>

        <View style={styles.heroDivider} />

        <View style={styles.heroGrid}>
          <HeroStat
            n={stats.pdcaOpen}
            l={tr("dashboard.open")}
            color={theme.colors.info}
          />
          <HeroStat
            n={stats.pdcaInProgress}
            l={tr("dashboard.inProgress")}
            color={theme.colors.warning}
          />
          <HeroStat
            n={stats.pdcaCompleted}
            l={tr("dashboard.completed")}
            color={theme.colors.success}
          />
          <HeroStat
            n={stats.actionsOverdue}
            l={tr("dashboard.overdue")}
            color={theme.colors.danger}
          />
        </View>
      </Card>

      {/* ── Taux de réalisation ────────────────────── */}
      <Card>
        <Text style={styles.sectionLabel}>{tr("dashboard.rateTitle")}</Text>

        <View style={styles.rateRow}>
          <View style={styles.rateBig}>
            <Text style={styles.rateValue}>{stats.rate}%</Text>
            <Text style={styles.rateHint}>{tr("dashboard.rateActionsDone")}</Text>
          </View>
          <View style={styles.rateBig}>
            <Text style={[styles.rateValue, { color: theme.colors.success }]}>
              {stats.pdcaRate}%
            </Text>
            <Text style={styles.rateHint}>{tr("dashboard.ratePdcaClosed")}</Text>
          </View>
        </View>

        <View style={{ marginTop: theme.spacing(3) }}>
          <ProgressBar
            value={stats.rate}
            label={tr("dashboard.kpiActions")}
            showLabel={false}
          />
        </View>
        <View style={{ marginTop: theme.spacing(2) }}>
          <ProgressBar
            value={stats.pdcaRate}
            color={theme.colors.success}
            label={tr("dashboard.kpiPdca")}
            showLabel={false}
          />
        </View>

        <View style={styles.miniRow}>
          <MiniKpi n={stats.actionsCompleted} l="Terminées" color={theme.colors.success} />
          <MiniKpi n={stats.actionsInProgress} l={tr("dashboard.kpiInProgress")} color={theme.colors.warning} />
          <MiniKpi n={stats.actionsOpen} l="Ouvertes" color={theme.colors.info} />
          <MiniKpi n={stats.actionsCancelled} l="Annulées" color={theme.colors.textMuted} />
        </View>
      </Card>

      {/* ── Alertes retard ─────────────────────────── */}
      {overdueActions.length > 0 ? (
        <Card style={styles.alertCard}>
          <View style={styles.alertHead}>
            <View style={styles.alertIconBox}>
              <Text style={styles.alertIcon}>⚠️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>{tr("dashboard.alertLate")}</Text>
              <Text style={styles.alertCount}>
                {stats.actionsOverdue} action
                {stats.actionsOverdue > 1 ? "s" : ""} dépassée
                {stats.actionsOverdue > 1 ? "s" : ""}
              </Text>
            </View>
          </View>

          {overdueActions.map(({ pdca, action }) => (
            <Pressable
              key={action.id}
              style={styles.alertRow}
              onPress={() => router.push(`/(app)/pdca/${pdca.id}`)}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.alertRef} numberOfLines={1}>
                  {pdca.reference}
                </Text>
                <Text style={styles.alertAction} numberOfLines={1}>
                  {action.action}
                </Text>
              </View>
              <Text style={styles.alertDue}>{fmtDate(action.due_date ?? "")}</Text>
            </Pressable>
          ))}

          <View style={{ height: theme.spacing(2) }} />
          <Button
            label={tr("dashboard.seeAllActions")}
            variant="ghost"
            size="sm"
            onPress={() => router.push("/(app)/actions-annulees")}
          />
        </Card>
      ) : null}

      {/* ── Actions rapides ────────────────────────── */}
      <Text style={styles.sectionHeader}>{tr("dashboard.quickActions")}</Text>
      <View style={styles.quickGrid}>
        <QuickAction
          icon="➕"
          label={tr("dashboard.newPdca")}
          onPress={() => router.push("/(app)/pdca/new")}
        />
        <QuickAction
          icon="📋"
          label={tr("dashboard.pdcaList")}
          onPress={() => router.push("/(app)/pdca")}
        />
        <QuickAction
          icon="👥"
          label={tr("dashboard.pilots")}
          onPress={() => router.push("/(app)/pilotes")}
        />
        <QuickAction
          icon="📈"
          label={tr("dashboard.charts")}
          onPress={() => router.push("/(app)/graphiques")}
        />
      </View>

      {/* ── PDCA récents ───────────────────────────── */}
      <View style={styles.recentHeader}>
        <Text style={styles.sectionHeader}>{tr("dashboard.recentPdca")}</Text>
        <Pressable onPress={() => router.push("/(app)/pdca")}>
          <Text style={styles.seeAll}>{tr("dashboard.seeAll")}</Text>
        </Pressable>
      </View>

      {recentPdcas.length === 0 ? (
        <EmptyState
          title={tr("dashboard.noPdca")}
          subtitle={tr("dashboard.noPdcaSub")}
          icon="📋"
        />
      ) : (
        recentPdcas.map((p) => {
          const totalA = p.pdca_actions.length;
          const doneA = p.pdca_actions.filter(
            (a) => a.status === "COMPLETED",
          ).length;
          const pct = totalA > 0 ? Math.round((doneA / totalA) * 100) : 0;
          return (
            <Link key={p.id} href={`/(app)/pdca/${p.id}`} asChild>
              <Pressable>
                <Card>
                  <View style={styles.recentRow}>
                    <Text style={styles.recentRef}>{p.reference}</Text>
                    <StatusBadge status={p.status} />
                  </View>
                  <Text style={styles.recentSubject} numberOfLines={1}>
                    {p.subject}
                  </Text>
                  <View style={styles.recentFooter}>
                    <PriorityBadge priority={p.priority} />
                    <Text style={styles.recentProgress}>
                      {doneA}/{totalA} · {pct}%
                    </Text>
                  </View>
                </Card>
              </Pressable>
            </Link>
          );
        })
      )}

      {/* ── Logout ─────────────────────────────────── */}
      <View style={{ height: theme.spacing(6) }} />
      <Button label={tr("dashboard.logout")} variant="secondary" onPress={signOut} />
      <View style={{ height: theme.spacing(6) }} />
    </ScrollView>
  );
}

// ── Subcomponents ──────────────────────────────────────

function HeroStat({
  n,
  l,
  color,
}: {
  n: number;
  l: string;
  color: string;
}) {
  return (
    <View style={styles.heroStat}>
      <Text style={[styles.heroStatN, { color }]}>{n}</Text>
      <Text style={styles.heroStatL}>{l}</Text>
    </View>
  );
}

function MiniKpi({
  n,
  l,
  color,
}: {
  n: number;
  l: string;
  color: string;
}) {
  return (
    <View style={styles.miniKpi}>
      <Text style={[styles.miniKpiN, { color }]}>{n}</Text>
      <Text style={styles.miniKpiL}>{l}</Text>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickBtn,
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text style={styles.quickIcon}>{icon}</Text>
      <Text style={styles.quickLabel} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

// ── Styles ─────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  container: {
    padding: theme.spacing(4),
    paddingBottom: 40,
  },

  // ── Company header ────────────────────────────
  companyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(3),
    marginBottom: theme.spacing(5),
  },
  companyLogo: { width: 48, height: 48, borderRadius: 12 },
  companyLogoFallback: {
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  companyLogoText: {
    color: "#fff",
    fontWeight: theme.font.weight.black,
    fontSize: theme.font.size.xl,
  },
  companyName: {
    fontSize: theme.font.size.lg,
    fontWeight: theme.font.weight.bold,
    color: theme.colors.text,
  },
  companySub: {
    fontSize: theme.font.size.xs,
    color: theme.colors.textMuted,
    marginTop: 1,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: theme.font.weight.semibold,
  },

  // ── Greeting ──────────────────────────────────
  greetingWrap: { marginBottom: theme.spacing(5) },
  greeting: {
    fontSize: theme.font.size["2xl"],
    fontWeight: theme.font.weight.black,
    color: theme.colors.text,
  },
  greetingSub: {
    fontSize: theme.font.size.base,
    color: theme.colors.textMuted,
    marginTop: theme.spacing(1),
  },

  // ── Hero card ─────────────────────────────────
  heroCard: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: theme.font.weight.bold,
    color: "#ffffffcc",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  heroValue: {
    fontSize: 56,
    fontWeight: theme.font.weight.black,
    color: "#fff",
    lineHeight: 60,
    marginTop: theme.spacing(1),
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroIconTxt: { fontSize: 24 },
  heroDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginVertical: theme.spacing(4),
  },
  heroGrid: {
    flexDirection: "row",
    gap: theme.spacing(3),
  },
  heroStat: { flex: 1 },
  heroStatN: {
    fontSize: theme.font.size.xl,
    fontWeight: theme.font.weight.black,
    color: "#fff",
  },
  heroStatL: {
    fontSize: 10,
    color: "#ffffffb3",
    marginTop: 2,
    fontWeight: theme.font.weight.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // ── Section labels ────────────────────────────
  sectionLabel: {
    fontSize: theme.font.size.sm,
    fontWeight: theme.font.weight.bold,
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: theme.spacing(4),
  },
  sectionHeader: {
    fontSize: theme.font.size.md,
    fontWeight: theme.font.weight.bold,
    color: theme.colors.text,
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(3),
  },

  // ── Rates ─────────────────────────────────────
  rateRow: {
    flexDirection: "row",
    gap: theme.spacing(4),
    marginBottom: theme.spacing(2),
  },
  rateBig: { flex: 1 },
  rateValue: {
    fontSize: 36,
    fontWeight: theme.font.weight.black,
    color: theme.colors.primary,
    lineHeight: 40,
  },
  rateHint: {
    fontSize: theme.font.size.xs,
    color: theme.colors.textMuted,
    marginTop: 2,
    fontWeight: theme.font.weight.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  miniRow: {
    flexDirection: "row",
    gap: theme.spacing(2),
    marginTop: theme.spacing(4),
    paddingTop: theme.spacing(3),
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  miniKpi: { flex: 1, alignItems: "center" },
  miniKpiN: {
    fontSize: theme.font.size.lg,
    fontWeight: theme.font.weight.black,
  },
  miniKpiL: {
    fontSize: 10,
    color: theme.colors.textMuted,
    textAlign: "center",
    marginTop: 2,
    fontWeight: theme.font.weight.medium,
  },

  // ── Alert card ────────────────────────────────
  alertCard: {
    backgroundColor: theme.colors.dangerSoft,
    borderColor: theme.colors.danger + "44",
  },
  alertHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(3),
    marginBottom: theme.spacing(4),
  },
  alertIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  alertIcon: { fontSize: 20 },
  alertTitle: {
    fontSize: theme.font.size.md,
    fontWeight: theme.font.weight.bold,
    color: theme.colors.danger,
  },
  alertCount: {
    fontSize: theme.font.size.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  alertRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing(3),
    paddingHorizontal: theme.spacing(2),
    backgroundColor: "#fff",
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing(2),
    gap: theme.spacing(3),
  },
  alertRef: {
    fontSize: theme.font.size.xs,
    fontWeight: theme.font.weight.bold,
    color: theme.colors.danger,
    letterSpacing: 0.3,
  },
  alertAction: {
    fontSize: theme.font.size.sm,
    color: theme.colors.text,
    marginTop: 2,
  },
  alertDue: {
    fontSize: theme.font.size.xs,
    fontWeight: theme.font.weight.bold,
    color: theme.colors.danger,
  },

  // ── Quick actions ─────────────────────────────
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing(2),
  },
  quickBtn: {
    width: "48%",
    flexGrow: 1,
    minWidth: 140,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing(4),
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadow.sm,
  },
  quickIcon: { fontSize: 22, marginBottom: theme.spacing(2) },
  quickLabel: {
    fontSize: theme.font.size.sm,
    fontWeight: theme.font.weight.bold,
    color: theme.colors.text,
  },

  // ── Recent PDCA ───────────────────────────────
  recentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  seeAll: {
    fontSize: theme.font.size.sm,
    color: theme.colors.primary,
    fontWeight: theme.font.weight.semibold,
  },
  recentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing(2),
  },
  recentRef: {
    fontWeight: theme.font.weight.bold,
    color: theme.colors.primary,
    fontSize: theme.font.size.sm,
    letterSpacing: 0.3,
  },
  recentSubject: {
    fontSize: theme.font.size.base,
    color: theme.colors.text,
    fontWeight: theme.font.weight.semibold,
    marginBottom: theme.spacing(3),
  },
  recentFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: theme.spacing(3),
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  recentProgress: {
    fontSize: theme.font.size.xs,
    color: theme.colors.textMuted,
    fontWeight: theme.font.weight.semibold,
  },
});
