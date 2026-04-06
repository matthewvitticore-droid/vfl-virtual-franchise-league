import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator, Alert, Platform, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NFLTeamBadge } from "@/components/NFLTeamBadge";
import { VFLLogo } from "@/components/VFLLogo";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useNFL } from "@/context/NFLContext";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router  = useRouter();
  const { membership, signOut } = useAuth();
  const {
    season, isLoading, isSyncing, syncError,
    getPlayerTeam, getWeekGames, getStandings,
    simulateWeek, simulateSeason, advancePhase,
  } = useNFL();
  const [simulating, setSimulating]   = useState(false);
  const [simSeason,  setSimSeason]    = useState(false);
  const [advancing,  setAdvancing]    = useState(false);

  const team       = getPlayerTeam();
  const teamColor  = team?.primaryColor ?? colors.nflBlue;
  const topPad     = Platform.OS === "web" ? 16 : insets.top;
  const role       = membership?.role ?? "GM";

  const standings  = getStandings(team?.conference);
  const myRank     = standings.findIndex(t => t.id === season?.playerTeamId) + 1;

  const wins   = team?.wins   ?? 0;
  const losses = team?.losses ?? 0;
  const wPct   = (wins / Math.max(1, wins + losses)).toFixed(3).replace("0.", ".");

  const roster  = team?.roster ?? [];
  const capUsed = roster.reduce((s, p) => s + p.salary, 0).toFixed(1);
  const capTotal = team?.totalCap ?? 255;
  const capLeft  = team ? (capTotal - parseFloat(capUsed)).toFixed(1) : "0";

  const currentPhase      = season?.phase ?? "regular";
  const isOffseasonPhase  = ["offseason","freeAgency","draft","preseason"].includes(currentPhase);
  const allPlayoffsDone   = !!season?.vflBowlWinnerId;
  const weekGames         = getWeekGames(season?.currentWeek ?? 1);
  const canSim            = weekGames.some(g => g.status === "upcoming") && !isOffseasonPhase;
  const canAdvance        = isOffseasonPhase || allPlayoffsDone;
  const busy              = canAdvance ? advancing : simulating;
  const canPress          = !busy && role !== "Scout" && (canSim || canAdvance);

  const NEXT_PHASE: Record<string, string> = {
    playoffs:  "Begin Offseason", offseason: "Open Free Agency",
    freeAgency:"Go to Draft",     draft:     "Enter Preseason",
    preseason: "Start New Season",
  };
  const btnLabel = canAdvance
    ? (advancing ? "Advancing…" : NEXT_PHASE[currentPhase] ?? "Advance")
    : simulating ? "Simulating…"
    : `Simulate Week ${season?.currentWeek}`;

  const handleSim = async () => {
    if (role === "Scout") { Alert.alert("Permission Denied", "Only the GM or Coach can simulate."); return; }
    if (canAdvance) { setAdvancing(true); try { await advancePhase(); } finally { setAdvancing(false); } }
    else { setSimulating(true); try { await simulateWeek(); } finally { setSimulating(false); } }
  };

  if (isLoading) return (
    <View style={[st.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={teamColor} size="large" />
      <Text style={[st.mutedText, { color: colors.mutedForeground }]}>Loading franchise…</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>

      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <View style={[st.topBar, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <View style={st.topLeft}>
          <VFLLogo size="sm" />
          <View>
            <Text style={[st.seasonLbl, { color: colors.mutedForeground }]}>
              VFL {season?.year} SEASON
            </Text>
            <Text style={[st.weekLbl, { color: colors.foreground }]}>
              WK <Text style={{ color: colors.nflGold }}>{season?.currentWeek}</Text>
            </Text>
          </View>
        </View>
        <View style={st.topRight}>
          {isSyncing && (
            <ActivityIndicator color={colors.nflBlue} size="small"
              style={{ transform:[{scale:0.7}] }} />
          )}
          {syncError && !isSyncing && (
            <Feather name="wifi-off" size={14} color={colors.danger} />
          )}
          <TouchableOpacity
            onPress={() => Alert.alert("Sign Out", "Leave this session?", [
              { text: "Cancel" },
              { text: "Sign Out", style: "destructive", onPress: signOut },
            ])}
            style={[st.avatarBtn, { backgroundColor: teamColor + "25", borderColor: teamColor + "70" }]}
          >
            <Feather name="user" size={14} color={teamColor} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, paddingTop: 16, gap: 14 }}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Team card ──────────────────────────────────────────────────── */}
        {team && (
          <View style={[st.teamCard, { backgroundColor: teamColor + "14", borderColor: teamColor + "50" }]}>
            <View style={[st.teamCardAccent, { backgroundColor: teamColor }]} />
            <View style={st.teamCardRow}>
              <NFLTeamBadge abbreviation={team.abbreviation} primaryColor={team.primaryColor} size="lg" />
              <View style={{ flex: 1 }}>
                <Text style={[st.teamCity, { color: teamColor }]}>{team.city.toUpperCase()}</Text>
                <Text style={[st.teamName, { color: colors.foreground }]}>{team.name}</Text>
                <View style={st.recordRow}>
                  <Text style={[st.record, { color: teamColor }]}>{wins}–{losses} · {wPct}</Text>
                  <View style={[st.confPill, { backgroundColor: colors.secondary }]}>
                    <Text style={[st.confTxt, { color: colors.mutedForeground }]}>
                      {team.conference} {team.division}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[st.rankLbl, { color: colors.mutedForeground }]}>CONF</Text>
                <Text style={[st.rankNum, {
                  color: myRank <= 3 ? colors.nflGold : myRank <= 7 ? colors.success : colors.foreground,
                }]}>#{myRank}</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Stats strip ────────────────────────────────────────────────── */}
        {team && (
          <View style={[st.strip, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <StatItem label="CAP" value={`$${capLeft}M`}
              color={parseFloat(capLeft) > 0 ? colors.success : colors.danger} />
            <View style={[st.div, { backgroundColor: colors.border }]} />
            <StatItem label="PF"     value={String(team.pointsFor)}     color={colors.success} />
            <View style={[st.div, { backgroundColor: colors.border }]} />
            <StatItem label="PA"     value={String(team.pointsAgainst)} color={colors.danger}  />
            <View style={[st.div, { backgroundColor: colors.border }]} />
            <StatItem label="ROSTER" value={String(roster.length)}      color={teamColor}      />
            <View style={[st.div, { backgroundColor: colors.border }]} />
            <StatItem label="PICKS"  value={String(team.draftPicks.length)} color={colors.nflGold} />
          </View>
        )}

        {/* ── Quick tiles ────────────────────────────────────────────────── */}
        <View style={st.grid}>
          <Tile icon="users"     label="Depth Chart"  sub="Manage lineups"
            color={teamColor} onPress={() => router.push("/(tabs)/roster")} />
          <Tile icon="user-plus" label="Free Agency"
            sub={`${season?.freeAgents.length ?? 0} available`}
            color={teamColor} onPress={() => router.push("/(tabs)/frontoffice")} />
          <Tile icon="git-merge" label="Trades"       sub="Build an offer"
            color={teamColor} onPress={() => router.push("/(tabs)/frontoffice")} />
          <Tile icon="award"     label="Draft Room"
            sub={`${season?.draftProspects.filter(p=>!p.isPickedUp).length ?? 0} prospects`}
            color={teamColor} onPress={() => router.push({ pathname:"/(tabs)/frontoffice", params:{tab:"draft"} })} />
          <Tile icon="edit-2"    label="Customize"    sub="Team identity & kits"
            color={teamColor} onPress={() => router.push("/customize")} />
        </View>

        {/* ── Sim / Advance button ───────────────────────────────────────── */}
        {season && (canSim || canAdvance) && (
          <View style={{ gap: 8 }}>
            <TouchableOpacity
              onPress={handleSim}
              disabled={!canPress}
              activeOpacity={0.82}
              style={[st.simBtn, { backgroundColor: canPress ? teamColor : colors.secondary }]}
            >
              {busy
                ? <ActivityIndicator color="#fff" size="small" />
                : <Feather name={canAdvance ? "chevrons-right" : "fast-forward"} size={18} color={canPress ? "#fff" : colors.mutedForeground} />
              }
              <Text style={[st.simBtnTxt, { color: canPress ? "#fff" : colors.mutedForeground }]}>
                {role === "Scout" ? "GM / Coach Only" : btnLabel}
              </Text>
            </TouchableOpacity>

            {canSim && !isOffseasonPhase && role !== "Scout" && (
              <TouchableOpacity
                onPress={() => { setSimSeason(true); simulateSeason().finally(() => setSimSeason(false)); }}
                disabled={simSeason || simulating}
                activeOpacity={0.82}
                style={[st.simSecBtn, { borderColor: teamColor + "50" }]}
              >
                {simSeason
                  ? <ActivityIndicator color={teamColor} size="small" />
                  : <Feather name="zap" size={14} color={teamColor} />}
                <Text style={[st.simSecTxt, { color: teamColor }]}>
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

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatItem({ label, value, color }: { label: string; value: string; color: string }) {
  const colors = useColors();
  return (
    <View style={st.statItem}>
      <Text style={[st.statVal, { color }]}>{value}</Text>
      <Text style={[st.statLbl, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function Tile({ icon, label, sub, color, onPress }: { icon: any; label: string; sub: string; color: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}
      style={[st.tile, { backgroundColor: color + "12", borderColor: color + "45" }]}>
      <View style={[st.tileIcon, { backgroundColor: color + "25" }]}>
        <Feather name={icon} size={18} color={color} />
      </View>
      <Text style={[st.tileLbl, { color: colors.foreground }]}>{label}</Text>
      <Text style={[st.tileSub, { color: colors.mutedForeground }]}>{sub}</Text>
    </TouchableOpacity>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  center:       { flex:1, alignItems:"center", justifyContent:"center", gap:12 },
  mutedText:    { fontSize:14, fontFamily:"Inter_400Regular" },

  // Top bar
  topBar:       { flexDirection:"row", alignItems:"center", justifyContent:"space-between",
                  paddingHorizontal:16, paddingBottom:12, borderBottomWidth:StyleSheet.hairlineWidth },
  topLeft:      { flexDirection:"row", alignItems:"center", gap:10 },
  topRight:     { flexDirection:"row", alignItems:"center", gap:8 },
  seasonLbl:    { fontSize:10, fontFamily:"Inter_600SemiBold", letterSpacing:1.5 },
  weekLbl:      { fontSize:22, fontFamily:"Inter_700Bold", letterSpacing:-0.5 },
  avatarBtn:    { width:32, height:32, borderRadius:16, alignItems:"center", justifyContent:"center", borderWidth:1.5 },

  // Team card
  teamCard:     { borderRadius:16, borderWidth:1.5, overflow:"hidden" },
  teamCardAccent: { height:3 },
  teamCardRow:  { flexDirection:"row", alignItems:"center", gap:12, padding:14 },
  teamCity:     { fontSize:10, fontFamily:"Inter_600SemiBold", letterSpacing:1.5 },
  teamName:     { fontSize:22, fontFamily:"Inter_700Bold", letterSpacing:-0.3 },
  recordRow:    { flexDirection:"row", alignItems:"center", gap:8, marginTop:2 },
  record:       { fontSize:14, fontFamily:"Inter_700Bold" },
  confPill:     { paddingHorizontal:7, paddingVertical:2, borderRadius:5 },
  confTxt:      { fontSize:10, fontFamily:"Inter_500Medium" },
  rankLbl:      { fontSize:9,  fontFamily:"Inter_500Medium", letterSpacing:1 },
  rankNum:      { fontSize:26, fontFamily:"Inter_700Bold" },

  // Stats strip
  strip:        { flexDirection:"row", alignItems:"center", borderRadius:12,
                  borderWidth:1, paddingVertical:10, paddingHorizontal:8 },
  statItem:     { flex:1, alignItems:"center", gap:2 },
  statVal:      { fontSize:15, fontFamily:"Inter_700Bold" },
  statLbl:      { fontSize:8,  fontFamily:"Inter_600SemiBold", letterSpacing:0.8 },
  div:          { width:1, height:28, opacity:0.35 },

  // Tiles
  grid:         { flexDirection:"row", flexWrap:"wrap", gap:10 },
  tile:         { width:"47%", borderRadius:14, borderWidth:1, padding:12, gap:8 },
  tileIcon:     { width:40, height:40, borderRadius:10, alignItems:"center", justifyContent:"center" },
  tileLbl:      { fontSize:14, fontFamily:"Inter_700Bold" },
  tileSub:      { fontSize:11, fontFamily:"Inter_400Regular" },

  // Sim
  simBtn:       { flexDirection:"row", alignItems:"center", justifyContent:"center",
                  gap:10, paddingVertical:15, borderRadius:14 },
  simBtnTxt:    { fontSize:16, fontFamily:"Inter_700Bold" },
  simSecBtn:    { flexDirection:"row", alignItems:"center", justifyContent:"center",
                  gap:7, paddingVertical:11, borderRadius:12, borderWidth:1, backgroundColor:"transparent" },
  simSecTxt:    { fontSize:13, fontFamily:"Inter_600SemiBold" },
});
