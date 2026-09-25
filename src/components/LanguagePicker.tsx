import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "@/i18n/I18nProvider";
import { LANGUAGES } from "@/i18n/translations";
import { theme } from "@/theme";

export function LanguagePicker() {
  const { language, setLanguage } = useTranslation();
  return (
    <View style={styles.wrap}>
      {LANGUAGES.map((l) => {
        const active = language === l.code;
        return (
          <Pressable
            key={l.code}
            onPress={() => setLanguage(l.code)}
            style={[styles.item, active && styles.itemActive]}
          >
            <Text style={styles.flag}>{l.flag}</Text>
            <Text
              style={[styles.label, active && styles.labelActive]}
              numberOfLines={1}
            >
              {l.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    gap: theme.spacing(1),
    paddingHorizontal: theme.spacing(4),
    marginBottom: theme.spacing(3),
  },
  item: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: theme.spacing(2),
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  itemActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  flag: { fontSize: 14 },
  label: {
    fontSize: 11,
    fontWeight: theme.font.weight.semibold,
    color: theme.colors.text,
  },
  labelActive: { color: "#fff" },
});
