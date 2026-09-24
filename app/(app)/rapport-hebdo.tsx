import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/Card";
import { BarChart, StatTile } from "@/components/Charts";
import { ErrorState, LoadingState } from "@/components/States";
import { listPDCA, PDCAWithActions } from "@/services/pdcaService";
import { Button } from "@/components/Button";
import { computeWeeklyReport, exportWeeklyReport } from "@/services/reportService";
import { getCompany, CompanyRow } from "@/services/companiesService";
import { useAuth } from "@/hooks/useAuth";
import { useUI } from "@/ui/UIProvider";
import { useCompanyOptions } from "@/hooks/useCompanyOptions";
import { theme } from "@/theme";

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

function fmtRange(a: Date, b: Date): string {
  const f = (x: Date) =>
    x.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
  return `${f(a)} → ${f(addDays(b, -1))}`;
}

export default function RapportHebdo() {
  const [items, setItems] = useState<PDCAWithActions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const { profile } = useAuth();
  const { toast } = useUI();
  const [company, setCompany] = useState<CompanyRow | null>(null);
  const { departments, defectTypes } = useCompanyOptions();

  const resolveDept = (id: string | null | undefined, fallback: string) => {
    if (!id) return fallback;
    return departments.find((d) => d.id === id)?.label ?? fallback;
  };
  const resolveDefect = (id: string | null | undefined, fallback: string) => {
    if (!id) return fallback;
    return defectTypes.find((d) => d.id === id)?.label ?? fallback;
  };
  const [exporting, setExporting] = useState(false);
  const companyId = (profile as { company_id?: string } | null)?.company_id;

  useEffect(() => {
    if (!companyId) return;
    getCompany(companyId).then(setCompany).catch(console.warn);
  }, [companyId]);

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

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const handleExport = async () => {
    try {
      setExporting(true);
      const data = computeWeeklyReport(items, week.start, week.end, company, resolveDept, resolveDefect);
      await exportWeeklyReport(data);
      toast.success("Rapport généré");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec de l'export");
    } finally {
      setExporting(false);
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
    >
      <Text style={styles.h1}>Rapport hebdomadaire</Text>

      <View style={styles.weekRow}>
        <Pressable
          onPress={() => setWeekOffset((w) => w - 1)}
          style={styles.navBtn}
        >
          <Text style={styles.navTxt}>‹ Précédent</Text>
        </Pressable>
        <Text style={styles.range}>{fmtRange(week.start, week.end)}</Text>
        <Pressable
          onPress={() => setWeekOffset((w) => Math.min(0, w + 1))}
          style={styles.navBtn}
          disabled={weekOffset === 0}
        >
          <Text style={[styles.navTxt, weekOffset === 0 && { opacity: 0.3 }]}>
            Suivant ›
          </Text>
        </Pressable>
      </View>

      <View style={styles.tiles}>
        <StatTile label="PDCA créés" value={report.pdcasCreated} />
        <StatTile label="PDCA clôturés" value={report.pdcasClosed} />
        <StatTile label="Actions ouvertes" value={report.open} />
        <StatTile label="Actions en retard" value={report.overdue} color={theme.colors.danger} />
        <StatTile label="Actions terminées" value={report.completed} color={theme.colors.success} />
      </View>

      <View style={{ marginTop: 12, marginBottom: 12 }}>
        <Button
          label="📄 Exporter en PDF"
          onPress={handleExport}
          loading={exporting}
        />
      </View>

      <Card>
        <Text style={styles.h2}>Top défauts</Text>
        <BarChart data={report.topDefects} />
      </Card>

      <Card>
        <Text style={styles.h2}>Top départements</Text>
        <BarChart data={report.topDepartments} />
      </Card>

      <Card>
        <Text style={styles.h2}>Top pilotes</Text>
        <BarChart data={report.topPilots} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 24, fontWeight: "800", color: theme.colors.text, marginBottom: 12 },
  h2: { fontSize: 15, fontWeight: "700", color: theme.colors.text, marginBottom: 10 },
  weekRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  range: { fontWeight: "700", color: theme.colors.text },
  navBtn: { padding: 6 },
  navTxt: { color: theme.colors.primary, fontWeight: "600" },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 4 },
});
