import React, { createContext, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { ProfileRow } from "@/types/database";

interface AuthCtx {
  session: Session | null;
  profile: ProfileRow | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: string,
    companyName: string,
  ) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);

  // ── 1. Subscribe to auth state changes ─────────────────
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // ── 2. Load profile when session changes ────────────────
  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      return;
    }

    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (cancelled) return;

      if (error || !data) {
        setProfile(null);
        return;
      }

      const p = data as ProfileRow;

      // Disabled account → force sign out
      if (p.active === false) {
        await supabase.auth.signOut();
        return;
      }

      setProfile(p);
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  // ── 3. Context value ────────────────────────────────────
  const value: AuthCtx = {
    session,
    profile,
    loading,
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    },
    signUp: async (email, password, fullName, role, companyName) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role,
            company_name: companyName,
          },
        },
      });
      if (error) throw error;
      return { needsConfirmation: !data.session };
    },
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
