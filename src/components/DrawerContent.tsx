import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { DrawerContentComponentProps } from "@react-navigation/drawer";
import { useRouter, usePathname } from "expo-router";
import { theme } from "@/theme";
import { DEPARTMENTS } from "@/constants/options";

interface Item {
  label: string;
  href: string;
  match: string;
}

const SECTIONS: { title: string; items: Item[] }[] = [
  {
    title: "Navigation",
    items: [
      { label: "Tableau de bord", href: "/(app)/dashboard", match: "/dashboard" },
      { label: "Liste des PDCA", href: "/(app)/pdca", match: "/pdca" },
      { label: "PDCA Form", href: "/(app)/pdca/new", match: "/pdca/new" },
      { label: "Mon entreprise", href: "/(app)/company-settings", match: "/company-settings" },
    ],
  },
  {
    title: "Départements",
    items: DEPARTMENTS.map((d) => ({
      label: d,
      href: `/(app)/department/${d}`,
      match: `/department/${d}`,
    })),
  },
  {
    title: "Analyse",
    items: [
      { label: "Pilotes", href: "/(app)/pilotes", match: "/pilotes" },
      { label: "Graphiques", href: "/(app)/graphiques", match: "/graphiques" },
      { label: "Historique", href: "/(app)/historique", match: "/historique" },
      { label: "Rapport hebdo", href: "/(app)/rapport-hebdo", match: "/rapport-hebdo" },
      { label: "Lessons Learned", href: "/(app)/lessons-learned", match: "/lessons-learned" },
      { label: "Actions annulées", href: "/(app)/actions-annulees", match: "/actions-annulees" },
      { label: "Tour Usine", href: "/(app)/tour-usine", match: "/tour-usine" },
    ],
  },
];

export function DrawerContent(props: DrawerContentComponentProps) {
  const router = useRouter();
  const path = usePathname();

  const handlePress = (href: string) => {
    // Blur any focused element first (web accessibility)
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const active = document.activeElement as HTMLElement | null;
      if (active && typeof active.blur === "function") active.blur();
    }

    // Navigate FIRST — let expo-router handle it synchronously
    router.push(href as never);

    // Close the drawer AFTER a tiny delay so the tap isn't lost
    setTimeout(() => {
      try {
        props.navigation.closeDrawer();
      } catch {}
    }, 50);
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.wrap}
      keyboardShouldPersistTaps="always"
      showsVerticalScrollIndicator
      // Critical: don't let the ScrollView steal the tap from Pressables
      onStartShouldSetResponder={() => false}
      onMoveShouldSetResponder={() => false}
    >
      <Text style={styles.brand}>PDCA</Text>
      <Text style={styles.brandSub}>Gestion industrielle</Text>

      {SECTIONS.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.items.map((item) => {
            const active = path.startsWith(item.match);
            return (
              <Pressable
                key={item.href}
                // onPressIn fires before the scroll can cancel the gesture
                onPressIn={() => handlePress(item.href)}
                style={({ pressed }) => [
                  styles.item,
                  active && styles.itemActive,
                  pressed && styles.itemPressed,
                ]}
                android_ripple={{ color: "#00000022", borderless: false }}
                accessibilityRole="button"
                accessibilityLabel={item.label}
              >
                <Text
                  style={[styles.itemTxt, active && styles.itemTxtActive]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.surface },
  wrap: { paddingHorizontal: 0, paddingBottom: 40 },
  brand: {
    fontSize: 24,
    fontWeight: "800",
    color: theme.colors.primary,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  brandSub: {
    fontSize: 12,
    color: theme.colors.textMuted,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  section: { marginBottom: 4 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textMuted,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  item: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 48,
    justifyContent: "center",
  },
  itemPressed: {
    backgroundColor: "#eef2f7",
  },
  itemActive: {
    backgroundColor: theme.colors.primary + "15",
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  itemTxt: { fontSize: 14, color: theme.colors.text },
  itemTxtActive: { color: theme.colors.primary, fontWeight: "700" },
});
