import { Platform } from "react-native";

export interface CsvExport {
  filename: string;              // without extension
  headers: string[];
  rows: (string | number | null | undefined)[][];
}

/**
 * Escape a single CSV cell for Excel FR.
 * Excel FR uses ";" as separator, so we quote any cell containing
 * ";", '"', newline, or leading/trailing whitespace.
 */
function escapeCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[";\n\r]/.test(s) || s !== s.trim()) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildCsv(data: CsvExport): string {
  // BOM for Excel to detect UTF-8 (accents)
  const BOM = "\uFEFF";
  const header = data.headers.map(escapeCell).join(";");
  const body = data.rows
    .map((r) => r.map(escapeCell).join(";"))
    .join("\r\n");
  return BOM + header + "\r\n" + body + "\r\n";
}

function safeFilename(name: string): string {
  return name.replace(/[^a-z0-9\-_]/gi, "_").slice(0, 80);
}

function todayTag(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Export a CSV. On web: triggers a browser download.
 * On native: writes to a temp file and opens the share sheet.
 */
export async function exportCsv(data: CsvExport): Promise<void> {
  const csv = buildCsv(data);
  const baseName = `${safeFilename(data.filename)}-${todayTag()}`;

  if (Platform.OS === "web") {
    // Browser download
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseName}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }

  // Native: write file + share (dynamic imports)
  const FileSystemModule = await import("expo-file-system");
  const Sharing = await import("expo-sharing");
  const FileSystem = (FileSystemModule.default ?? FileSystemModule) as any;

  const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!dir) throw new Error("No writable directory available");
  const path = `${dir}${baseName}.csv`;

  await FileSystem.writeAsStringAsync(path, csv, { encoding: "utf8" });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(path, {
      mimeType: "text/csv",
      dialogTitle: `Exporter ${data.filename}`,
      UTI: "public.comma-separated-values-text",
    });
  } else {
    throw new Error("Le partage de fichiers n'est pas disponible");
  }
}
