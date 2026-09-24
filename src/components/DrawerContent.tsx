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

  const isAdmin = (profile as { is_admin?: boolean } | null)?.is_admin === true;
  const fullName = profile?.full_name ?? "";
  const role = profile?.role ?? "";

  const handlePress = (href: string) => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const active = document.activeElement as HTMLElement | null;
      if (active && typeof active.blur === "function") active.blur();
    }
    router.push(href as never);
    // Give navigation a moment, then close drawer
    setTimeout(() => {
      try {
        props.navigation.closeDrawer();
      } catch {}
    }, 80);
  };

  const navItems: Item[] = [
    { label: "Tableau de bord", href: "/(app)/dashboard", match: "/dashboard", icon: "📊" },
    { label: "Liste des PDCA", href: "/(app)/pdca", match: "/pdca", icon: "📋" },
    { label: "Nouveau PDCA", href: "/(app)/pdca/new", match: "/pdca/new", icon: "➕" },
  ];

  const deptItems: Item[] = departments.map((d) => ({
    label: d.label,
    href: `/(app)/department/${encodeURIComponent(d.label)}`,
    match: `/department/${d.label}`,
    icon: "🏭",
  }));

  const analysisItems: Item[] = [
    { label: "Pilotes", href: "/(app)/pilotes", match: "/pilotes", icon: "👤" },
    { label: "Graphiques", href: "/(app)/graphiques", match: "/graphiques", icon: "📈" },
    { label: "Historique", href: "/(app)/historique", match: "/historique", icon: "🕐" },
    { label: "Rapport hebdo", href: "/(app)/rapport-hebdo", match: "/rapport-hebdo", icon: "📄" },
    { label: "Lessons Learned", href: "/(app)/lessons-learned", match: "/lessons-learned", icon: "💡" },
    { label: "Actions annulées", href: "/(app)/actions-annulees", match: "/actions-annulees", icon: "🚫" },
    { label: "Tour Usine", href: "/(app)/tour-usine", match: "/tour-usine", icon: "🏗️" },
  ];

  const adminItems: Item[] = isAdmin
    ? [
        { label: "Configuration", href: "/(app)/company-options", match: "/company-options", icon: "⚙️" },
        { label: "Utilisateurs", href: "/(app)/company-users", match: "/company-users", icon: "👥" },
        { label: "Mon entreprise", href: "/(app)/company-settings", match: "/company-settings", icon: "🏢" },
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
            // onPress fires only on real taps, NOT on scroll/swipe
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
      {/* ── Header ─────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>PDCA</Text>
        </View>
        <Text style={styles.headerSub}>Gestion industrielle</Text>
      </View>

      {/* ── Scrollable body ────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.wrap}
        showsVerticalScrollIndicator
        bounces={false}
        // Important: standard ScrollView props so swipe-to-scroll works naturally
      >
        {renderSection("Navigation", navItems)}

        {loading ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Départements</Text>
            <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 12 }} />
          </View>
        ) : deptItems.length > 0 ? (
          renderSection("Départements", deptItems)
        ) : null}

        {renderSection("Analyse", analysisItems)}

        {isAdmin ? renderSection("Administration", adminItems) : null}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ── Footer: user info ──────────────────── */}
      <View style={styles.footer}>
        <View style={[styles.avatar, isAdmin && styles.avatarAdmin]}>
          <Text style={styles.avatarTxt}>
            {fullName.charAt(0).toUpperCase() || "?"}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.footerName} numberOfLines={1}>
            {fullName || "Utilisateur"}
          </Text>
          <Text style={styles.footerRole} numberOfLines={1}>
            {isAdmin ? "Administrateur" : role || "Membre"}
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
  headerSub: {
    fontSize: 12,
    color: "#ffffffcc",
    fontWeight: "600",
  },

  scroll: { flex: 1, backgroundColor: theme.colors.surface },
  wrap: { paddingBottom: 12 },

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
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 50,
    gap: 12,
    borderLeftWidth: 3,
    borderLeftColor: "transparent",
  },
  itemPressed: {
    backgroundColor: "#f1f5f9",
  },
  itemActive: {
    backgroundColor: theme.colors.primary + "0d",
    borderLeftColor: theme.colors.primary,
  },
  itemIcon: { fontSize: 16, width: 22, textAlign: "center" },
  itemTxt: { flex: 1, fontSize: 14, color: theme.colors.text, fontWeight: "500" },
  itemTxtActive: { color: theme.colors.primary, fontWeight: "800" },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
  },

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
  avatarAdmin: {
    backgroundColor: theme.colors.primary,
  },
  avatarTxt: { color: "#fff", fontWeight: "800", fontSize: 18 },
  footerName: { fontSize: 13, fontWeight: "700", color: theme.colors.text },
  footerRole: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
});
