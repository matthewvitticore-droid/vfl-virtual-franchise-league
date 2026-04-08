import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Text, View, StyleSheet } from "react-native";
import { supabase } from "@/lib/supabase";
import { VFLSplash } from "@/components/VFLSplash";

export default function AuthCallbackScreen() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handle = async () => {
      try {
        // Give Supabase a tick to parse the URL hash
        await new Promise(r => setTimeout(r, 500));
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          setError("Link expired or already used. Please sign in.");
          setTimeout(() => router.replace("/auth/login"), 3000);
          return;
        }

        // Check if this user already has a franchise set up (solo or co-gm)
        const [seasonRaw, gmMode] = await Promise.all([
          AsyncStorage.getItem("vfl_season_v1"),
          AsyncStorage.getItem("vfl_gm_mode"),
        ]);

        const hasSoloFranchise = !!(seasonRaw || gmMode);

        // Also check if there's a cloud (Co-GM) membership via Supabase
        const { data: membershipRows } = await supabase
          .from("franchise_members")
          .select("id")
          .eq("user_id", session.user.id)
          .limit(1);

        const hasCloudFranchise = !!(membershipRows && membershipRows.length > 0);

        if (hasSoloFranchise || hasCloudFranchise) {
          router.replace("/(tabs)");
        } else {
          // Brand new user — send them to franchise type selector
          router.replace("/franchise");
        }
      } catch {
        setError("Something went wrong. Redirecting to sign in…");
        setTimeout(() => router.replace("/auth/login"), 3000);
      }
    };
    handle();
  }, []);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.msg}>{error}</Text>
      </View>
    );
  }

  return <VFLSplash />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#07182E" },
  msg:    { color: "#aaa", fontSize: 14, textAlign: "center", paddingHorizontal: 32 },
});
