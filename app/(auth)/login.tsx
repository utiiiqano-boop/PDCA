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
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n/I18nProvider";
import { useUI } from "@/ui/UIProvider";
import { theme } from "@/theme";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const { t: tr } = useTranslation();
  const { toast } = useUI();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async () => {
    setErr(null);
    if (!email || !password) {
      setErr("Email et mot de passe requis.");
      return;
    }
    try {
      setLoading(true);
      await signIn(email.trim(), password);
      router.replace("/(app)/dashboard");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Échec de connexion.";
      setErr(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.root}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>P</Text>
          </View>
          <Text style={styles.title}>PDCA</Text>
          <Text style={styles.subtitle}>Gestion industrielle</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{tr("auth.login")}</Text>

          <Input
            label={tr("auth.email")}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="vous@entreprise.com"
            required
          />
          <Input
            label={tr("auth.password")}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            required
          />

          {err ? <Text style={styles.err}>{err}</Text> : null}

          <Button label={tr("auth.signIn")} onPress={onSubmit} loading={loading} />

          <Text
            style={styles.link}
            onPress={() => router.push("/(auth)/forgot-password")}
          >
            {tr("auth.forgotPassword")}
          </Text>
        </View>

        <View style={styles.signupWrap}>
          <Text style={styles.signupLabel}>{tr("auth.noAccount")}</Text>
          <Button
            label={tr("auth.createCompany")}
            variant="secondary"
            onPress={() => router.push("/(auth)/signup")}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  container: {
    padding: theme.spacing(6),
    flexGrow: 1,
    justifyContent: "center",
    maxWidth: 480,
    width: "100%",
    alignSelf: "center",
  },
  hero: { alignItems: "center", marginBottom: theme.spacing(8) },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing(4),
    ...theme.shadow.md,
  },
  logoText: {
    fontSize: 40,
    fontWeight: theme.font.weight.black,
    color: "#fff",
    letterSpacing: 1,
  },
  title: {
    fontSize: theme.font.size["3xl"],
    fontWeight: theme.font.weight.black,
    color: theme.colors.primary,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: theme.font.size.base,
    color: theme.colors.textMuted,
    marginTop: theme.spacing(1),
    letterSpacing: 1,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing(6),
    borderWidth: 1,
    borderColor: theme.colors.divider,
    ...theme.shadow.md,
  },
  cardTitle: {
    fontSize: theme.font.size.xl,
    fontWeight: theme.font.weight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing(6),
  },
  err: {
    color: theme.colors.danger,
    fontSize: theme.font.size.sm,
    marginBottom: theme.spacing(3),
    textAlign: "center",
    fontWeight: theme.font.weight.medium,
  },
  link: {
    color: theme.colors.primary,
    textAlign: "center",
    marginTop: theme.spacing(5),
    fontWeight: theme.font.weight.semibold,
    fontSize: theme.font.size.base,
  },
  signupWrap: { marginTop: theme.spacing(6), alignItems: "center" },
  signupLabel: {
    color: theme.colors.textMuted,
    marginBottom: theme.spacing(3),
    fontSize: theme.font.size.base,
  },
});
