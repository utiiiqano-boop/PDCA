import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import { PDCAWithActions } from "@/services/pdcaService";
import { CompanyRow } from "@/services/companiesService";

export interface WeeklyReportData {
  company: CompanyRow | null;
  weekStart: string; // DD/MM/YYYY
  weekEnd: string;
  pdcasCreated: number;
  pdcasClosed: number;
  actionsOpen: number;
  actionsOverdue: number;
  actionsCompleted: number;
  topDefects: { label: string; value: number }[];
  topDepartments: { label: string; value: number }[];
  topPilots: { label: string; value: number }[];
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtml(data: WeeklyReportData): string {
  const logo = data.company?.logo_url
    ? `<img src="${data.company.logo_url}" class="logo" />`
    : "";
  const companyName = escapeHtml(data.company?.name ?? "Entreprise");

  const rows = (items: { label: string; value: number }[]) =>
    items.length === 0
      ? `<tr><td colspan="2" class="empty">Aucune donnée</td></tr>`
      : items
          .map(
            (it) =>
              `<tr><td>${escapeHtml(it.label)}</td><td class="right">${it.value}</td></tr>`,
          )
          .join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<style>
  @page { margin: 30px 40px; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; color: #1f2937; font-size: 13px; }
  .header { display: flex; align-items: center; gap: 12px; border-bottom: 3px solid #0f4c81; padding-bottom: 12px; margin-bottom: 20px; }
  .logo { height: 60px; width: 60px; object-fit: contain; border-radius: 8px; }
  .brand { font-size: 22px; font-weight: 800; color: #0f4c81; }
  .subtitle { font-size: 12px; color: #6b7280; margin-top: 2px; }
  h1 { font-size: 20px; margin: 20px 0 6px; color: #0f4c81; }
  .week { font-size: 12px; color: #6b7280; margin-bottom: 20px; }

  .kpis { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 24px; }
  .kpi { flex: 1 0 30%; min-width: 140px; background: #f4f6f8; border: 1px solid #d9dee5; border-radius: 8px; padding: 10px 12px; }
  .kpi .n { font-size: 26px; font-weight: 800; color: #0f4c81; }
  .kpi .l { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.4px; margin-top: 2px; }
  .kpi.danger .n { color: #dc2626; }
  .kpi.success .n { color: #16a34a; }

  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th, td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; text-align: left; font-size: 12px; }
  th { background: #0f4c81; color: white; font-weight: 700; }
  td.right { text-align: right; font-weight: 700; }
  td.empty { text-align: center; color: #9ca3af; font-style: italic; }

  h2 { font-size: 14px; color: #0f4c81; margin: 20px 0 8px; border-bottom: 1px solid #d9dee5; padding-bottom: 4px; }

  .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; text-align: center; }
</style>
</head>
<body>
  <div class="header">
    ${logo}
    <div>
      <div class="brand">${companyName}</div>
      <div class="subtitle">Rapport hebdomadaire PDCA</div>
    </div>
  </div>

  <h1>Rapport hebdomadaire</h1>
  <div class="week">Semaine du ${data.weekStart} au ${data.weekEnd}</div>

  <div class="kpis">
    <div class="kpi"><div class="n">${data.pdcasCreated}</div><div class="l">PDCA créés</div></div>
    <div class="kpi"><div class="n">${data.pdcasClosed}</div><div class="l">PDCA clôturés</div></div>
    <div class="kpi"><div class="n">${data.actionsOpen}</div><div class="l">Actions ouvertes</div></div>
    <div class="kpi danger"><div class="n">${data.actionsOverdue}</div><div class="l">Actions en retard</div></div>
    <div class="kpi success"><div class="n">${data.actionsCompleted}</div><div class="l">Actions terminées</div></div>
  </div>

  <h2>Top défauts</h2>
  <table><thead><tr><th>Défaut</th><th class="right">Nb</th></tr></thead><tbody>${rows(data.topDefects)}</tbody></table>

  <h2>Top départements</h2>
  <table><thead><tr><th>Département</th><th class="right">Nb</th></tr></thead><tbody>${rows(data.topDepartments)}</tbody></table>

  <h2>Top pilotes</h2>
  <table><thead><tr><th>Pilote</th><th class="right">Actions</th></tr></thead><tbody>${rows(data.topPilots)}</tbody></table>

  <div class="footer">
    Généré le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} — PDCA App
  </div>
</body>
</html>`;
}

/**
 * Generate and share (or save) the weekly report as a PDF.
 * On web: triggers a download via the browser.
 * On native: opens the sharing sheet (email, WhatsApp, Drive, ...).
 */
export async function exportWeeklyReport(data: WeeklyReportData): Promise<void> {
  const html = buildHtml(data);

  if (Platform.OS === "web") {
    // Use the browser's print dialog for web
    await Print.printAsync({ html });
    return;
  }

  const { uri } = await Print.printToFileAsync({ html });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: "Partager le rapport hebdomadaire",
      UTI: "com.adobe.pdf",
    });
  }
}

/** Compute the report data from the raw PDCA list. */
export function computeWeeklyReport(
  items: PDCAWithActions[],
  weekStart: Date,
  weekEnd: Date,
  company: CompanyRow | null,
): WeeklyReportData {
  const inRange = (iso: string | null) => {
    if (!iso) return false;
    const t = new Date(iso).getTime();
    return t >= weekStart.getTime() && t < weekEnd.getTime();
  };

  const pdcasCreated = items.filter((p) => inRange(p.created_at)).length;
  const pdcasClosed = items.filter(
    (p) => p.status === "COMPLETED" && inRange(p.updated_at),
  ).length;

  const actions = items.flatMap((p) => p.pdca_actions);
  const open = actions.filter(
    (a) => a.status === "OPEN" || a.status === "IN_PROGRESS",
  ).length;
  const overdue = actions.filter((a) => a.status === "OVERDUE").length;
  const completed = actions.filter((a) => a.status === "COMPLETED").length;

  const topBy = (keyFn: (x: PDCAWithActions) => string | null) => {
    const m = new Map<string, number>();
    for (const x of items) {
      const k = keyFn(x) ?? "—";
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  };

  const pilotsMap = new Map<string, number>();
  for (const a of actions) {
    const k = a.pilot_name || "—";
    pilotsMap.set(k, (pilotsMap.get(k) ?? 0) + 1);
  }
  const topPilots = [...pilotsMap.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

  return {
    company,
    weekStart: fmt(weekStart),
    weekEnd: fmt(new Date(weekEnd.getTime() - 1)), // inclusive end
    pdcasCreated,
    pdcasClosed,
    actionsOpen: open,
    actionsOverdue: overdue,
    actionsCompleted: completed,
    topDefects: topBy((p) => p.defect_type),
    topDepartments: topBy((p) => p.department),
    topPilots,
  };
}
