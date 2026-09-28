import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Redirect, router } from "expo-router";
import { theme } from "@/theme";
import { useGate } from "@/hooks/useGate";

const FEATURES = [
  { icon: "📋", text: "Créez et suivez vos PDCAs" },
  { icon: "👤", text: "Assignez des actions à vos pilotes" },
  { icon: "⏰", text: "Recevez des rappels avant échéance" },
  { icon: "📊", text: "Analysez vos performances" },
];

export default function GateScreen() {
  const { unlocked, loading, unlock } = useGate();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loading && unlocked) return <Redirect href="/" />;

  const DEMO_CODE = "PDCA-TEST-001";
  const showDemo = __DEV__ || process.env.EXPO_PUBLIC_DEMO_MODE === "1";

  const fillDemo = () => {
    setCode(DEMO_CODE);
    setError(null);
  };

  const onSubmit = async () => {
    if (busy) return;
    setError(null);
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError("Entrez un code d'accès.");
      return;
    }
    setBusy(true);
    try {
      const res = await unlock(trimmed);
      if (!res.ok) {
        setError("Code invalide ou expiré.");
        return;
      }
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
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
        <View style={styles.logoWrap}>
          <Image
            source={require("../assets/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>PDCA</Text>
        <Text style={styles.subtitle}>
          Pilotez vos cycles d'amélioration continue
        </Text>

        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.text} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureTxt}>{f.text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.formWrap}>
          <Text style={styles.label}>Code d'accès</Text>
          <TextInput
            value={code}
            onChangeText={(v) => {
              setCode(v.toUpperCase());
              setError(null);
            }}
            placeholder="PDCA-XXXX-XXXX"
            placeholderTextColor={theme.colors.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            style={styles.input}
            onSubmitEditing={onSubmit}
            returnKeyType="go"
            editable={!busy}
          />
          {error ? <Text style={styles.err}>{error}</Text> : null}
          <Pressable
            onPress={onSubmit}
            disabled={busy}
            style={[styles.btn, busy && { opacity: 0.6 }]}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnTxt}>Accéder à l'application</Text>
            )}
          </Pressable>
        </View>

        <Text style={styles.footer}>
          Pour obtenir un code, contactez-nous :{"\n"}
          <Text style={styles.footerLink}>WhatsApp +216 99 137 938</Text>
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
    alignItems: "center",
  },
  logoWrap: { marginTop: 24, marginBottom: 8 },
  logo: { width: 96, height: 96, borderRadius: 20 },
  title: {
    fontSize: 34,
    fontWeight: "900",
    color: theme.colors.primary,
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 32,
  },
  features: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    marginBottom: 28,
  },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  featureIcon: { fontSize: 22, width: 32, textAlign: "center" },
  featureTxt: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: "600",
  },
  formWrap: { width: "100%", maxWidth: 420, marginBottom: 24 },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    minHeight: 52,
    fontSize: 18,
    letterSpacing: 2,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
    textAlign: "center",
    fontWeight: "700",
  },
  err: {
    color: theme.colors.danger,
    fontSize: 13,
    marginTop: 8,
    textAlign: "center",
    fontWeight: "600",
  },
  btn: {
    marginTop: 14,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  btnTxt: { color: "#fff", fontWeight: "800", fontSize: 16 },
  demoBtn: {
    marginTop: 10,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderStyle: "dashed",
    backgroundColor: theme.colors.primarySoft,
  },
  demoTxt: {
    color: theme.colors.primary,
    fontWeight: "700",
    fontSize: 13,
  },
  footer: {
    textAlign: "center",
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  footerLink: { color: theme.colors.primary, fontWeight: "700" },
});
