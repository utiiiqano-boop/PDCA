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
import { Select } from "@/components/Select";
import { useAuth } from "@/hooks/useAuth";
import { useUI } from "@/ui/UIProvider";
import { PILOTS } from "@/constants/options";
import { theme } from "@/theme";

export default function SignupScreen() {
  const { signUp } = useAuth();
  const { toast } = useUI();

  const [role, setRole] = useState<string | null>(null);
  const [customRole, setCustomRole] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async () => {
    setErr(null);
    const finalRole = role === "Autre" ? customRole.trim() : role;

    if (!finalRole) return setErr("Rôle requis.");
    if (!fullName.trim()) return setErr("Nom et prénom requis.");
    if (!email.trim()) return setErr("Email requis.");
    if (password.length < 6)
      return setErr("Mot de passe : 6 caractères minimum.");
    if (password !== passwordConfirm)
      return setErr("Les mots de passe ne correspondent pas.");

    try {
      setLoading(true);
      const result = await signUp(
        email.trim(),
        password,
        fullName.trim(),
        finalRole,
      );

      if (result.needsConfirmation) {
        toast.success("Compte créé. Vérifiez votre email pour confirmer.");
        router.replace("/(auth)/login");
      } else {
        toast.success("Compte créé. Bienvenue !");
        router.replace("/(app)/dashboard");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
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
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>PDCA</Text>
        <Text style={styles.subtitle}>Créer un compte</Text>

        <Select
          label="Rôle / Pilote"
          value={role}
          options={[...PILOTS]}
          onChange={setRole}
          required
          placeholder="Choisissez votre rôle…"
        />
        {role === "Autre" && (
          <Input
            label="Précisez le rôle"
            value={customRole}
            onChangeText={setCustomRole}
            placeholder="Ex : Responsable Production"
            required
          />
        )}

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
          required
        />

        <Input
          label="Mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          required
        />

        <Input
          label="Répéter le mot de passe"
          value={passwordConfirm}
          onChangeText={setPasswordConfirm}
          secureTextEntry
          required
        />

        {err ? <Text style={styles.err}>{err}</Text> : null}

        <Button label="Créer le compte" onPress={onSubmit} loading={loading} />

        <Text style={styles.link} onPress={() => router.replace("/(auth)/login")}>
          J'ai déjà un compte — Se connecter
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
    fontSize: 16,
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: 24,
    fontWeight: "600",
  },
  err: {
    color: theme.colors.danger,
    marginBottom: 12,
    textAlign: "center",
    fontSize: 13,
  },
  link: {
    color: theme.colors.primary,
    textAlign: "center",
    marginTop: 20,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});
