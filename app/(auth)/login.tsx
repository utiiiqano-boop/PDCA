import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useAuth } from "@/hooks/useAuth";
import { useUI } from "@/ui/UIProvider";
import { theme } from "@/theme";

export default function LoginScreen() {
  const { signIn } = useAuth();
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
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>PDCA</Text>
        <Text style={styles.subtitle}>Gestion industrielle — Connexion</Text>

        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          required
        />
        <Input
          label="Mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          required
        />
        {err ? <Text style={styles.err}>{err}</Text> : null}

        <Button label="Se connecter" onPress={onSubmit} loading={loading} />

        <Text
          style={styles.link}
          onPress={() => router.push("/(auth)/signup")}
        >
          Créer un compte
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    flexGrow: 1,
    justifyContent: "center",
    backgroundColor: theme.colors.bg,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: theme.colors.primary,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: "center",
    marginBottom: 32,
  },
  err: { color: theme.colors.danger, marginBottom: 12, textAlign: "center" },
  link: {
    color: theme.colors.primary,
    textAlign: "center",
    marginTop: 20,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});
