import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { BarChart } from "@/components/Charts";
import { ErrorState, LoadingState } from "@/components/States";
import { listPDCA, PDCAWithActions } from "@/services/pdcaService";
import { useCompanyOptions } from "@/hooks/useCompanyOptions";
import { useUI } from "@/ui/UIProvider";
import {
  computeWeeklyReport,
  exportWeeklyReport,
} from "@/services/reportService";
import { getCompany, CompanyRow } from "@/services/companiesService";
import { useAuth } from "@/hooks/useAuth";
import { theme } from "@/theme";
import { useTranslation } from "@/i18n/I18nProvider";

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

const LOCALES: Record<string, string> = { fr: "fr-FR", en: "en-US", ar: "ar-SA" };
function fmtRange(a: Date, b: Date, locale: string): string {
  const f = (x: Date) =>
    x.toLocaleDateString(locale, { day: "2-digit", month: "short" });
  return `${f(a)} → ${f(addDays(b, -1))}`;
}

export default function RapportHebdo() {
  const { profile } = useAuth();
  const { toast, alert } = useUI();
  const { t: tr, language } = useTranslation();
  const locale = LOCALES[language] ?? "fr-FR";
  const [items, setItems] = useState<PDCAWithActions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [exporting, setExporting] = useState(false);

  const { departments, defectTypes } = useCompanyOptions();
  const companyId =
    (profile as { company_id?: string } | null)?.company_id ?? null;

  useEffect(() => {
    if (!companyId) return;
    getCompany(companyId).then(setCompany).catch(console.warn);
  }, [companyId]);

  const load = async () => {
    try {
      setError(null);
      setItems(await listPDCA());
    } catch (e) {
      setError(e instanceof Error ? e.message : tr("common.error"));
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, []);

  const week = useMemo(() => {
    const start = addDays(startOfWeek(new Date()), weekOffset * 7);
    const end = addDays(start, 7);
    return { start, end };
  }, [weekOffset]);

  const report = useMemo(() => {
    const inRange = (iso: string | null) => {
      if (!iso) return false;
      const t = new Date(iso).getTime();
      return t >= week.start.getTime() && t < week.end.getTime();
    };

    const pdcasCreated = items.filter((p) => inRange(p.created_at)).length;
    const pdcasClosed = items.filter(
      (p) => p.status === "COMPLETED" && inRange(p.updated_at),
    ).length;

    const allActions = items.flatMap((p) => p.pdca_actions);
    const open = allActions.filter(
      (a) => a.status === "OPEN" || a.status === "IN_PROGRESS",
    ).length;
    const overdue = allActions.filter((a) => a.status === "OVERDUE").length;
    const completed = allActions.filter((a) => a.status === "COMPLETED").length;

    const tally = (fn: (x: PDCAWithActions) => string | null) => {
      const m = new Map<string, number>();
      for (const p of items) {
        const k = fn(p) ?? "—";
        m.set(k, (m.get(k) ?? 0) + 1);
      }
      return [...m.entries()]
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
    };

    const pilotTally = (() => {
      const m = new Map<string, number>();
      for (const a of allActions) {
        const k = a.pilot_name || "—";
        m.set(k, (m.get(k) ?? 0) + 1);
      }
      return [...m.entries()]
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
    })();

    return {
      pdcasCreated,
      pdcasClosed,
      open,
      overdue,
      completed,
      topDefects: tally((p) => p.defect_type),
      topDepartments: tally((p) => p.department),
      topPilots: pilotTally,
    };
  }, [items, week]);

  const handleExport = async () => {
    try {
      setExporting(true);
      const data = computeWeeklyReport(items, week.start, week.end, company);
      await exportWeeklyReport(data);
      toast.success(tr("rapportHebdo.generated"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("rapportHebdo.exportFailed"));
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.container}
    >
      {/* ── Header ───────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.title}>{tr("rapportHebdo.title")}</Text>
        <Text style={styles.sub}>
          {tr("rapportHebdo.subtitle")}
        </Text>
      </View>

      {/* ── Week selector ────────────────────────────── */}
      <View style={styles.weekRow}>
        <Pressable
          onPress={() => setWeekOffset((w) => w - 1)}
          style={styles.navBtn}
        >
          <Text style={styles.navTxt}>{tr("rapportHebdo.prev")}</Text>
        </Pressable>
        <View style={styles.rangeWrap}>
          <Text style={styles.rangeLbl}>{tr("rapportHebdo.week")}</Text>
          <Text style={styles.rangeTxt}>{fmtRange(week.start, week.end, locale)}</Text>
        </View>
        <Pressable
          onPress={() => setWeekOffset((w) => Math.min(0, w + 1))}
          style={[styles.navBtn, weekOffset === 0 && { opacity: 0.3 }]}
          disabled={weekOffset === 0}
        >
          <Text style={styles.navTxt}>{tr("rapportHebdo.next")}</Text>
        </Pressable>
      </View>

      {/* ── KPIs ─────────────────────────────────────── */}
      <View style={styles.kpiGrid}>
        <KpiCard
          label={tr("rapportHebdo.kpiPdcaCreated")}
          value={report.pdcasCreated}
          color={theme.colors.primary}
          icon="📝"
        />
        <KpiCard
          label={tr("rapportHebdo.kpiPdcaClosed")}
          value={report.pdcasClosed}
          color={theme.colors.success}
          icon="✓"
        />
        <KpiCard
          label={tr("rapportHebdo.kpiActionsOpen")}
          value={report.open}
          color={theme.colors.info}
          icon="▶"
        />
        <KpiCard
          label={tr("rapportHebdo.kpiActionsOverdue")}
          value={report.overdue}
          color={theme.colors.danger}
          icon="⚠"
        />
        <KpiCard
          label={tr("rapportHebdo.kpiActionsCompleted")}
          value={report.completed}
          color={theme.colors.success}
          icon="🏁"
          wide
        />
      </View>

      {/* ── Export PDF ───────────────────────────────── */}
      <View style={{ marginBottom: theme.spacing(5) }}>
        <Button
          label={tr("rapportHebdo.exportPdf")}
          onPress={handleExport}
          loading={exporting}
        />
      </View>

      {/* ── Top lists ────────────────────────────────── */}
      <SectionTitle index={1} label={tr("rapportHebdo.topDefects")} />
      <Card>
        <BarChart data={report.topDefects} />
      </Card>

      <SectionTitle index={2} label={tr("rapportHebdo.topDepartments")} />
      <Card>
        <BarChart data={report.topDepartments} />
      </Card>

      <SectionTitle index={3} label={tr("rapportHebdo.topPilots")} />
      <Card>
        <BarChart data={report.topPilots} />
      </Card>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function KpiCard({
  label,
  value,
  color,
  icon,
  wide,
}: {
  label: string;
  value: number;
  color: string;
  icon: string;
  wide?: boolean;
}) {
  return (
    <View style={[styles.kpi, wide && styles.kpiWide]}>
      <View style={[styles.kpiIconBox, { backgroundColor: color + "18" }]}>
        <Text style={[styles.kpiIcon, { color }]}>{icon}</Text>
      </View>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function SectionTitle({ index, label }: { index: number; label: string }) {
  return (
    <View style={styles.sectionTitleWrap}>
      <View style={styles.sectionNum}>
        <Text style={styles.sectionNumTxt}>{index}</Text>
      </View>
      <Text style={styles.sectionLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  container: {
    padding: theme.spacing(4),
    paddingBottom: 60,
  },

  // ── Header ────────────────────────────────────
  header: { marginBottom: theme.spacing(5) },
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

  // ── Week selector ─────────────────────────────
  weekRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    padding: theme.spacing(2),
    marginBottom: theme.spacing(4),
    ...theme.shadow.sm,
  },
  navBtn: {
    paddingVertical: theme.spacing(2),
    paddingHorizontal: theme.spacing(3),
    borderRadius: theme.radius.md,
  },
  navTxt: {
    color: theme.colors.primary,
    fontWeight: theme.font.weight.bold,
    fontSize: theme.font.size.sm,
  },
  rangeWrap: { flex: 1, alignItems: "center" },
  rangeLbl: {
    fontSize: 10,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: theme.font.weight.bold,
  },
  rangeTxt: {
    fontSize: theme.font.size.md,
    fontWeight: theme.font.weight.bold,
    color: theme.colors.text,
    marginTop: 2,
  },

  // ── KPI grid ──────────────────────────────────
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing(2),
    marginBottom: theme.spacing(4),
  },
  kpi: {
    flex: 1,
    minWidth: "30%",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    paddingVertical: theme.spacing(3),
    paddingHorizontal: theme.spacing(3),
    alignItems: "center",
    ...theme.shadow.sm,
  },
  kpiWide: { minWidth: "62%" },
  kpiIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing(2),
  },
  kpiIcon: { fontSize: 16 },
  kpiValue: {
    fontSize: theme.font.size["2xl"],
    fontWeight: theme.font.weight.black,
  },
  kpiLabel: {
    fontSize: theme.font.size.xs,
    color: theme.colors.textMuted,
    marginTop: theme.spacing(1),
    fontWeight: theme.font.weight.medium,
    textAlign: "center",
  },

  // ── Section title ─────────────────────────────
  sectionTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(2),
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(3),
  },
  sectionNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionNumTxt: {
    color: "#fff",
    fontSize: theme.font.size.xs,
    fontWeight: theme.font.weight.bold,
  },
  sectionLabel: {
    fontSize: theme.font.size.sm,
    fontWeight: theme.font.weight.bold,
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
});
