import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "@/theme";

export default function CompanyUsersPlaceholder() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Utilisateurs</Text>
      <Text style={styles.sub}>Disponible à la Phase 5.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, backgroundColor: theme.colors.bg },
  title: { fontSize: 22, fontWeight: "800", color: theme.colors.text },
  sub: { fontSize: 14, color: theme.colors.textMuted, marginTop: 8 },
});
