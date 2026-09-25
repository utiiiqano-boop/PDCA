import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Redirect } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { OptionAdminPanel } from "@/components/OptionAdminPanel";
import { ErrorState } from "@/components/States";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useCompanyOptions } from "@/hooks/useCompanyOptions";
import { theme } from "@/theme";
import { OPTION_KIND_LABELS, OptionKind } from "@/types/companyOptions";

const TABS: { key: OptionKind; icon: string; shortLabel: string }[] = [
  { key: "lines", icon: "🏭", shortLabel: "Lignes" },
  { key: "departments", icon: "🏢", shortLabel: "Départements" },
  { key: "pilots", icon: "👤", shortLabel: "Pilotes" },
  { key: "defect_types", icon: "🔍", shortLabel: "Défauts" },
];

export default function CompanyOptionsScreen() {
  const { profile } = useAuth();
  const isAdmin = useIsAdmin();
  const companyId =
    (profile as { company_id?: string } | null)?.company_id ?? null;

  const { lines, departments, pilots, defectTypes, loading, error, reload } =
    useCompanyOptions(true);

  const [activeKind, setActiveKind] = useState<OptionKind>("lines");

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  if (!isAdmin) return <Redirect href="/(app)/dashboard" />;
  if (!companyId) return <ErrorState message="Aucune entreprise associée." />;
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
        <Text style={styles.loadingTxt}>Chargement…</Text>
      </View>
    );
  }
  if (error) return <ErrorState message={error} />;

  const optionsFor = (kind: OptionKind) => {
    switch (kind) {
      case "lines":
        return lines;
      case "departments":
        return departments;
      case "pilots":
        return pilots;
      case "defect_types":
        return defectTypes;
    }
  };

  const countFor = (kind: OptionKind) =>
    optionsFor(kind).filter((o) => o.active).length;

  return (
    <View style={styles.container}>
      {/* ── Header ──────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.title}>Configuration</Text>
        <Text style={styles.sub}>
          Personnalisez les listes de votre entreprise
        </Text>
      </View>

      {/* ── Grille 2x2 ──────────────────────────────── */}
      <View style={styles.grid}>
        {TABS.map((t) => {
          const active = activeKind === t.key;
          const count = countFor(t.key);
          return (
            <Pressable
              key={t.key}
              onPress={() => setActiveKind(t.key)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <View style={styles.tabTop}>
                <Text style={styles.tabIcon}>{t.icon}</Text>
                <View
                  style={[styles.tabBadge, active && styles.tabBadgeActive]}
                >
                  <Text
                    style={[
                      styles.tabBadgeTxt,
                      active && styles.tabBadgeTxtActive,
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              </View>
              <Text
                style={[styles.tabTxt, active && styles.tabTxtActive]}
                numberOfLines={1}
              >
                {t.shortLabel}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* ── Panel ───────────────────────────────────── */}
      <OptionAdminPanel
        kind={activeKind}
        companyId={companyId}
        options={optionsFor(activeKind)}
        onChanged={reload}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.bg,
  },
  loadingTxt: {
    marginTop: theme.spacing(3),
    color: theme.colors.textMuted,
    fontSize: theme.font.size.base,
  },

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

  // ── Grille 2x2 ────────────────────────────────
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: theme.spacing(4),
    gap: theme.spacing(2),
    marginBottom: theme.spacing(4),
  },
  tab: {
    // 2 colonnes : (100% - gap) / 2 ; le gap fait spacing(2)=8 → calc à 48%
    width: "48%",
    flexGrow: 1,
    minWidth: 140,
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(3),
    borderRadius: theme.radius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    ...theme.shadow.sm,
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    ...theme.shadow.md,
  },
  tabTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing(2),
  },
  tabIcon: { fontSize: 20 },
  tabBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 26,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.neutralSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBadgeActive: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  tabBadgeTxt: {
    fontSize: theme.font.size.xs,
    fontWeight: theme.font.weight.bold,
    color: theme.colors.textSecondary,
  },
  tabBadgeTxtActive: { color: "#fff" },
  tabTxt: {
    fontSize: theme.font.size.base,
    fontWeight: theme.font.weight.bold,
    color: theme.colors.text,
  },
  tabTxtActive: { color: "#fff" },
});
