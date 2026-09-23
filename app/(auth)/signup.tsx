import React, { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import { useAuth } from "@/hooks/useAuth";
import { useUI } from "@/ui/UIProvider";
import { supabase } from "@/lib/supabase";
import { getCompany, uploadCompanyLogo } from "@/services/companiesService";
import { PILOTS } from "@/constants/options";
import { theme } from "@/theme";

export default function SignupScreen() {
  const { signUp, signOut } = useAuth();
  const { toast } = useUI();

  const [companyName, setCompanyName] = useState("");
  const [logoUri, setLogoUri] = useState<string | null>(null);

  const [role, setRole] = useState<string | null>(null);
  const [customRole, setCustomRole] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pickLogo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.error("Permission refusée pour accéder aux photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setLogoUri(result.assets[0].uri);
    }
  };

  const onSubmit = async () => {
    setErr(null);
    const finalRole = role === "Autre" ? customRole.trim() : role;

    if (!companyName.trim()) return setErr("Nom de l'entreprise requis.");
    if (!finalRole) return setErr("Rôle requis.");
    if (!fullName.trim()) return setErr("Nom et prénom requis.");
    if (!email.trim()) return setErr("Email requis.");
    if (password.length < 6) return setErr("Mot de passe : 6 caractères minimum.");
    if (password !== passwordConfirm) return setErr("Les mots de passe ne correspondent pas.");

    try {
      setLoading(true);
      const result = await signUp(
        email.trim(),
        password,
        fullName.trim(),
        finalRole,
        companyName.trim(),
      );

      if (result.needsConfirmation) {
        toast.success("Compte créé. Vérifiez votre email pour confirmer.");
        router.replace("/(auth)/login");
        return;
      }

      // Upload logo (after session is created, before navigating)
      if (logoUri) {
        try {
          const { data } = await supabase.auth.getUser();
          if (data.user) {
            const { data: prof } = await supabase
              .from("profiles")
              .select("company_id")
              .eq("id", data.user.id)
              .single();
            const companyId = (prof as { company_id?: string } | null)?.company_id;
            if (companyId) {
              await uploadCompanyLogo(companyId, logoUri);
            }
          }
        } catch (e) {
          console.warn("Logo upload failed:", e);
          // Continue — the account is still created
        }
      }

      toast.success("Compte créé. Bienvenue !");
      router.replace("/(app)/dashboard");
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

        {/* ── Company section ─────────────────────────── */}
        <Text style={styles.section}>Entreprise</Text>

        <View style={styles.logoRow}>
          <View style={styles.logoBox}>
            {logoUri ? (
              <Image source={{ uri: logoUri }} style={styles.logoImg} />
            ) : (
              <Text style={styles.logoPlaceholder}>Logo</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Choisir un logo" variant="secondary" onPress={pickLogo} />
            {logoUri ? (
              <Text style={styles.logoHint} onPress={() => setLogoUri(null)}>
                Retirer le logo
              </Text>
            ) : null}
          </View>
        </View>

        <Input
          label="Nom de l'entreprise"
          value={companyName}
          onChangeText={setCompanyName}
          placeholder="Ex : Métallurgie Dupont SAS"
          required
          autoCapitalize="words"
        />

        {/* ── User section ────────────────────────────── */}
        <Text style={styles.section}>Utilisateur</Text>

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
    backgroundColor: theme.colors.bg,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: theme.colors.primary,
    textAlign: "center",
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: 24,
    fontWeight: "600",
  },
  section: {
    fontSize: 15,
    fontWeight: "800",
    color: theme.colors.text,
    marginTop: 20,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: 6,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoImg: { width: "100%", height: "100%" },
  logoPlaceholder: { color: theme.colors.textMuted, fontWeight: "600" },
  logoHint: {
    color: theme.colors.danger,
    fontSize: 13,
    marginTop: 8,
    textDecorationLine: "underline",
  },
  err: {
    color: theme.colors.danger,
    marginTop: 12,
    marginBottom: 8,
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
