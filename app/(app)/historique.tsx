import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { ExportButton } from "@/components/ExportButton";
import {
  listHistory,
  listHistoryFull,
  HistoryEntry,
} from "@/services/pdcaService";
import { useUI } from "@/ui/UIProvider";
import { exportCsv } from "@/services/exportService";
import { theme } from "@/theme";
import { useTranslation } from "@/i18n/I18nProvider";

const EVENT_KEYS: Record<string, string> = {
  PDCA_CREATED: "ePdcaCreated",
  PDCA_CANCELLED: "ePdcaCancelled",
  ACTION_CREATED: "eActionCreated",
  ACTION_UPDATED: "eActionUpdated",
  ACTION_COMPLETED: "eActionCompleted",
  ACTION_CANCELLED: "eActionCancelled",
  PHASE_CHANGED: "ePhaseChanged",
  PILOT_CHANGED: "ePilotChanged",
  DUE_DATE_CHANGED: "eDueDateChanged",
  PRIORITY_CHANGED: "ePriorityChanged",
};
const eventLabel = (tr: (k: string) => string, code: string): string =>
  EVENT_KEYS[code] ? tr("historiqueScreen." + EVENT_KEYS[code]) : code;

const EVENT_COLORS: Record<string, { fg: string; bg: string }> = {
  PDCA_CREATED:     { fg: theme.colors.primary, bg: theme.colors.primarySoft },
  PDCA_CANCELLED:   { fg: theme.colors.danger,  bg: theme.colors.dangerSoft },
  ACTION_CREATED:   { fg: theme.colors.info,    bg: theme.colors.infoSoft },
  ACTION_COMPLETED: { fg: theme.colors.success, bg: theme.colors.successSoft },
  ACTION_CANCELLED: { fg: theme.colors.danger,  bg: theme.colors.dangerSoft },
  PHASE_CHANGED:    { fg: "#B45309",            bg: theme.colors.warningSoft },
  PILOT_CHANGED:    { fg: "#7C3AED",            bg: "#EDE9FE" },
  DUE_DATE_CHANGED: { fg: "#B45309",            bg: theme.colors.warningSoft },
};

const FILTER_KEYS = [
  { key: "ALL", labelKey: "fAll" },
  { key: "ACTION_CREATED", labelKey: "fCreated" },
  { key: "ACTION_COMPLETED", labelKey: "fCompleted" },
  { key: "ACTION_CANCELLED", labelKey: "fCancelled" },
  { key: "PHASE_CHANGED", labelKey: "fPhases" },
  { key: "PILOT_CHANGED", labelKey: "fPilots" },
  { key: "DUE_DATE_CHANGED", labelKey: "fDueDates" },
];

