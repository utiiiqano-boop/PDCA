import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import { useAuth } from "@/hooks/useAuth";
import { useUI } from "@/ui/UIProvider";
import { useTranslation } from "@/i18n/I18nProvider";
import { PILOTS } from "@/constants/options";
import { theme } from "@/theme";

export default function JoinScreen() {
  const { signUp, refreshProfile } = useAuth();
  const { toast } = useUI();
  const { t: tr } = useTranslation();

  const [inviteCode, setInviteCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roleOptions = PILOTS.map((r) => r);

  const onSubmit = async () => {
    setError(null);

    if (!inviteCode.trim()) return setError("Code d'invitation requis.");
    if (!fullName.trim()) return setError("Nom et prénom requis.");
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return setError("Email invalide.");
    if (password.length < 6)
      return setError("Mot de passe : 6 caractères minimum.");
    if (!role) return setError("Rôle requis.");

    setBusy(true);
    try {
      // Send empty company_name — RPC will use the invite code's company_id
      const result = await signUp(
        email.trim(),
        password,
        fullName.trim(),
        role,
        "", // no company name
        inviteCode.trim().toUpperCase(),
      );

      if (result.needsConfirmation) {
        toast.success("Compte créé. Vérifiez votre email pour confirmer.");
        router.replace("/(auth)/login");
        return;
      }

      await refreshProfile();
      await new Promise((r) => setTimeout(r, 200));
      toast.success("Vous avez rejoint l'entreprise !");
      router.replace("/(app)/dashboard");
    } catch (e) {
      const msg = e instanceof Error ? e.message : tr("common.unknownError");
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>🔗</Text>
          </View>
          <Text style={styles.title}>Rejoindre une entreprise</Text>
          <Text style={styles.subtitle}>
            Saisissez le code d'invitation transmis par votre administrateur.
          </Text>
        </View>

        <View style={styles.card}>
          <Input
            label="Code d'invitation"
            value={inviteCode}
            onChangeText={(v) => setInviteCode(v.toUpperCase())}
            placeholder="PDCA-INV-XXXXXX"
            required
            autoCapitalize="characters"
          />

          <Input
            label="Nom et prénom"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Ex : Jean Dupont"
            required
            autoCapitalize="words"
          />

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="vous@entreprise.com"
            required
          />

          <Input
            label="Mot de passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            required
          />

          <Select
            label="Rôle / Pilote"
            value={role}
            options={roleOptions}
            onChange={setRole}
            required
            placeholder="Choisissez votre rôle…"
          />

          {error ? <Text style={styles.err}>{error}</Text> : null}

          <View style={{ height: 12 }} />
          <Button
            label="Rejoindre l'entreprise"
            onPress={onSubmit}
            loading={busy}
          />
        </View>

        <View style={styles.footer}>
          <Button
            label="← Retour à la connexion"
            variant="secondary"
            onPress={() => router.replace("/(auth)/login")}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing(6),
    flexGrow: 1,
    justifyContent: "center",
    maxWidth: 480,
    width: "100%",
    alignSelf: "center",
  },
  hero: { alignItems: "center", marginBottom: theme.spacing(6) },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing(4),
    ...theme.shadow.md,
  },
  logoText: { fontSize: 34 },
  title: {
    fontSize: theme.font.size.xl,
    fontWeight: theme.font.weight.black,
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: theme.font.size.base,
    color: theme.colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing(6),
    borderWidth: 1,
    borderColor: theme.colors.divider,
    ...theme.shadow.md,
  },
  err: {
    color: theme.colors.danger,
    fontSize: theme.font.size.sm,
    marginTop: theme.spacing(3),
    textAlign: "center",
    fontWeight: theme.font.weight.medium,
  },
  footer: { marginTop: theme.spacing(6), alignItems: "center" },
});
