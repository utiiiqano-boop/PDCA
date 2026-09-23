import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

Deno.serve(async () => {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) {
      return new Response(
        JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(url, key);

    const today = new Date().toISOString().slice(0, 10);
    const { data: overdue, error } = await supabase
      .from("pdca_actions")
      .select("id, pilot_name, action, due_date, pdca_id, company_id")
      .lt("due_date", today)
      .not("status", "in", "(COMPLETED,CANCELLED)");

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!overdue || overdue.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: "no overdue" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Group by (company_id + pilot_name) so each company is isolated
    const byKey = new Map<string, typeof overdue>();
    for (const a of overdue) {
      const k = `${a.company_id ?? "none"}::${a.pilot_name ?? "—"}`;
      if (!byKey.has(k)) byKey.set(k, []);
      byKey.get(k)!.push(a);
    }

    // Load all profiles with tokens, once
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("id, full_name, role, company_id, expo_push_token")
      .not("expo_push_token", "is", null);

    if (pErr) {
      return new Response(JSON.stringify({ error: pErr.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const messages: Array<{
      to: string;
      sound: string;
      title: string;
      body: string;
      data: Record<string, unknown>;
    }> = [];

    for (const [key, actions] of byKey.entries()) {
      const [companyId, pilotName] = key.split("::");

      // Find profiles in the SAME COMPANY whose full_name OR role matches the pilot
      const matches = (profiles ?? []).filter(
        (p) =>
          p.company_id === companyId &&
          (p.full_name === pilotName || p.role === pilotName) &&
          p.expo_push_token,
      );

      for (const p of matches) {
        messages.push({
          to: p.expo_push_token,
          sound: "default",
          title: "Actions en retard",
          body: `${actions.length} action(s) en retard vous sont assignées.`,
          data: { type: "overdue", count: actions.length },
        });
      }
    }

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, reason: "no token matched a pilot name" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
    });
    const json = await res.json();

    return new Response(
      JSON.stringify({ sent: messages.length, expo: json }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
