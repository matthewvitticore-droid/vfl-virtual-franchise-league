import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import Constants from "expo-constants";
import { Platform } from "react-native";

const extra = Constants.expoConfig?.extra ?? {};
const rawA: string = extra.supabaseUrl || (process.env.EXPO_PUBLIC_SUPABASE_URL ?? "");
const rawB: string = extra.supabaseAnonKey || (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "");

// Auto-correct if the two secrets are accidentally swapped
const supabaseUrl: string  = rawA.startsWith("https://") ? rawA : rawB.startsWith("https://") ? rawB : rawA;
const supabaseAnonKey: string = rawA.startsWith("https://") ? rawB : rawB.startsWith("https://") ? rawA : rawB;

export const SUPABASE_ENABLED =
  supabaseUrl.startsWith("https://") && supabaseAnonKey.length > 0;

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;
  if (!SUPABASE_ENABLED) {
    throw new Error("AUTH_NOT_CONFIGURED");
  }
  _client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: Platform.OS === "web" ? undefined : AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === "web",
    },
  });
  return _client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getClient();
    const value = (client as any)[prop];
    if (typeof value === "function") return value.bind(client);
    return value;
  },
});

export type Database = {
  public: {
    Tables: {
      franchises: {
        Row: {
          id: string;
          name: string;
          team_id: string;
          join_code: string;
          created_at: string;
          created_by: string;
        };
        Insert: Omit<Database["public"]["Tables"]["franchises"]["Row"], "id" | "created_at">;
      };
      franchise_members: {
        Row: {
          id: string;
          franchise_id: string;
          user_id: string;
          display_name: string;
          role: "GM" | "Coach" | "Scout";
          joined_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["franchise_members"]["Row"], "id" | "joined_at">;
      };
      franchise_seasons: {
        Row: {
          id: string;
          franchise_id: string;
          year: number;
          phase: string;
          week: number;
          record: { wins: number; losses: number; ties: number };
          sim_state: any;
          updated_by: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["franchise_seasons"]["Row"], "id" | "updated_at">;
      };
      franchise_proposals: {
        Row: {
          id: string;
          franchise_id: string;
          type: string;
          description: string;
          payload: any;
          status: "pending" | "approved" | "rejected";
          required_votes: number;
          created_by: string;
          created_by_name: string;
          created_at: string;
          resolved_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["franchise_proposals"]["Row"], "id" | "created_at" | "resolved_at">;
      };
      franchise_votes: {
        Row: {
          id: string;
          proposal_id: string;
          franchise_id: string;
          user_id: string;
          vote: "yes" | "no";
          display_name: string;
          voted_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["franchise_votes"]["Row"], "id" | "voted_at">;
      };
    };
  };
};
