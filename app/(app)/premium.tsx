import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
import { useSubscription } from "@/hooks/useSubscription";
import { useTranslation } from "@/i18n/I18nProvider";
import { theme } from "@/theme";

export default function PremiumScreen() {
  const { toast, alert } = useUI();
  const { t: tr } = useTranslation();
  const { data: sub, refresh } = useSubscription();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

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

      const r = data as { ok: boolean; reason?: string; plan?: string; duration_days?: number };

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
      await refresh();
    } catch (e) {
      alert({
        title: "Erreur",
        message: e instanceof Error ? e.message : "Erreur inconnue",
      });
    } finally {
      setBusy(false);
    }
  };

  const status = sub?.status ?? "unknown";
  const isActive = status === "active";
  const endsAt = sub?.ends_at ? new Date(sub.ends_at).toLocaleDateString() : null;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Abonnement Premium</Text>
          <Text style={styles.subtitle}>
            Activez votre code pour débloquer toutes les fonctionnalités.
          </Text>
        </View>

        {/* Status card */}
        <Card style={{ marginBottom: theme.spacing(4) }}>
          <Text style={styles.statusLabel}>Statut actuel</Text>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                isActive
                  ? { backgroundColor: theme.colors.success }
                  : { backgroundColor: theme.colors.warning },
              ]}
            />
            <Text style={styles.statusValue}>
              {isActive
                ? "Actif"
                : status === "trial"
                  ? "Essai gratuit"
                  : status === "expired"
                    ? "Expiré"
                    : "Inconnu"}
            </Text>
          </View>
          {sub?.plan ? (
            <Text style={styles.statusMeta}>
              Formule : {sub.plan} · {sub.currency}
            </Text>
          ) : null}
          {endsAt ? (
            <Text style={styles.statusMeta}>Valide jusqu'au {endsAt}</Text>
          ) : null}
          {status === "trial" && sub?.days_left != null ? (
            <Text style={styles.statusMeta}>
              {sub.days_left} jour(s) d'essai restant(s)
            </Text>
          ) : null}
        </Card>

        {/* Code form */}
        <Card>
          <Text style={styles.formTitle}>Activer un code</Text>
          <Text style={styles.formHint}>
            Saisissez le code fourni après votre paiement.
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

        {/* Help */}
        <View style={styles.help}>
          <Text style={styles.helpTitle}>Besoin d'un code ?</Text>
          <Text style={styles.helpText}>
            Contactez notre équipe par WhatsApp au{" "}
            <Text style={styles.helpBold}>+216 99 137 938</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusValue: {
    fontSize: 20,
    fontWeight: "800",
    color: theme.colors.text,
  },
  statusMeta: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: theme.colors.text,
    marginBottom: 6,
  },
  formHint: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginBottom: 14,
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
  help: {
    marginTop: theme.spacing(5),
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
    lineHeight: 20,
  },
  helpBold: { fontWeight: "800", color: theme.colors.primary },
});
