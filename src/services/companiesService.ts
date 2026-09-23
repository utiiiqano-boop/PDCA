import { supabase } from "@/lib/supabase";

export interface CompanyRow {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export async function getCompany(companyId: string): Promise<CompanyRow | null> {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .maybeSingle();
  if (error) throw error;
  return data as CompanyRow | null;
}

export async function updateCompany(
  companyId: string,
  patch: Partial<Pick<CompanyRow, "name" | "logo_url">>,
): Promise<void> {
  const { error } = await supabase
    .from("companies")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", companyId);
  if (error) throw error;
}

/**
 * Upload a logo image (local file URI from expo-image-picker) and return a
 * signed URL for immediate display.
 */
export async function uploadCompanyLogo(
  companyId: string,
  localUri: string,
): Promise<string> {
  // Convert local file URI → ArrayBuffer
  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();

  // Determine file extension
  const ext = localUri.toLowerCase().endsWith(".png") ? "png" : "jpg";
  const path = `${companyId}/logo.${ext}`;

  const { error: upErr } = await supabase.storage
    .from("company-logos")
    .upload(path, arrayBuffer, {
      contentType: ext === "png" ? "image/png" : "image/jpeg",
      upsert: true,
    });
  if (upErr) throw upErr;

  // Signed URL valid for 1 year
  const { data: signed, error: signErr } = await supabase.storage
    .from("company-logos")
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  if (signErr) throw signErr;

  const url = signed?.signedUrl ?? null;
  if (url) {
    await updateCompany(companyId, { logo_url: url });
  }
  return url ?? "";
}
