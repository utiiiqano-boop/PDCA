import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

const T = {
  fr: {
    title: "Actions en retard",
    body: (n: number) => `${n} action(s) en retard vous sont assignées.`,
  },
  en: {
    title: "Overdue actions",
    body: (n: number) => `${n} overdue action(s) assigned to you.`,
  },
  ar: {
    title: "إجراءات متأخرة",
    body: (n: number) => `${n} إجراء متأخر مُسند إليك.`,
  },
} as const;

type Lang = keyof typeof T;
const langOf = (l: unknown): Lang =>
  l === "en" || l === "ar" ? l : "fr";

Deno.serve(async () => {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) {
      return new Response(
        JSON.stringify({ error: "Missing env" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(url, key);

    const today = new Date().toISOString().slice(0, 10);
    const { data: overdue, error } = await supabase
      .from("pdca_actions")
      .select("id, pilot_id, pilot_name, action, due_date, pdca_id, company_id")
      .lt("due_date", today)
      .not("status", "in", "(COMPLETED,CANCELLED)");

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { "Content-Type": "application/json" },
      });
    }

    if (!overdue || overdue.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: "no overdue" }), {
        status: 200, headers: { "Content-Type": "application/json" },
      });
    }

    // Group by pilot_id (fallback to company_id + pilot_name string)
    const byKey = new Map<string, { ids: string[]; count: number }>();
    for (const a of overdue) {
      const key = a.pilot_id
        ? `id:${a.pilot_id}`
        : `name:${a.company_id}:${a.pilot_name || "—"}`;
      const entry = byKey.get(key) ?? { ids: [], count: 0 };
      entry.ids.push(a.id);
      entry.count += 1;
      byKey.set(key, entry);
    }

    // Load profiles (by id)
    const idsFromPilotId = [...byKey.keys()]
      .filter((k) => k.startsWith("id:"))
      .map((k) => k.slice(3));

    const byPilotIdProfile = new Map<string, { full_name: string; role: string; company_id: string; token: string; language: string | null }>();
    if (idsFromPilotId.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, role, company_id, expo_push_token, language")
        .in("id", idsFromPilotId)
        .not("expo_push_token", "is", null);
      for (const p of (profs ?? []) as Array<{
        id: string; full_name: string; role: string; company_id: string; expo_push_token: string; language: string | null;
      }>) {
        byPilotIdProfile.set(p.id, {
          full_name: p.full_name,
          role: p.role,
          company_id: p.company_id,
          token: p.expo_push_token,
          language: p.language,
        });
      }
    }

    // Load profiles (fallback by name)
    const { data: allProfs } = await supabase
      .from("profiles")
      .select("full_name, role, company_id, expo_push_token, language")
      .not("expo_push_token", "is", null);

    const messages: Array<{
      to: string;
      sound: string;
      title: string;
      body: string;
      data: Record<string, unknown>;
    }> = [];

    for (const [key, info] of byKey.entries()) {
      if (key.startsWith("id:")) {
        const pid = key.slice(3);
        const prof = byPilotIdProfile.get(pid);
        if (!prof) continue;
        const tt = T[langOf(prof.language)];
        messages.push({
          to: prof.token,
          sound: "default",
          title: tt.title,
          body: tt.body(info.count),
          data: { type: "overdue", count: info.count },
        });
      } else {
        // Fallback: name + company match
        const parts = key.split(":");
        const companyId = parts[1];
        const pilotName = parts.slice(2).join(":");
        const matches = (allProfs ?? []).filter(
          (p) =>
            p.company_id === companyId &&
            (p.full_name === pilotName || p.role === pilotName) &&
            p.expo_push_token,
        );
        for (const p of matches) {
          const tt = T[langOf(p.language)];
          messages.push({
            to: p.expo_push_token,
            sound: "default",
            title: tt.title,
            body: tt.body(info.count),
            data: { type: "overdue", count: info.count },
          });
        }
      }
    }

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, reason: "no matching recipient" }),
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
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
});
