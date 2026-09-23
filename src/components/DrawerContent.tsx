import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  DrawerContentScrollView,
  DrawerContentComponentProps,
} from "@react-navigation/drawer";
import { router, usePathname } from "expo-router";
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
  const path = usePathname();

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.wrap}>
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
                onPress={() => {
                  // Blur any focused element to prevent aria-hidden warnings on web
                  if (typeof document !== "undefined" && document.activeElement) {
                    (document.activeElement as HTMLElement).blur();
                  }
                  props.navigation.closeDrawer();
                  router.push(item.href);
                }}
                style={[styles.item, active && styles.itemActive]}
              >
                <Text style={[styles.itemTxt, active && styles.itemTxtActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 0 },
  brand: {
    fontSize: 24,
    fontWeight: "800",
    color: theme.colors.primary,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  brandSub: {
    fontSize: 12,
    color: theme.colors.textMuted,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  section: { marginBottom: 8 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textMuted,
    paddingHorizontal: 16,
    paddingVertical: 8,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  item: { paddingVertical: 12, paddingHorizontal: 16 },
  itemActive: {
    backgroundColor: theme.colors.primary + "15",
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  itemTxt: { fontSize: 14, color: theme.colors.text },
  itemTxtActive: { color: theme.colors.primary, fontWeight: "700" },
});
