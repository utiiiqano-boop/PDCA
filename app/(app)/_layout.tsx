import React from "react";
import { Drawer } from "expo-router/drawer";
import { Redirect } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { LoadingState } from "@/components/States";
import { DrawerContent } from "@/components/DrawerContent";
import { theme } from "@/theme";

export default function AppLayout() {
  const { session, loading, profile } = useAuth();

  if (loading) return <LoadingState />;
  if (!session) return <Redirect href="/(auth)/login" />;

  // If the user must change password, redirect OUT of the drawer entirely.
  // The target route lives at the root level (app/change-password.tsx),
  // so no Drawer is rendered → no infinite loop.
  if (profile?.must_change_password) {
    return <Redirect href="/change-password" />;
  }

  return (
    <Drawer
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "700" },
        swipeEnabled: false,
        swipeEdgeWidth: 0,
        drawerType: "front",
      }}
    >
      <Drawer.Screen name="dashboard" options={{ title: "Tableau de bord" }} />
      <Drawer.Screen name="company-settings" options={{ title: "Mon entreprise" }} />
      <Drawer.Screen name="company-options/index" options={{ title: "Configuration entreprise" }} />
      <Drawer.Screen name="company-users/index" options={{ title: "Utilisateurs" }} />
      <Drawer.Screen name="pdca/index" options={{ title: "PDCA" }} />
      <Drawer.Screen name="pdca/new" options={{ title: "Nouveau PDCA" }} />
      <Drawer.Screen
        name="pdca/[id]"
        options={{ title: "Détail PDCA", drawerItemStyle: { display: "none" } }}
      />
      <Drawer.Screen
        name="department/[dept]"
        options={{ title: "Département", drawerItemStyle: { display: "none" } }}
      />
      <Drawer.Screen name="pilotes" options={{ title: "Pilotes" }} />
      <Drawer.Screen name="historique" options={{ title: "Historique" }} />
      <Drawer.Screen name="actions-annulees" options={{ title: "Actions annulées" }} />
      <Drawer.Screen name="graphiques" options={{ title: "Graphiques" }} />
      <Drawer.Screen name="rapport-hebdo" options={{ title: "Rapport hebdomadaire" }} />
      <Drawer.Screen name="lessons-learned" options={{ title: "Lessons Learned" }} />
      <Drawer.Screen name="tour-usine" options={{ title: "Tour Usine" }} />
      <Drawer.Screen
        name="placeholder/[slug]"
        options={{ title: "", drawerItemStyle: { display: "none" } }}
      />
    </Drawer>
  );
}
