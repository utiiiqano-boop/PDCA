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
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useUI } from "@/ui/UIProvider";
import {
  importOptions,
  parseCsv,
  ParsedRow,
  ParseResult,
} from "@/services/csvImportService";
import type { OptionKind } from "@/types/companyOptions";
import { theme } from "@/theme";

interface Props {
  kind: OptionKind;
  companyId: string;
  onImported: () => Promise<void>;
}

async function pickFile(): Promise<string | null> {
  if (Platform.OS === "web") {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".csv,text/csv,text/plain";
      input.onchange = (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return resolve(null);
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.readAsText(file, "utf-8");
      };
      input.click();
    });
  }

  // Native
  const DocumentPicker = await import("expo-document-picker");
  const res = await DocumentPicker.getDocumentAsync({
    type: ["text/csv", "text/comma-separated-values", "text/plain", "*/*"],
    copyToCacheDirectory: true,
  });
  if (res.canceled || !res.assets?.[0]) return null;
  const uri = res.assets[0].uri;
  const r = await fetch(uri);
  return await r.text();
}

export function ImportCsvButton({ kind, companyId, onImported }: Props) {
  const { toast, alert } = useUI();
  const [showPreview, setShowPreview] = useState(false);
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [importing, setImporting] = useState(false);

  const handlePick = async () => {
    try {
      const text = await pickFile();
      if (!text) return;
      const result = parseCsv(text);
      if (result.rows.length === 0) {
        alert({
          title: "Fichier vide",
          message: "Aucune ligne valide trouvée dans le CSV.",
        });
        return;
      }
      setParsed(result);
      setShowPreview(true);
    } catch (e) {
      alert({
        title: "Erreur",
        message: e instanceof Error ? e.message : "Lecture impossible.",
      });
    }
  };

  const confirmImport = async () => {
    if (!parsed) return;
    try {
      setImporting(true);
      const result = await importOptions(kind, companyId, parsed.rows);
      toast.success(`${result.total} entrée(s) importée(s)`);
      setShowPreview(false);
      setParsed(null);
      await onImported();
    } catch (e) {
      alert({
        title: "Erreur d'import",
        message: e instanceof Error ? e.message : "Erreur",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <Button
        label="📁 Importer depuis CSV"
        variant="secondary"
        onPress={handlePick}
      />

      <Modal
        visible={showPreview}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPreview(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setShowPreview(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.title}>Aperçu de l'import</Text>
              <Text style={styles.subtitle}>
                {parsed?.rows.length ?? 0} entrée(s) valide(s)
                {parsed?.skipped ? ` • ${parsed.skipped} ignorée(s)` : ""}
              </Text>

              {parsed?.duplicates && parsed.duplicates.length > 0 ? (
                <Card style={{ marginBottom: 12 }}>
                  <Text style={styles.warnTitle}>Doublons détectés</Text>
                  <Text style={styles.warnTxt}>
                    {parsed.duplicates.slice(0, 5).join(", ")}
                    {parsed.duplicates.length > 5
                      ? ` … (+${parsed.duplicates.length - 5})`
                      : ""}
                  </Text>
                </Card>
              ) : null}

              <Card style={{ maxHeight: 300, marginBottom: 12 }}>
                <ScrollView>
                  {parsed?.rows.slice(0, 30).map((r: ParsedRow, i: number) => (
                    <View key={i} style={styles.row}>
                      <Text style={styles.rowLabel} numberOfLines={1}>
                        {r.label}
                      </Text>
                      <Text style={styles.rowOrder}>#{r.sort_order}</Text>
                    </View>
                  ))}
                  {parsed && parsed.rows.length > 30 ? (
                    <Text style={styles.moreTxt}>
                      … et {parsed.rows.length - 30} autre(s)
                    </Text>
                  ) : null}
                </ScrollView>
              </Card>

              <Text style={styles.hint}>
                Les libellés déjà existants seront mis à jour. Les nouveaux
                seront ajoutés. Aucune entrée existante ne sera supprimée.
              </Text>

              <Button
                label={`Importer ${parsed?.rows.length ?? 0} entrée(s)`}
                onPress={confirmImport}
                loading={importing}
              />
              <View style={{ height: 8 }} />
              <Button
                label="Annuler"
                variant="secondary"
                onPress={() => setShowPreview(false)}
              />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
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
    marginBottom: 16,
  },
  warnTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.colors.danger,
    marginBottom: 4,
  },
  warnTxt: { fontSize: 12, color: theme.colors.text },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  rowLabel: { fontSize: 13, color: theme.colors.text, flex: 1 },
  rowOrder: { fontSize: 12, color: theme.colors.textMuted, marginLeft: 8 },
  moreTxt: {
    fontSize: 12,
    fontStyle: "italic",
    color: theme.colors.textMuted,
    textAlign: "center",
    paddingVertical: 8,
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
});
