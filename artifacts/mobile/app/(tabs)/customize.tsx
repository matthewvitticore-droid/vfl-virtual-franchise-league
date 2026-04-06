/**
 * Customize tab screen.
 *
 * Renders a standalone hub — NO auto-redirect.
 * Using <Redirect> here created a back-navigation loop:
 *   (tabs)/customize → /customize → back → (tabs)/customize → redirect again → stuck
 *
 * Instead this is a proper screen with explicit navigation actions.
 */
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { UniformPreview } from "@/components/UniformPreview";
import { useColors } from "@/hooks/useColors";
import { useTeamTheme } from "@/hooks/useTeamTheme";
import { useNFL } from "@/context/NFLContext";
import type { UniformSet } from "@/context/NFLContext";

const FALLBACK_UNIFORM: UniformSet = {
  helmetColor: "#4F46E5", helmetFacemaskColor: "#C0C6D0",
  helmetChinstrapColor: "#4F46E5", helmetLogoPlacement: "both",
  jerseyStyle: "traditional", jerseyColor: "#4F46E5",
  jerseyAccentColor: "#0D9488", numberFont: "block",
  numberColor: "#FFFFFF", numberOutlineColor: "#0D9488",
  pantColor: "#4F46E5", pantStripeStyle: "single",
  pantStripeColor: "#0D9488", sockColor: "#4F46E5", sockAccentColor: "#0D9488",
};

const KITS = [
  { key: "home",      label: "HOME" },
  { key: "away",      label: "AWAY" },
  { key: "alternate", label: "ALT"  },
] as const;

export default function CustomizeTab() {
  const colors  = useColors();
  const theme   = useTeamTheme();
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const { teamCustomization, saveCustomization } = useNFL();

  const topPad    = Platform.OS === "web" ? 16 : insets.top;
  const activeKit = (teamCustomization?.featuredUniformSet ?? "home") as "home" | "away" | "alternate";
  const abbr      = teamCustomization?.abbreviation ?? "VFL";

  const uniform = (teamCustomization?.uniforms?.[activeKit] ?? FALLBACK_UNIFORM);

  const setKit = async (kit: "home" | "away" | "alternate") => {
    if (!teamCustomization) return;
    try { await saveCustomization({ ...teamCustomization, featuredUniformSet: kit }); }
    catch {}
  };

  return (
    <View style={[st.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[st.header, { paddingTop: topPad + 8, borderBottomColor: theme.primary + "40" }]}>
        <Text style={[st.headerTitle, { color: colors.foreground }]}>Customize</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 110, gap: 0 }} showsVerticalScrollIndicator={false}>

        {/* Active kit preview */}
        <View style={[st.hero, { borderBottomColor: theme.primary + "20" }]}>
          <View style={[st.heroAccent, { backgroundColor: theme.primary }]} />

          {/* Kit selector pills */}
          <View style={st.kitRow}>
            {KITS.map(k => {
              const isActive = k.key === activeKit;
              const kitUniform = teamCustomization?.uniforms?.[k.key];
              const kitColor   = kitUniform?.jerseyColor ?? theme.primary;
              return (
                <TouchableOpacity
                  key={k.key}
                  onPress={() => setKit(k.key)}
                  style={[
                    st.kitPill,
                    {
                      backgroundColor: isActive ? kitColor + "30" : colors.card,
                      borderColor: isActive ? kitColor : colors.border,
                    },
                  ]}
                  activeOpacity={0.75}
                >
                  <View style={[st.kitDot, { backgroundColor: kitColor }]} />
                  <Text style={[st.kitLabel, { color: isActive ? kitColor : colors.mutedForeground }]}>
                    {k.label}
                  </Text>
                  {isActive && (
                    <Feather name="check" size={12} color={kitColor} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Uniform robot preview */}
          <View style={st.previewCenter}>
            <UniformPreview
              uniform={uniform}
              abbreviation={abbr}
              number="00"
              width={160}
              height={256}
            />
          </View>

          <Text style={[st.kitTag, { color: theme.primary }]}>
            {activeKit.toUpperCase()} · ACTIVE THEME
          </Text>
        </View>

        {/* Action cards */}
        <View style={{ padding: 14, gap: 10 }}>
          <ActionCard
            icon="user"
            title="Team Identity"
            subtitle="City · name · abbreviation · colors"
            color={theme.primary}
            onPress={() => router.push("/customize")}
          />
          <ActionCard
            icon="layers"
            title="Uniform Sets"
            subtitle="Design home, away & alternate kits"
            color={theme.secondary}
            onPress={() => router.push("/customize/uniform")}
          />
          <ActionCard
            icon="shield"
            title="Logo Editor"
            subtitle="Shape · letters · colours"
            color={colors.nflGold}
            onPress={() => router.push("/customize/logo")}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function ActionCard({ icon, title, subtitle, color, onPress }:
  { icon: any; title: string; subtitle: string; color: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}
      style={[st.card, { backgroundColor: color + "10", borderColor: color + "35" }]}>
      <View style={[st.cardIcon, { backgroundColor: color + "22" }]}>
        <Feather name={icon} size={20} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[st.cardTitle, { color: colors.foreground }]}>{title}</Text>
        <Text style={[st.cardSub, { color: colors.mutedForeground }]}>{subtitle}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  root:       { flex: 1 },
  header:     { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle:{ fontSize: 22, fontFamily: "Inter_700Bold" },

  hero:       { borderBottomWidth: 1, paddingBottom: 16 },
  heroAccent: { height: 3 },
  kitRow:     { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 14 },
  kitPill:    { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
                gap: 5, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5 },
  kitDot:     { width: 8, height: 8, borderRadius: 4 },
  kitLabel:   { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  previewCenter: { alignItems: "center", paddingTop: 8 },
  kitTag:     { textAlign: "center", fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 2, marginTop: 4 },

  card:       { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 14, borderWidth: 1, padding: 14 },
  cardIcon:   { width: 44, height: 44, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  cardTitle:  { fontSize: 15, fontFamily: "Inter_700Bold" },
  cardSub:    { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
});
