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
import { Card } from "@/components/Card";
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
        { redirectTo: "pdca://reset-password" },
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
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.iconBox}>
            <Text style={styles.icon}>{sent ? "📬" : "✉️"}</Text>
          </View>
          <Text style={styles.title}>
            {sent ? "Email envoyé" : "Mot de passe oublié"}
          </Text>
          {sent ? (
            <Text style={styles.subtitle}>
              Si un compte existe avec l'email{" "}
              <Text style={styles.bold}>{email}</Text>, un lien de
              réinitialisation vient d'être envoyé.
            </Text>
          ) : (
            <Text style={styles.subtitle}>
              Entrez votre email pour recevoir un lien de réinitialisation.
            </Text>
          )}
        </View>

        {/* Card */}
        <Card>
          {sent ? (
            <>
              <View style={styles.infoBox}>
                <Text style={styles.infoTxt}>
                  Vérifiez votre boîte de réception. Pensez aussi à vérifier
                  vos spams si vous ne voyez rien dans les 2 minutes.
                </Text>
              </View>
              <Button
                label="Retour à la connexion"
                onPress={() => router.replace("/(auth)/login")}
              />
            </>
          ) : (
            <>
              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="vous@entreprise.com"
                required
              />
              {error ? <Text style={styles.err}>{error}</Text> : null}
              <Button
                label="Envoyer le lien"
                onPress={submit}
                loading={loading}
              />
              <View style={{ height: theme.spacing(3) }} />
              <Button
                label="Annuler"
                variant="secondary"
                onPress={() => router.replace("/(auth)/login")}
              />
            </>
          )}
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  container: {
    padding: theme.spacing(5),
    flexGrow: 1,
    justifyContent: "center",
    maxWidth: 480,
    width: "100%",
    alignSelf: "center",
  },

  hero: {
    alignItems: "center",
    marginBottom: theme.spacing(6),
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing(4),
  },
  icon: { fontSize: 28 },
  title: {
    fontSize: theme.font.size.xl,
    fontWeight: theme.font.weight.black,
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: theme.spacing(2),
  },
  subtitle: {
    fontSize: theme.font.size.base,
    color: theme.colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: theme.spacing(3),
  },
  bold: { fontWeight: theme.font.weight.bold, color: theme.colors.text },

  infoBox: {
    backgroundColor: theme.colors.infoSoft,
    padding: theme.spacing(3),
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing(4),
  },
  infoTxt: {
    fontSize: theme.font.size.sm,
    color: theme.colors.info,
    lineHeight: 18,
  },

  err: {
    color: theme.colors.danger,
    fontSize: theme.font.size.sm,
    marginBottom: theme.spacing(3),
    textAlign: "center",
    fontWeight: theme.font.weight.medium,
  },
});
