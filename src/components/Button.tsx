import React, { forwardRef } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { theme } from "@/theme";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg";

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  fullWidth?: boolean;
}

export const Button = forwardRef<View, Props>(function Button(
  {
    label,
    onPress,
    variant = "primary",
    size = "md",
    loading,
    disabled,
    style,
    fullWidth = true,
  },
  ref,
) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        sizeStyles[size],
        variantStyles[variant],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "secondary" || variant === "ghost" ? theme.colors.primary : "#fff"}
        />
      ) : (
        <Text
          style={[
            styles.txt,
            sizeTextStyles[size],
            variant === "secondary" || variant === "ghost"
              ? styles.txtDark
              : styles.txtLight,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    minHeight: theme.size.buttonMinHeight,
    paddingHorizontal: theme.spacing(4),
  },
  fullWidth: { width: "100%" },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
  txt: { fontWeight: theme.font.weight.semibold, letterSpacing: 0.2 },
  txtLight: { color: "#fff" },
  txtDark: { color: theme.colors.primary },
});

const sizeStyles: Record<Size, ViewStyle> = {
  sm: { minHeight: 38, paddingHorizontal: theme.spacing(3) },
  md: { minHeight: 48, paddingHorizontal: theme.spacing(4) },
  lg: { minHeight: 54, paddingHorizontal: theme.spacing(5) },
};

const sizeTextStyles = StyleSheet.create({
  sm: { fontSize: theme.font.size.sm, fontWeight: theme.font.weight.semibold },
  md: { fontSize: theme.font.size.base, fontWeight: theme.font.weight.semibold },
  lg: { fontSize: theme.font.size.md, fontWeight: theme.font.weight.bold },
});

const variantStyles: Record<Variant, ViewStyle> = {
  primary: {
    backgroundColor: theme.colors.primary,
  },
  secondary: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  danger: {
    backgroundColor: theme.colors.danger,
  },
  success: {
    backgroundColor: theme.colors.success,
  },
};
