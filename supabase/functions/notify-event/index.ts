import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

Deno.serve(async (req) => {
  try {
    const { notification_id } = await req.json();
    if (!notification_id) {
      return new Response(
        JSON.stringify({ error: "notification_id missing" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) {
      return new Response(
        JSON.stringify({ error: "missing env" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
    const supabase = createClient(url, key);

    // 1. Load notification
    const { data: notif, error: nErr } = await supabase
      .from("notifications")
      .select("*")
      .eq("id", notification_id)
      .single();
    if (nErr || !notif) {
      return new Response(JSON.stringify({ error: nErr?.message ?? "not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Load tokens of the SAME COMPANY only, except the actor
    let query = supabase
      .from("profiles")
      .select("id, expo_push_token")
      .eq("company_id", notif.company_id)         // ← FILTRE ENTREPRISE
      .not("expo_push_token", "is", null);

    if (notif.actor_id) {
      query = query.neq("id", notif.actor_id);
    }

    const { data: profiles, error: pErr } = await query;
    if (pErr) {
      return new Response(JSON.stringify({ error: pErr.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const messages = (profiles ?? [])
      .filter((p) => p.expo_push_token)
      .map((p) => ({
        to: p.expo_push_token,
        sound: "default",
        title: notif.title,
        body: notif.body,
        data: {
          type: notif.event_type,
          notificationId: notif.id,
          pdcaId: notif.pdca_id,
          actionId: notif.action_id,
        },
      }));

    if (messages.length === 0) {
      await supabase
        .from("notifications")
        .update({
          dispatched_at: new Date().toISOString(),
          dispatch_note: "no recipients in same company",
        })
        .eq("id", notification_id);
      return new Response(
        JSON.stringify({ sent: 0, reason: "no recipients in same company" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // 3. Send via Expo Push API
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
    });
    const json = await res.json();

    await supabase
      .from("notifications")
      .update({
        dispatched_at: new Date().toISOString(),
        dispatch_note: JSON.stringify(json).slice(0, 500),
      })
      .eq("id", notification_id);

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
