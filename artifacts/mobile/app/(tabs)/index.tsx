import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator, Alert, Platform, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { UniformPreview } from "@/components/UniformPreview";
import { VFLLogo } from "@/components/VFLLogo";
import { useColors } from "@/hooks/useColors";
import { useTeamTheme } from "@/hooks/useTeamTheme";
import { useAuth } from "@/context/AuthContext";
import { useNFL } from "@/context/NFLContext";
import type { UniformSet } from "@/context/NFLContext";

// Neutral nav tiles (team-coloured but no separate page theming needed)
const NAV_TILES = [
  { icon: "users",     label: "Depth Chart",  href: "/(tabs)/roster" as const },
  { icon: "git-merge", label: "Trades",        href: "/(tabs)/frontoffice" as const },
  { icon: "user-plus", label: "Free Agency",   href: "/(tabs)/frontoffice" as const },
  { icon: "award",     label: "Draft Room",    href: "/(tabs)/frontoffice" as const },
  { icon: "calendar",  label: "Schedule",      href: "/(tabs)/schedule" as const },
  { icon: "bar-chart-2", label: "Standings",   href: "/(tabs)/standings" as const },
] as const;

const FALLBACK_UNIFORM: UniformSet = {
  helmetColor: "#4F46E5", helmetFacemaskColor: "#C0C6D0",
  helmetChinstrapColor: "#4F46E5", helmetLogoPlacement: "both",
  jerseyStyle: "traditional", jerseyColor: "#4F46E5",
  jerseyAccentColor: "#0D9488", numberFont: "block",
  numberColor: "#FFFFFF", numberOutlineColor: "#0D9488",
  pantColor: "#4F46E5", pantStripeStyle: "single",
  pantStripeColor: "#0D9488", sockColor: "#4F46E5", sockAccentColor: "#0D9488",
};