function fmt(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mn = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mn}`;
}

export default function HistoriqueScreen() {
  const { toast, alert } = useUI();
  const { t: tr } = useTranslation();
  const [items, setItems] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("ALL");
  const [exportingFull, setExportingFull] = useState(false);

  const load = async () => {
    try {
      setError(null);
      setItems(await listHistory(500));
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

  const filtered = useMemo(() => {
    if (filter === "ALL") return items;
    return items.filter((h) => h.event_type === filter);
  }, [items, filter]);

  // ── Export complet avec détails ────────────────────────
  const handleExportFull = async () => {
    try {
      setExportingFull(true);
      const full = await listHistoryFull(5000);
      if (full.length === 0) {
        toast.info(tr("export.noData"));
        return;
      }
      await exportCsv({
        filename: "historique-complet",
        headers: [
          tr("historiqueScreen.hId"),
          tr("historiqueScreen.hDateIso"),
          tr("historiqueScreen.hDate"),
          tr("historiqueScreen.hTypeCode"),
          tr("historiqueScreen.hTypeLabel"),
          tr("historiqueScreen.hOldValue"),
          tr("historiqueScreen.hNewValue"),
          tr("historiqueScreen.hComment"),
          tr("historiqueScreen.hPdcaRef"),
          tr("historiqueScreen.hPdcaSubject"),
          tr("historiqueScreen.hAction"),
          tr("historiqueScreen.hUserName"),
          tr("historiqueScreen.hUserEmail"),
        ],
        rows: full.map((h) => [
          h.id,
          h.created_at,
          fmt(h.created_at),
          h.event_type,
          eventLabel(tr, h.event_type),
          h.old_value ?? "",
          h.new_value ?? "",
          h.comment ?? "",
          h.pdca_reference ?? "",
          h.pdca_subject ?? "",
          h.action_text ?? "",
          h.user_name ?? "",
          h.user_email ?? "",
        ]),
      });
      toast.success(`${tr("historiqueScreen.exportDone")} : ${full.length}`);
    } catch (e) {
      alert({
        title: tr("historiqueScreen.exportFailed"),
        message: e instanceof Error ? e.message : "Erreur",
      });
    } finally {
      setExportingFull(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{tr("historiqueScreen.title")}</Text>
        <Text style={styles.sub}>
          {filtered.length} / {items.length} {tr("historiqueScreen.subtitleCount")}
        </Text>
      </View>

      <View style={styles.filtersWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        >
          {FILTER_KEYS.map((f) => {
            const active = filter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>
                  {tr("historiqueScreen." + f.labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.exportWrap}>
        <ExportButton
          label={tr("historiqueScreen.exportView")}
          filename="historique-vue"
          headers={[
            tr("historiqueScreen.hDate"),
            tr("historiqueScreen.hTypeLabel"),
            tr("historiqueScreen.hOldValue"),
            tr("historiqueScreen.hNewValue"),
            tr("historiqueScreen.hComment"),
            tr("historiqueScreen.hPdcaRef"),
          ]}
          rows={() =>
            filtered.map((h) => [
              fmt(h.created_at),
              eventLabel(tr, h.event_type),
              h.old_value ?? "",
              h.new_value ?? "",
              h.comment ?? "",
              h.pdca_reference ?? "",
            ])
          }
        />
        <View style={{ height: theme.spacing(2) }} />
        <Button
          label={tr("historiqueScreen.exportFull")}
          variant="secondary"
          onPress={handleExportFull}
          loading={exportingFull}
        />
        <Text style={styles.exportHint}>
          {tr("historiqueScreen.exportHint")}
        </Text>
      </View>

      {filtered.length === 0 ? (
        <EmptyState
          title={tr("historiqueScreen.empty")}
          subtitle={
            filter === "ALL"
              ? undefined
              : tr("historiqueScreen.emptyFiltered")
          }
        />
      ) : (
        <FlatList<HistoryEntry>
          contentContainerStyle={styles.listContent}
          data={filtered}
          keyExtractor={(it: HistoryEntry) => it.id}
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
          renderItem={({ item }: { item: HistoryEntry }) => {
            const label = eventLabel(tr, item.event_type);
            const colors =
              EVENT_COLORS[item.event_type] ?? {
                fg: theme.colors.primary,
                bg: theme.colors.primarySoft,
              };
            const hasChange =
              Boolean(item.old_value) || Boolean(item.new_value);
            return (
              <Card>
                <View style={styles.eventHeader}>
                  <View
                    style={[styles.badge, { backgroundColor: colors.bg }]}
                  >
                    <Text style={[styles.badgeTxt, { color: colors.fg }]}>
                      {label}
                    </Text>
                  </View>
                  <Text style={styles.date}>{fmt(item.created_at)}</Text>
                </View>

                {hasChange ? (
                  <Text style={styles.change}>
                    {item.old_value ?? "—"} → {item.new_value ?? "—"}
                  </Text>
                ) : null}

                {item.comment ? (
                  <Text style={styles.comment}>« {item.comment} »</Text>
                ) : null}

                {item.pdca_reference ? (
                  <Text style={styles.ref}>{tr("historiqueScreen.pdcaRef")} {item.pdca_reference}</Text>
                ) : null}
              </Card>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  header: {
    paddingHorizontal: theme.spacing(4),
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(2),
  },
  title: {
    fontSize: theme.font.size["2xl"],
    fontWeight: theme.font.weight.black,
    color: theme.colors.text,
  },
  sub: {
    color: theme.colors.textMuted,
    marginTop: theme.spacing(1),
    fontSize: theme.font.size.base,
  },
  filtersWrap: {
    height: 56,
    justifyContent: "center",
  },
  filtersContent: {
    paddingHorizontal: theme.spacing(4),
    gap: theme.spacing(2),
    alignItems: "center",
  },
  chip: {
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(2),
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    height: 36,
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipTxt: {
    fontSize: theme.font.size.sm,
    color: theme.colors.text,
    fontWeight: theme.font.weight.semibold,
  },
  chipTxtActive: { color: "#fff" },
  exportWrap: {
    paddingHorizontal: theme.spacing(4),
    paddingBottom: theme.spacing(3),
  },
  exportHint: {
    fontSize: theme.font.size.xs,
    color: theme.colors.textMuted,
    marginTop: theme.spacing(2),
    fontStyle: "italic",
    textAlign: "center",
  },
  listContent: {
    paddingHorizontal: theme.spacing(4),
    paddingBottom: 60,
  },
  eventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing(3),
  },
  badge: {
    paddingHorizontal: theme.spacing(3),
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
  },
  badgeTxt: {
    fontSize: theme.font.size.xs,
    fontWeight: theme.font.weight.bold,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  date: {
    fontSize: theme.font.size.xs,
    color: theme.colors.textMuted,
    fontWeight: theme.font.weight.medium,
  },
  change: {
    fontSize: theme.font.size.base,
    color: theme.colors.text,
    marginTop: theme.spacing(1),
    fontWeight: theme.font.weight.semibold,
  },
  comment: {
    fontSize: theme.font.size.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing(2),
    fontStyle: "italic",
  },
  ref: {
    fontSize: theme.font.size.xs,
    color: theme.colors.primary,
    marginTop: theme.spacing(2),
    fontWeight: theme.font.weight.semibold,
  },
});
