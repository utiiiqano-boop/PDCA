import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import { DateField, todayISO } from "@/components/DateField";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { FilterBar, FilterState, defaultFilters } from "@/components/FilterBar";
import { ExportButton } from "@/components/ExportButton";
import { useAuth } from "@/hooks/useAuth";
import { useUI } from "@/ui/UIProvider";
import {
  FactoryTour,
  TourInsert,
  createTour,
  deleteTour,
  listTours,
} from "@/services/tourService";
import { theme } from "@/theme";
import { useTranslation } from "@/i18n/I18nProvider";

const STATUSES = ["PLANNED", "IN_PROGRESS", "DONE", "CANCELLED"] as const;

const STATUS_KEYS: Record<string, string> = {
  PLANNED: "planned",
  IN_PROGRESS: "inProgress",
  DONE: "done",
  CANCELLED: "cancelled",
};

function statusLabel(tr: (k: string) => string, s: string): string {
  const k = STATUS_KEYS[s];
  return k ? tr("tourUsineScreen.status." + k) : s;
}

const STATUS_COLORS: Record<string, { fg: string; bg: string }> = {
  PLANNED:     { fg: theme.colors.info,    bg: theme.colors.infoSoft },
  IN_PROGRESS: { fg: theme.colors.warning, bg: theme.colors.warningSoft },
  DONE:        { fg: theme.colors.success, bg: theme.colors.successSoft },
  CANCELLED:   { fg: theme.colors.textMuted, bg: theme.colors.neutralSoft },
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return iso;
  }
}

