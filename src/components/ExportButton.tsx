import React, { useState } from "react";
import { Button } from "@/components/Button";
import { useUI } from "@/ui/UIProvider";
import { exportCsv, CsvExport } from "@/services/exportService";

interface Props {
  label?: string;
  filename: string;
  headers: string[];
  rows: () => (string | number | null | undefined)[][];
}

export function ExportButton({ label, filename, headers, rows }: Props) {
  const { toast } = useUI();
  const [busy, setBusy] = useState(false);

  const onPress = async () => {
    try {
      setBusy(true);
      const data = rows();
      if (data.length === 0) {
        toast.info("Aucune donnée à exporter");
        return;
      }
      await exportCsv({ filename, headers, rows: data });
      toast.success("Export généré");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec de l'export");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      label={label ?? "📊 Exporter Excel"}
      variant="secondary"
      onPress={onPress}
      loading={busy}
    />
  );
}
