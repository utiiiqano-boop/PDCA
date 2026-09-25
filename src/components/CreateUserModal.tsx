import React, { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import { useCompanyOptions } from "@/hooks/useCompanyOptions";
import { useUI } from "@/ui/UIProvider";
import { useTranslation } from "@/i18n/I18nProvider";
import { createCompanyUser, CreateCompanyUserResult } from "@/services/companyUsersService";
import { theme } from "@/theme";

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: () => Promise<void>;
}

export function CreateUserModal({ visible, onClose, onCreated }: Props) {
  const { pilots } = useCompanyOptions();
  const { toast, alert } = useUI();
  const { t: tr } = useTranslation();

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateCompanyUserResult | null>(null);

  const reset = () => {
    setEmail("");
    setFullName("");
    setRole(null);
    setIsAdmin(false);
    setError(null);
    setResult(null);
    setBusy(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    setError(null);
    if (!email.trim()) return setError("Email requis.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return setError("Email invalide.");
    if (!fullName.trim()) return setError("Nom et prénom requis.");
    if (!role) return setError("Rôle requis.");

    try {
      setBusy(true);
      const res = await createCompanyUser({
        email: email.trim(),
        fullName: fullName.trim(),
        role,
        isAdmin,
      });
      setResult(res);
      await onCreated();
      toast.success("Compte créé");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const copyCredentials = async () => {
    if (!result) return;
    const text = `PDCA — Accès\nURL : votre application PDCA\nEmail : ${result.email}\nMot de passe : ${result.tempPassword}`;
    try {
      await Clipboard.setStringAsync(text);
      toast.success("Identifiants copiés");
    } catch {
      toast.error("Copie impossible");
    }
  };

  const roleLabels = pilots.map((p) => p.label);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={close}
    >
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <ScrollView keyboardShouldPersistTaps="handled">
            {result ? (
              /* ───────────── Success screen ───────────── */
              <>
                <Text style={styles.title}>Compte créé ✓</Text>
                <Text style={styles.subtitle}>
                  Notez ces identifiants maintenant. Le mot de passe ne sera plus
                  affiché.
                </Text>

                <View style={styles.credBox}>
                  <Text style={styles.credLabel}>Email</Text>
                  <Text style={styles.credValue} selectable>
                    {result.email}
                  </Text>
                  <Text style={[styles.credLabel, { marginTop: 12 }]}>
                    Mot de passe temporaire
                  </Text>
                  <Text style={styles.credValue} selectable>
                    {result.tempPassword}
                  </Text>
                </View>

                <Text style={styles.hint}>
                  Transmettez ces identifiants à l'employé. Il pourra se connecter
                  immédiatement à l'application.
                </Text>

                <Button label="📋 Copier les identifiants" onPress={copyCredentials} />
                <View style={{ height: 8 }} />
                <Button label="Créer un autre compte" variant="secondary" onPress={reset} />
                <View style={{ height: 8 }} />
                <Button label="Fermer" variant="secondary" onPress={close} />
              </>
            ) : (
              /* ───────────── Form screen ───────────── */
              <>
                <Text style={styles.title}>Nouveau compte</Text>
                <Text style={styles.subtitle}>
                  L'employé rejoindra automatiquement votre entreprise.
                </Text>

                <Input
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="prenom.nom@entreprise.com"
                  required
                />

                <Input
                  label="Nom et prénom"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  placeholder="Ex : Jean Dupont"
                  required
                />

                <Select
                  label="Rôle / Pilote"
                  value={role}
                  options={roleLabels}
                  onChange={setRole}
                  placeholder="Choisissez un rôle…"
                  required
                />

                <Pressable
                  onPress={() => setIsAdmin(!isAdmin)}
                  style={styles.checkboxRow}
                >
                  <View style={[styles.checkbox, isAdmin && styles.checkboxOn]}>
                    {isAdmin ? <Text style={styles.checkmark}>✓</Text> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.checkboxLabel}>{tr("role.admin")}</Text>
                    <Text style={styles.checkboxHint}>{tr("role.adminHint")}</Text>
                  </View>
                </Pressable>

                {error ? <Text style={styles.err}>{error}</Text> : null}

                <View style={{ height: 12 }} />
                <Button label="Créer le compte" onPress={submit} loading={busy} />
                <View style={{ height: 8 }} />
                <Button label="Annuler" variant="secondary" onPress={close} />
              </>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: theme.colors.bg,
    maxHeight: "92%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 32,
  },
  title: { fontSize: 20, fontWeight: "800", color: theme.colors.text },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 4,
    marginBottom: 20,
    lineHeight: 18,
  },
  credBox: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: 14,
    marginBottom: 16,
  },
  credLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  credValue: {
    fontSize: 15,
    color: theme.colors.text,
    marginTop: 4,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  hint: {
    fontSize: 12,
    color: theme.colors.textMuted,
    backgroundColor: "#fef3c7",
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    lineHeight: 16,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    marginBottom: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
  },
  checkboxOn: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  checkmark: { color: "#fff", fontWeight: "800", fontSize: 16 },
  checkboxLabel: { fontSize: 14, fontWeight: "700", color: theme.colors.text },
  checkboxHint: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  err: {
    color: theme.colors.danger,
    fontSize: 13,
    marginTop: 8,
    textAlign: "center",
  },
});
