import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "@/theme";

interface Props {
  logoUrl?: string | null;
  greeting: string;
  userName: string;
  companyName: string;
  subscriptionLabel?: string;
  subscriptionWarning?: boolean;
}

export function DashboardHero({
  logoUrl,
  greeting,
  userName,
  companyName,
  subscriptionLabel,
  subscriptionWarning,
}: Props) {
  const firstName = userName.split(" ")[0] || userName;

  return (
    <LinearGradient
      colors={[theme.colors.primary, "#083358"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          {logoUrl ? (
            <Image
              source={{ uri: logoUrl }}
              style={styles.logo}
              resizeMode="contain"
            />
          ) : (
            <View style={[styles.logo, styles.logoFallback]}>
              <Text style={styles.logoFallbackTxt}>
                {companyName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.greeting}>{greeting},</Text>
          <Text style={styles.name} numberOfLines={1}>
            {firstName} 👋
          </Text>
          <Text style={styles.company} numberOfLines={1}>
            {companyName}
          </Text>
        </View>
      </View>

      {subscriptionLabel ? (
        <View
          style={[
            styles.pill,
            subscriptionWarning ? styles.pillWarn : styles.pillInfo,
          ]}
        >
          <Text style={styles.pillTxt}>{subscriptionLabel}</Text>
        </View>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  logo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: "#ffffff22",
  },
  logoFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff33",
  },
  logoFallbackTxt: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
  },
  hero: {
    marginHorizontal: theme.spacing(4),
    marginTop: theme.spacing(4),
    marginBottom: theme.spacing(3),
    borderRadius: theme.radius.lg,
    padding: theme.spacing(5),
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  greeting: {
    fontSize: 14,
    color: "#ffffffcc",
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  name: {
    fontSize: 26,
    fontWeight: "900",
    color: "#fff",
    marginTop: 2,
    letterSpacing: -0.3,
  },
  company: {
    fontSize: 13,
    color: "#ffffffaa",
    marginTop: 6,
    fontWeight: "600",
  },
  pill: {
    alignSelf: "flex-start",
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillInfo: {
    backgroundColor: "#ffffff22",
    borderWidth: 1,
    borderColor: "#ffffff44",
  },
  pillWarn: {
    backgroundColor: "#f59e0b33",
    borderWidth: 1,
    borderColor: "#f59e0b88",
  },
  pillTxt: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
