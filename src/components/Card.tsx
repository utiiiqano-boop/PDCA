import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { theme } from "@/theme";

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
}

export function Card({ children, style, padded = true }: Props) {
  return (
    <View style={[styles.card, padded && styles.padded, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    marginBottom: theme.spacing(3),
    ...theme.shadow.sm,
  },
  padded: {
    padding: theme.spacing(4),
  },
});
