import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { theme } from "@/theme";
import { useTranslation } from "@/i18n/I18nProvider";

export function LoadingState({ label }: { label?: string }) {
  const { t: tr } = useTranslation();
  return (
    <View style={styles.center}>
      <ActivityIndicator color={theme.colors.primary} size="large" />
      <Text style={styles.loadingTxt}>{label ?? tr("common.loading")}</Text>
    </View>
  );
}

export function EmptyState({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle?: string;
  icon?: string;
}) {
  return (
    <View style={styles.center}>
      <View style={styles.emptyIcon}>
        <Text style={styles.emptyIconTxt}>{icon ?? "📭"}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.txt}>{subtitle}</Text> : null}
    </View>
  );
}

export function ErrorState({ message }: { message: string }) {
  const { t: tr } = useTranslation();
  return (
    <View style={styles.center}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.colors.dangerSoft }]}>
        <Text style={styles.emptyIconTxt}>⚠️</Text>
      </View>
      <Text style={[styles.title, { color: theme.colors.danger }]}>{tr("common.error")}</Text>
      <Text style={styles.txt}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing(8),
  },
  loadingTxt: {
    marginTop: theme.spacing(4),
    fontSize: theme.font.size.base,
    color: theme.colors.textMuted,
    fontWeight: theme.font.weight.medium,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.neutralSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing(4),
  },
  emptyIconTxt: { fontSize: 32 },
  title: {
    fontSize: theme.font.size.lg,
    fontWeight: theme.font.weight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing(1),
    textAlign: "center",
  },
  txt: {
    fontSize: theme.font.size.base,
    color: theme.colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
});
