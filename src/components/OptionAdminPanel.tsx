import React, { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/States";
import { OptionRowItem } from "@/components/OptionRowItem";
import { ImportCsvButton } from "@/components/ImportCsvButton";
import { useUI } from "@/ui/UIProvider";
import {
  createOption,
  deleteOption,
  enableOption,
  disableOption,
  reorderOptions,
  updateOption,
} from "@/services/companyOptionsService";
import type { CompanyOption, OptionKind } from "@/types/companyOptions";
import { theme } from "@/theme";

interface Props {
  kind: OptionKind;
  companyId: string;
  options: CompanyOption[];
  onChanged: () => Promise<void>;
}

export function OptionAdminPanel({ kind, companyId, options, onChanged }: Props) {
  const { toast, confirm, alert } = useUI();
  const [newLabel, setNewLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...options].sort((a, b) => a.sort_order - b.sort_order),
    [options],
  );

  const handleRename = async (id: string, newLabel: string) => {
    try {
      await updateOption(kind, id, { label: newLabel });
      toast.success("Libellé mis à jour");
      await onChanged();
    } catch (e) {
      alert({
        title: "Erreur",
        message: e instanceof Error ? e.message : "Erreur",
      });
    }
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      if (active) await enableOption(kind, id);
      else await disableOption(kind, id);
      toast.success(active ? "Option réactivée" : "Option désactivée");
      await onChanged();
    } catch (e) {
      alert({
        title: "Erreur",
        message: e instanceof Error ? e.message : "Erreur",
      });
    }
  };

  const handleDelete = async (id: string) => {
    const opt = options.find((o) => o.id === id);
    const ok = await confirm({
      title: "Supprimer définitivement ?",
      message: opt
        ? `"${opt.label}" sera retiré de la liste. Si des PDCA l'utilisent, la suppression sera refusée — dans ce cas, désactivez-le plutôt.`
        : "Cette option sera retirée de la liste.",
      confirmLabel: "Supprimer",
      destructive: true,
    });
    if (!ok) return;

    setDeletingId(id);
    try {
      await deleteOption(kind, id);
      toast.info("Option supprimée");
      await onChanged();
    } catch (e) {
      alert({
        title: "Suppression refusée",
        message: e instanceof Error ? e.message : "Erreur",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleMoveUp = async (id: string) => {
    const idx = sorted.findIndex((o) => o.id === id);
    if (idx <= 0) return;
    const ids = sorted.map((o) => o.id);
    const a = ids[idx - 1];
    const b = ids[idx];
    if (!a || !b) return;
    ids[idx - 1] = b;
    ids[idx] = a;
    try {
      await reorderOptions(kind, ids);
      await onChanged();
    } catch (e) {
      alert({ title: "Erreur", message: e instanceof Error ? e.message : "Erreur" });
    }
  };

  const handleMoveDown = async (id: string) => {
    const idx = sorted.findIndex((o) => o.id === id);
    if (idx < 0 || idx >= sorted.length - 1) return;
    const ids = sorted.map((o) => o.id);
    const a = ids[idx];
    const b = ids[idx + 1];
    if (!a || !b) return;
    ids[idx] = b;
    ids[idx + 1] = a;
    try {
      await reorderOptions(kind, ids);
      await onChanged();
    } catch (e) {
      alert({ title: "Erreur", message: e instanceof Error ? e.message : "Erreur" });
    }
  };

  const handleCreate = async () => {
    const trimmed = newLabel.trim();
    if (!trimmed) return;
    try {
      setCreating(true);
      await createOption(kind, companyId, trimmed);
      setNewLabel("");
      toast.success("Option ajoutée");
      await onChanged();
    } catch (e) {
      alert({ title: "Erreur", message: e instanceof Error ? e.message : "Erreur" });
    } finally {
      setCreating(false);
    }
  };

  const activeCount = options.filter((o) => o.active).length;
  const inactiveCount = options.length - activeCount;

  const ListHeader = (
    <View>
      {/* Add card */}
      <Card style={styles.addCard}>
        <View style={styles.addHeader}>
          <Text style={styles.addTitle}>Ajouter une entrée</Text>
        </View>
        <Input
          label="Libellé"
          value={newLabel}
          onChangeText={setNewLabel}
          placeholder="Ex : Ligne 42"
          onSubmitEditing={handleCreate}
          returnKeyType="done"
          containerStyle={{ marginBottom: theme.spacing(2) }}
        />
        <Button
          label="+ Ajouter"
          onPress={handleCreate}
          loading={creating}
          disabled={!newLabel.trim()}
        />
        <View style={{ height: theme.spacing(2) }} />
        <ImportCsvButton
          kind={kind}
          companyId={companyId}
          onImported={onChanged}
        />
      </Card>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statPill}>
          <View style={[styles.statDot, { backgroundColor: theme.colors.success }]} />
          <Text style={styles.statTxt}>
            {activeCount} active{activeCount > 1 ? "s" : ""}
          </Text>
        </View>
        {inactiveCount > 0 ? (
          <View style={styles.statPill}>
            <View style={[styles.statDot, { backgroundColor: theme.colors.textMuted }]} />
            <Text style={styles.statTxt}>
              {inactiveCount} désactivée{inactiveCount > 1 ? "s" : ""}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );

  if (sorted.length === 0) {
    return (
      <View style={{ flex: 1 }}>
        {ListHeader}
        <EmptyState
          title="Aucune entrée"
          subtitle="Ajoutez votre première entrée ci-dessus."
          icon="📝"
        />
      </View>
    );
  }

  return (
    <FlatList<CompanyOption>
      style={styles.list}
      data={sorted}
      keyExtractor={(it: CompanyOption) => it.id}
      ListHeaderComponent={ListHeader}
      renderItem={({ item, index }: { item: CompanyOption; index: number }) => (
        <OptionRowItem
          option={item}
          isFirst={index === 0}
          isLast={index === sorted.length - 1}
          deleting={deletingId === item.id}
          onRename={handleRename}
          onToggleActive={handleToggleActive}
          onDelete={handleDelete}
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
        />
      )}
      contentContainerStyle={styles.listContent}
      keyboardShouldPersistTaps="handled"
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 80,
  },

  addCard: {
    marginHorizontal: theme.spacing(4),
    marginBottom: theme.spacing(3),
  },
  addHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing(3),
  },
  addTitle: {
    fontSize: theme.font.size.sm,
    fontWeight: theme.font.weight.bold,
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  statsRow: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing(4),
    gap: theme.spacing(3),
    marginBottom: theme.spacing(3),
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
});
