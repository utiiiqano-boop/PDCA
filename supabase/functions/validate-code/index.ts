import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    if (req.method !== "POST") {
      return json({ ok: false, reason: "method_not_allowed" }, 405);
    }

    const { code } = await req.json().catch(() => ({ code: null }));
    if (!code || typeof code !== "string") {
      return json({ ok: false, reason: "missing_code" }, 400);
    }

    const cleanCode = code.trim().toUpperCase();

    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) {
      return json({ ok: false, reason: "server_misconfigured" }, 500);
    }

    const supabase = createClient(url, key);

    const { data, error } = await supabase
      .from("access_codes")
      .select("id, code, customer_name, status")
      .eq("code", cleanCode)
      .maybeSingle();

    if (error) {
      console.error("[validate-code] db error:", error);
      return json({ ok: false, reason: "db_error" }, 500);
    }

    if (!data) {
      return json({ ok: false, reason: "invalid_code" }, 200);
    }

    if (data.status !== "active" && data.status !== "used") {
      return json({ ok: false, reason: `code_${data.status}` }, 200);
    }

    return json({
      ok: true,
      code_id: data.id,
      customer_name: data.customer_name,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[validate-code] exception:", msg);
    return json({ ok: false, reason: "exception", message: msg }, 500);
  }
});
