import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Given a stored logo_url (which may be an expired signed URL),
 * extracts the file path and regenerates a fresh signed URL.
 * Bucket is PRIVATE, so signed URLs are required.
 */
export function useCompanyLogo(companyId: string | null, storedUrl: string | null) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) {
      setUrl(null);
      return;
    }

    (async () => {
      try {
        // Extract bucket path from stored URL
        // e.g. ".../storage/v1/object/sign/company-logos/{id}/logo.png?token=..."
        const match = storedUrl?.match(/company-logos\/([^?]+)/);
        const filePath = match ? match[1] : `${companyId}/logo.png`;

        // Signed URL valid for 1 year
        const { data, error } = await supabase.storage
          .from("company-logos")
          .createSignedUrl(filePath, 60 * 60 * 24 * 365);

        if (error || !data?.signedUrl) {
          console.warn("[company-logo] signed URL failed:", error?.message);
          setUrl(storedUrl ?? null);
          return;
        }
        setUrl(data.signedUrl);
      } catch (e) {
        console.warn("[company-logo] exception:", e);
        setUrl(storedUrl ?? null);
      }
    })();
  }, [companyId, storedUrl]);

  return url;
}
