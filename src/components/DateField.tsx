import React, { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { theme } from "@/theme";
import { useTranslation } from "@/i18n/I18nProvider";

interface Props {
  label: string;
  value: string | null; // YYYY-MM-DD
  onChange: (v: string | null) => void;
  required?: boolean;
  error?: string | null;
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function fromISO(s: string | null): Date {
  if (!s) return new Date();
  const parts = s.split("-");
  const y = Number(parts[0] ?? new Date().getFullYear());
  const m = Number(parts[1] ?? 1);
  const d = Number(parts[2] ?? 1);
  return new Date(y, m - 1, d);
}

export function todayISO(): string {
  return toISO(new Date());
}

const LOCALES: Record<string, string> = { fr: "fr-FR", en: "en-US", ar: "ar-SA" };

export function DateField({ label, value, onChange, required, error }: Props) {
  const { t: tr, language } = useTranslation();
  const [show, setShow] = useState(false);
  const locale = LOCALES[language] ?? "fr-FR";

  // ---------- Web ----------
  if (Platform.OS === "web") {
    return (
      <View style={styles.wrap}>
        <Text style={styles.label}>
          {label}{required ? <Text style={{ color: theme.colors.danger }}> *</Text> : null}
        </Text>
        <input
          type="date"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          style={{
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: error ? theme.colors.danger : theme.colors.border,
            borderRadius: theme.radius.md,
            paddingLeft: 12,
            paddingRight: 12,
            minHeight: 48,
            fontSize: 15,
            color: theme.colors.text,
            backgroundColor: theme.colors.surface,
            fontFamily: "inherit",
            width: "100%",
            boxSizing: "border-box",
          }}
        />
        {error ? <Text style={styles.err}>{error}</Text> : null}
      </View>
    );
  }

  // ---------- Native ----------
  const display = value ? fromISO(value).toLocaleDateString(locale) : tr("select.placeholder");

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        {label}{required ? <Text style={{ color: theme.colors.danger }}> *</Text> : null}
      </Text>
      <Pressable
        onPress={() => setShow(true)}
        style={[styles.field, error ? styles.fieldError : undefined]}
      >
        <Text style={{ color: value ? theme.colors.text : theme.colors.textMuted, fontSize: 16 }}>
          {display}
        </Text>
      </Pressable>
      {error ? <Text style={styles.err}>{error}</Text> : null}

      {show && (
        <DateTimePicker
          value={fromISO(value)}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(e: DateTimePickerEvent, d?: Date) => {
            if (Platform.OS !== "ios") setShow(false);
            if (e.type === "set" && d) onChange(toISO(d));
          }}
        />
      )}
      {Platform.OS === "ios" && show && (
        <Pressable onPress={() => setShow(false)} style={styles.iosDone}>
          <Text style={{ color: theme.colors.primary, fontWeight: "600" }}>OK</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: theme.spacing(1.5) },
  label: { fontSize: 14, fontWeight: "600", color: theme.colors.text, marginBottom: 6 },
  field: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    minHeight: 48,
  },
  fieldError: { borderColor: theme.colors.danger },
  err: { color: theme.colors.danger, fontSize: 12, marginTop: 4 },
  iosDone: { alignSelf: "flex-end", padding: 8 },
});
