import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { theme } from "@/theme";
import { useSubscription } from "@/hooks/useSubscription";

const DISMISS_KEY = "pdca.trial.banner.dismissed";

export function TrialBanner() {
  const { data: sub, loading } = useSubscription();
  const [dismissed, setDismissed] = useState(true); // start hidden

  // Check dismissal state on mount
  useEffect(() => {
    (async () => {
      const v = await AsyncStorage.getItem(DISMISS_KEY);
      setDismissed(v === "1");
    })();
  }, []);

  // Reset dismissal when subscription status changes to trial again
  useEffect(() => {
    if (sub?.status === "trial") {
      // no-op: keep dismissal state
    }
  }, [sub?.status]);

  const onDismiss = async () => {
    setDismissed(true);
    await AsyncStorage.setItem(DISMISS_KEY, "1");
  };

  if (loading || dismissed) return null;
  if (!sub || sub.status !== "trial") return null;

  const days = sub.days_left ?? 0;
  const isWarning = days <= 2;

  return (
    <Pressable
      onPress={() => router.push("/paywall")}
      style={[
        styles.wrap,
        isWarning ? styles.warnWrap : styles.trialWrap,
      ]}
    >
      <View style={styles.left}>
        <Text style={styles.icon}>{isWarning ? "⚠️" : "⏱️"}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>
            {days === 0
              ? "Votre essai se termine aujourd'hui"
              : `Essai gratuit · ${days} jour${days > 1 ? "s" : ""} restant${days > 1 ? "s" : ""}`}
          </Text>
          <Text style={styles.subtitle}>
            Choisissez votre formule pour continuer
          </Text>
        </View>
      </View>
      <Pressable
        onPress={(e) => {
          e.stopPropagation?.();
          onDismiss();
        }}
        hitSlop={10}
        style={styles.closeBtn}
      >
        <Text style={styles.closeTxt}>✕</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    gap: 10,
  },
  trialWrap: {
    backgroundColor: theme.colors.infoSoft,
    borderBottomColor: theme.colors.info,
  },
  warnWrap: {
    backgroundColor: theme.colors.warningSoft,
    borderBottomColor: theme.colors.warning,
  },
  left: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  icon: { fontSize: 20 },
  title: {
    fontSize: 13,
    fontWeight: "800",
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  closeTxt: {
    color: theme.colors.textMuted,
    fontSize: 16,
    fontWeight: "800",
  },
});