export default function HomeScreen() {
  const colors   = useColors();
  const theme    = useTeamTheme();
  const insets   = useSafeAreaInsets();
  const router   = useRouter();
  const { membership, signOut } = useAuth();
  const {
    season, isLoading, isSyncing, syncError,
    teamCustomization,
    getPlayerTeam, getWeekGames, getStandings,
    simulateWeek, simulateSeason, advancePhase,
  } = useNFL();

  const [simulating, setSimulating] = useState(false);
  const [simSeason,  setSimSeason]  = useState(false);
  const [advancing,  setAdvancing]  = useState(false);

  const team    = getPlayerTeam();
  const topPad  = Platform.OS === "web" ? 16 : insets.top;
  const role    = membership?.role ?? "GM";

  // Active kit
  const kitKey  = teamCustomization?.featuredUniformSet ?? "home";
  const uniform = teamCustomization?.uniforms?.[kitKey] ?? FALLBACK_UNIFORM;
  const abbr    = teamCustomization?.abbreviation ?? team?.abbreviation ?? "VFL";

  // Record / cap
  const wins    = team?.wins   ?? 0;
  const losses  = team?.losses ?? 0;
  const wPct    = (wins / Math.max(1, wins + losses)).toFixed(3).replace("0.", ".");
  const roster  = team?.roster ?? [];

  const standings = getStandings(team?.conference);
  const myRank    = standings.findIndex(t => t.id === season?.playerTeamId) + 1;

  // Sim state
  const currentPhase     = season?.phase ?? "regular";
  const isOffseason      = ["offseason","freeAgency","draft","preseason"].includes(currentPhase);
  const allDone          = !!season?.vflBowlWinnerId;
  const weekGames        = getWeekGames(season?.currentWeek ?? 1);
  const canSim           = weekGames.some(g => g.status === "upcoming") && !isOffseason;
  const canAdvance       = isOffseason || allDone;
  const busy             = canAdvance ? advancing : simulating;
  const canPress         = !busy && role !== "Scout" && (canSim || canAdvance);

  const NEXT_PHASE: Record<string, string> = {
    playoffs: "Begin Offseason", offseason: "Open Free Agency",
    freeAgency: "Go to Draft", draft: "Enter Preseason", preseason: "Start New Season",
  };
  const btnLabel = canAdvance
    ? (advancing ? "Advancing…" : NEXT_PHASE[currentPhase] ?? "Advance")
    : simulating ? "Simulating…"
    : `Simulate Week ${season?.currentWeek}`;

  const handleSim = async () => {
    if (role === "Scout") { Alert.alert("Permission Denied", "Only the GM or Coach can simulate."); return; }
    if (canAdvance) { setAdvancing(true); try { await advancePhase(); } finally { setAdvancing(false); } }
    else            { setSimulating(true); try { await simulateWeek(); } finally { setSimulating(false); } }
  };

  if (isLoading) return (
    <View style={[st.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={theme.primary} size="large" />
      <Text style={[st.mutedTxt, { color: colors.mutedForeground }]}>Loading franchise…</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <View style={[st.topBar, { paddingTop: topPad + 8, borderBottomColor: theme.primary + "40" }]}>
        <View style={st.topRow}>
          <VFLLogo size="sm" />
          <View>
            <Text style={[st.seasonLbl, { color: colors.mutedForeground }]}>VFL {season?.year} SEASON</Text>
            <Text style={[st.weekLbl, { color: colors.foreground }]}>
              WK <Text style={{ color: theme.secondary }}>{season?.currentWeek}</Text>
            </Text>
          </View>
        </View>
        <View style={st.topRight}>
          {isSyncing && <ActivityIndicator color={theme.primary} size="small" style={{ transform:[{scale:0.7}] }} />}
          {syncError && !isSyncing && <Feather name="wifi-off" size={14} color={colors.danger} />}
          <TouchableOpacity
            onPress={() => Alert.alert("Sign Out", "Leave this session?", [
              { text: "Cancel" },
              { text: "Sign Out", style: "destructive", onPress: signOut },
            ])}
            style={[st.avatarBtn, { backgroundColor: theme.primary + "22", borderColor: theme.primary + "60" }]}
          >
            <Feather name="user" size={14} color={theme.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 110, gap: 0 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <LinearGradient
          colors={[theme.primary + "28", theme.secondary + "10", "transparent"]}
          style={st.hero}
        >
          {/* Accent border top */}
          <View style={[st.heroAccent, { backgroundColor: theme.primary }]} />

          <View style={st.heroInner}>
            {/* Left: uniform player */}
            <View style={st.heroLeft}>
              <UniformPreview
                uniform={uniform}
                abbreviation={abbr}
                number="00"
                width={140}
                height={224}
              />
            </View>

            {/* Right: team info */}
            <View style={st.heroRight}>
              <Text style={[st.heroCity, { color: theme.primary }]}>
                {(team?.city ?? "").toUpperCase()}
              </Text>
              <Text style={[st.heroName, { color: colors.foreground }]}>
                {team?.name ?? "VFL Team"}
              </Text>
              <Text style={[st.heroRecord, { color: theme.secondary }]}>
                {wins}–{losses} · {wPct}
              </Text>
              <View style={[st.heroPill, { backgroundColor: theme.primary + "20", borderColor: theme.primary + "40" }]}>
                <Text style={[st.heroPillTxt, { color: theme.primary }]}>
                  {team?.conference ?? ""} {team?.division ?? ""}
                </Text>
              </View>
              {myRank > 0 && (
                <View style={st.heroRank}>
                  <Text style={[st.heroRankLbl, { color: colors.mutedForeground }]}>CONF RANK</Text>
                  <Text style={[st.heroRankNum, {
                    color: myRank <= 3 ? colors.nflGold : myRank <= 7 ? colors.success : colors.foreground,
                  }]}>#{myRank}</Text>
                </View>
              )}
            </View>
          </View>
        </LinearGradient>

        {/* ── Kit theme toggle ─────────────────────────────────────────── */}
        <KitToggle />

        {/* ── Navigation tiles ─────────────────────────────────────────── */}
        <View style={[st.tilesSection, { paddingHorizontal: 14 }]}>
          <View style={st.tileGrid}>
            {NAV_TILES.map(t => (
              <NavTile key={t.label} icon={t.icon as any} label={t.label}
                color={theme.primary} accent={theme.secondary}
                onPress={() => router.push(t.href as any)} />
            ))}
          </View>
        </View>

        {/* ── Sim / Advance ────────────────────────────────────────────── */}
        {season && (canSim || canAdvance) && (
          <View style={{ paddingHorizontal: 14, gap: 8, marginTop: 6 }}>
            <TouchableOpacity
              onPress={handleSim} disabled={!canPress} activeOpacity={0.82}
              style={[st.simBtn, { backgroundColor: canPress ? "#111118" : colors.secondary, borderWidth: 1.5, borderColor: canPress ? "#ffffff22" : "transparent" }]}
            >
              {busy
                ? <ActivityIndicator color="#fff" size="small" />
                : <Feather name={canAdvance ? "chevrons-right" : "fast-forward"} size={18}
                    color={canPress ? "#fff" : colors.mutedForeground} />
              }
              <Text style={[st.simBtnTxt, { color: canPress ? "#fff" : colors.mutedForeground }]}>
                {role === "Scout" ? "GM / Coach Only" : btnLabel}
              </Text>
            </TouchableOpacity>

            {canSim && !isOffseason && role !== "Scout" && (
              <TouchableOpacity
                onPress={() => { setSimSeason(true); simulateSeason().finally(() => setSimSeason(false)); }}
                disabled={simSeason || simulating} activeOpacity={0.82}
                style={[st.simSecBtn, { borderColor: "#ffffff20" }]}
              >
                {simSeason
                  ? <ActivityIndicator color="#aaa" size="small" />
                  : <Feather name="zap" size={14} color="#aaa" />}
                <Text style={[st.simSecTxt, { color: "#aaa" }]}>
                  {simSeason ? "Simulating to VFL Bowl…" : "Sim to VFL Bowl"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const KITS = [
  { key: "home" as const,      label: "HOME" },
  { key: "away" as const,      label: "AWAY" },
  { key: "alternate" as const, label: "ALT"  },
];

function KitToggle() {
  const colors = useColors();
  const theme  = useTeamTheme();
  const { teamCustomization, saveCustomization } = useNFL();

  const activeKit = (teamCustomization?.featuredUniformSet ?? "home") as "home" | "away" | "alternate";

  const setKit = async (kit: "home" | "away" | "alternate") => {
    if (!teamCustomization || kit === activeKit) return;
    try { await saveCustomization({ ...teamCustomization, featuredUniformSet: kit }); }
    catch {}
  };

  return (
    <View style={[st.kitRow, { backgroundColor: colors.card, borderColor: theme.primary + "30" }]}>
      <Text style={[st.kitRowLabel, { color: colors.mutedForeground }]}>THEME KIT</Text>
      <View style={st.kitPills}>
        {KITS.map(k => {
          const isActive = k.key === activeKit;
          // Active: team primary (solid). Inactive: team secondary tint — always readable
          const bgColor   = isActive ? theme.primary         : theme.secondary + "25";
          const bdColor   = isActive ? theme.primary         : theme.secondary + "60";
          const txtColor  = isActive ? "#fff"                : theme.secondary;
          const dotColor  = isActive ? "#fff"                : theme.secondary;
          return (
            <TouchableOpacity
              key={k.key}
              onPress={() => setKit(k.key)}
              activeOpacity={0.75}
              style={[st.kitPill, { backgroundColor: bgColor, borderColor: bdColor }]}
            >
              <View style={[st.kitDot, { backgroundColor: dotColor }]} />
              <Text style={[st.kitPillTxt, { color: txtColor }]}>{k.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function NavTile({ icon, label, color, accent, onPress }:
  { icon: any; label: string; color: string; accent: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}
      style={[st.tile, { backgroundColor: color + "10", borderColor: color + "35" }]}>
      <View style={[st.tileIcon, { backgroundColor: accent + "20" }]}>
        <Feather name={icon} size={17} color={accent} />
      </View>
      <Text style={[st.tileLbl, { color: colors.foreground }]} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  center:    { flex:1, alignItems:"center", justifyContent:"center", gap:12 },
  mutedTxt:  { fontSize:14, fontFamily:"Inter_400Regular" },

  // Top bar
  topBar:    { flexDirection:"row", alignItems:"center", justifyContent:"space-between",
               paddingHorizontal:16, paddingBottom:12, borderBottomWidth:StyleSheet.hairlineWidth },
  topRow:    { flexDirection:"row", alignItems:"center", gap:10 },
  topRight:  { flexDirection:"row", alignItems:"center", gap:8 },
  seasonLbl: { fontSize:10, fontFamily:"Inter_600SemiBold", letterSpacing:1.5 },
  weekLbl:   { fontSize:22, fontFamily:"Inter_700Bold", letterSpacing:-0.5 },
  avatarBtn: { width:32, height:32, borderRadius:16, alignItems:"center", justifyContent:"center", borderWidth:1.5 },

  // Hero
  hero:      { paddingBottom: 16 },
  heroAccent:{ height: 3 },
  heroInner: { flexDirection:"row", alignItems:"center", paddingHorizontal:16, paddingTop:14, gap:8 },
  heroLeft:  { alignItems:"center", justifyContent:"center" },
  heroRight: { flex:1, gap:4, paddingLeft:4 },
  heroCity:  { fontSize:10, fontFamily:"Inter_600SemiBold", letterSpacing:2 },
  heroName:  { fontSize:28, fontFamily:"Inter_700Bold", letterSpacing:-0.5 },
  heroRecord:{ fontSize:15, fontFamily:"Inter_700Bold" },
  heroPill:  { alignSelf:"flex-start", paddingHorizontal:8, paddingVertical:3,
               borderRadius:6, borderWidth:1, marginTop:2 },
  heroPillTxt:{ fontSize:10, fontFamily:"Inter_600SemiBold" },
  heroRank:  { marginTop:6 },
  heroRankLbl:{ fontSize:9, fontFamily:"Inter_500Medium", letterSpacing:1 },
  heroRankNum:{ fontSize:32, fontFamily:"Inter_700Bold", lineHeight:36 },

  // Kit toggle
  kitRow:    { flexDirection:"row", alignItems:"center", borderTopWidth:1, borderBottomWidth:1,
               paddingVertical:10, paddingHorizontal:14, gap:10, marginBottom:12 },
  kitRowLabel:{ fontSize:9, fontFamily:"Inter_700Bold", letterSpacing:1.5, width:46 },
  kitPills:  { flex:1, flexDirection:"row", gap:6 },
  kitPill:   { flex:1, flexDirection:"row", alignItems:"center", justifyContent:"center",
               gap:5, paddingVertical:7, borderRadius:9, borderWidth:1.5 },
  kitDot:    { width:7, height:7, borderRadius:3.5 },
  kitPillTxt:{ fontSize:10, fontFamily:"Inter_700Bold", letterSpacing:0.5 },

  // Nav tiles
  tilesSection: { gap: 8 },
  tileGrid:  { flexDirection:"row", flexWrap:"wrap", gap:8 },
  tile:      { width:"31%", borderRadius:12, borderWidth:1, padding:10, gap:6, alignItems:"flex-start" },
  tileIcon:  { width:34, height:34, borderRadius:8, alignItems:"center", justifyContent:"center" },
  tileLbl:   { fontSize:11, fontFamily:"Inter_700Bold" },

  // Sim
  simBtn:    { flexDirection:"row", alignItems:"center", justifyContent:"center",
               gap:10, paddingVertical:15, borderRadius:14 },
  simBtnTxt: { fontSize:16, fontFamily:"Inter_700Bold" },
  simSecBtn: { flexDirection:"row", alignItems:"center", justifyContent:"center",
               gap:7, paddingVertical:11, borderRadius:12, borderWidth:1 },
  simSecTxt: { fontSize:13, fontFamily:"Inter_600SemiBold" },
});
