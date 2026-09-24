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
import { Redirect } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useUI } from "@/ui/UIProvider";
import { CreateUserModal } from "@/components/CreateUserModal";
import {
  listCompanyUsers,
  setUserAdmin,
  setUserActive,
  sendPasswordReset,
} from "@/services/companyUsersService";
import type { ProfileRow } from "@/types/database";
import { theme } from "@/theme";

export default function CompanyUsersScreen() {
  const { profile } = useAuth();
  const isAdmin = useIsAdmin();
  const { toast, confirm, alert } = useUI();

  const companyId =
    (profile as { company_id?: string } | null)?.company_id ?? null;
  const myId = profile?.id ?? null;

  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) return;
    try {
      setError(null);
      setUsers(await listCompanyUsers(companyId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }, [companyId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load]),
  );

  if (!isAdmin) return <Redirect href="/(app)/dashboard" />;
  if (!companyId) return <ErrorState message="Aucune entreprise associée." />;
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const adminCount = users.filter((u) => u.is_admin).length;

  const handleToggleAdmin = async (user: ProfileRow) => {
    if (user.id === myId) {
      alert({
        title: "Action impossible",
        message: "Vous ne pouvez pas modifier votre propre statut admin.",
      });
      return;
    }
    if (user.is_admin && adminCount <= 1) {
      alert({
        title: "Action impossible",
        message: "Vous ne pouvez pas retirer le dernier administrateur.",
      });
      return;
    }
    const verb = user.is_admin ? "retirer les droits admin de" : "promouvoir admin";
    const ok = await confirm({
      title: "Confirmer",
      message: `Voulez-vous ${verb} ${user.full_name} ?`,
      confirmLabel: user.is_admin ? "Retirer admin" : "Promouvoir admin",
      destructive: user.is_admin,
    });
    if (!ok) return;
    try {
      setBusyId(user.id);
      await setUserAdmin(user.id, !user.is_admin);
      toast.success(user.is_admin ? "Admin retiré" : "Promu admin");
      await load();
    } catch (e) {
      alert({ title: "Erreur", message: e instanceof Error ? e.message : "Erreur" });
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleActive = async (user: ProfileRow) => {
    if (user.id === myId) {
      alert({
        title: "Action impossible",
        message: "Vous ne pouvez pas désactiver votre propre compte.",
      });
      return;
    }
    const ok = await confirm({
      title: user.active ? "Désactiver ce compte ?" : "Réactiver ce compte ?",
      message: user.active
        ? `${user.full_name} ne pourra plus se connecter à l'application. Ses données sont conservées.`
        : `${user.full_name} pourra de nouveau se connecter.`,
      confirmLabel: user.active ? "Désactiver" : "Réactiver",
      destructive: user.active,
    });
    if (!ok) return;
    try {
      setBusyId(user.id);
      await setUserActive(user.id, !user.active);
      toast.success(user.active ? "Compte désactivé" : "Compte réactivé");
      await load();
    } catch (e) {
      alert({ title: "Erreur", message: e instanceof Error ? e.message : "Erreur" });
    } finally {
      setBusyId(null);
    }
  };

  const handleResetPassword = async (user: ProfileRow) => {
    const ok = await confirm({
      title: "Réinitialiser le mot de passe ?",
      message: `Un email de réinitialisation sera envoyé à ${user.email}.`,
      confirmLabel: "Envoyer l'email",
    });
    if (!ok) return;
    try {
      setBusyId(user.id);
      await sendPasswordReset(user.email);
      toast.success("Email de réinitialisation envoyé");
    } catch (e) {
      alert({ title: "Erreur", message: e instanceof Error ? e.message : "Erreur" });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Utilisateurs</Text>
        <Text style={styles.sub}>
          {users.length} membre(s) • {adminCount} admin(s)
        </Text>
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <Button
          label="+ Nouveau compte"
          onPress={() => setShowCreate(true)}
        />
      </View>

      {users.length === 0 ? (
        <EmptyState title="Aucun utilisateur" />
      ) : (
        <FlatList<ProfileRow>
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          data={users}
          keyExtractor={(it: ProfileRow) => it.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await load();
                setRefreshing(false);
              }}
            />
          }
          renderItem={({ item }: { item: ProfileRow }) => {
            const isMe = item.id === myId;
            const busy = busyId === item.id;
            return (
              <Card style={!item.active ? styles.cardInactive : undefined}>
                <View style={styles.userHead}>
                  <View style={[styles.avatar, item.is_admin && styles.avatarAdmin]}>
                    <Text style={styles.avatarTxt}>
                      {(item.full_name || item.email).charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.name} numberOfLines={1}>
                        {item.full_name || "Sans nom"}
                      </Text>
                      {isMe ? <Text style={styles.badge}>Vous</Text> : null}
                      {item.is_admin ? (
                        <Text style={[styles.badge, styles.badgeAdmin]}>Admin</Text>
                      ) : null}
                      {!item.active ? (
                        <Text style={[styles.badge, styles.badgeInactive]}>
                          Désactivé
                        </Text>
                      ) : null}
                    </View>
                    <Text style={styles.email} numberOfLines={1}>
                      {item.email}
                    </Text>
                    {item.role ? (
                      <Text style={styles.role} numberOfLines={1}>
                        {item.role}
                      </Text>
                    ) : null}
                  </View>
                  {busy ? <ActivityIndicator color={theme.colors.primary} /> : null}
                </View>

                <View style={styles.actions}>
                  <Button
                    label={item.is_admin ? "Retirer admin" : "Promouvoir admin"}
                    variant="secondary"
                    onPress={() => handleToggleAdmin(item)}
                    style={{ flex: 1 }}
                  />
                  <Button
                    label={item.active ? "Désactiver" : "Réactiver"}
                    variant={item.active ? "danger" : "secondary"}
                    onPress={() => handleToggleActive(item)}
                    style={{ flex: 1 }}
                  />
                </View>
                <View style={{ height: 8 }} />
                <Button
                  label="Réinitialiser mot de passe"
                  variant="secondary"
                  onPress={() => handleResetPassword(item)}
                />
              </Card>
            );
          }}
        />
      )}
          <CreateUserModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={load}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  header: { padding: 16, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: "800", color: theme.colors.text },
  sub: { color: theme.colors.textMuted, marginTop: 4 },
  cardInactive: { opacity: 0.7, borderColor: theme.colors.danger },
  userHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.textMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarAdmin: { backgroundColor: theme.colors.primary },
  avatarTxt: { color: "#fff", fontWeight: "800", fontSize: 18 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  name: { fontSize: 15, fontWeight: "800", color: theme.colors.text },
  badge: {
    fontSize: 10,
    fontWeight: "800",
    color: theme.colors.primary,
    backgroundColor: theme.colors.primary + "22",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeAdmin: { color: "#fff", backgroundColor: theme.colors.primary },
  badgeInactive: { color: "#fff", backgroundColor: theme.colors.danger },
  email: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  role: { fontSize: 11, color: theme.colors.textMuted, marginTop: 1, fontStyle: "italic" },
  actions: { flexDirection: "row", gap: 8 },
});
