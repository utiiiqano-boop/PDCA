import React, { useEffect, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Card } from "@/components/Card";
import { LoadingState, ErrorState } from "@/components/States";
import { useAuth } from "@/hooks/useAuth";
import { useUI } from "@/ui/UIProvider";
import {
  getCompany,
  updateCompany,
  uploadCompanyLogo,
  CompanyRow,
} from "@/services/companiesService";
import { theme } from "@/theme";

export default function CompanySettings() {
  // ── 1. HOOKS FIRST ────────────────────────────────────
  const { profile } = useAuth();
  const { toast, alert } = useUI();

  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [name, setName] = useState("");
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const companyId =
    (profile as { company_id?: string } | null)?.company_id;

  useEffect(() => {
    if (!companyId) {
      setError("Aucune entreprise associée à votre compte.");
      setLoading(false);
      return;
    }
    getCompany(companyId)
      .then((c) => {
        setCompany(c);
        setName(c?.name ?? "");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"))
      .finally(() => setLoading(false));
  }, [companyId]);

  // ── 2. HANDLERS ───────────────────────────────────────
  const pickLogo = async () => {
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/png,image/jpeg,image/webp";
      input.onchange = (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setLogoUri(reader.result as string);
        reader.readAsDataURL(file);
      };
      input.click();
      return;
    }

    try {
      const ImagePicker = await import("expo-image-picker");
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        toast.error("Permission refusée.");
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
    } catch (e) {
      alert({
        title: "Erreur",
        message: e instanceof Error ? e.message : "Erreur",
      });
    }
  };

  const onSave = async () => {
    if (!companyId) return;
    setSaving(true);
    try {
      if (name.trim() !== company?.name) {
        await updateCompany(companyId, { name: name.trim() });
      }
      if (logoUri) {
        await uploadCompanyLogo(companyId, logoUri);
      }
      toast.success("Entreprise mise à jour");
      const fresh = await getCompany(companyId);
      setCompany(fresh);
      setLogoUri(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      alert({ title: "Erreur", message: msg });
    } finally {
      setSaving(false);
    }
  };

  // ── 3. EARLY RETURNS ──────────────────────────────────
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  // ── 4. UI ─────────────────────────────────────────────
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Mon entreprise</Text>
        <Text style={styles.sub}>
          Gérez le nom et le logo affichés dans l'application
        </Text>
      </View>

      {/* Logo card */}
      <Card>
        <Text style={styles.sectionLabel}>Logo</Text>

        <View style={styles.logoSection}>
          <View style={styles.logoBox}>
            {logoUri ? (
              <Image source={{ uri: logoUri }} style={styles.logoImg} />
            ) : company?.logo_url ? (
              <Image source={{ uri: company.logo_url }} style={styles.logoImg} />
            ) : (
              <Text style={styles.logoPlaceholder}>
                {(company?.name ?? "?").charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label="Changer le logo"
              variant="secondary"
              size="sm"
              onPress={pickLogo}
            />
            {logoUri ? (
              <Pressable
                onPress={() => setLogoUri(null)}
                style={styles.removeLogoBtn}
              >
                <Text style={styles.removeLogoTxt}>Retirer le nouveau logo</Text>
              </Pressable>
            ) : null}
            <Text style={styles.logoHint}>
              Recommandé : carré, 512×512, PNG ou JPG
            </Text>
          </View>
        </View>
      </Card>

      {/* Name card */}
      <Card>
        <Text style={styles.sectionLabel}>Informations</Text>
        <Input
          label="Nom de l'entreprise"
          value={name}
          onChangeText={setName}
          placeholder="Ex : Métallurgie Dupont SAS"
          required
          hint="Ce nom apparaît dans le drawer et le dashboard"
        />
      </Card>

      {/* Save button */}
      <View style={styles.saveWrap}>
        <Button
          label="Enregistrer les modifications"
          onPress={onSave}
          loading={saving}
        />
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  container: {
    padding: theme.spacing(4),
    paddingBottom: 60,
  },

  // ── Header ────────────────────────────────────
  header: { marginBottom: theme.spacing(5) },
  title: {
    fontSize: theme.font.size["2xl"],
    fontWeight: theme.font.weight.black,
    color: theme.colors.text,
  },
  sub: {
    fontSize: theme.font.size.base,
    color: theme.colors.textMuted,
    marginTop: theme.spacing(1),
    lineHeight: 20,
  },

  // ── Section label ─────────────────────────────
  sectionLabel: {
    fontSize: theme.font.size.sm,
    fontWeight: theme.font.weight.bold,
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: theme.spacing(3),
  },

  // ── Logo section ──────────────────────────────
  logoSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(4),
  },
  logoBox: {
    width: 96,
    height: 96,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 2,
    borderColor: theme.colors.divider,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoImg: { width: "100%", height: "100%" },
  logoPlaceholder: {
    color: theme.colors.primary,
    fontSize: 40,
    fontWeight: theme.font.weight.black,
  },
  removeLogoBtn: {
    marginTop: theme.spacing(2),
    alignSelf: "flex-start",
  },
  removeLogoTxt: {
    color: theme.colors.danger,
    fontSize: theme.font.size.sm,
    fontWeight: theme.font.weight.semibold,
    textDecorationLine: "underline",
  },
  logoHint: {
    fontSize: theme.font.size.xs,
    color: theme.colors.textMuted,
    marginTop: theme.spacing(2),
    lineHeight: 15,
  },

  // ── Save ──────────────────────────────────────
  saveWrap: { marginTop: theme.spacing(2) },
});
