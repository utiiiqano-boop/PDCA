import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_FAILED_ATTEMPTS = 5;
const WINDOW_MINUTES = 1;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function getClientIp(req: Request): string {
  // Priority order: Supabase headers → X-Forwarded-For → fallback
  const candidates = [
    req.headers.get("x-real-ip"),
    req.headers.get("x-forwarded-for")?.split(",")[0].trim(),
    req.headers.get("cf-connecting-ip"),
    "unknown",
  ];
  for (const c of candidates) {
    if (c && c !== "unknown") return c;
  }
  return "unknown";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    if (req.method !== "POST") {
      return json({ ok: false, reason: "method_not_allowed" }, 405);
    }

    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) {
      return json({ ok: false, reason: "server_misconfigured" }, 500);
    }

    const supabase = createClient(url, key);
    const ip = getClientIp(req);

    // -------- Rate limit check --------
    const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
    const { count: failedCount } = await supabase
      .from("code_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .eq("success", false)
      .gte("attempted_at", since);

    if ((failedCount ?? 0) >= MAX_FAILED_ATTEMPTS) {
      return json(
        {
          ok: false,
          reason: "rate_limited",
          retry_after_seconds: WINDOW_MINUTES * 60,
        },
        429,
      );
    }

    // -------- Validate input --------
    const { code } = await req.json().catch(() => ({ code: null }));
    if (!code || typeof code !== "string") {
      return json({ ok: false, reason: "missing_code" }, 400);
    }

    const cleanCode = code.trim().toUpperCase();

    // -------- Lookup code --------
    const { data, error } = await supabase
      .from("access_codes")
      .select("id, code, customer_name, status")
      .eq("code", cleanCode)
      .maybeSingle();

    if (error) {
      console.error("[validate-code] db error:", error);
      return json({ ok: false, reason: "db_error" }, 500);
    }

    const isInvalid = !data;
    const isBadStatus = data && data.status !== "active" && data.status !== "used";

    if (isInvalid || isBadStatus) {
      // Log failed attempt
      await supabase.from("code_attempts").insert({
        ip,
        code_tried: cleanCode.slice(0, 64),
        success: false,
      });

      if (isInvalid) {
        return json({ ok: false, reason: "invalid_code" }, 200);
      }
      return json({ ok: false, reason: `code_${data!.status}` }, 200);
    }

    // -------- Success: log success, return data --------
    await supabase.from("code_attempts").insert({
      ip,
      code_tried: cleanCode.slice(0, 64),
      success: true,
    });

    // Occasional cleanup (1% chance)
    if (Math.random() < 0.01) {
      supabase.rpc("cleanup_old_code_attempts").catch(() => {});
    }

    return json({
      ok: true,
      code_id: data!.id,
      customer_name: data!.customer_name,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[validate-code] exception:", msg);
    return json({ ok: false, reason: "exception", message: msg }, 500);
  }
});
