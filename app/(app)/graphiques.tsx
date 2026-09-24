import React, { useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/Card";
import { BarChart, DonutChart, StatTile } from "@/components/Charts";
import { ErrorState, LoadingState } from "@/components/States";
import { listPDCA, PDCAWithActions } from "@/services/pdcaService";
import {
  actionsByPhase,
  avgCompletionDays,
  completedVsOverdue,
  monthlyCreations,
  pdcaByDefectType,
  pdcaByDepartment,
  pdcaByPriority,
} from "@/services/analyticsService";
import { useCompanyOptions } from "@/hooks/useCompanyOptions";
import { theme } from "@/theme";

export default function Graphiques() {
  const { departments, defectTypes } = useCompanyOptions();

  const resolveDept = (id: string | null | undefined, fallback: string) => {
    if (!id) return fallback;
    return departments.find((d) => d.id === id)?.label ?? fallback;
  };
  const resolveDefect = (id: string | null | undefined, fallback: string) => {
    if (!id) return fallback;
    return defectTypes.find((d) => d.id === id)?.label ?? fallback;
  };

  const [items, setItems] = useState<PDCAWithActions[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
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
      <Text style={styles.h1}>Graphiques</Text>

      <View style={styles.tiles}>
        <StatTile label="PDCA total" value={items.length} />
        <StatTile
          label="Actions totales"
          value={items.reduce((s, p) => s + p.pdca_actions.length, 0)}
        />
        <StatTile
          label="Durée moyenne (jours)"
          value={avg}
          color={theme.colors.primary}
        />
      </View>

      <Card>
        <Text style={styles.h2}>1. PDCA par département</Text>
        <BarChart data={pdcaByDepartment(items, resolveDept)} />
      </Card>

      <Card>
        <Text style={styles.h2}>2. PDCA par priorité</Text>
        <DonutChart data={pdcaByPriority(items)} />
      </Card>

      <Card>
        <Text style={styles.h2}>3. PDCA par type de défaut</Text>
        <BarChart data={pdcaByDefectType(items, resolveDefect)} />
      </Card>

      <Card>
        <Text style={styles.h2}>4. Actions par phase P/D/C/A</Text>
        <BarChart data={actionsByPhase(items)} />
      </Card>

      <Card>
        <Text style={styles.h2}>5. Terminées vs En retard</Text>
        <DonutChart data={completedVsOverdue(items)} />
      </Card>

      <Card>
        <Text style={styles.h2}>6. Créations mensuelles (6 mois)</Text>
        <BarChart data={monthlyCreations(items, 6)} />
      </Card>

      <Card>
        <Text style={styles.h2}>7. Durée moyenne de clôture</Text>
        <Text style={styles.big}>{avg} jours</Text>
        <Text style={styles.sub}>
          Basée sur {items.reduce((s, p) => s + p.pdca_actions.filter((a) => a.status === "COMPLETED").length, 0)} action(s) terminée(s).
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 24, fontWeight: "800", color: theme.colors.text, marginBottom: 12 },
  h2: { fontSize: 15, fontWeight: "700", color: theme.colors.text, marginBottom: 10 },
  big: { fontSize: 32, fontWeight: "800", color: theme.colors.primary },
  sub: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4 },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 4 },
});
