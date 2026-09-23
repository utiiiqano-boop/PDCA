import React, { useEffect, useState } from "react";
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
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
  const { profile } = useAuth();
  const { toast, alert } = useUI();

  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [name, setName] = useState("");
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const companyId = (profile as { company_id?: string } | null)?.company_id;

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

  const pickLogo = async () => {
    if (Platform.OS === "web") {
      // Web: native file input
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

    // Native: expo-image-picker
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
      alert({ title: "Erreur", message: e instanceof Error ? e.message : "Erreur" });
    }
  };

  const onSave = async () => {
    if (!companyId) return;
    setSaving(true);
    try {
      // 1. Update name
      if (name.trim() !== company?.name) {
        await updateCompany(companyId, { name: name.trim() });
      }
      // 2. Upload logo if changed
      if (logoUri) {
        await uploadCompanyLogo(companyId, logoUri);
      }
      toast.success("Entreprise mise à jour");
      // Reload
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

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Entreprise</Text>
      <Text style={styles.subtitle}>Gérez le nom et le logo de votre entreprise</Text>

      <View style={styles.logoSection}>
        <View style={styles.logoBox}>
          {logoUri ? (
            <Image source={{ uri: logoUri }} style={styles.logoImg} />
          ) : company?.logo_url ? (
            <Image source={{ uri: company.logo_url }} style={styles.logoImg} />
          ) : (
            <Text style={styles.logoPlaceholder}>Aucun logo</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Button label="Changer le logo" variant="secondary" onPress={pickLogo} />
        </View>
      </View>

      <Input
        label="Nom de l'entreprise"
        value={name}
        onChangeText={setName}
        placeholder="Ex : Métallurgie Dupont SAS"
        required
      />

      <View style={{ height: 16 }} />
      <Button label="Enregistrer" onPress={onSave} loading={saving} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: theme.colors.bg, paddingBottom: 60 },
  title: { fontSize: 24, fontWeight: "800", color: theme.colors.text },
  subtitle: { fontSize: 13, color: theme.colors.textMuted, marginTop: 4, marginBottom: 24 },
  logoSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 20,
  },
  logoBox: {
    width: 96,
    height: 96,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoImg: { width: "100%", height: "100%" },
  logoPlaceholder: { color: theme.colors.textMuted, fontSize: 12, fontWeight: "600" },
});
