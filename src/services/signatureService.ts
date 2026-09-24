import { supabase } from "@/lib/supabase";
import type { ActionSignatureRow, SignaturePoint } from "@/types/database";

export async function getActionSignature(
  actionId: string,
): Promise<ActionSignatureRow | null> {
  const { data, error } = await supabase
    .from("action_signatures")
    .select("*")
    .eq("action_id", actionId)
    .maybeSingle();
  if (error) throw error;
  return (data as ActionSignatureRow | null) ?? null;
}

export async function saveActionSignature(
  actionId: string,
  paths: SignaturePoint[][],
  signerName: string,
  userId: string,
): Promise<void> {
  if (paths.length === 0) throw new Error("Signature vide.");

  const { error } = await supabase
    .from("action_signatures")
    .upsert(
      {
        action_id: actionId,
        signed_by: userId,
        signer_name: signerName,
        signature_paths: paths as unknown as never,
      },
      { onConflict: "action_id" },
    );
  if (error) throw error;
}
