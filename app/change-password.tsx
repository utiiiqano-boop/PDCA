import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Redirect, router } from "expo-router";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Card } from "@/components/Card";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useUI } from "@/ui/UIProvider";
import { theme } from "@/theme";

export default function ChangePasswordScreen() {
  // ── 1. HOOKS ──────────────────────────────────────────
  const { session, profile, loading, refreshProfile, signOut } = useAuth();
  const { toast, alert } = useUI();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── 2. EARLY RETURNS ──────────────────────────────────
  if (loading) return null;
  if (!session) return <Redirect href="/(auth)/login" />;

  const isForced = profile?.must_change_password === true;

  // ── 3. HANDLER ────────────────────────────────────────
  const submit = async () => {
    setError(null);
    if (!current) return setError("Mot de passe actuel requis.");
    if (next.length < 6)
      return setError("Nouveau mot de passe : 6 caractères minimum.");
    if (next !== confirm)
      return setError("Les mots de passe ne correspondent pas.");
    if (next === current)
      return setError("Le nouveau doit être différent de l'actuel.");

    try {
      setSubmitting(true);

      const email = profile?.email;
      if (!email) throw new Error("Email manquant.");

      const { error: signErr } = await supabase.auth.signInWithPassword({
        email,
        password: current,
      });
      if (signErr) throw new Error("Mot de passe actuel incorrect.");

      const { error: upErr } = await supabase.auth.updateUser({
        password: next,
      });
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

  // ── 4. UI ─────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.hero}>
          <View style={styles.iconBox}>
            <Text style={styles.icon}>🔒</Text>
          </View>
          <Text style={styles.title}>
            {isForced ? "Changement obligatoire" : "Changer le mot de passe"}
          </Text>
          {isForced ? (
            <Text style={styles.subtitle}>
              Votre compte a été créé par un administrateur. Pour votre
              sécurité, vous devez définir un mot de passe personnel avant de
              continuer.
            </Text>
          ) : (
            <Text style={styles.subtitle}>
              Choisissez un mot de passe robuste et unique.
            </Text>
          )}
        </View>

        {/* Form */}
        <Card>
          <Input
            label="Mot de passe actuel"
            value={current}
            onChangeText={setCurrent}
            secureTextEntry
            placeholder="••••••••"
            required
          />
          <Input
            label="Nouveau mot de passe"
            value={next}
            onChangeText={setNext}
            secureTextEntry
            placeholder="••••••••"
            hint="6 caractères minimum"
            required
          />
          <Input
            label="Confirmer le nouveau mot de passe"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            placeholder="••••••••"
            required
          />

          {error ? <Text style={styles.err}>{error}</Text> : null}

          <Button
            label={isForced ? "Définir mon mot de passe" : "Mettre à jour"}
            onPress={submit}
            loading={submitting}
          />
        </Card>

        {/* Forced footer */}
        {isForced ? (
          <View style={styles.forcedFooter}>
            <Text style={styles.forcedTxt}>
              Vous ne pouvez pas accéder à l'application tant que vous n'avez
              pas défini un mot de passe personnel.
            </Text>
            <Button
              label="Se déconnecter"
              variant="secondary"
              onPress={signOut}
            />
          </View>
        ) : null}
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

  // ── Hero ──────────────────────────────────────
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

  err: {
    color: theme.colors.danger,
    fontSize: theme.font.size.sm,
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(3),
    textAlign: "center",
    fontWeight: theme.font.weight.medium,
  },

  forcedFooter: {
    marginTop: theme.spacing(5),
    gap: theme.spacing(3),
  },
  forcedTxt: {
    fontSize: theme.font.size.sm,
    color: theme.colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
});
