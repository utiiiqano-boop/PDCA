import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { supabase } from "@/lib/supabase";
import { theme } from "@/theme";

export function NotificationBell() {
  const [unread, setUnread] = useState(0);

  const loadCount = useCallback(async () => {
    try {
      const { data } = await supabase.rpc("rpc_unread_notification_count");
      setUnread(typeof data === "number" ? data : 0);
    } catch {
      setUnread(0);
    }
  }, []);

  // Refresh on every screen focus
  useFocusEffect(
    useCallback(() => {
      loadCount();
    }, [loadCount]),
  );

  return (
    <Pressable
      onPress={() => router.push("/(app)/notifications" as never)}
      hitSlop={12}
      style={styles.wrap}
      accessibilityRole="button"
      accessibilityLabel="Notifications"
    >
      <Text style={styles.icon}>🔔</Text>
      {unread > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeTxt}>{unread > 99 ? "99+" : unread}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  icon: { fontSize: 20 },
  badge: {
    position: "absolute",
    top: 6,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: theme.colors.danger,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },
  badgeTxt: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
    lineHeight: 12,
  },
});
