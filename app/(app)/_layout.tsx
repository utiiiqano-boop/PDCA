import React from "react";
import { Drawer } from "expo-router/drawer";
import { Redirect } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n/I18nProvider";
import { useNotifications } from "@/hooks/useNotifications";
import { useNotificationTap } from "@/hooks/useNotificationTap";
import { LoadingState } from "@/components/States";
import { DrawerContent } from "@/components/DrawerContent";
import { theme } from "@/theme";

export default function AppLayout() {
  const { session, loading, profile } = useAuth();
  const { t: tr, isRTL } = useTranslation();
  useNotifications();
  useNotificationTap();

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
        drawerPosition: isRTL ? "right" : "left",
      }}
    >
      <Drawer.Screen name="dashboard" options={{ title: tr("nav.dashboard") }} />
      <Drawer.Screen name="company-settings" options={{ title: tr("nav.company") }} />
      <Drawer.Screen name="company-options/index" options={{ title: tr("nav.configuration") }} />
      <Drawer.Screen name="company-users/index" options={{ title: tr("nav.users") }} />
      <Drawer.Screen name="pdca/index" options={{ title: tr("nav.pdca") }} />
      <Drawer.Screen name="pdca/new" options={{ title: tr("nav.pdcaForm") }} />
      <Drawer.Screen
        name="pdca/[id]"
        options={{ title: tr("pdcaDetail.title"), drawerItemStyle: { display: "none" } }}
      />
      <Drawer.Screen
        name="department/[dept]"
        options={{ title: tr("nav.department"), drawerItemStyle: { display: "none" } }}
      />
      <Drawer.Screen name="pilotes" options={{ title: tr("nav.pilots") }} />
      <Drawer.Screen name="historique" options={{ title: tr("nav.history") }} />
      <Drawer.Screen name="actions-annulees" options={{ title: tr("nav.cancelled") }} />
      <Drawer.Screen name="graphiques" options={{ title: tr("nav.charts") }} />
      <Drawer.Screen name="rapport-hebdo" options={{ title: tr("nav.weeklyReport") }} />
      <Drawer.Screen name="lessons-learned" options={{ title: tr("nav.lessons") }} />
      <Drawer.Screen name="tour-usine" options={{ title: tr("nav.factoryTour") }} />
      <Drawer.Screen
        name="placeholder/[slug]"
        options={{ title: "", drawerItemStyle: { display: "none" } }}
      />
    </Drawer>
  );
}
