import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { DrawerContentComponentProps } from "@react-navigation/drawer";
import { useRouter, usePathname } from "expo-router";
import { useCompanyOptions } from "@/hooks/useCompanyOptions";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n/I18nProvider";
import { LanguagePicker } from "@/components/LanguagePicker";
import { theme } from "@/theme";

interface Item {
  label: string;
  href: string;
  match: string;
  icon?: string;
}

export function DrawerContent(props: DrawerContentComponentProps) {
  const router = useRouter();
  const path = usePathname();
  const { profile } = useAuth();
  const { departments, loading } = useCompanyOptions();
  const { t } = useTranslation();

  const isAdmin = (profile as { is_admin?: boolean } | null)?.is_admin === true;
  const fullName = profile?.full_name ?? "";
  const role = profile?.role ?? "";

  const handlePress = (href: string) => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const active = document.activeElement as HTMLElement | null;
      if (active && typeof active.blur === "function") active.blur();
    }
    router.push(href as never);
    setTimeout(() => {
      try {
        props.navigation.closeDrawer();
      } catch {}
    }, 80);
  };

  const navItems: Item[] = [
    { label: t("nav.dashboard"), href: "/(app)/dashboard", match: "/dashboard", icon: "📊" },
    { label: t("nav.pdcaList"), href: "/(app)/pdca", match: "/pdca", icon: "📋" },
    { label: t("nav.pdcaForm"), href: "/(app)/pdca/new", match: "/pdca/new", icon: "➕" },
  ];

  const deptItems: Item[] = departments.map((d) => ({
    label: d.label,
    href: `/(app)/department/${encodeURIComponent(d.label)}`,
    match: `/department/${d.label}`,
    icon: "🏭",
  }));

  const analysisItems: Item[] = [
    { label: t("nav.pilots"), href: "/(app)/pilotes", match: "/pilotes", icon: "👤" },
    { label: t("nav.charts"), href: "/(app)/graphiques", match: "/graphiques", icon: "📈" },
    { label: t("nav.history"), href: "/(app)/historique", match: "/historique", icon: "🕐" },
    { label: t("nav.weeklyReport"), href: "/(app)/rapport-hebdo", match: "/rapport-hebdo", icon: "📄" },
    { label: t("nav.lessons"), href: "/(app)/lessons-learned", match: "/lessons-learned", icon: "💡" },
    { label: t("nav.cancelled"), href: "/(app)/actions-annulees", match: "/actions-annulees", icon: "🚫" },
    { label: t("nav.factoryTour"), href: "/(app)/tour-usine", match: "/tour-usine", icon: "🏗️" },
  ];

  const adminItems: Item[] = isAdmin
    ? [
        { label: t("nav.configuration"), href: "/(app)/company-options", match: "/company-options", icon: "⚙️" },
        { label: t("nav.users"), href: "/(app)/company-users", match: "/company-users", icon: "👥" },
        { label: t("nav.company"), href: "/(app)/company-settings", match: "/company-settings", icon: "🏢" },
      ]
    : [];

  const renderSection = (title: string, items: Item[]) => (
    <View key={title} style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((item) => {
        const active = path.startsWith(item.match);
        return (
          <Pressable
            key={item.href}
            onPress={() => handlePress(item.href)}
            style={({ pressed }) => [
              styles.item,
              active && styles.itemActive,
              pressed && styles.itemPressed,
            ]}
            android_ripple={{ color: "#0f4c8115", borderless: false }}
            accessibilityRole="button"
            accessibilityLabel={item.label}
          >
            {item.icon ? <Text style={styles.itemIcon}>{item.icon}</Text> : null}
            <Text
              style={[styles.itemTxt, active && styles.itemTxtActive]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
            {active ? <View style={styles.activeDot} /> : null}
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>PDCA</Text>
        </View>
        <Text style={styles.headerSub}>{t("nav.industrialManagement")}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.wrap}
        showsVerticalScrollIndicator
      >
        <Text style={styles.langTitle}>{t("language.select")}</Text>
        <LanguagePicker />

        {renderSection(t("nav.navigation"), navItems)}

        {loading ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("nav.departments")}</Text>
            <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 12 }} />
          </View>
        ) : deptItems.length > 0 ? (
          renderSection(t("nav.departments"), deptItems)
        ) : null}

        {renderSection(t("nav.analysis"), analysisItems)}

        {isAdmin ? renderSection(t("nav.admin"), adminItems) : null}

        <View style={{ height: 24 }} />
      </ScrollView>

      <View style={styles.footer}>
        <View style={[styles.avatar, isAdmin && styles.avatarAdmin]}>
          <Text style={styles.avatarTxt}>
            {fullName.charAt(0).toUpperCase() || "?"}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.footerName} numberOfLines={1}>
            {fullName || t("pdcaDetailScreen.defaultUser")}
          </Text>
          <Text style={styles.footerRole} numberOfLines={1}>
            {isAdmin ? t("role.admin") : role || t("role.member")}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surface },
  header: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 56 : 24,
    paddingBottom: 20,
  },
  headerBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  headerBadgeText: {
    fontSize: 18,
    fontWeight: "900",
    color: theme.colors.primary,
    letterSpacing: 1,
  },
  headerSub: { fontSize: 12, color: "#ffffffcc", fontWeight: "600" },
  scroll: { flex: 1, backgroundColor: theme.colors.surface },
  wrap: { paddingBottom: 12 },
  langTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: theme.colors.textMuted,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  section: { marginBottom: 4 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: theme.colors.textMuted,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 46,
    gap: 12,
    borderStartWidth: 3,
    borderStartColor: "transparent",
  },
  itemPressed: { backgroundColor: "#f1f5f9" },
  itemActive: {
    backgroundColor: theme.colors.primary + "0d",
    borderStartColor: theme.colors.primary,
  },
  itemIcon: { fontSize: 16, width: 22, textAlign: "center" },
  itemTxt: { flex: 1, fontSize: 14, color: theme.colors.text, fontWeight: "500" },
  itemTxtActive: { color: theme.colors.primary, fontWeight: "800" },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.primary },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.textMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarAdmin: { backgroundColor: theme.colors.primary },
  avatarTxt: { color: "#fff", fontWeight: "800", fontSize: 18 },
  footerName: { fontSize: 13, fontWeight: "700", color: theme.colors.text },
  footerRole: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
});
