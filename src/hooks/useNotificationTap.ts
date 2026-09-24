import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { router } from "expo-router";

export function useNotificationTap() {
  const sub = useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    // Web has no push notifications — skip
    if (Platform.OS === "web") return;

    let mounted = true;

    (async () => {
      try {
        const Notifications = await import("expo-notifications");

        // 1. Handle tap while app is running
        sub.current = Notifications.addNotificationResponseReceivedListener((response) => {
          const data = response.notification.request.content.data as {
            pdcaId?: string;
            actionId?: string;
            type?: string;
          };
          if (data?.pdcaId) {
            router.push(`/(app)/pdca/${data.pdcaId}` as never);
          }
        });

        // 2. Handle tap that COLD-STARTED the app
        const last = await Notifications.getLastNotificationResponseAsync();
        if (mounted && last) {
          const data = last.notification.request.content.data as { pdcaId?: string };
          if (data?.pdcaId) {
            // Small delay to let the navigation container mount
            setTimeout(() => {
              router.push(`/(app)/pdca/${data.pdcaId}` as never);
            }, 500);
          }
        }
      } catch (e) {
        console.warn("[notification-tap] setup failed:", e);
      }
    })();

    return () => {
      mounted = false;
      sub.current?.remove();
    };
  }, []);
}
