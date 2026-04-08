import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Text, View, StyleSheet } from "react-native";
import { supabase } from "@/lib/supabase";
import { VFLSplash } from "@/components/VFLSplash";

export default function AuthCallbackScreen() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Supabase automatically reads the access_token / code from the URL hash
    // when getSession() is called — just wait for it to settle then navigate.
    const handle = async () => {
      try {
        // Give Supabase a tick to parse the URL hash
        await new Promise(r => setTimeout(r, 500));
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.replace("/(tabs)");
        } else {
          // Session not set — could mean link expired or already used
          setError("Link expired or already used. Please sign in.");
          setTimeout(() => router.replace("/auth/login"), 3000);
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
