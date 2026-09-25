import React, { useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@/theme";
import { useTranslation } from "@/i18n/I18nProvider";

interface Props {
  label: string;
  value: string | null;
  options: readonly string[];
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string | null;
  required?: boolean;
}

export function Select({ label, value, options, onChange, placeholder, error, required }: Props) {
  const { t: tr } = useTranslation();
  const ph = placeholder ?? tr("select.placeholder");
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        {label}{required ? <Text style={{ color: theme.colors.danger }}> *</Text> : null}
      </Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.field, error ? styles.fieldError : undefined]}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ?? ph}`}
      >
        <Text style={{ color: value ? theme.colors.text : theme.colors.textMuted, fontSize: 16 }}>
          {value ?? ph}
        </Text>
      </Pressable>
      {error ? <Text style={styles.err}>{error}</Text> : null}

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <FlatList<string>
              data={options as string[]}
              keyExtractor={(it: string) => it}
              renderItem={({ item }: { item: string }) => (
                <Pressable
                  onPress={() => { onChange(item); setOpen(false); }}
                  style={styles.option}
                >
                  <Text style={{ fontSize: 16, color: theme.colors.text }}>{item}</Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: theme.spacing(1.5) },
  label: { fontSize: 14, fontWeight: "600", color: theme.colors.text, marginBottom: 6 },
  field: {
    borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md,
    paddingHorizontal: 12, justifyContent: "center",
    backgroundColor: theme.colors.surface, minHeight: 48,
  },
  fieldError: { borderColor: theme.colors.danger },
  err: { color: theme.colors.danger, fontSize: 12, marginTop: 4 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", maxHeight: "70%", borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 },
  sheetTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8, color: theme.colors.text },
  option: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
});
