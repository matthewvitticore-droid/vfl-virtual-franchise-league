import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { VFLLogo } from "@/components/VFLLogo";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { bigGet, bigSet } from "@/utils/bigStorage";
import { supabase } from "@/lib/supabase";

export default function WelcomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, membership } = useAuth();

  const [expanded, setExpanded] = useState<"new" | "load" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSolo, setHasSolo] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("vfl_season_v1").then(v => setHasSolo(!!v));
  }, []);

  const toggle = (section: "new" | "load") => {
    setExpanded(prev => prev === section ? null : section);
    setError(null);
  };

  const loadSolo = async () => {
    const season = await bigGet("vfl_season_v1");
    if (!season) { setError("No solo franchise found on this device."); return; }
    await AsyncStorage.setItem("vfl_gm_mode", "solo");
    router.replace("/(tabs)");
  };

  const loadCoGM = async () => {
    if (!membership) { setError("You're not in a Co-GM franchise yet. Join one first."); return; }
    setLoading(true);
    try {
      const { data } = await supabase
        .from("franchise_state")
        .select("state_json")
        .eq("franchise_id", membership.franchiseId)
        .maybeSingle();
      if (data?.state_json) {
        await bigSet("vfl_season_v1", data.state_json);
        await AsyncStorage.setItem("vfl_gm_mode", "co-gm");
      }
    } catch {}
    setLoading(false);
    router.replace("/(tabs)");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <VFLLogo size="lg" />

        <Text style={[styles.heading, { color: colors.foreground }]}>
          Welcome back to VFL
        </Text>
        <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
          Where stats and stories last.
        </Text>

        <View style={styles.divider} />

        {/* ── NEW FRANCHISE ─────────────────────────────── */}
        <SectionCard
          icon="plus-circle"
          label="NEW FRANCHISE"
          accent={colors.nflBlue}
          expanded={expanded === "new"}
          onToggle={() => toggle("new")}
        >
          <SubOption
            icon="user"
            label="Solo GM"
            desc="All decisions are yours. Your team, your vision."
            accent={colors.nflBlue}
            onPress={() => router.push({ pathname: "/franchise", params: { initialScreen: "solo-team" } })}
          />
          <SubOption
            icon="users"
            label="Co-GM"
            desc="Create a shared franchise and invite a partner to build together."
            accent={colors.nflBlue}
            onPress={() => router.push({ pathname: "/franchise", params: { initialScreen: "create" } })}
          />
        </SectionCard>

        {/* ── LOAD FRANCHISE ────────────────────────────── */}
        <SectionCard
          icon="download"
          label="LOAD FRANCHISE"
          accent={colors.nflGold}
          expanded={expanded === "load"}
          onToggle={() => toggle("load")}
        >
          <SubOption
            icon="smartphone"
            label="Solo (this device)"
            desc={hasSolo ? "Continue your solo franchise where you left off." : "No solo franchise saved on this device."}
            accent={hasSolo ? colors.nflGold : colors.mutedForeground}
            onPress={loadSolo}
            disabled={!hasSolo}
          />
          <SubOption
            icon="cloud"
            label="Co-GM (cloud)"
            desc={membership ? `Resume: ${membership.franchiseName}` : "No Co-GM franchise found for your account."}
            accent={membership ? colors.nflGold : colors.mutedForeground}
            onPress={loadCoGM}
            disabled={!membership}
          />
        </SectionCard>

        {/* ── JOIN FRANCHISE ────────────────────────────── */}
        <TouchableOpacity
          onPress={() => router.push({ pathname: "/franchise", params: { initialScreen: "join" } })}
          style={[styles.joinCard, { backgroundColor: colors.card, borderColor: colors.nflRed + "60" }]}
        >
          <View style={[styles.joinIcon, { backgroundColor: colors.nflRed + "20" }]}>
            <Feather name="link" size={22} color={colors.nflRed} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.joinLabel, { color: colors.nflRed }]}>JOIN FRANCHISE</Text>
            <Text style={[styles.joinDesc, { color: colors.mutedForeground }]}>
              Enter a 6-character code to join your co-GM's franchise.
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>

        {error && (
          <View style={[styles.errorBox, { backgroundColor: colors.nflRed + "18", borderColor: colors.nflRed + "40" }]}>
            <Feather name="alert-circle" size={14} color={colors.nflRed} />
            <Text style={[styles.errorText, { color: colors.nflRed }]}>{error}</Text>
          </View>
        )}

        {loading && <ActivityIndicator color={colors.nflGold} style={{ marginTop: 20 }} size="large" />}
      </ScrollView>
    </View>
  );
}

function SectionCard({
  icon, label, accent, expanded, onToggle, children,
}: {
  icon: string; label: string; accent: string;
  expanded: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: expanded ? accent + "80" : colors.border }]}>
      <TouchableOpacity onPress={onToggle} style={styles.cardHeader}>
        <View style={[styles.cardIcon, { backgroundColor: accent + "20" }]}>
          <Feather name={icon as any} size={20} color={accent} />
        </View>
        <Text style={[styles.cardLabel, { color: expanded ? accent : colors.foreground }]}>{label}</Text>
        <Feather name={expanded ? "chevron-up" : "chevron-down"} size={18} color={colors.mutedForeground} />
      </TouchableOpacity>
      {expanded && (
        <View style={[styles.cardBody, { borderTopColor: colors.border }]}>
          {children}
        </View>
      )}
    </View>
  );
}

function SubOption({
  icon, label, desc, accent, onPress, disabled = false,
}: {
  icon: string; label: string; desc: string; accent: string;
  onPress: () => void; disabled?: boolean;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.subOption, { opacity: disabled ? 0.4 : 1 }]}
    >
      <Feather name={icon as any} size={16} color={accent} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.subLabel, { color: colors.foreground }]}>{label}</Text>
        <Text style={[styles.subDesc, { color: colors.mutedForeground }]}>{desc}</Text>
      </View>
      <Feather name="arrow-right" size={14} color={accent} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 14 },
  heading: { fontSize: 28, fontFamily: "Inter_700Bold", marginTop: 20, letterSpacing: -0.5 },
  tagline: { fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: 4 },
  divider: { height: 1, backgroundColor: "#ffffff18", marginVertical: 4 },

  card: { borderRadius: 16, borderWidth: 1.5, overflow: "hidden" },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  cardIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cardLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  cardBody: { borderTopWidth: 1, paddingHorizontal: 12, paddingBottom: 8 },

  subOption: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 4 },
  subLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  subDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 16 },

  joinCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, borderWidth: 1.5, padding: 16 },
  joinIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  joinLabel: { fontSize: 15, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  joinDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 16 },

  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  errorText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
});
