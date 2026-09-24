import { createClient } from "npm:@supabase/supabase-js@2.45.0";

// ── CORS headers ────────────────────────────────────────
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function generatePassword(): string {
  // 14 chars, évite les caractères ambigus (0/O, 1/l/I)
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  let out = "";
  for (let i = 0; i < 14; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}

Deno.serve(async (req) => {
  // ── Handle CORS preflight ─────────────────────────────
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ error: "Méthode non autorisée." }, 405);
  }

  try {
    // 1. Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Authentification manquante." }, 401);
    }
    const userJwt = authHeader.substring(7);

    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anonKey || !serviceKey) {
      return json({ error: "Env manquant." }, 500);
    }

    // 2. Vérifier le caller avec son JWT
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${userJwt}` } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const caller = userData?.user;
    if (!caller) {
      return json({ error: "Token invalide." }, 401);
    }

    // 3. Vérifier que le caller est admin
    const admin = createClient(url, serviceKey);
    const { data: callerProfile } = await admin
      .from("profiles")
      .select("company_id, is_admin")
      .eq("id", caller.id)
      .single();

    if (!callerProfile || !callerProfile.is_admin) {
      return json({ error: "Réservé aux administrateurs." }, 403);
    }
    if (!callerProfile.company_id) {
      return json({ error: "Aucune entreprise associée." }, 400);
    }

    // 4. Parser le body
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const fullName = String(body.full_name ?? "").trim();
    const role = String(body.role ?? "user").trim() || "user";
    const isAdmin = body.is_admin === true;

    if (!email || !fullName) {
      return json({ error: "Email et nom requis." }, 400);
    }

    // 5. Générer mot de passe
    const tempPassword = generatePassword();

    // 6. Créer le user avec company_id dans les metadata
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role,
        company_id: callerProfile.company_id,
      },
    });

    if (createErr) {
      const msg = (createErr.message ?? "").toLowerCase();
      if (
        msg.includes("already") ||
        msg.includes("exists") ||
        msg.includes("duplicate")
      ) {
        return json({ error: "Cet email est déjà utilisé." }, 409);
      }
      return json({ error: createErr.message ?? "Erreur." }, 500);
    }
    if (!created.user) {
      return json({ error: "Création échouée." }, 500);
    }

    // 7. S'assurer que le profil a bien les bonnes valeurs
    const { error: profErr } = await admin
      .from("profiles")
      .update({
        company_id: callerProfile.company_id,
        role,
        is_admin: isAdmin,
        active: true,
      })
      .eq("id", created.user.id);

    if (profErr) {
      return json({ error: `Profil : ${profErr.message}` }, 500);
    }

    // 8. Retour
    return json({
      id: created.user.id,
      email: created.user.email,
      temp_password: tempPassword,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 500);
  }
});
