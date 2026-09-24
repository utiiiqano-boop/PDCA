import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Card } from "@/components/Card";
import { ExportButton } from "@/components/ExportButton";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import { DateField, todayISO } from "@/components/DateField";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { FilterBar, FilterState, defaultFilters } from "@/components/FilterBar";
import {
  FactoryTour,
  TourInsert,
  createTour,
  deleteTour,
  listTours,
} from "@/services/tourService";
import { useAuth } from "@/hooks/useAuth";
import { useUI } from "@/ui/UIProvider";
import { theme } from "@/theme";

const STATUSES = ["PLANNED", "IN_PROGRESS", "DONE", "CANCELLED"];
const STATUS_LABELS: Record<string, string> = {
  PLANNED: "Planifié",
  IN_PROGRESS: "En cours",
  DONE: "Terminé",
  CANCELLED: "Annulé",
};

export default function TourUsineScreen() {
  const { session } = useAuth();
  const { alert, toast } = useUI();
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
      setError(e instanceof Error ? e.message : "Erreur");
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
    const q = filters.search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((t) =>
      `${t.title} ${t.location ?? ""} ${t.description ?? ""}`.toLowerCase().includes(q),
    );
  }, [items, filters.search]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <FilterBar
        value={filters}
        onChange={setFilters}
        showPriority={false}
        showStatus={false}
        placeholder="Rechercher une tournée…"
      />
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <Button label="+ Nouvelle tournée" onPress={() => setShowForm(true)} />
        <View style={{ height: 8 }} />
        <ExportButton
          filename="tour-usine"
          headers={["Titre","Lieu","Date","Statut","Description"]}
          rows={() => filtered.map((r) => [
            r.title,
            r.location ?? "",
            r.tour_date ?? "",
            r.status,
            r.description ?? "",
          ])}
        />
      </View>

      {filtered.length === 0 ? (
        <EmptyState title="Aucune tournée" />
      ) : (
        <FlatList<FactoryTour>
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          data={filtered}
          keyExtractor={(it: FactoryTour) => it.id}
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
          renderItem={({ item }: { item: FactoryTour }) => (
            <Card>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.meta}>
                {item.tour_date ?? "Sans date"} • {item.location ?? "—"} •{" "}
                {STATUS_LABELS[item.status] ?? item.status}
              </Text>
              {item.description ? (
                <Text style={styles.desc}>{item.description}</Text>
              ) : null}
              <View style={{ marginTop: 10 }}>
                <Button
                  label="Supprimer"
                  variant="danger"
                  onPress={async () => {
                    try {
                      await deleteTour(item.id);
                      await load();
                    } catch (e) {
                      alert({ title: "Erreur", message: e instanceof Error ? e.message : "Erreur" });
                    }
                  }}
                />
              </View>
            </Card>
          )}
        />
      )}

      <TourForm
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={async (payload) => {
          if (!session?.user) return;
          try {
            await createTour({ ...payload, created_by: session.user.id });
            setShowForm(false);
            await load();
          } catch (e) {
            alert({ title: "Erreur", message: e instanceof Error ? e.message : "Erreur" });
          }
        }}
      />
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
      alert({ title: "Validation", message: "Titre obligatoire." });
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
      <ScrollView contentContainerStyle={styles.modalBody}>
        <Text style={styles.modalTitle}>Nouvelle tournée</Text>

        <Input label="Titre" value={title} onChangeText={setTitle} required />
        <Input label="Lieu" value={location} onChangeText={setLocation} />
        <Input
          label="Description"
          value={description}
          onChangeText={setDescription}
          multiline
        />
        <DateField label="Date" value={date} onChange={setDate} />
        <Select
          label="Statut"
          value={STATUS_LABELS[status] ?? status}
          options={STATUSES.map((s) => STATUS_LABELS[s] ?? s)}
          onChange={(v) => {
            const key = Object.keys(STATUS_LABELS).find((k) => STATUS_LABELS[k] === v);
            setStatus(key ?? "PLANNED");
          }}
        />

        <View style={{ height: 12 }} />
        <Button label="Enregistrer" onPress={submit} loading={busy} />
        <View style={{ height: 8 }} />
        <Button label="Annuler" variant="secondary" onPress={onClose} />
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: "700", color: theme.colors.text },
  meta: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4 },
  desc: { fontSize: 13, color: theme.colors.text, marginTop: 6 },
  modalBody: { padding: 20, paddingBottom: 60, backgroundColor: theme.colors.bg },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: theme.colors.text,
    marginBottom: 16,
  },
});
