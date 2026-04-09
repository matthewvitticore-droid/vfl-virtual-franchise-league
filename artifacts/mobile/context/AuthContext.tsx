import { Session, User } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";

export type FranchiseMemberRole = "GM" | "Coach" | "Scout";

export interface FranchiseMembership {
  franchiseId: string;
  franchiseName: string;
  teamId: string;
  joinCode: string;
  role: FranchiseMemberRole;
  displayName: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  membership: FranchiseMembership | null;
  hasSoloSave: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string, displayName: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  createFranchise: (franchiseName: string, teamId: string, role: FranchiseMemberRole, displayName: string) => Promise<{ error: string | null; joinCode: string | null; franchiseId: string | null }>;
  joinFranchise: (joinCode: string, role: FranchiseMemberRole, displayName: string) => Promise<string | null>;
  leaveFranchise: () => Promise<void>;
  refreshMembership: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [membership, setMembership] = useState<FranchiseMembership | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // If Supabase isn't configured, immediately go to offline/unauthenticated state
    if (!SUPABASE_ENABLED) {
      setIsLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchMembership(session.user.id);
      else setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setIsLoading(true); // keep AuthGate on splash until membership resolves
        fetchMembership(session.user.id);
      } else {
        setMembership(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchMembership(userId: string) {
    try {
      const { data, error } = await supabase
        .from("franchise_members")
        .select("franchise_id, role, display_name, franchises(id, name, team_id, join_code)")
        .eq("user_id", userId)
        .maybeSingle();

      if (data && !error) {
        const franchise = data.franchises as any;
        const mem: FranchiseMembership = {
          franchiseId: data.franchise_id,
          franchiseName: franchise?.name ?? "",
          teamId: franchise?.team_id ?? "",
          joinCode: franchise?.join_code ?? "",
          role: data.role as FranchiseMemberRole,
          displayName: data.display_name,
        };
        setMembership(mem);
        // Persist join code and franchise name locally so Meeting Room can
        // show them even before membership fully loads on next app open.
        if (franchise?.join_code) {
          AsyncStorage.setItem("vfl_franchise_code", franchise.join_code).catch(() => {});
          AsyncStorage.setItem("vfl_franchise_name", franchise.name ?? "").catch(() => {});
        }
      } else {
        setMembership(null);
      }
    } catch {
      setMembership(null);
    } finally {
      setIsLoading(false);
    }
  }

  const refreshMembership = async () => {
    if (user) await fetchMembership(user.id);
  };

  const signIn = async (email: string, password: string): Promise<string | null> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error?.message ?? null;
    } catch (e: any) {
      if (e?.message === "AUTH_NOT_CONFIGURED") {
        return "Sign-in is currently unavailable. Please contact the administrator.";
      }
      return "An unexpected error occurred. Please try again.";
    }
  };

  const signUp = async (email: string, password: string, displayName: string): Promise<string | null> => {
    try {
      // Point the confirmation link back to this app, not localhost
      const emailRedirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback`
          : undefined;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName }, emailRedirectTo },
      });
      return error?.message ?? null;
    } catch (e: any) {
      if (e?.message === "AUTH_NOT_CONFIGURED") {
        return "Account creation is currently unavailable. Please contact the administrator.";
      }
      return "An unexpected error occurred. Please try again.";
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setMembership(null);
  };

  const createFranchise = async (
    franchiseName: string,
    teamId: string,
    role: FranchiseMemberRole,
    displayName: string
  ): Promise<{ error: string | null; joinCode: string | null }> => {
    if (!user) return { error: "Not authenticated", joinCode: null };

    const joinCode = generateJoinCode();

    const { data: franchise, error: fErr } = await supabase
      .from("franchises")
      .insert({ name: franchiseName, team_id: teamId, join_code: joinCode, created_by: user.id })
      .select()
      .single();

    if (fErr || !franchise) return { error: fErr?.message ?? "Failed to create franchise", joinCode: null, franchiseId: null };

    const { error: mErr } = await supabase
      .from("franchise_members")
      .insert({ franchise_id: franchise.id, user_id: user.id, display_name: displayName, role });

    if (mErr) return { error: mErr.message, joinCode: null, franchiseId: null };

    await fetchMembership(user.id);
    return { error: null, joinCode, franchiseId: franchise.id };
  };

  const joinFranchise = async (
    joinCode: string,
    role: FranchiseMemberRole,
    displayName: string
  ): Promise<string | null> => {
    if (!user) return "Not authenticated";

    // Find franchise by code
    const { data: franchise, error: fErr } = await supabase
      .from("franchises")
      .select("id")
      .eq("join_code", joinCode.toUpperCase().trim())
      .maybeSingle();

    if (fErr || !franchise) return "Franchise not found. Check your join code.";

    // Check if already a member
    const { data: existing } = await supabase
      .from("franchise_members")
      .select("id")
      .eq("franchise_id", franchise.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) return "You are already a member of this franchise.";

    // Check role availability (only one GM, one Coach)
    if (role !== "Scout") {
      const { data: roleHolder } = await supabase
        .from("franchise_members")
        .select("id")
        .eq("franchise_id", franchise.id)
        .eq("role", role)
        .maybeSingle();
      if (roleHolder) return `The ${role} role is already taken in this franchise.`;
    }

    const { error: mErr } = await supabase
      .from("franchise_members")
      .insert({ franchise_id: franchise.id, user_id: user.id, display_name: displayName, role });

    // 23505 = duplicate key — user is already a member, treat as success
    if (mErr && mErr.code !== "23505") return mErr.message;

    await fetchMembership(user.id);
    return null;
  };

  const leaveFranchise = async () => {
    if (!user || !membership) return;
    await supabase
      .from("franchise_members")
      .delete()
      .eq("franchise_id", membership.franchiseId)
      .eq("user_id", user.id);
    setMembership(null);
  };

  return (
    <AuthContext.Provider value={{
      session, user, membership, isLoading,
      signIn, signUp, signOut,
      createFranchise, joinFranchise, leaveFranchise, refreshMembership,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
