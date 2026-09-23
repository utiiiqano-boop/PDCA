import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  DrawerContentScrollView,
  DrawerContentComponentProps,
} from "@react-navigation/drawer";
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
    // 1) Navigate FIRST — expo-router handles this synchronously
    router.push(href as never);
    // 2) Close the drawer AFTER — the drawer closes during the transition
    requestAnimationFrame(() => {
      props.navigation.closeDrawer();
    });
  };

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={styles.wrap}
      scrollEnabled
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
                onPress={() => handlePress(item.href)}
                style={[styles.item, active && styles.itemActive]}
                android_ripple={{ color: "#00000022" }}
                hitSlop={{ top: 4, bottom: 4 }}
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

      {/* Bottom spacer so last items are always reachable */}
      <View style={{ height: 32 }} />
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 0, paddingBottom: 24 },
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
  section: { marginBottom: 4 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textMuted,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  item: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
    justifyContent: "center",
  },
  itemActive: {
    backgroundColor: theme.colors.primary + "15",
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  itemTxt: { fontSize: 14, color: theme.colors.text },
  itemTxtActive: { color: theme.colors.primary, fontWeight: "700" },
});
