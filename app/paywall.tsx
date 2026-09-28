import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { theme } from "@/theme";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";

interface PricingRow {
  plan: "monthly" | "6month" | "yearly";
  currency: "USD" | "EUR" | "TND";
  amount: number;
  months: number;
  discount_pct: number;
}

const PLAN_LABELS: Record<string, string> = {
  monthly: "1 mois",
  "6month": "6 mois",
  yearly: "1 an",
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  TND: "DT",
};

export default function PaywallScreen() {
  const { session, signOut } = useAuth();
  const { data: sub, loading: subLoading, refresh } = useSubscription();
  const [pricing, setPricing] = useState<PricingRow[]>([]);
  const [currency, setCurrency] = useState<"USD" | "EUR" | "TND">("TND");
  const [loadingPricing, setLoadingPricing] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from("pricing")
          .select("plan, currency, amount, months, discount_pct")
          .eq("active", true);
        setPricing((data ?? []) as PricingRow[]);
      } finally {
        setLoadingPricing(false);
      }
    })();
  }, []);

  const filteredPricing = useMemo(
    () =>
      pricing
        .filter((p) => p.currency === currency)
        .sort((a, b) => a.months - b.months),
    [pricing, currency],
  );

  const openWhatsApp = (plan: PricingRow) => {
    const msg = `Bonjour, je souhaite m'abonner au plan ${PLAN_LABELS[plan.plan]} (${CURRENCY_SYMBOLS[plan.currency]}${plan.amount}) pour PDCA.`;
    const url = `https://wa.me/21699137938?text=${encodeURIComponent(msg)}`;
    Linking.openURL(url);
  };

  if (subLoading || loadingPricing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  const isActive = sub?.status === "active" && sub.ok;
  const isExpired = sub?.status === "expired" || !sub?.ok;
  const isTrial = sub?.status === "trial";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>
        {isActive ? "Votre abonnement" : "Abonnez-vous à PDCA"}
      </Text>

      {/* Status banner */}
      {isTrial ? (
        <View style={[styles.banner, styles.bannerTrial]}>
          <Text style={styles.bannerTxt}>
            Essai gratuit · {sub?.days_left ?? 0} jour(s) restant(s)
          </Text>
        </View>
      ) : null}

      {isActive ? (
        <View style={[styles.banner, styles.bannerActive]}>
          <Text style={styles.bannerTxt}>
            Actif · {PLAN_LABELS[sub?.plan ?? "monthly"]} · jusqu'au{" "}
            {sub?.ends_at ? new Date(sub.ends_at).toLocaleDateString() : "—"}
          </Text>
        </View>
      ) : null}

      {isExpired ? (
        <View style={[styles.banner, styles.bannerExpired]}>
          <Text style={styles.bannerTxt}>
            Votre essai est terminé. Choisissez un abonnement pour continuer.
          </Text>
        </View>
      ) : null}

      {/* Currency toggle */}
      <View style={styles.currencyRow}>
        {(["TND", "EUR", "USD"] as const).map((c) => (
          <Pressable
            key={c}
            onPress={() => setCurrency(c)}
            style={[styles.curBtn, currency === c && styles.curBtnActive]}
          >
            <Text
              style={[styles.curTxt, currency === c && styles.curTxtActive]}
            >
              {c}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Plans */}
      <View style={styles.plansWrap}>
        {filteredPricing.map((p) => (
          <View key={p.plan} style={styles.planCard}>
            <View style={styles.planHeader}>
              <Text style={styles.planLabel}>{PLAN_LABELS[p.plan]}</Text>
              {p.discount_pct > 0 ? (
                <View style={styles.discBadge}>
                  <Text style={styles.discTxt}>-{p.discount_pct}%</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.planPrice}>
              {CURRENCY_SYMBOLS[p.currency]}
              {p.amount}
            </Text>
            <Text style={styles.planPer}>
              {p.months === 1 ? "par mois" : `pour ${p.months} mois`}
            </Text>
            <Pressable
              onPress={() => openWhatsApp(p)}
              style={styles.planBtn}
            >
              <Text style={styles.planBtnTxt}>Choisir ce plan</Text>
            </Pressable>
          </View>
        ))}
      </View>

      {/* Payment methods */}
      <View style={styles.payInfo}>
        <Text style={styles.payTitle}>Moyens de paiement</Text>
        <Text style={styles.payTxt}>
          💳 Carte bancaire via <Text style={styles.bold}>Flouci</Text>{"\n"}
          📱 Virement / D17 via <Text style={styles.bold}>WhatsApp</Text>{"\n"}
          🏪 Bientôt : <Text style={styles.bold}>Google Play</Text>
        </Text>
        <Text style={styles.payHint}>
          Après paiement, votre abonnement sera activé sous 24h.
        </Text>
      </View>

      {/* Actions */}
      {isActive ? (
        <>
          <Pressable onPress={refresh} style={styles.secondaryBtn}>
            <Text style={styles.secondaryTxt}>Rafraîchir le statut</Text>
          </Pressable>
          <Pressable
            onPress={async () => {
              await signOut();
              router.replace("/");
            }}
            style={styles.secondaryBtn}
          >
            <Text style={styles.secondaryTxt}>Se déconnecter</Text>
          </Pressable>
        </>
      ) : (
        <Pressable onPress={refresh} style={styles.secondaryBtn}>
          <Text style={styles.secondaryTxt}>Déjà payé ? Rafraîchir</Text>
        </Pressable>
      )}

      <Text style={styles.footer}>
        Support : WhatsApp +216 99 137 938
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.bg,
  },
  container: {
    padding: 24,
    paddingBottom: 60,
    backgroundColor: theme.colors.bg,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: 20,
  },
  banner: {
    borderRadius: theme.radius.md,
    padding: 14,
    marginBottom: 20,
    alignItems: "center",
  },
  bannerTrial: { backgroundColor: theme.colors.infoSoft },
  bannerActive: { backgroundColor: theme.colors.successSoft },
  bannerExpired: { backgroundColor: theme.colors.dangerSoft },
  bannerTxt: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.text,
    textAlign: "center",
  },
  currencyRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 20,
  },
  curBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  curBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  curTxt: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.text,
  },
  curTxtActive: { color: "#fff" },
  plansWrap: { gap: 14, marginBottom: 24 },
  planCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 20,
    borderWidth: 2,
    borderColor: theme.colors.divider,
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  planLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: theme.colors.text,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  discBadge: {
    backgroundColor: theme.colors.success,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  discTxt: { color: "#fff", fontSize: 11, fontWeight: "800" },
  planPrice: {
    fontSize: 32,
    fontWeight: "900",
    color: theme.colors.primary,
  },
  planPer: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 12,
  },
  planBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    alignItems: "center",
  },
  planBtnTxt: { color: "#fff", fontWeight: "800", fontSize: 14 },
  payInfo: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  payTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  payTxt: {
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 22,
  },
  bold: { fontWeight: "800", color: theme.colors.primary },
  payHint: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 10,
    fontStyle: "italic",
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  secondaryTxt: {
    color: theme.colors.text,
    fontWeight: "700",
    fontSize: 14,
  },
  footer: {
    textAlign: "center",
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 20,
  },
});
