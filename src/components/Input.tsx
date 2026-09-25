import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { theme } from "@/theme";

interface Props extends TextInputProps {
  label: string;
  error?: string | null;
  required?: boolean;
  hint?: string;
  containerStyle?: ViewStyle;
}

export function Input({
  label,
  error,
  required,
  hint,
  style,
  multiline,
  containerStyle,
  onFocus,
  onBlur,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);
  const hasError = Boolean(error);

  return (
    <View style={[styles.wrap, containerStyle]}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.star}> *</Text> : null}
      </Text>

      <TextInput
        placeholderTextColor={theme.colors.textMuted}
        multiline={multiline}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          styles.input,
          multiline && styles.multiline,
          focused && !hasError && styles.inputFocused,
          hasError && styles.inputError,
          style,
        ]}
        {...rest}
      />

      {error ? (
        <Text style={styles.err}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: theme.spacing(4) },
  label: {
    fontSize: theme.font.size.base,
    fontWeight: theme.font.weight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing(2),
  },
  star: { color: theme.colors.danger },
  input: {
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(3),
    fontSize: theme.font.size.md,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
    minHeight: theme.size.inputMinHeight,
  },
  inputFocused: {
    borderColor: theme.colors.primary,
    backgroundColor: "#fff",
  },
  multiline: {
    minHeight: 100,
    textAlignVertical: "top",
    paddingTop: theme.spacing(3),
  },
  inputError: {
    borderColor: theme.colors.danger,
    backgroundColor: theme.colors.dangerSoft,
  },
  err: {
    color: theme.colors.danger,
    fontSize: theme.font.size.sm,
    marginTop: theme.spacing(1),
    fontWeight: theme.font.weight.medium,
  },
  hint: {
    color: theme.colors.textMuted,
    fontSize: theme.font.size.sm,
    marginTop: theme.spacing(1),
  },
});
