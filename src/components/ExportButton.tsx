import React, { useState } from "react";
import { Button } from "@/components/Button";
import { useUI } from "@/ui/UIProvider";
import { useTranslation } from "@/i18n/I18nProvider";
import { exportCsv, CsvExport } from "@/services/exportService";

interface Props {
  label?: string;
  filename: string;
  headers: string[];
  rows: () => (string | number | null | undefined)[][];
}

export function ExportButton({ label, filename, headers, rows }: Props) {
  const { toast } = useUI();
  const { t: tr } = useTranslation();
  const [busy, setBusy] = useState(false);

  const onPress = async () => {
    try {
      setBusy(true);
      const data = rows();
      if (data.length === 0) {
        toast.info(tr("export.noData"));
        return;
      }
      await exportCsv({ filename, headers, rows: data });
      toast.success(tr("export.generated"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("export.failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      label={label ?? tr("export.excel")}
      variant="secondary"
      onPress={onPress}
      loading={busy}
    />
  );
}
