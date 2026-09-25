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
import { CreateUserModal } from "@/components/CreateUserModal";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useUI } from "@/ui/UIProvider";
import { useTranslation } from "@/i18n/I18nProvider";
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
  const { t: tr } = useTranslation();

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
  if (!companyId) return <ErrorState message={tr("companyUsers.noCompany")} />;
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const adminCount = users.filter((u) => u.is_admin).length;
  const activeCount = users.filter((u) => u.active).length;

  const handleToggleAdmin = async (user: ProfileRow) => {
    if (user.id === myId) {
      alert({
        title: tr("companyUsers.actionImpossible"),
        message: tr("companyUsers.cantChangeSelf"),
      });
      return;
    }
    if (user.is_admin && adminCount <= 1) {
      alert({
        title: tr("companyUsers.actionImpossible"),
        message: tr("companyUsers.cantRemoveLastAdmin"),
      });
      return;
    }
    const verb = user.is_admin ? "retirer les droits admin de" : "promouvoir admin";
    const ok = await confirm({
      title: "Confirmer",
      message: `Voulez-vous ${verb} ${user.full_name} ?`,
      confirmLabel: user.is_admin ? tr("companyUsers.removeAdmin") : tr("companyUsers.promoteAdmin"),
      destructive: user.is_admin,
    });
    if (!ok) return;
    try {
      setBusyId(user.id);
      await setUserAdmin(user.id, !user.is_admin);
      toast.success(user.is_admin ? tr("companyUsers.adminRemoved") : tr("companyUsers.adminPromoted"));
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
        title: tr("companyUsers.actionImpossible"),
        message: tr("companyUsers.cantDisableSelf"),
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
      toast.success(user.active ? tr("companyUsers.accountDisabled") : tr("companyUsers.accountEnabled"));
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
      confirmLabel: tr("companyUsers.sendEmail"),
    });
    if (!ok) return;
    try {
      setBusyId(user.id);
      await sendPasswordReset(user.email);
      toast.success(tr("companyUsers.resetEmailSent"));
    } catch (e) {
      alert({ title: "Erreur", message: e instanceof Error ? e.message : "Erreur" });
    } finally {
      setBusyId(null);
    }
  };

  const ListHeader = (
    <View>
      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statPill}>
          <View style={[styles.statDot, { backgroundColor: theme.colors.primary }]} />
          <Text style={styles.statTxt}>
            {users.length} membre{users.length > 1 ? "s" : ""}
          </Text>
        </View>
        <View style={styles.statPill}>
          <View style={[styles.statDot, { backgroundColor: theme.colors.success }]} />
          <Text style={styles.statTxt}>{activeCount} actif(s)</Text>
        </View>
        <View style={styles.statPill}>
          <View style={[styles.statDot, { backgroundColor: theme.colors.warning }]} />
          <Text style={styles.statTxt}>
            {adminCount} admin{adminCount > 1 ? "s" : ""}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{tr("companyUsers.title")}</Text>
        <Text style={styles.sub}>
          Gérez les membres et leurs accès à l'application
        </Text>
      </View>

      {/* Add user button */}
      <View style={styles.addWrap}>
        <Button
          label="+ Nouveau compte"
          onPress={() => setShowCreate(true)}
        />
      </View>

      {/* List */}
      {users.length === 0 ? (
        <EmptyState
          title={tr("companyUsers.noUser")}
          subtitle={tr("companyUsers.noUserSub")}
          icon="👥"
        />
      ) : (
        <FlatList<ProfileRow>
          data={users}
          keyExtractor={(it: ProfileRow) => it.id}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
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
                {/* Header: avatar + nom + badges */}
                <View style={styles.userHead}>
                  <View style={[styles.avatar, item.is_admin && styles.avatarAdmin]}>
                    <Text style={styles.avatarTxt}>
                      {(item.full_name || item.email).charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.name} numberOfLines={1}>
                        {item.full_name || tr("companyUsers.noName")}
                      </Text>
                      {isMe ? <Badge label={tr("companyUsers.badgeYou")} tone="primary" /> : null}
                      {item.is_admin ? <Badge label={tr("companyUsers.badgeAdmin")} tone="warning" /> : null}
                      {!item.active ? <Badge label={tr("companyUsers.badgeDisabled")} tone="danger" /> : null}
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

                {/* Actions */}
                <View style={styles.actionsGrid}>
                  <View style={{ flex: 1 }}>
                    <Button
                      label={item.is_admin ? tr("companyUsers.removeAdmin") : tr("companyUsers.promote")}
                      variant="secondary"
                      size="sm"
                      onPress={() => handleToggleAdmin(item)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      label={item.active ? "Désactiver" : "Réactiver"}
                      variant={item.active ? "danger" : "success"}
                      size="sm"
                      onPress={() => handleToggleActive(item)}
                    />
                  </View>
                </View>
                <View style={{ height: theme.spacing(2) }} />
                <Button
                  label={tr("companyUsers.resetPassword")}
                  variant="ghost"
                  size="sm"
                  onPress={() => handleResetPassword(item)}
                />
              </Card>
            );
          }}
        />
      )}

      {/* Create user modal */}
      <CreateUserModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={load}
      />
    </View>
  );
}

function Badge({
  label,
  tone,
}: {
  label: string;
  tone: "primary" | "warning" | "danger";
}) {
  const map = {
    primary: { fg: theme.colors.primary, bg: theme.colors.primarySoft },
    warning: { fg: "#B45309", bg: theme.colors.warningSoft },
    danger: { fg: theme.colors.danger, bg: theme.colors.dangerSoft },
  };
  const c = map[tone];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeTxt, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },

  // ── Header ────────────────────────────────────
  header: {
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
    fontSize: theme.font.size.base,
    color: theme.colors.textMuted,
    marginTop: theme.spacing(1),
    lineHeight: 20,
  },
  addWrap: {
    paddingHorizontal: theme.spacing(4),
    marginBottom: theme.spacing(3),
  },

  // ── Stats row ─────────────────────────────────
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing(4),
    gap: theme.spacing(3),
    marginBottom: theme.spacing(4),
    flexWrap: "wrap",
  },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statTxt: {
    fontSize: theme.font.size.sm,
    color: theme.colors.textMuted,
    fontWeight: theme.font.weight.medium,
  },

  // ── List ──────────────────────────────────────
  listContent: {
    paddingHorizontal: theme.spacing(4),
    paddingBottom: 60,
  },

  // ── Card user ─────────────────────────────────
  cardInactive: {
    opacity: 0.65,
    borderColor: theme.colors.danger,
  },
  userHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing(3),
    marginBottom: theme.spacing(3),
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
  avatarTxt: {
    color: "#fff",
    fontWeight: theme.font.weight.black,
    fontSize: theme.font.size.lg,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  name: {
    fontSize: theme.font.size.md,
    fontWeight: theme.font.weight.bold,
    color: theme.colors.text,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
  },
  badgeTxt: {
    fontSize: 9,
    fontWeight: theme.font.weight.bold,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  email: {
    fontSize: theme.font.size.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing(1),
  },
  role: {
    fontSize: theme.font.size.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
    fontStyle: "italic",
  },

  // ── Actions ───────────────────────────────────
  actionsGrid: {
    flexDirection: "row",
    gap: theme.spacing(2),
  },
});
