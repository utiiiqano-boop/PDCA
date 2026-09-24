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
import { ExportButton } from "@/components/ExportButton";
import { ProgressBar } from "@/components/ProgressBar";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { listPilotSummaries, PilotSummary } from "@/services/pdcaService";
import { theme } from "@/theme";

function rateColor(rate: number): string {
  if (rate >= 80) return theme.colors.success;
  if (rate >= 50) return theme.colors.primary;
  if (rate >= 20) return theme.colors.warning;
  return theme.colors.danger;
}

export default function PilotesScreen() {
  const [items, setItems] = useState<PilotSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setItems(await listPilotSummaries());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }, []);

  // Load on first mount
  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  // Reload every time the screen gets focus (e.g. after creating a PDCA)
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const totalActions = items.reduce((s, p) => s + p.total_actions, 0);
  const totalCompleted = items.reduce((s, p) => s + p.completed_actions, 0);
  const globalRate =
    totalActions > 0 ? Math.round((totalCompleted / totalActions) * 100) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View style={styles.header}>
        <Text style={styles.title}>Pilotes</Text>
        <Text style={styles.sub}>
          {items.length} pilote(s) • {totalActions} action(s) • {globalRate}% réalisé
        </Text>
      </View>
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <ExportButton
          filename="pilotes"
          headers={["Pilote","Nb PDCA","Actions totales","Terminées","En cours","Ouvertes","En retard","Annulées","Taux réalisation %"]}
          rows={() => items.map((p) => [
            p.pilot_name,
            p.pdca_ids.length,
            p.total_actions,
            p.completed_actions,
            p.in_progress_actions,
            p.open_actions,
            p.overdue_actions,
            p.cancelled_actions,
            p.completion_rate,
          ])}
        />
      </View>

      {items.length === 0 ? (
        <EmptyState
          title="Aucun pilote"
          subtitle="Créez un PDCA avec une action pour faire apparaître les pilotes ici."
        />
      ) : (
        <FlatList<PilotSummary>
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          data={items}
          keyExtractor={(it: PilotSummary) => it.pilot_name}
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
              <View style={styles.pilotHead}>
                <View style={[styles.avatar, { backgroundColor: rateColor(item.completion_rate) }]}>
                  <Text style={styles.avatarText}>
                    {item.pilot_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pilotName} numberOfLines={2}>
                    {item.pilot_name}
                  </Text>
                  <Text style={styles.pilotMeta}>
                    {item.pdca_ids.length} PDCA • {item.total_actions} action(s)
                  </Text>
                </View>
              </View>

              <ProgressBar
                value={item.completion_rate}
                color={rateColor(item.completion_rate)}
                label="Taux de réalisation"
              />

              <View style={styles.metrics}>
                <Metric n={item.completed_actions} l="Terminées" color={theme.colors.success} />
                <Metric n={item.in_progress_actions} l="En cours" color={theme.colors.warning} />
                <Metric n={item.open_actions} l="Ouvertes" color={theme.colors.info} />
                <Metric n={item.overdue_actions} l="En retard" color={theme.colors.danger} />
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}

function Metric({ n, l, color }: { n: number; l: string; color?: string }) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricN, color && { color }]}>{n}</Text>
      <Text style={styles.metricL}>{l}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { padding: 16, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: "800", color: theme.colors.text },
  sub: { color: theme.colors.textMuted, marginTop: 4 },

  pilotHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 20 },
  pilotName: { fontSize: 15, fontWeight: "800", color: theme.colors.text },
  pilotMeta: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },

  metrics: {
    flexDirection: "row",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 8,
  },
  metric: { flex: 1, alignItems: "center" },
  metricN: { fontSize: 18, fontWeight: "800", color: theme.colors.text },
  metricL: { fontSize: 11, color: theme.colors.textMuted, textAlign: "center" },
});
