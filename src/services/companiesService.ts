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
  // 1) Detect mime type (works for data: URLs and file paths)
  let mime = "image/jpeg";
  let ext = "jpg";

  if (localUri.startsWith("data:")) {
    // data:image/png;base64,...   → extract "image/png"
    const match = localUri.match(/^data:([^;]+);/);
    if (match && match[1]) {
      mime = match[1];
      if (mime.includes("png")) ext = "png";
      else if (mime.includes("webp")) ext = "webp";
      else if (mime.includes("jpeg") || mime.includes("jpg")) ext = "jpg";
    }
  } else if (localUri.toLowerCase().endsWith(".png")) {
    mime = "image/png";
    ext = "png";
  } else if (localUri.toLowerCase().endsWith(".webp")) {
    mime = "image/webp";
    ext = "webp";
  }

  // 2) Fetch + ArrayBuffer
  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();

  const path = `${companyId}/logo.${ext}`;

  // 3) Upload
  const { error: upErr } = await supabase.storage
    .from("company-logos")
    .upload(path, arrayBuffer, {
      contentType: mime,
      upsert: true,
    });
  if (upErr) throw upErr;

  // 4) Signed URL valid for 1 year
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
