import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
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
import {
  OPTION_KIND_LABELS,
  OptionKind,
} from "@/types/companyOptions";

const TABS: OptionKind[] = ["lines", "departments", "pilots", "defect_types"];

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

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
      >
        {TABS.map((k) => {
          const active = activeKind === k;
          return (
            <Pressable
              key={k}
              onPress={() => setActiveKind(k)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={[styles.tabTxt, active && styles.tabTxtActive]}>
                {OPTION_KIND_LABELS[k]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

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
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.bg },
  tabs: {
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  tabTxt: { fontSize: 13, color: theme.colors.text, fontWeight: "600" },
  tabTxtActive: { color: "#fff" },
});
