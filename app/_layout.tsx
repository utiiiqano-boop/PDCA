import "react-native-gesture-handler";
import React from "react";
import { View, Text } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/hooks/useAuth";
import { I18nProvider } from "@/i18n/I18nProvider";
import { UIProvider } from "@/ui/UIProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { configError } from "@/lib/supabase";

export default function RootLayout() {
  if (configError) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: "#fff", padding: 24, justifyContent: "center" }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: "#dc2626", marginBottom: 12 }}>
            Configuration manquante
          </Text>
          <Text style={{ fontSize: 14, color: "#1f2937", lineHeight: 20 }}>
            {configError}
          </Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <UIProvider>
          <I18nProvider>
          <AuthProvider>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(app)" />
            </Stack>
          </AuthProvider>
        </I18nProvider>
        </UIProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
