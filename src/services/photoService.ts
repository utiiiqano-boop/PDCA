import { supabase } from "@/lib/supabase";

export interface ActionPhoto {
  id: string;
  action_id: string;
  company_id: string | null;
  storage_path: string;
  caption: string | null;
  uploaded_by: string | null;
  created_at: string;
  // Computed client-side
  signed_url?: string;
}

/**
 * Upload a photo for an action.
 * `localUri` can be a data: URL (web) or file:// (mobile).
 */
export async function uploadActionPhoto(
  actionId: string,
  localUri: string,
  userId: string,
  caption?: string,
): Promise<ActionPhoto> {
  // Detect mime + ext
  let mime = "image/jpeg";
  let ext = "jpg";
  if (localUri.startsWith("data:")) {
    const match = localUri.match(/^data:([^;]+);/);
    if (match?.[1]) {
      mime = match[1];
      if (mime.includes("png")) ext = "png";
      else if (mime.includes("webp")) ext = "webp";
    }
  } else if (localUri.toLowerCase().endsWith(".png")) {
    mime = "image/png";
    ext = "png";
  } else if (localUri.toLowerCase().endsWith(".webp")) {
    mime = "image/webp";
    ext = "webp";
  }

  // Get the company_id from the current profile (needed for path)
  const { data: prof, error: pErr } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", userId)
    .single();
  if (pErr) throw pErr;
  const companyId = (prof as { company_id?: string } | null)?.company_id;
  if (!companyId) throw new Error("Aucune entreprise associée au profil.");

  // Path: <company_id>/<action_id>/<timestamp>.<ext>
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `${companyId}/${actionId}/${filename}`;

  // Fetch + upload
  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();
  const { error: upErr } = await supabase.storage
    .from("action-photos")
    .upload(path, arrayBuffer, { contentType: mime, upsert: false });
  if (upErr) throw upErr;

  // DB row
  const { data, error } = await supabase
    .from("action_photos")
    .insert({
      action_id: actionId,
      company_id: companyId,
      storage_path: path,
      caption: caption?.trim() || null,
      uploaded_by: userId,
    })
    .select("*")
    .single();
  if (error) throw error;

  // Signed URL
  const { data: signed } = await supabase.storage
    .from("action-photos")
    .createSignedUrl(path, 60 * 60 * 24 * 365);

  return {
    ...(data as ActionPhoto),
    signed_url: signed?.signedUrl ?? undefined,
  };
}

export async function listPhotosForAction(actionId: string): Promise<ActionPhoto[]> {
  const { data, error } = await supabase
    .from("action_photos")
    .select("*")
    .eq("action_id", actionId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as ActionPhoto[];
  if (rows.length === 0) return [];

  // Generate signed URLs in one batch
  const paths = rows.map((r) => r.storage_path);
  const { data: signed, error: sErr } = await supabase.storage
    .from("action-photos")
    .createSignedUrls(paths, 60 * 60 * 24 * 365);
  if (sErr) {
    // Fallback: no urls
    return rows;
  }
  const urlByPath = new Map(
    (signed ?? []).map((s) => [s.path, s.signedUrl]),
  );
  return rows.map((r) => ({ ...r, signed_url: urlByPath.get(r.storage_path) }));
}

export async function deleteActionPhoto(photo: ActionPhoto): Promise<void> {
  const { error: sErr } = await supabase.storage
    .from("action-photos")
    .remove([photo.storage_path]);
  if (sErr) throw sErr;
  const { error } = await supabase.from("action_photos").delete().eq("id", photo.id);
  if (error) throw error;
}
