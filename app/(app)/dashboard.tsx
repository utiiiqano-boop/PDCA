import React, { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { listPDCA, PDCAWithActions } from "@/services/pdcaService";
import { useAuth } from "@/hooks/useAuth";
import { getCompany, CompanyRow } from "@/services/companiesService";
import { registerForPushNotifications, PushStatus } from "@/services/pushService";
import { theme } from "@/theme";

export default function Dashboard() {
  const { profile, signOut } = useAuth();
  const [pushStatus, setPushStatus] = useState<PushStatus | null>(null);
  const [checkingPush, setCheckingPush] = useState(false);
  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [data, setData] = useState<PDCAWithActions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try { setData(await listPDCA()); }
      catch (e) { setError(e instanceof Error ? e.message : "Erreur"); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <LoadingState />;
  if (error)   return <ErrorState message={error} />;

  const total = data.length;
  const open = data.filter((p) => p.status === "OPEN").length;
  const inProgress = data.filter((p) => p.status === "IN_PROGRESS").length;
  const completed = data.filter((p) => p.status === "COMPLETED").length;
  const overdue = data.flatMap((p) => p.pdca_actions).filter((a) => a.status === "OVERDUE").length;

  return (
    <ScrollView contentContainerStyle={styles.container}>
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

      <Card>
        <Text style={styles.big}>{total}</Text>
        <Text style={styles.label}>PDCA Total</Text>
        <View style={styles.grid}>
          <Stat n={open}       l="Ouverts" />
          <Stat n={inProgress} l="En cours" />
          <Stat n={completed}  l="Terminés" />
          <Stat n={overdue}    l="En retard" danger />
        </View>
      </Card>

      <Link href="/(app)/pdca/new" asChild>
        <Button label="+ Nouveau PDCA" onPress={() => {}} style={{ marginBottom: 12 }} />
      </Link>
      <Link href="/(app)/pdca" asChild>
        <Button label="Voir tous les PDCA" variant="secondary" onPress={() => {}} />
      </Link>

      <View style={{ height: 24 }} />
      <Button
        label="🔔 Tester push"
        variant="secondary"
        loading={checkingPush}
        onPress={async () => {
          if (!profile?.id) return;
          setCheckingPush(true);
          const res = await registerForPushNotifications(profile.id);
          setPushStatus(res);
          setCheckingPush(false);
        }}
      />
      {pushStatus ? (
        <View style={{ marginTop: 12, padding: 12, borderRadius: 8, backgroundColor: pushStatus.ok ? "#dcfce7" : "#fee2e2" }}>
          <Text style={{ fontWeight: "700", color: pushStatus.ok ? "#166534" : "#991b1b" }}>
            {pushStatus.ok ? "✅ Succès" : "❌ Échec"}
          </Text>
          <Text style={{ marginTop: 4, color: "#1f2937" }}>{pushStatus.message}</Text>
          {pushStatus.token ? (
            <Text style={{ marginTop: 4, fontSize: 11, color: "#6b7280" }} selectable>
              Token: {pushStatus.token.slice(0, 40)}...
            </Text>
          ) : null}
        </View>
      ) : null}
      <View style={{ height: 12 }} />
      <Button label="Se déconnecter" variant="danger" onPress={signOut} />

      {total === 0 && <EmptyState title="Aucun PDCA" subtitle="Créez votre premier PDCA." />}
    </ScrollView>
  );
}

function Stat({ n, l, danger }: { n: number; l: string; danger?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statN, danger && { color: theme.colors.danger }]}>{n}</Text>
      <Text style={styles.statL}>{l}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
  container: { padding: 16, backgroundColor: theme.colors.bg, flexGrow: 1 },
  hello: { fontSize: 22, fontWeight: "700", color: theme.colors.text },
  sub: { color: theme.colors.textMuted, marginBottom: 16 },
  big: { fontSize: 36, fontWeight: "800", color: theme.colors.primary },
  label: { color: theme.colors.textMuted, marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  stat: { minWidth: 100, flex: 1 },
  statN: { fontSize: 22, fontWeight: "700", color: theme.colors.text },
  statL: { fontSize: 13, color: theme.colors.textMuted },
});
