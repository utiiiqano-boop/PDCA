import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { theme } from "@/theme";

const DISMISS_KEY = "pdca.getting_started.dismissed";

interface Steps {
  hasLines: boolean;
  hasUsers: boolean;
  hasPdca: boolean;
  hasCompletedAction: boolean;
}

interface StepDef {
  key: keyof Steps;
  label: string;
  action: () => void;
}

export function GettingStarted() {
  const { profile } = useAuth();
  const companyId = (profile as { company_id?: string } | null)?.company_id ?? null;
  const [steps, setSteps] = useState<Steps | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const v = await AsyncStorage.getItem(DISMISS_KEY);
      setDismissed(v === "1");
    })();
  }, []);

  const load = React.useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    try {
      const [lines, users, pdcaCount, completed] = await Promise.all([
        supabase
          .from("company_lines")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId),
        supabase
          .from("pdca")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId),
        supabase
          .from("pdca_actions")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .eq("status", "COMPLETED"),
      ]);
      setSteps({
        hasLines: (lines.count ?? 0) > 0,
        hasUsers: (users.count ?? 0) > 1,
        hasPdca: (pdcaCount.count ?? 0) > 0,
        hasCompletedAction: (completed.count ?? 0) > 0,
      });
    } catch (e) {
      console.warn("[getting-started] load failed:", e);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  // Reload on focus (automatic when returning to dashboard)
  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load])
  );

  const onDismiss = async () => {
    setDismissed(true);
    await AsyncStorage.setItem(DISMISS_KEY, "1");
  };

  if (dismissed || loading || !steps) return null;

  const stepDefs: StepDef[] = [
    {
      key: "hasLines",
      label: "Ajoutez vos lignes de production",
      action: () => router.push("/(app)/company-options"),
    },
    {
      key: "hasUsers",
      label: "Ajoutez un utilisateur",
      action: () => router.push("/(app)/company-users"),
    },
    {
      key: "hasPdca",
      label: "Créez votre premier PDCA",
      action: () => router.push("/(app)/pdca/new"),
    },
    {
      key: "hasCompletedAction",
      label: "Complétez une première action",
      action: () => router.push("/(app)/pdca"),
    },
  ];

  const done = stepDefs.filter((s) => steps[s.key]).length;

  // All done → hide automatically
  if (done === stepDefs.length) {
    // Optionally, auto-dismiss so it doesn't reappear
    if (!dismissed) onDismiss();
    return null;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>🎯 Vos premiers pas</Text>
          <Text style={styles.subtitle}>
            {done} / {stepDefs.length} étapes complétées
          </Text>
        </View>
        <Pressable onPress={onDismiss} hitSlop={10} style={styles.closeBtn}>
          <Text style={styles.closeTxt}>✕</Text>
        </Pressable>
      </View>

      {/* Progress bar */}
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${(done / stepDefs.length) * 100}%` },
          ]}
        />
      </View>

      {/* Steps */}
      <View style={{ gap: 8, marginTop: 12 }}>
        {stepDefs.map((s) => {
          const checked = steps[s.key];
          return (
            <Pressable
              key={s.key}
              onPress={checked ? undefined : s.action}
              disabled={checked}
              style={[styles.step, checked && styles.stepDone]}
            >
              <View style={[styles.check, checked && styles.checkOn]}>
                {checked ? <Text style={styles.checkMark}>✓</Text> : null}
              </View>
              <Text
                style={[styles.stepTxt, checked && styles.stepTxtDone]}
                numberOfLines={2}
              >
                {s.label}
              </Text>
              {!checked ? <Text style={styles.arrow}>→</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
    marginBottom: theme.spacing(4),
    borderWidth: 1,
    borderColor: theme.colors.primary + "33",
    borderStyle: "dashed",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: "800",
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
    fontWeight: "600",
  },
  closeBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  closeTxt: {
    color: theme.colors.textMuted,
    fontSize: 16,
    fontWeight: "800",
  },
  track: {
    height: 6,
    backgroundColor: theme.colors.divider,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 4,
  },
  fill: {
    height: 6,
    backgroundColor: theme.colors.success,
    borderRadius: 999,
  },
  step: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  stepDone: {
    opacity: 0.6,
    borderColor: theme.colors.success + "33",
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
  },
  checkOn: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  checkMark: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
  stepTxt: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  stepTxtDone: {
    textDecorationLine: "line-through",
    color: theme.colors.textMuted,
  },
  arrow: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: "800",
  },
});
