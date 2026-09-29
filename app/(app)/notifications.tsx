import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { EmptyState, ErrorState } from "@/components/States";
import { useUI } from "@/ui/UIProvider";
import { supabase } from "@/lib/supabase";
import { theme } from "@/theme";

interface NotifRow {
  id: string;
  event_type: string;
  title: string;
  body: string;
  pdca_id: string | null;
  action_id: string | null;
  created_at: string;
  is_read: boolean;
  read_at: string | null;
}

const EVENT_ICONS: Record<string, string> = {
  ACTION_CREATED: "➕",
  ACTION_UPDATED: "✏️",
  ACTION_COMPLETED: "✅",
  ACTION_CANCELLED: "🚫",
  PDCA_CREATED: "📋",
  PDCA_CANCELLED: "❌",
  PHASE_CHANGED: "🔄",
  PILOT_CHANGED: "👤",
  DUE_DATE_CHANGED: "📅",
  PRIORITY_CHANGED: "⚡",
  reminder: "⏰",
  overdue: "⚠️",
};

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return "À l'instant";
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `Il y a ${Math.floor(diff / 86400)}j`;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export default function NotificationsScreen() {
  const { toast, alert } = useUI();
  const [items, setItems] = useState<NotifRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const { data, error: rpcErr } = await supabase.rpc("rpc_my_notifications", {
        p_limit: 100,
        p_offset: 0,
      });
      if (rpcErr) throw rpcErr;
      const res = data as { ok: boolean; notifications?: NotifRow[] };
      if (!res.ok) throw new Error("Impossible de charger les notifications");
      setItems(res.notifications ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openNotification = async (n: NotifRow) => {
    if (!n.is_read) {
      await supabase.rpc("rpc_mark_notification_read", { p_notification_id: n.id });
      setItems((prev) =>
        prev.map((x) =>
          x.id === n.id ? { ...x, is_read: true, read_at: new Date().toISOString() } : x,
        ),
      );
    }
    if (n.pdca_id) {
      router.push(`/(app)/pdca/${n.pdca_id}` as never);
    }
  };

  const markAllRead = async () => {
    try {
      const { data, error: rpcErr } = await supabase.rpc("rpc_mark_all_notifications_read");
      if (rpcErr) throw rpcErr;
      const res = data as { ok: boolean; marked?: number };
      if (res.ok) {
        toast.success(`${res.marked ?? 0} notification(s) marquée(s) comme lue(s)`);
        await load();
      }
    } catch (e) {
      alert({
        title: "Erreur",
        message: e instanceof Error ? e.message : "Erreur",
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  if (error) return <ErrorState message={error} />;

  const unreadCount = items.filter((n) => !n.is_read).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.sub}>
            {unreadCount > 0
              ? `${unreadCount} non lue(s) · ${items.length} au total`
              : `${items.length} notification(s)`}
          </Text>
        </View>
        {unreadCount > 0 ? (
          <Pressable onPress={markAllRead} style={styles.markAllBtn}>
            <Text style={styles.markAllTxt}>Tout marquer lu</Text>
          </Pressable>
        ) : null}
      </View>

      {/* List */}
      {items.length === 0 ? (
        <EmptyState
          title="Aucune notification"
          subtitle="Vous recevrez ici les alertes liées à vos actions, échéances et PDCAs."
          icon="🔔"
        />
      ) : (
        <FlatList<NotifRow>
          style={{ flex: 1 }}
          contentContainerStyle={styles.listContent}
          data={items}
          keyExtractor={(it) => it.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={null}
          renderItem={({ item }) => {
            const icon = EVENT_ICONS[item.event_type] ?? "🔔";
            return (
              <Pressable onPress={() => openNotification(item)}>
                <Card style={[styles.card, ...(item.is_read ? [] : [styles.cardUnread])]}>
                  <View style={styles.row}>
                    <View
                      style={[styles.iconWrap, ...(item.is_read ? [] : [styles.iconWrapUnread])]}
                    >
                      <Text style={styles.icon}>{icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.headRow}>
                        <Text
                          style={[styles.title_, !item.is_read && styles.titleUnread]}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        {!item.is_read ? <View style={styles.dot} /> : null}
                      </View>
                      <Text style={styles.body} numberOfLines={2}>
                        {item.body}
                      </Text>
                      <Text style={styles.time}>{fmtTime(item.created_at)}</Text>
                    </View>
                  </View>
                </Card>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.bg,
  },
  container: {
    flex: 1,
    height: "100%",
    backgroundColor: theme.colors.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    paddingHorizontal: theme.spacing(4),
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(3),
  },
  title: {
    fontSize: theme.font.size["2xl"],
    fontWeight: theme.font.weight.black,
    color: theme.colors.text,
  },
  sub: {
    fontSize: theme.font.size.sm,
    color: theme.colors.textMuted,
    marginTop: 2,
    fontWeight: theme.font.weight.medium,
  },
  markAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  markAllTxt: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  listContent: {
    paddingHorizontal: theme.spacing(4),
    paddingBottom: 60,
    flexGrow: 1,
  },
  card: {
    marginBottom: theme.spacing(2),
  },
  cardUnread: {
    borderWidth: 1,
    borderColor: theme.colors.primary + "44",
    backgroundColor: theme.colors.primary + "08",
  },
  row: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.neutralSoft,
  },
  iconWrapUnread: {
    backgroundColor: theme.colors.primarySoft,
  },
  icon: { fontSize: 18 },
  headRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title_: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.text,
  },
  titleUnread: {
    color: theme.colors.primary,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  body: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  time: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 6,
    fontWeight: "600",
  },
});
