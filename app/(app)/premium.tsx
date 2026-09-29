import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useUI } from "@/ui/UIProvider";
import { supabase } from "@/lib/supabase";
import { useTranslation } from "@/i18n/I18nProvider";
import { theme } from "@/theme";

interface Pricing {
  plan: "monthly" | "6month" | "yearly";
  currency: "TND" | "EUR" | "USD";
  amount: number;
  months: number;
  discount_pct: number;
}

interface Payment {
  id: string;
  plan: string;
  currency: string;
  amount: number;
  status: string;
  provider: string;
  paid_at: string | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  notes: string | null;
}

interface SubDetails {
  ok: boolean;
  reason?: string;
  company?: { id: string; name: string; slug: string; created_at: string };
  subscription?: {
    status: string;
    plan: string | null;
    currency: string | null;
    trial_started_at: string | null;
    trial_ends_at: string | null;
    ends_at: string | null;
    days_left: number;
    is_active: boolean;
    is_trial: boolean;
  };
  pricing?: Pricing[];
  payments?: Payment[];
}

const PLAN_LABELS: Record<string, string> = {
  trial: "Essai gratuit",
  monthly: "1 mois",
  "6month": "6 mois",
  yearly: "1 an",
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  TND: "DT",
  EUR: "€",
  USD: "$",
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function fmtAmount(currency: string, amount: number): string {
  const sym = CURRENCY_SYMBOLS[currency] ?? currency;
  return currency === "TND" ? `${amount} ${sym}` : `${sym}${amount}`;
}

export default function PremiumScreen() {
  const { toast, alert } = useUI();
  const { t: tr } = useTranslation();
  const [details, setDetails] = useState<SubDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc("rpc_my_subscription_details");
      if (error) throw error;
      setDetails(data as SubDetails);
    } catch (e) {
      console.warn("[premium] load failed:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const onActivate = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      alert({ title: "Code requis", message: "Entrez un code." });
      return;
    }

    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("rpc_activate_premium_code", {
        p_code: trimmed,
      });

      if (error) {
        alert({ title: "Erreur", message: error.message });
        return;
      }

      const r = data as { ok: boolean; reason?: string; duration_days?: number };

      if (!r.ok) {
        const reasons: Record<string, string> = {
          not_authenticated: "Session expirée.",
          not_admin: "Action réservée aux administrateurs.",
          no_company: "Aucune entreprise associée.",
          invalid_code: "Code invalide ou expiré.",
          code_used_by_other: "Ce code a déjà été utilisé par une autre entreprise.",
        };
        alert({ title: "Échec", message: reasons[r.reason ?? ""] ?? "Erreur inconnue." });
        return;
      }

      toast.success(`Abonnement activé · ${r.duration_days} jours`);
      setCode("");
      await load();
    } catch (e) {
      alert({
        title: "Erreur",
        message: e instanceof Error ? e.message : "Erreur inconnue",
      });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const sub = details?.subscription;
  const company = details?.company;
  const payments = details?.payments ?? [];
  const pricing = details?.pricing ?? [];

  const statusLabel = sub?.is_active
    ? "Actif"
    : sub?.is_trial
      ? "Essai gratuit"
      : "Expiré";
  const statusColor = sub?.is_active
    ? theme.colors.success
    : sub?.is_trial
      ? theme.colors.warning
      : theme.colors.danger;

  // Next renewal date
  const nextDate = sub?.is_active ? sub.ends_at : sub?.is_trial ? sub.trial_ends_at : null;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Mon abonnement</Text>
          <Text style={styles.subtitle}>{company?.name ?? "—"}</Text>
        </View>

        {/* Big status card */}
        <View style={[styles.statusCard, { borderColor: statusColor }]}>
          <View style={styles.statusTop}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>

          {sub?.plan ? (
            <Text style={styles.planName}>{PLAN_LABELS[sub.plan] ?? sub.plan}</Text>
          ) : (
            <Text style={styles.planName}>{PLAN_LABELS.trial}</Text>
          )}

          {sub?.days_left != null ? (
            <Text style={styles.daysLeft}>
              {sub.days_left > 0
                ? `${sub.days_left} jour${sub.days_left > 1 ? "s" : ""} restant${sub.days_left > 1 ? "s" : ""}`
                : "Expiré"}
            </Text>
          ) : null}

          {nextDate ? (
            <Text style={styles.nextDate}>
              {sub?.is_active ? "Renouvellement le" : "Fin d'essai le"} {fmtDate(nextDate)}
            </Text>
          ) : null}
        </View>

        {/* Details grid */}
        <Card style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Détails</Text>

          <Row label="Entreprise" value={company?.name ?? "—"} />
          <Row label="Statut" value={statusLabel} />
          {sub?.plan ? (
            <Row label="Formule" value={PLAN_LABELS[sub.plan] ?? sub.plan} />
          ) : null}
          {sub?.currency ? (
            <Row label="Devise" value={sub.currency} />
          ) : null}
          {sub?.trial_started_at ? (
            <Row label="Début essai" value={fmtDate(sub.trial_started_at)} />
          ) : null}
          {sub?.trial_ends_at ? (
            <Row label="Fin essai" value={fmtDate(sub.trial_ends_at)} />
          ) : null}
          {sub?.ends_at ? (
            <Row
              label={sub.is_active ? "Valide jusqu'au" : "Fin d'abonnement"}
              value={fmtDate(sub.ends_at)}
            />
          ) : null}
        </Card>

        {/* Payment history */}
        {payments.length > 0 ? (
          <Card style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>Historique des paiements</Text>
            {payments.map((p) => (
              <View key={p.id} style={styles.paymentRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.paymentPlan}>
                    {PLAN_LABELS[p.plan] ?? p.plan}
                  </Text>
                  <Text style={styles.paymentMeta}>
                    {fmtDate(p.paid_at ?? p.created_at)} · {p.provider}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.paymentAmount}>
                    {fmtAmount(p.currency, p.amount)}
                  </Text>
                  <Text
                    style={[
                      styles.paymentStatus,
                      p.status === "paid"
                        ? { color: theme.colors.success }
                        : { color: theme.colors.warning },
                    ]}
                  >
                    {p.status}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        ) : null}

        {/* Code form */}
        <Card style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Activer un code</Text>
          <Text style={styles.formHint}>
            Saisissez le code fourni après votre paiement pour activer ou
            renouveler votre abonnement.
          </Text>
          <TextInput
            value={code}
            onChangeText={(v) => setCode(v.toUpperCase())}
            placeholder="PDCA-XX-XXXXXX"
            placeholderTextColor={theme.colors.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!busy}
            style={styles.input}
            onSubmitEditing={onActivate}
            returnKeyType="go"
          />
          <Button
            label={busy ? "Activation…" : "Activer"}
            onPress={onActivate}
            loading={busy}
            disabled={busy || !code.trim()}
          />
        </Card>

        {/* Pricing grid */}
        {pricing.length > 0 ? (
          <Card style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>Nos formules</Text>
            <Text style={styles.formHint}>
              Contactez-nous pour souscrire à une nouvelle formule.
            </Text>

            {(["TND", "EUR", "USD"] as const).map((cur) => {
              const plans = pricing.filter((p) => p.currency === cur);
              if (plans.length === 0) return null;
              return (
                <View key={cur} style={styles.priceGroup}>
                  <Text style={styles.priceGroupTitle}>{cur}</Text>
                  {plans.map((p) => (
                    <View key={`${p.plan}-${p.currency}`} style={styles.priceRow}>
                      <Text style={styles.pricePlan}>
                        {PLAN_LABELS[p.plan] ?? p.plan}
                      </Text>
                      <Text style={styles.priceAmount}>
                        {fmtAmount(p.currency, p.amount)}
                      </Text>
                      {p.discount_pct > 0 ? (
                        <View style={styles.discountTag}>
                          <Text style={styles.discountTxt}>
                            -{p.discount_pct}%
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>
              );
            })}
          </Card>
        ) : null}

        {/* Help */}
        <View style={styles.help}>
          <Text style={styles.helpTitle}>Besoin d'aide ?</Text>
          <Text style={styles.helpText}>
            WhatsApp <Text style={styles.helpBold}>+216 99 137 938</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
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
    padding: theme.spacing(4),
    paddingBottom: 60,
    backgroundColor: theme.colors.bg,
  },
  header: { marginBottom: theme.spacing(4) },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },

  statusCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing(5),
    marginBottom: theme.spacing(4),
    borderWidth: 2,
    alignItems: "center",
  },
  statusTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: {
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  planName: {
    fontSize: 26,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 4,
  },
  daysLeft: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.primary,
    marginTop: 4,
  },
  nextDate: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 6,
  },

  detailsCard: { marginBottom: theme.spacing(3) },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.divider,
  },
  rowLabel: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontWeight: "600",
  },
  rowValue: {
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: "700",
    textAlign: "right",
    flex: 1,
    marginLeft: 12,
  },

  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.divider,
  },
  paymentPlan: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.text,
  },
  paymentMeta: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: "800",
    color: theme.colors.text,
  },
  paymentStatus: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    marginTop: 2,
  },

  formHint: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginBottom: 14,
    lineHeight: 18,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    minHeight: 52,
    fontSize: 18,
    letterSpacing: 2,
    textAlign: "center",
    fontWeight: "700",
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
    marginBottom: 12,
  },

  priceGroup: {
    marginBottom: theme.spacing(3),
  },
  priceGroupTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: theme.colors.textMuted,
    letterSpacing: 1,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.divider,
  },
  pricePlan: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.text,
  },
  priceAmount: {
    fontSize: 15,
    fontWeight: "900",
    color: theme.colors.primary,
  },
  discountTag: {
    marginLeft: 8,
    backgroundColor: theme.colors.success,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  discountTxt: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },

  help: {
    marginTop: theme.spacing(4),
    padding: theme.spacing(4),
    backgroundColor: theme.colors.neutralSoft,
    borderRadius: theme.radius.md,
    alignItems: "center",
  },
  helpTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: theme.colors.text,
    marginBottom: 6,
  },
  helpText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  helpBold: { fontWeight: "800", color: theme.colors.primary },
});
