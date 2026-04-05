import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, Animated, Platform, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NFLTeamBadge } from "@/components/NFLTeamBadge";
import { VFLLogo } from "@/components/VFLLogo";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useNFL } from "@/context/NFLContext";

const POS_COLORS: Record<string, string> = {
  QB:"#E31837", RB:"#FB4F14", WR:"#FFC20E", TE:"#00B5E2", OL:"#8B949E",
  DE:"#3FB950", DT:"#26A69A", LB:"#1F6FEB", CB:"#6E40C9", S:"#9C27B0",
  K:"#FF7043", P:"#795548",
};

function newsTicker(news: any[]) { return news.slice(0, 8).map(n => n.headline).join("  •  "); }

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { membership, signOut } = useAuth();
  const { season, isLoading, isSyncing, syncError, getPlayerTeam, getWeekGames, simulateWeek, getStandings } = useNFL();
  const [simulating, setSimulating] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const tickerX = useRef(new Animated.Value(0)).current;
  const tickerWidth = useRef(0);
  const screenWidth = 400;

  const team = getPlayerTeam();
  const weekGames = useMemo(() => getWeekGames(season?.currentWeek ?? 1), [season, getWeekGames]);
  const myGame = useMemo(() => weekGames.find(g => g.homeTeamId === season?.playerTeamId || g.awayTeamId === season?.playerTeamId), [weekGames, season]);
  const standings = getStandings(team?.conference);
  const myRank = standings.findIndex(t => t.id === season?.playerTeamId) + 1;
  const role = membership?.role ?? "GM";
  const teamColor = team?.primaryColor ?? colors.nflBlue;
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  // News ticker animation
  useEffect(() => {
    if (!season?.news?.length) return;
    const total = (season.news.length * 200) + 800;
    tickerX.setValue(screenWidth);
    Animated.loop(
      Animated.timing(tickerX, { toValue: -total, duration: total * 35, useNativeDriver: true })
    ).start();
  }, [season?.news?.length]);

  const copyJoinCode = async () => {
    if (!membership?.joinCode) return;
    await Clipboard.setStringAsync(membership.joinCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2500);
  };

  const handleSimulateWeek = async () => {
    if (role === "Scout") { Alert.alert("Permission Denied", "Only the GM or Coach can simulate."); return; }
    setSimulating(true);
    try { await simulateWeek(); } finally { setSimulating(false); }
  };

  if (isLoading) return (
    <View style={[st.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={teamColor} size="large" />
      <Text style={[st.loadingText, { color: colors.mutedForeground }]}>Loading franchise...</Text>
    </View>
  );

  const roster = team?.roster ?? [];
  const capUsed = roster.reduce((s, p) => s + p.salary, 0).toFixed(1);
  const capTotal = team?.totalCap ?? 255;
  const capLeft = team ? (capTotal - parseFloat(capUsed)).toFixed(1) : "0";
  const capPct = Math.min(1, parseFloat(capUsed) / capTotal);
  const wins = team?.wins ?? 0;
  const losses = team?.losses ?? 0;
  const wPct = (wins / Math.max(1, wins + losses)).toFixed(3).replace("0.", ".");

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* News Ticker */}
      {season?.news && season.news.length > 0 && (
        <View style={[st.ticker, { backgroundColor: teamColor, top: topPad }]}>
          <Feather name="radio" size={10} color="#fff" style={{ marginRight: 6, marginLeft: 10 }} />
          <View style={{ flex: 1, overflow: "hidden" }}>
            <Animated.Text style={[st.tickerText, { transform: [{ translateX: tickerX }] }]} numberOfLines={1}>
              {newsTicker(season.news)}
            </Animated.Text>
          </View>
          <View style={[st.liveTag, { backgroundColor: "#fff22" }]}>
            <Text style={{ fontSize: 9, fontFamily: "Inter_700Bold", color: teamColor, letterSpacing: 1 }}>LIVE</Text>
          </View>
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[st.content, { paddingTop: topPad + 42, paddingBottom: Platform.OS === "web" ? 100 : 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={st.headerRow}>
          <View style={st.headerLeft}>
            <VFLLogo size="sm" />
            <View>
              <Text style={[st.seasonLabel, { color: colors.mutedForeground }]}>VFL {season?.year} SEASON</Text>
              <Text style={[st.weekLabel, { color: colors.foreground }]}>WEEK {season?.currentWeek}</Text>
            </View>
          </View>
          <View style={st.headerRight}>
            {isSyncing && <SyncBadge type="syncing" colors={colors} />}
            {syncError && !isSyncing && <SyncBadge type="offline" colors={colors} />}
            {!isSyncing && !syncError && membership && <SyncBadge type="live" colors={colors} />}
            <TouchableOpacity
              onPress={() => Alert.alert("Sign Out", "Leave this session?", [{ text: "Cancel" }, { text: "Sign Out", style: "destructive", onPress: signOut }])}
              style={[st.avatarBtn, { backgroundColor: teamColor + "25", borderColor: teamColor }]}
            >
              <Feather name="user" size={14} color={teamColor} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Team Hero Card */}
        {team && (
          <View style={[st.heroCard, { backgroundColor: teamColor + "14", borderColor: teamColor + "50" }]}>
            <View style={[st.heroAccent, { backgroundColor: teamColor }]} />
            <View style={st.heroContent}>
              <NFLTeamBadge abbreviation={team.abbreviation} primaryColor={team.primaryColor} size="lg" />
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={[st.heroCity, { color: colors.mutedForeground }]}>{team.city.toUpperCase()}</Text>
                <Text style={[st.heroName, { color: colors.foreground }]}>{team.name}</Text>
                <View style={st.heroRecordRow}>
                  <Text style={[st.heroRecord, { color: teamColor }]}>{wins}-{losses} · {wPct}</Text>
                  <View style={[st.confBadge, { backgroundColor: colors.secondary }]}>
                    <Text style={[st.confText, { color: colors.mutedForeground }]}>{team.conference} {team.division}</Text>
                  </View>
                </View>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[st.rankLabel, { color: colors.mutedForeground }]}>CONF RANK</Text>
                <Text style={[st.rankNum, { color: myRank <= 3 ? colors.nflGold : myRank <= 7 ? colors.success : colors.foreground }]}>#{myRank}</Text>
              </View>
            </View>

            {/* Cap bar */}
            <View style={st.capSection}>
              <View style={st.capTopRow}>
                <Text style={[st.capLabel, { color: colors.mutedForeground }]}>SALARY CAP</Text>
                <Text style={[st.capValues, { color: colors.foreground }]}>${capUsed}M / ${capTotal}M</Text>
                <View style={[st.capAvailTag, { backgroundColor: parseFloat(capLeft) > 0 ? colors.success + "25" : colors.danger + "25" }]}>
                  <Text style={[st.capAvailText, { color: parseFloat(capLeft) > 0 ? colors.success : colors.danger }]}>${capLeft}M AVAIL</Text>
                </View>
              </View>
              <View style={[st.capTrack, { backgroundColor: colors.secondary }]}>
                <View style={[st.capFill, { width: `${Math.round(capPct * 100)}%`, backgroundColor: capPct > 0.95 ? colors.danger : capPct > 0.8 ? colors.warning : teamColor }]} />
              </View>
            </View>

            {/* Stat chips */}
            <View style={[st.statRow, { borderTopColor: teamColor + "30" }]}>
              <StatChip label="PF"    value={`${team.pointsFor}`}     color={colors.success} />
              <StatChip label="PA"    value={`${team.pointsAgainst}`} color={colors.danger} />
              <StatChip label="ROSTER" value={`${roster.length}`}      color={teamColor} />
              <StatChip label="PICKS"  value={`${team.draftPicks.length}`} color={colors.nflGold} />
            </View>
          </View>
        )}

        {/* Role pill */}
        {membership && (
          <View style={[st.rolePill, { backgroundColor: getRoleColor(role, colors) + "20", borderColor: getRoleColor(role, colors) + "60" }]}>
            <Feather name={getRoleIcon(role)} size={12} color={getRoleColor(role, colors)} />
            <Text style={[st.rolePillText, { color: getRoleColor(role, colors) }]}>{role} — {membership.franchiseName}</Text>
            <TouchableOpacity onPress={copyJoinCode} style={st.joinCodeBtn}>
              <Feather name="hash" size={11} color={colors.nflGold} />
              <Text style={[st.joinCodeText, { color: colors.nflGold }]}>{membership.joinCode}</Text>
              <Feather name={codeCopied ? "check" : "copy"} size={11} color={codeCopied ? colors.success : colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        )}

        {/* Quick action tiles */}
        <View style={st.quickGrid}>
          <QuickTile icon="users"   label="Depth Chart"  sub="Manage lineups"      color={teamColor}         onPress={() => router.push("/(tabs)/roster")} />
          <QuickTile icon="user-plus" label="Free Agency" sub={`${season?.freeAgents.length ?? 0} available`} color={colors.success} onPress={() => router.push("/(tabs)/frontoffice")} />
          <QuickTile icon="git-merge" label="Trades"      sub="Build an offer"      color={colors.nflRed}     onPress={() => router.push("/(tabs)/frontoffice")} />
          <QuickTile icon="award"   label="Draft Room"   sub={`${season?.draftProspects.filter(p=>!p.isPickedUp).length ?? 0} prospects`} color={colors.nflGold} onPress={() => router.push("/(tabs)/frontoffice")} />
        </View>

        {/* Next game */}
        {myGame && (
          <View style={st.section}>
            <SectionTitle>{myGame.status === "final" ? "Last Result" : "Next Game"}</SectionTitle>
            {(() => {
              const home = season!.teams.find(t => t.id === myGame.homeTeamId)!;
              const away = season!.teams.find(t => t.id === myGame.awayTeamId)!;
              const isHome = myGame.homeTeamId === season?.playerTeamId;
              return (
                <TouchableOpacity
                  onPress={() => router.push({ pathname: "/game/[id]", params: { id: myGame.id } })}
                  activeOpacity={0.8}
                  style={[st.gameCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  {myGame.weather && myGame.status === "upcoming" && (
                    <View style={[st.weatherBar, { backgroundColor: getWeatherColor(myGame.weather.condition, colors) + "25" }]}>
                      <Feather name={getWeatherIcon(myGame.weather.condition)} size={11} color={getWeatherColor(myGame.weather.condition, colors)} />
                      <Text style={[st.weatherText, { color: getWeatherColor(myGame.weather.condition, colors) }]}>
                        {myGame.weather.condition} · {myGame.weather.temperature}°F · Wind {myGame.weather.windSpeed}mph
                      </Text>
                    </View>
                  )}
                  <View style={st.gameInner}>
                    <TeamSide team={home} label="HOME" isPlayer={isHome} colors={colors} />
                    <View style={st.gameCenter}>
                      {myGame.status === "final"
                        ? <Text style={[st.gameScore, { color: colors.foreground }]}>{myGame.homeScore}–{myGame.awayScore}</Text>
                        : <Text style={[st.gameVs, { color: colors.mutedForeground }]}>VS</Text>}
                      <Text style={[st.gameStatus, { color: myGame.status === "final" ? colors.success : colors.nflGold }]}>
                        {myGame.status === "final" ? "FINAL" : `WK ${myGame.week}`}
                      </Text>
                    </View>
                    <TeamSide team={away} label="AWAY" isPlayer={!isHome} colors={colors} />
                  </View>
                  <View style={[st.gameFooter, { borderTopColor: colors.border }]}>
                    <Feather name={myGame.status === "final" ? "eye" : "play-circle"} size={13} color={teamColor} />
                    <Text style={[st.gameFooterText, { color: teamColor }]}>
                      {myGame.status === "final" ? "View Full Box Score →" : "Simulate & Watch →"}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })()}
          </View>
        )}

        {/* Sim Week button */}
        {season && season.currentWeek <= season.totalWeeks && weekGames.some(g => g.status === "upcoming") && (
          <TouchableOpacity
            onPress={handleSimulateWeek}
            disabled={simulating || role === "Scout"}
            activeOpacity={0.8}
            style={[st.simBtn, { backgroundColor: simulating || role === "Scout" ? colors.secondary : teamColor }]}
          >
            {simulating
              ? <ActivityIndicator color={colors.mutedForeground} size="small" />
              : <Feather name="fast-forward" size={18} color={simulating || role === "Scout" ? colors.mutedForeground : "#fff"} />}
            <Text style={[st.simBtnText, { color: simulating || role === "Scout" ? colors.mutedForeground : "#fff" }]}>
              {simulating ? "Simulating Week..." : role === "Scout" ? "Sim Week (GM/Coach only)" : `Simulate Week ${season.currentWeek}`}
            </Text>
          </TouchableOpacity>
        )}

        {/* Recent News */}
        {season?.news && season.news.length > 0 && (
          <View style={st.section}>
            <SectionTitle>Front Office News</SectionTitle>
            {season.news.slice(0, 5).map(n => (
              <View key={n.id} style={[st.newsItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[st.newsCat, { backgroundColor: getCatColor(n.category, colors, teamColor) + "25" }]}>
                  <Text style={[st.newsCatText, { color: getCatColor(n.category, colors, teamColor) }]}>
                    {n.category.toUpperCase()}
                  </Text>
                </View>
                <Text style={[st.newsHeadline, { color: colors.foreground }]}>{n.headline}</Text>
                <Text style={[st.newsBody, { color: colors.mutedForeground }]} numberOfLines={2}>{n.body}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Standings snapshot */}
        <View style={st.section}>
          <SectionTitle>{team?.conference ?? "Ironclad"} Standings</SectionTitle>
          <View style={[st.standingsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {standings.slice(0, 8).map((t, idx) => (
              <View key={t.id} style={[st.standingRow, { borderBottomColor: colors.border, backgroundColor: t.id === season?.playerTeamId ? teamColor + "15" : "transparent" }]}>
                <Text style={[st.standingPos, { color: idx < 3 ? colors.nflGold : idx < 7 ? colors.success : colors.mutedForeground }]}>{idx + 1}</Text>
                <NFLTeamBadge abbreviation={t.abbreviation} primaryColor={t.primaryColor} size="xs" />
                <Text style={[st.standingName, { color: t.id === season?.playerTeamId ? teamColor : colors.foreground }]} numberOfLines={1}>{t.city} {t.name}</Text>
                <Text style={[st.standingRecord, { color: colors.mutedForeground }]}>{t.wins}-{t.losses}</Text>
                <Text style={[st.standingPF, { color: colors.mutedForeground }]}>{t.pointsFor}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SyncBadge({ type, colors }: { type: "live"|"syncing"|"offline"; colors: any }) {
  const cfg = {
    live:    { bg: colors.success+"20",  dot: colors.success,  text: "LIVE" },
    syncing: { bg: colors.nflBlue+"25",  dot: null,            text: "SYNC" },
    offline: { bg: colors.danger+"20",   dot: null,            text: "OFFLINE" },
  }[type];
  return (
    <View style={[st.syncBadge, { backgroundColor: cfg.bg }]}>
      {type === "syncing" ? <ActivityIndicator color={colors.nflBlue} size="small" style={{ transform: [{ scale: 0.6 }] }} />
        : type === "live" ? <View style={[{ width:6, height:6, borderRadius:3, backgroundColor:cfg.dot! }]} />
        : <Feather name="wifi-off" size={9} color={colors.danger} />}
      <Text style={[st.syncText, { color: type === "live" ? colors.success : type === "offline" ? colors.danger : colors.nflBlue }]}>{cfg.text}</Text>
    </View>
  );
}

function StatChip({ label, value, color }: { label: string; value: string; color: string }) {
  const colors = useColors();
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
      <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color }}>{value}</Text>
      <Text style={{ fontSize: 9, fontFamily: "Inter_500Medium", color: colors.mutedForeground, letterSpacing: 0.5 }}>{label}</Text>
    </View>
  );
}

function TeamSide({ team, label, isPlayer, colors }: { team: any; label: string; isPlayer: boolean; colors: any }) {
  return (
    <View style={{ flex: 1, alignItems: label === "AWAY" ? "flex-end" : "flex-start" }}>
      <NFLTeamBadge abbreviation={team.abbreviation} primaryColor={team.primaryColor} size="sm" />
      <Text style={[st.gameTeamAbbr, { color: isPlayer ? team.primaryColor : colors.foreground }]}>{team.abbreviation}</Text>
      <Text style={[st.gameTeamLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function QuickTile({ icon, label, sub, color, onPress }: { icon: any; label: string; sub: string; color: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[st.quickTile, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[st.quickIcon, { backgroundColor: color + "20" }]}>
        <Feather name={icon} size={18} color={color} />
      </View>
      <Text style={[st.quickLabel, { color: colors.foreground }]}>{label}</Text>
      <Text style={[st.quickSub, { color: colors.mutedForeground }]}>{sub}</Text>
    </TouchableOpacity>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return <Text style={[st.sectionTitle, { color: colors.foreground }]}>{children}</Text>;
}

// ─── Utility fns ──────────────────────────────────────────────────────────────

function getRoleColor(role: string, colors: any) {
  return role === "GM" ? colors.nflBlue : role === "Coach" ? colors.nflRed : colors.nflGold;
}
function getRoleIcon(role: string): any {
  return role === "GM" ? "briefcase" : role === "Coach" ? "target" : "search";
}
function getCatColor(cat: string, colors: any, teamColor: string) {
  const m: Record<string, string> = { game: teamColor, injury: colors.danger, trade: colors.nflBlue, signing: colors.success, draft: colors.nflGold, contract: colors.warning, general: colors.mutedForeground };
  return m[cat] ?? colors.mutedForeground;
}
function getWeatherIcon(cond: string): any {
  const m: Record<string, any> = { Clear:"sun", Cloudy:"cloud", Wind:"wind", Rain:"cloud-drizzle", Snow:"cloud-snow", Dome:"home" };
  return m[cond] ?? "cloud";
}
function getWeatherColor(cond: string, colors: any) {
  const m: Record<string, string> = { Clear: colors.nflGold, Cloudy: colors.mutedForeground, Wind: colors.warning, Rain: colors.nflBlue, Snow: "#A8D8EA", Dome: colors.success };
  return m[cond] ?? colors.mutedForeground;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  center:         { flex:1, alignItems:"center", justifyContent:"center", gap:12 },
  loadingText:    { fontSize:14, fontFamily:"Inter_400Regular" },
  content:        { paddingHorizontal:16 },
  ticker:         { position:"absolute", left:0, right:0, zIndex:20, flexDirection:"row", alignItems:"center", height:28, overflow:"hidden" },
  tickerText:     { fontSize:11, fontFamily:"Inter_600SemiBold", color:"#fff", letterSpacing:0.3, width:3000 },
  liveTag:        { paddingHorizontal:6, paddingVertical:2, borderRadius:4, marginRight:8 },
  headerRow:      { flexDirection:"row", alignItems:"center", justifyContent:"space-between", marginBottom:14 },
  headerLeft:     { flexDirection:"row", alignItems:"center", gap:10 },
  headerRight:    { flexDirection:"row", alignItems:"center", gap:8 },
  seasonLabel:    { fontSize:10, fontFamily:"Inter_600SemiBold", letterSpacing:1.5 },
  weekLabel:      { fontSize:26, fontFamily:"Inter_700Bold", letterSpacing:-0.5 },
  syncBadge:      { flexDirection:"row", alignItems:"center", gap:4, paddingHorizontal:7, paddingVertical:3, borderRadius:10 },
  syncText:       { fontSize:9, fontFamily:"Inter_700Bold", letterSpacing:0.5 },
  avatarBtn:      { width:32, height:32, borderRadius:16, alignItems:"center", justifyContent:"center", borderWidth:1.5 },
  // Hero card
  heroCard:       { borderRadius:18, borderWidth:1.5, marginBottom:14, overflow:"hidden" },
  heroAccent:     { height:3 },
  heroContent:    { flexDirection:"row", alignItems:"center", padding:16, paddingBottom:10 },
  heroCity:       { fontSize:10, fontFamily:"Inter_600SemiBold", letterSpacing:1.5 },
  heroName:       { fontSize:22, fontFamily:"Inter_700Bold", letterSpacing:-0.3 },
  heroRecordRow:  { flexDirection:"row", alignItems:"center", gap:8, marginTop:2 },
  heroRecord:     { fontSize:15, fontFamily:"Inter_700Bold" },
  confBadge:      { paddingHorizontal:7, paddingVertical:2, borderRadius:5 },
  confText:       { fontSize:10, fontFamily:"Inter_500Medium" },
  rankLabel:      { fontSize:9, fontFamily:"Inter_500Medium", letterSpacing:1 },
  rankNum:        { fontSize:28, fontFamily:"Inter_700Bold" },
  capSection:     { paddingHorizontal:16, paddingBottom:12 },
  capTopRow:      { flexDirection:"row", alignItems:"center", gap:8, marginBottom:6 },
  capLabel:       { fontSize:9, fontFamily:"Inter_600SemiBold", letterSpacing:1, flex:1 },
  capValues:      { fontSize:12, fontFamily:"Inter_600SemiBold" },
  capAvailTag:    { paddingHorizontal:6, paddingVertical:2, borderRadius:5 },
  capAvailText:   { fontSize:10, fontFamily:"Inter_700Bold" },
  capTrack:       { height:5, borderRadius:3, overflow:"hidden" },
  capFill:        { height:"100%", borderRadius:3 },
  statRow:        { flexDirection:"row", borderTopWidth:1, paddingTop:10, paddingBottom:10, paddingHorizontal:8 },
  // Role pill
  rolePill:       { flexDirection:"row", alignItems:"center", gap:6, paddingHorizontal:10, paddingVertical:7, borderRadius:10, borderWidth:1, marginBottom:14 },
  rolePillText:   { fontSize:11, fontFamily:"Inter_600SemiBold", flex:1 },
  joinCodeBtn:    { flexDirection:"row", alignItems:"center", gap:4, paddingLeft:8, borderLeftWidth:1, borderLeftColor:"#ffffff15" },
  joinCodeText:   { fontSize:14, fontFamily:"Inter_700Bold", letterSpacing:3 },
  // Quick tiles
  quickGrid:      { flexDirection:"row", flexWrap:"wrap", gap:10, marginBottom:18 },
  quickTile:      { width:"47%", borderRadius:14, borderWidth:1, padding:12, gap:8 },
  quickIcon:      { width:40, height:40, borderRadius:10, alignItems:"center", justifyContent:"center" },
  quickLabel:     { fontSize:14, fontFamily:"Inter_700Bold" },
  quickSub:       { fontSize:11, fontFamily:"Inter_400Regular" },
  // Game card
  section:        { marginBottom:18 },
  sectionTitle:   { fontSize:16, fontFamily:"Inter_700Bold", marginBottom:10, letterSpacing:-0.2 },
  gameCard:       { borderRadius:14, borderWidth:1, overflow:"hidden" },
  weatherBar:     { flexDirection:"row", alignItems:"center", gap:5, paddingHorizontal:12, paddingVertical:6 },
  weatherText:    { fontSize:11, fontFamily:"Inter_500Medium" },
  gameInner:      { flexDirection:"row", alignItems:"center", padding:14 },
  gameCenter:     { flex:0, paddingHorizontal:20, alignItems:"center" },
  gameScore:      { fontSize:26, fontFamily:"Inter_700Bold", letterSpacing:-1 },
  gameVs:         { fontSize:16, fontFamily:"Inter_700Bold" },
  gameStatus:     { fontSize:9, fontFamily:"Inter_700Bold", letterSpacing:1.5, marginTop:3 },
  gameTeamAbbr:   { fontSize:14, fontFamily:"Inter_700Bold", marginTop:5 },
  gameTeamLabel:  { fontSize:10, fontFamily:"Inter_500Medium" },
  gameFooter:     { flexDirection:"row", alignItems:"center", justifyContent:"center", gap:6, padding:10, borderTopWidth:1 },
  gameFooterText: { fontSize:12, fontFamily:"Inter_600SemiBold" },
  // Sim button
  simBtn:         { flexDirection:"row", alignItems:"center", justifyContent:"center", gap:10, paddingVertical:14, borderRadius:14, marginBottom:18 },
  simBtnText:     { fontSize:15, fontFamily:"Inter_700Bold" },
  // News
  newsItem:       { borderRadius:12, borderWidth:1, padding:12, marginBottom:8 },
  newsCat:        { alignSelf:"flex-start", paddingHorizontal:7, paddingVertical:2, borderRadius:5, marginBottom:5 },
  newsCatText:    { fontSize:9, fontFamily:"Inter_700Bold", letterSpacing:1 },
  newsHeadline:   { fontSize:13, fontFamily:"Inter_700Bold", marginBottom:3 },
  newsBody:       { fontSize:12, fontFamily:"Inter_400Regular", lineHeight:17 },
  // Standings
  standingsCard:  { borderRadius:14, borderWidth:1, overflow:"hidden" },
  standingRow:    { flexDirection:"row", alignItems:"center", gap:9, paddingVertical:9, paddingHorizontal:12, borderBottomWidth:1 },
  standingPos:    { fontSize:13, fontFamily:"Inter_700Bold", width:20 },
  standingName:   { flex:1, fontSize:13, fontFamily:"Inter_500Medium" },
  standingRecord: { fontSize:13, fontFamily:"Inter_600SemiBold", width:36 },
  standingPF:     { fontSize:12, fontFamily:"Inter_400Regular", width:36, textAlign:"right" },
});
