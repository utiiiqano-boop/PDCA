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
    // 1) Confirmation — pas de spinner sur la ligne pendant ce temps
    const ok = await confirm({
      title: "Supprimer définitivement ?",
      message: opt
        ? `"${opt.label}" sera retiré de la liste. Si des PDCA l'utilisent, la suppression sera refusée — dans ce cas, désactivez-le plutôt.`
        : "Cette option sera retirée de la liste.",
      confirmLabel: "Supprimer",
      destructive: true,
    });
    if (!ok) return;

    // 2) Maintenant on passe la ligne en mode "loading"
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

  return (
    <View style={{ flex: 1 }}>
      <Card style={{ margin: 12 }}>
        <Text style={styles.cardTitle}>Ajouter une entrée</Text>
        <Input
          label="Libellé"
          value={newLabel}
          onChangeText={setNewLabel}
          placeholder="Ex : Ligne 42"
          onSubmitEditing={handleCreate}
          returnKeyType="done"
        />
        <Button
          label="+ Ajouter"
          onPress={handleCreate}
          loading={creating}
          disabled={!newLabel.trim()}
        />
        <View style={{ height: 8 }} />
        <ImportCsvButton kind={kind} companyId={companyId} onImported={onChanged} />
      </Card>

      <View style={styles.statsRow}>
        <Text style={styles.stats}>
          {activeCount} active(s) • {inactiveCount} désactivée(s)
        </Text>
      </View>

      {sorted.length === 0 ? (
        <EmptyState title="Aucune entrée" subtitle="Ajoutez-en une ci-dessus." />
      ) : (
        <FlatList<CompanyOption>
          data={sorted}
          keyExtractor={(it: CompanyOption) => it.id}
          contentContainerStyle={{ paddingBottom: 40 }}
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
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  statsRow: { paddingHorizontal: 16, paddingBottom: 8 },
  stats: { fontSize: 12, color: theme.colors.textMuted },
});
