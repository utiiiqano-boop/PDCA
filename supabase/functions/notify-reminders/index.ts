import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

// Translations per language for each reminder bucket
const T = {
  fr: {
    d3: {
      title: "Échéance dans 3 jours",
      body: (n: number) => `${n} action(s) à échéance dans 3 jours`,
    },
    d2: {
      title: "Échéance dans 2 jours",
      body: (n: number) => `${n} action(s) à échéance dans 2 jours`,
    },
    d1: {
      title: "Échéance demain",
      body: (n: number) => `${n} action(s) à échéance demain`,
    },
  },
  en: {
    d3: {
      title: "Due in 3 days",
      body: (n: number) => `${n} action(s) due in 3 days`,
    },
    d2: {
      title: "Due in 2 days",
      body: (n: number) => `${n} action(s) due in 2 days`,
    },
    d1: {
      title: "Due tomorrow",
      body: (n: number) => `${n} action(s) due tomorrow`,
    },
  },
  ar: {
    d3: {
      title: "الاستحقاق بعد 3 أيام",
      body: (n: number) => `${n} إجراء(ات) مستحقة بعد 3 أيام`,
    },
    d2: {
      title: "الاستحقاق بعد يومين",
      body: (n: number) => `${n} إجراء(ات) مستحقة بعد يومين`,
    },
    d1: {
      title: "الاستحقاق غداً",
      body: (n: number) => `${n} إجراء(ات) مستحقة غداً`,
    },
  },
} as const;

type Lang = keyof typeof T;
type Bucket = "d3" | "d2" | "d1";

const langOf = (l: unknown): Lang => (l === "en" || l === "ar" ? l : "fr");

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

Deno.serve(async () => {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) {
      return new Response(JSON.stringify({ error: "Missing env" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(url, key);

    const today = new Date();
    const buckets: Record<Bucket, string> = {
      d3: isoDate(addDays(today, 3)),
      d2: isoDate(addDays(today, 2)),
      d1: isoDate(addDays(today, 1)),
    };

    // 1. Load actions with due_date in {today+3, today+2, today+1} and not closed
    const { data: actions, error } = await supabase
      .from("pdca_actions")
      .select("id, pilot_id, pilot_name, action, due_date, pdca_id, company_id")
      .in("due_date", [buckets.d3, buckets.d2, buckets.d1])
      .not("status", "in", "(COMPLETED,CANCELLED)");

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!actions || actions.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, reason: "no actions in reminder window" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

// 2. Resolve profiles by pilot_name (pilot_id is a company_pilots.id, not profiles.id)
    const { data: allProfs } = await supabase
      .from("profiles")
      .select("id, full_name, role, company_id, expo_push_token, language")
      .not("expo_push_token", "is", null);

    // 3. Group by (bucket, profile_id) — resolve via name first, fallback to company
    const bucketsByProfile = new Map<
      string,
      { profileId: string; bucket: Bucket; count: number }
    >();

    for (const a of actions) {
      const bucket: Bucket =
        a.due_date === buckets.d3 ? "d3" : a.due_date === buckets.d2 ? "d2" : "d1";

      // Find matching profile within the same company
      const matches = (allProfs ?? []).filter(
        (p) =>
          p.company_id === a.company_id &&
          (p.full_name === a.pilot_name || p.role === a.pilot_name),
      );

      for (const m of matches) {
        const key = `${bucket}::${m.id}`;
        const existing = bucketsByProfile.get(key);
        if (existing) existing.count += 1;
        else bucketsByProfile.set(key, { profileId: m.id, bucket, count: 1 });
      }
    }

    const messages: Array<{
      to: string;
      sound: string;
      title: string;
      body: string;
      data: Record<string, unknown>;
    }> = [];

    for (const g of bucketsByProfile.values()) {
      const prof = (allProfs ?? []).find((p) => p.id === g.profileId);
      if (!prof || !prof.expo_push_token) continue;
      const tt = T[langOf(prof.language)][g.bucket];
      messages.push({
        to: prof.expo_push_token,
        sound: "default",
        title: tt.title,
        body: tt.body(g.count),
        data: { type: "reminder", bucket: g.bucket, count: g.count },
      });
    }

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, reason: "no matching recipients" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // 4. Send
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
    });
    const json = await res.json();

    return new Response(
      JSON.stringify({ sent: messages.length, buckets: buckets, expo: json }),
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
