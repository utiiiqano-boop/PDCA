import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import { Redirect, router } from "expo-router";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useUI } from "@/ui/UIProvider";
import { theme } from "@/theme";

export default function ChangePasswordScreen() {
  const { session, profile, loading, refreshProfile, signOut } = useAuth();
  const { toast, alert } = useUI();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Loading or no session → back to login
  if (loading) return null;
  if (!session) return <Redirect href="/(auth)/login" />;

  // If the user doesn't need to change password AND isn't here voluntarily,
  // send them back to the dashboard.
  const isForced = profile?.must_change_password === true;

  const submit = async () => {
    setError(null);
    if (!current) return setError("Mot de passe actuel requis.");
    if (next.length < 6) return setError("Nouveau mot de passe : 6 caractères min.");
    if (next !== confirm) return setError("Les mots de passe ne correspondent pas.");
    if (next === current) return setError("Le nouveau doit être différent de l'actuel.");

    try {
      setSubmitting(true);

      const email = profile?.email;
      if (!email) throw new Error("Email manquant.");

      const { error: signErr } = await supabase.auth.signInWithPassword({
        email,
        password: current,
      });
      if (signErr) throw new Error("Mot de passe actuel incorrect.");

      const { error: upErr } = await supabase.auth.updateUser({ password: next });
      if (upErr) throw upErr;

      if (isForced && profile?.id) {
        const { error: profileErr } = await supabase
          .from("profiles")
          .update({ must_change_password: false })
          .eq("id", profile.id);
        if (profileErr) console.warn(profileErr);
        await refreshProfile();
      }

      toast.success("Mot de passe mis à jour");
      router.replace("/(app)/dashboard");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur";
      setError(msg);
      alert({ title: "Erreur", message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>
          {isForced ? "Changement obligatoire" : "Changer le mot de passe"}
        </Text>

        {isForced ? (
          <Text style={styles.hint}>
            Votre compte a été créé par un administrateur. Pour des raisons de
            sécurité, vous devez définir votre propre mot de passe avant de
            continuer.
          </Text>
        ) : null}

        <Input
          label="Mot de passe actuel"
          value={current}
          onChangeText={setCurrent}
          secureTextEntry
          required
        />
        <Input
          label="Nouveau mot de passe"
          value={next}
          onChangeText={setNext}
          secureTextEntry
          required
        />
        <Input
          label="Confirmer le nouveau mot de passe"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          required
        />

        {error ? <Text style={styles.err}>{error}</Text> : null}

        <Button
          label={isForced ? "Définir mon mot de passe" : "Mettre à jour"}
          onPress={submit}
          loading={submitting}
        />

        {isForced ? (
          <>
            <Text style={styles.hintSmall}>
              Vous ne pouvez pas accéder à l'application tant que vous n'avez pas
              défini un mot de passe personnel.
            </Text>
            <Button
              label="Se déconnecter"
              variant="secondary"
              onPress={signOut}
              style={{ marginTop: 12 }}
            />
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    flexGrow: 1,
    backgroundColor: theme.colors.bg,
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: theme.colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  hint: {
    fontSize: 13,
    color: theme.colors.textMuted,
    backgroundColor: "#fef3c7",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    lineHeight: 18,
  },
  hintSmall: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 16,
    textAlign: "center",
  },
  err: { color: theme.colors.danger, marginBottom: 12, textAlign: "center" },
});