export default function TourUsineScreen() {
  // ── 1. ALL HOOKS FIRST ────────────────────────────────
  const { session } = useAuth();
  const { toast, confirm, alert } = useUI();
  const { t: tr } = useTranslation();

  const [items, setItems] = useState<FactoryTour[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    try {
      setError(null);
      setItems(await listTours());
    } catch (e) {
      setError(e instanceof Error ? e.message : tr("common.error"));
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, []),
  );

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((t) =>
      `${t.title} ${t.location ?? ""} ${t.description ?? ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [items, filters.search]);

  // ── 2. EARLY RETURNS ──────────────────────────────────
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  // ── 3. Stats ──────────────────────────────────────────
  const plannedCount = items.filter((t) => t.status === "PLANNED").length;
  const doneCount = items.filter((t) => t.status === "DONE").length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{tr("tourUsineScreen.title")}</Text>
        <Text style={styles.sub}>
          {tr("tourUsineScreen.subtitle")}
        </Text>
      </View>

      {/* Add */}
      <View style={styles.addWrap}>
        <Button
          label={tr("tourUsineScreen.addBtn")}
          onPress={() => setShowForm(true)}
        />
      </View>

      {/* Export */}
      <View style={styles.exportWrap}>
        <ExportButton
          label={tr("tourUsineScreen.exportBtn")}
          filename="tour-usine"
          headers={[tr("tourUsineScreen.hTitle"), tr("tourUsineScreen.hLocation"), tr("tourUsineScreen.hDate"), tr("tourUsineScreen.hStatus"), tr("tourUsineScreen.hDescription")]}
          rows={() =>
            filtered.map((r) => [
              r.title,
              r.location ?? "",
              r.tour_date ?? "",
              statusLabel(tr, r.status),
              r.description ?? "",
            ])
          }
        />
      </View>

      {/* Search */}
      <FilterBar
        value={filters}
        onChange={setFilters}
        showPriority={false}
        showStatus={false}
        placeholder={tr("tourUsineScreen.searchPh")}
      />

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          title={tr("tourUsineScreen.empty")}
          subtitle={tr("tourUsineScreen.emptySub")}
          icon="🏭"
        />
      ) : (
        <FlatList<FactoryTour>
          data={filtered}
          keyExtractor={(it: FactoryTour) => it.id}
          ListHeaderComponent={
            <View style={styles.statsRow}>
              <View style={styles.statPill}>
                <View
                  style={[
                    styles.statDot,
                    { backgroundColor: theme.colors.info },
                  ]}
                />
                <Text style={styles.statTxt}>
                  {plannedCount} {plannedCount > 1 ? tr("tourUsineScreen.plannedMany") : tr("tourUsineScreen.plannedOne")}
                </Text>
              </View>
              <View style={styles.statPill}>
                <View
                  style={[
                    styles.statDot,
                    { backgroundColor: theme.colors.success },
                  ]}
                />
                <Text style={styles.statTxt}>
                  {doneCount} {doneCount > 1 ? tr("tourUsineScreen.doneMany") : tr("tourUsineScreen.doneOne")}
                </Text>
              </View>
            </View>
          }
          contentContainerStyle={styles.listContent}
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
          renderItem={({ item }: { item: FactoryTour }) => {
            const colors = STATUS_COLORS[item.status] ?? STATUS_COLORS.PLANNED!;
            return (
              <Card>
                {/* Header */}
                <View style={styles.cardHead}>
                  <View style={styles.titleWrap}>
                    <Text style={styles.cardIcon}>🏭</Text>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                  </View>
                  <View
                    style={[styles.statusBadge, { backgroundColor: colors.bg }]}
                  >
                    <Text style={[styles.statusTxt, { color: colors.fg }]}>
                      {statusLabel(tr, item.status)}
                    </Text>
                  </View>
                </View>

                {/* Description */}
                {item.description ? (
                  <Text style={styles.desc} numberOfLines={3}>
                    {item.description}
                  </Text>
                ) : null}

                {/* Meta grid */}
                <View style={styles.metaGrid}>
                  <MetaItem
                    icon="📍"
                    label={tr("tourUsineScreen.fieldLocation")}
                    value={item.location ?? "—"}
                  />
                  <MetaItem
                    icon="📅"
                    label={tr("tourUsineScreen.hDate")}
                    value={fmtDate(item.tour_date)}
                  />
                </View>

                {/* Footer */}
                <View style={styles.cardFooter}>
                  <Text style={styles.createdTxt}>
                    {tr("tourUsineScreen.created")} {fmtDate(item.created_at)}
                  </Text>
                  <Pressable
                    onPress={async () => {
                      const ok = await confirm({
                        title: tr("tourUsineScreen.deleteConfirm"),
                        message: tr("tourUsineScreen.deleteConfirmSub"),
                        confirmLabel: tr("common.delete"),
                        destructive: true,
                      });
                      if (!ok) return;
                      try {
                        await deleteTour(item.id);
                        toast.info(tr("tourUsineScreen.deleted"));
                        await load();
                      } catch (e) {
                        alert({
                          title: tr("common.error"),
                          message: e instanceof Error ? e.message : tr("common.error"),
                        });
                      }
                    }}
                    style={styles.deleteBtn}
                  >
                    <Text style={styles.deleteTxt}>{tr("common.delete")}</Text>
                  </Pressable>
                </View>
              </Card>
            );
          }}
        />
      )}

      {/* Modal */}
      <TourForm
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={async (payload) => {
          if (!session?.user) return;
          try {
            await createTour({ ...payload, created_by: session.user.id });
            setShowForm(false);
            toast.success(tr("tourUsineScreen.created2"));
            await load();
          } catch (e) {
            alert({
              title: tr("common.error"),
              message: e instanceof Error ? e.message : tr("common.error"),
            });
          }
        }}
      />
    </View>
  );
}

function MetaItem({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaIcon}>{icon}</Text>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.metaLabel}>{label}</Text>
        <Text style={styles.metaValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function TourForm({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (payload: Omit<TourInsert, "created_by">) => Promise<void>;
}) {
  const { alert } = useUI();
  const { t: tr } = useTranslation();
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<string | null>(todayISO());
  const [status, setStatus] = useState<string>("PLANNED");
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setTitle("");
    setLocation("");
    setDescription("");
    setDate(todayISO());
    setStatus("PLANNED");
  };

  const submit = async () => {
    if (!title.trim()) {
      alert({ title: tr("tourUsineScreen.validationTitle"), message: tr("tourUsineScreen.titleRequired") });
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        title: title.trim(),
        location: location.trim() || null,
        description: description.trim() || null,
        tour_date: date,
        status,
      });
      reset();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ScrollView
        style={styles.modalRoot}
        contentContainerStyle={styles.modalBody}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.modalTitle}>{tr("tourUsineScreen.modalTitle")}</Text>
        <Text style={styles.modalSub}>
          {tr("tourUsineScreen.modalSub")}
        </Text>

        <Input
          label={tr("tourUsineScreen.fieldTitle")}
          value={title}
          onChangeText={setTitle}
          placeholder={tr("tourUsineScreen.fieldTitlePh")}
          required
        />
        <Input
          label={tr("tourUsineScreen.fieldLocation")}
          value={location}
          onChangeText={setLocation}
          placeholder={tr("tourUsineScreen.fieldLocationPh")}
        />
        <Input
          label={tr("tourUsineScreen.fieldDescription")}
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder={tr("tourUsineScreen.fieldDescriptionPh")}
        />
        <DateField label={tr("tourUsineScreen.fieldDate")} value={date} onChange={setDate} />
        <Select
          label={tr("tourUsineScreen.fieldStatus")}
          value={statusLabel(tr, status)}
          options={STATUSES.map((s) => statusLabel(tr, s))}
          onChange={(v) => {
            const key = STATUSES.find((s) => statusLabel(tr, s) === v);
            setStatus(key ?? "PLANNED");
          }}
        />

        <View style={{ height: theme.spacing(3) }} />
        <Button label={tr("tourUsineScreen.submit")} onPress={submit} loading={busy} />
        <View style={{ height: theme.spacing(2) }} />
        <Button label={tr("common.cancel")} variant="secondary" onPress={onClose} />
      </ScrollView>
    </Modal>
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
  },
  addWrap: {
    paddingHorizontal: theme.spacing(4),
    marginBottom: theme.spacing(2),
  },
  exportWrap: {
    paddingHorizontal: theme.spacing(4),
    marginBottom: theme.spacing(3),
  },

  // ── Stats ─────────────────────────────────────
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing(4),
    gap: theme.spacing(3),
    marginBottom: theme.spacing(4),
    flexWrap: "wrap",
  },
  statPill: { flexDirection: "row", alignItems: "center", gap: 6 },
  statDot: { width: 8, height: 8, borderRadius: 4 },
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

  // ── Card ──────────────────────────────────────
  cardHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: theme.spacing(2),
    marginBottom: theme.spacing(3),
  },
  titleWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing(2),
    minWidth: 0,
  },
  cardIcon: { fontSize: 20 },
  cardTitle: {
    flex: 1,
    fontSize: theme.font.size.md,
    fontWeight: theme.font.weight.bold,
    color: theme.colors.text,
    lineHeight: 22,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing(2),
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
  },
  statusTxt: {
    fontSize: 10,
    fontWeight: theme.font.weight.bold,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  desc: {
    fontSize: theme.font.size.base,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing(3),
  },

  // ── Meta grid ─────────────────────────────────
  metaGrid: {
    flexDirection: "row",
    gap: theme.spacing(3),
    paddingTop: theme.spacing(3),
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  metaItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
  },
  metaIcon: { fontSize: 12 },
  metaLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontWeight: theme.font.weight.bold,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  metaValue: {
    fontSize: theme.font.size.sm,
    color: theme.colors.text,
    fontWeight: theme.font.weight.semibold,
    marginTop: 1,
  },

  // ── Footer ────────────────────────────────────
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: theme.spacing(4),
    paddingTop: theme.spacing(3),
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  createdTxt: {
    fontSize: theme.font.size.xs,
    color: theme.colors.textMuted,
    fontWeight: theme.font.weight.medium,
  },
  deleteBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  deleteTxt: {
    color: theme.colors.danger,
    fontWeight: theme.font.weight.semibold,
    fontSize: theme.font.size.sm,
  },

  // ── Modal ─────────────────────────────────────
  modalRoot: { flex: 1, backgroundColor: theme.colors.bg },
  modalBody: { padding: theme.spacing(5), paddingBottom: 60 },
  modalTitle: {
    fontSize: theme.font.size["2xl"],
    fontWeight: theme.font.weight.black,
    color: theme.colors.text,
  },
  modalSub: {
    fontSize: theme.font.size.base,
    color: theme.colors.textMuted,
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(5),
  },
});
