import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { Card } from "@/components/Card";
import { PriorityBadge, StatusBadge } from "@/components/Badges";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { Button } from "@/components/Button";
import { ExportButton } from "@/components/ExportButton";
import { listPDCA, PDCAWithActions } from "@/services/pdcaService";
import { theme } from "@/theme";

export default function PDCAList() {
  const [items, setItems] = useState<PDCAWithActions[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setItems(await listPDCA());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }, []);

  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]);

  if (loading) return <LoadingState />;
  if (error)   return <ErrorState message={error} />;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View style={styles.header}>
        <Link href="/(app)/pdca/new" asChild>
          <Button label="+ Nouveau PDCA" onPress={() => {}} />
        </Link>
        <View style={{ height: 8 }} />
        <ExportButton
          filename="pdca-list"
          headers={["Référence","Sujet","Ligne","Département","Priorité","Statut","Type défaut","Créé le","Nb actions"]}
          rows={() => items.map((p) => [
            p.reference,
            p.subject,
            p.line,
            p.department ?? "",
            p.priority === "HIGH" ? "Élevée" : p.priority === "MEDIUM" ? "Moyenne" : "Faible",
            p.status,
            p.defect_type ?? "",
            new Date(p.created_at).toLocaleDateString("fr-FR"),
            p.pdca_actions.length,
          ])}
        />
      </View>

      {items.length === 0 ? (
        <EmptyState title="Aucun PDCA" subtitle="Commencez par en créer un." />
      ) : (
        <FlatList<PDCAWithActions>
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          data={items}
          keyExtractor={(it: PDCAWithActions) => it.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={async () => {
              setRefreshing(true); await load(); setRefreshing(false);
            }} />
          }
          renderItem={({ item }: { item: PDCAWithActions }) => (
            <Link href={`/(app)/pdca/${item.id}`} asChild>
              <Pressable>
                <Card>
                  <View style={styles.row}>
                    <Text style={styles.ref}>{item.reference}</Text>
                    <StatusBadge status={item.status} />
                  </View>
                  <Text style={styles.subject}>{item.subject}</Text>
                  <Text style={styles.meta}>
                    {item.line} • {item.department ?? "—"} • {item.pdca_actions.length} action(s)
                  </Text>
                  <View style={{ marginTop: 8 }}>
                    <PriorityBadge priority={item.priority} />
                  </View>
                </Card>
              </Pressable>
            </Link>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { padding: 16, paddingBottom: 0 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  ref: { fontWeight: "700", color: theme.colors.primary },
  subject: { fontSize: 15, color: theme.colors.text, marginTop: 6 },
  meta: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4 },
});
