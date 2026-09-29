import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { theme } from "@/theme";

export function NotificationBell() {
  const { count, refresh } = useUnreadCount();

  // Refresh immédiat quand on revient sur un écran
  useFocusEffect(
    React.useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return (
    <Pressable
      onPress={() => router.push("/(app)/notifications" as never)}
      hitSlop={12}
      style={styles.wrap}
      accessibilityRole="button"
      accessibilityLabel={`Notifications${count > 0 ? ` (${count} non lues)` : ""}`}
    >
      <Text style={styles.icon}>🔔</Text>
      {count > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeTxt}>
            {count > 99 ? "99+" : String(count)}
          </Text>
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
    top: 4,
    right: 2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: theme.colors.danger,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  badgeTxt: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 13,
    textAlign: "center",
  },
});
