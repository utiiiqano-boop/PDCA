import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import { router } from "expo-router";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { supabase } from "@/lib/supabase";
import { useUI } from "@/ui/UIProvider";
import { theme } from "@/theme";

export default function ForgotPasswordScreen() {
  const { toast } = useUI();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!email.trim()) return setError("Email requis.");
    try {
      setLoading(true);
      const { error: err } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: "pdca://reset-password" }
      );
      if (err) throw err;
      setSent(true);
      toast.success("Email envoyé");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur";
      setError(msg);
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
        <Text style={styles.title}>Mot de passe oublié</Text>

        {sent ? (
          <>
            <Text style={styles.success}>
              Si un compte existe avec l'email <Text style={styles.bold}>{email}</Text>,
              un lien de réinitialisation vous a été envoyé.
            </Text>
            <Text style={styles.hint}>
              Vérifiez vos spams si vous ne voyez rien dans les 2 minutes.
            </Text>
            <Button
              label="Retour à la connexion"
              onPress={() => router.replace("/(auth)/login")}
            />
          </>
        ) : (
          <>
            <Text style={styles.subtitle}>
              Entrez votre email pour recevoir un lien de réinitialisation.
            </Text>

            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              required
            />

            {error ? <Text style={styles.err}>{error}</Text> : null}

            <Button label="Envoyer le lien" onPress={submit} loading={loading} />
            <Text
              style={styles.link}
              onPress={() => router.replace("/(auth)/login")}
            >
              Retour à la connexion
            </Text>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, flexGrow: 1, justifyContent: "center", backgroundColor: theme.colors.bg },
  title: { fontSize: 24, fontWeight: "800", color: theme.colors.text, textAlign: "center", marginBottom: 12 },
  subtitle: { fontSize: 14, color: theme.colors.textMuted, textAlign: "center", marginBottom: 24 },
  success: { fontSize: 14, color: theme.colors.text, textAlign: "center", marginBottom: 12 },
  bold: { fontWeight: "800" },
  hint: { fontSize: 12, color: theme.colors.textMuted, textAlign: "center", marginBottom: 24 },
  err: { color: theme.colors.danger, marginBottom: 12, textAlign: "center" },
  link: { color: theme.colors.primary, textAlign: "center", marginTop: 20, fontWeight: "600", textDecorationLine: "underline" },
});
