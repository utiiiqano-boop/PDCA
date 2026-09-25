import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { theme } from "@/theme";
import { useTranslation } from "@/i18n/I18nProvider";

const TITLE_KEYS: Record<string, string> = {
  graphiques: "nav.charts",
  rapport: "nav.weeklyReport",
  lessons: "nav.lessons",
  tour: "nav.factoryTour",
};

export default function Placeholder() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t: tr } = useTranslation();
  const titleKey = TITLE_KEYS[slug ?? ""];
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>
        {titleKey ? tr(titleKey) : tr("placeholder.feature")}
      </Text>
      <Text style={styles.sub}>{tr("placeholder.phase3")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    backgroundColor: theme.colors.bg,
  },
  title: { fontSize: 22, fontWeight: "800", color: theme.colors.text },
  sub: { fontSize: 14, color: theme.colors.textMuted, marginTop: 8 },
});
