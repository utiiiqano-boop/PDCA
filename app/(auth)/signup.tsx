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
import { useTranslation } from "@/i18n/I18nProvider";

export default function SignupScreen() {
  const { signUp, signOut } = useAuth();
  const { toast } = useUI();
  const { t: tr } = useTranslation();

  // Display-only translation for the DB sentinel "Autre"
  const OTHER_SENTINEL = "Autre";
  const otherLabel = tr("common.other");
  const vToL = (v: string | null) => (v === OTHER_SENTINEL ? otherLabel : v);
  const lToV = (l: string) => (l === otherLabel ? OTHER_SENTINEL : l);
  const roleOptions = PILOTS.map((r) => (r === OTHER_SENTINEL ? otherLabel : r));

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
      toast.error(tr("signup.permissionDenied"));
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
    const finalRole = role === OTHER_SENTINEL ? customRole.trim() : role;

    if (!companyName.trim()) return setErr(tr("signup.errCompanyName"));
    if (!finalRole) return setErr(tr("signup.errRole"));
    if (!fullName.trim()) return setErr(tr("signup.errFullName"));
    if (!email.trim()) return setErr(tr("signup.errEmail"));
    if (password.length < 6) return setErr(tr("signup.errPasswordLen"));
    if (password !== passwordConfirm) return setErr(tr("signup.errPasswordMismatch"));

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
        toast.success(tr("signup.createdConfirm"));
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

      toast.success(tr("signup.createdWelcome"));
      router.replace("/(app)/dashboard");
    } catch (e) {
      const msg = e instanceof Error ? e.message : tr("common.unknownError");
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
        <Text style={styles.subtitle}>{tr("signup.subtitle")}</Text>

        {/* ── Company section ─────────────────────────── */}
        <Text style={styles.section}>{tr("signup.sectionCompany")}</Text>

        <View style={styles.logoRow}>
          <View style={styles.logoBox}>
            {logoUri ? (
              <Image source={{ uri: logoUri }} style={styles.logoImg} />
            ) : (
              <Text style={styles.logoPlaceholder}>{tr("signup.logoPlaceholder")}</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Button label={tr("signup.chooseLogo")} variant="secondary" onPress={pickLogo} />
            {logoUri ? (
              <Text style={styles.logoHint} onPress={() => setLogoUri(null)}>
                {tr("signup.removeLogo")}
              </Text>
            ) : null}
          </View>
        </View>

        <Input
          label={tr("signup.companyName")}
          value={companyName}
          onChangeText={setCompanyName}
          placeholder={tr("signup.companyNamePh")}
          required
          autoCapitalize="words"
        />

        {/* ── User section ────────────────────────────── */}
        <Text style={styles.section}>{tr("signup.sectionUser")}</Text>

        <Select
          label={tr("signup.roleLabel")}
          value={vToL(role)}
          options={roleOptions}
          onChange={(l) => setRole(lToV(l))}
          required
          placeholder={tr("signup.rolePh")}
        />
        {role === OTHER_SENTINEL && (
          <Input
            label={tr("signup.customRole")}
            value={customRole}
            onChangeText={setCustomRole}
            placeholder={tr("signup.customRolePh")}
            required
          />
        )}

        <Input
          label={tr("signup.fullName")}
          value={fullName}
          onChangeText={setFullName}
          placeholder={tr("signup.fullNamePh")}
          required
          autoCapitalize="words"
        />

        <Input
          label={tr("signup.email")}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          required
        />

        <Input
          label={tr("signup.password")}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          required
        />

        <Input
          label={tr("signup.passwordConfirm")}
          value={passwordConfirm}
          onChangeText={setPasswordConfirm}
          secureTextEntry
          required
        />

        {err ? <Text style={styles.err}>{err}</Text> : null}

        <Button label={tr("signup.submit")} onPress={onSubmit} loading={loading} />

        <Text style={styles.link} onPress={() => router.replace("/(auth)/login")}>
          {tr("signup.alreadyAccount")}
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
