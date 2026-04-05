import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NFLTeamBadge } from "@/components/NFLTeamBadge";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useNFL } from "@/context/NFLContext";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { membership, signOut } = useAuth();
  const { season, isLoading, isSyncing, syncError, getPlayerTeam, getWeekGames, simulateWeek, getStandings } = useNFL();

  const [simulating, setSimulating] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const team = getPlayerTeam();
  const weekGames = useMemo(() => getWeekGames(season?.currentWeek ?? 1), [season, getWeekGames]);
  const myGame = useMemo(() =>
    weekGames.find(g => g.homeTeamId === season?.playerTeamId || g.awayTeamId === season?.playerTeamId),
    [weekGames, season]
  );
  const standings = getStandings(team?.conference);
  const myRank = standings.findIndex(t => t.id === season?.playerTeamId) + 1;

  const role = membership?.role ?? "GM";
  const roleColor = role === "GM" ? colors.nflBlue : role === "Coach" ? colors.nflRed : colors.nflGold;
  const roleIcon = role === "GM" ? "briefcase" : role === "Coach" ? "target" : "search";

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const copyJoinCode = async () => {
    if (!membership?.joinCode) return;
    await Clipboard.setStringAsync(membership.joinCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2500);
  };

  const handleSimulateWeek = async () => {
    if (role === "Scout") {
      Alert.alert("Permission Denied", "Only the GM or Coach can simulate games.");
      return;
    }
    setSimulating(true);
    try { await simulateWeek(); } finally { setSimulating(false); }
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.nflRed} size="large" />
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading franchise...</Text>
      </View>
    );
  }

  const winPct = team ? (team.wins / Math.max(1, team.wins + team.losses)).toFixed(3).replace("0.", ".") : ".000";

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 12, paddingBottom: Platform.OS === "web" ? 120 : 110 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Top header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.season, { color: colors.mutedForeground }]}>NFL {season?.year} Season</Text>
          <Text style={[styles.week, { color: colors.foreground }]}>Week {season?.currentWeek}</Text>
        </View>
        <View style={styles.headerRight}>
          {isSyncing && (
            <View style={[styles.syncBadge, { backgroundColor: colors.nflBlue + "30" }]}>
              <ActivityIndicator color={colors.nflBlue} size="small" style={{ transform: [{ scale: 0.7 }] }} />
              <Text style={[styles.syncText, { color: colors.nflBlue }]}>Syncing</Text>
            </View>
          )}
          {syncError && !isSyncing && (
            <View style={[styles.syncBadge, { backgroundColor: colors.danger + "20" }]}>
              <Feather name="wifi-off" size={10} color={colors.danger} />
              <Text style={[styles.syncText, { color: colors.danger }]}>Offline</Text>
            </View>
          )}
          {!isSyncing && !syncError && membership && (
            <View style={[styles.syncBadge, { backgroundColor: colors.success + "20" }]}>
              <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.syncText, { color: colors.success }]}>Live</Text>
            </View>
          )}
          <TouchableOpacity
            onPress={() => Alert.alert("Sign Out", "Leave this session?", [{ text: "Cancel" }, { text: "Sign Out", style: "destructive", onPress: signOut }])}
            style={[styles.avatarBtn, { backgroundColor: roleColor + "30", borderColor: roleColor }]}
          >
            <Feather name={roleIcon as any} size={14} color={roleColor} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Franchise / Multiplayer Card */}
      {membership ? (
        <View style={[styles.franchiseCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.franchiseTop}>
            <View style={[styles.rolePill, { backgroundColor: roleColor + "25", borderColor: roleColor }]}>
              <Feather name={roleIcon as any} size={12} color={roleColor} />
              <Text style={[styles.rolePillText, { color: roleColor }]}>{role}</Text>
            </View>
            <Text style={[styles.franchiseName, { color: colors.foreground }]} numberOfLines={1}>{membership.franchiseName}</Text>
            <Text style={[styles.displayName, { color: colors.mutedForeground }]}>{membership.displayName}</Text>
          </View>
          {/* Join code */}
          <TouchableOpacity
            onPress={copyJoinCode}
            style={[styles.joinCodeRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}
          >
            <Feather name="hash" size={14} color={colors.nflGold} />
            <Text style={[styles.joinCodeLabel, { color: colors.mutedForeground }]}>Invite Code</Text>
            <Text style={[styles.joinCode, { color: colors.nflGold }]}>{membership.joinCode}</Text>
            <Feather name={codeCopied ? "check" : "copy"} size={14} color={codeCopied ? colors.success : colors.mutedForeground} />
            {codeCopied && <Text style={[styles.copiedText, { color: colors.success }]}>Copied!</Text>}
          </TouchableOpacity>
          <Text style={[styles.inviteHint, { color: colors.mutedForeground }]}>
            Share this code with friends to join as GM, Coach, or Scout
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          onPress={() => router.push("/franchise")}
          style={[styles.franchiseCard, { backgroundColor: colors.nflBlue + "15", borderColor: colors.nflBlue + "50" }]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Feather name="users" size={20} color={colors.nflBlue} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.franchiseName, { color: colors.nflBlue }]}>Playing Offline</Text>
              <Text style={[styles.displayName, { color: colors.mutedForeground }]}>Tap to set up Co-GM multiplayer →</Text>
            </View>
          </View>
        </TouchableOpacity>
      )}

      {/* Team card */}
      {team && (
        <View style={[styles.teamCard, { backgroundColor: team.primaryColor + "18", borderColor: team.primaryColor + "55" }]}>
          <View style={styles.teamCardTop}>
            <NFLTeamBadge abbreviation={team.abbreviation} primaryColor={team.primaryColor} size="lg" />
            <View style={styles.teamMeta}>
              <Text style={[styles.teamCity, { color: colors.mutedForeground }]}>{team.city}</Text>
              <Text style={[styles.teamName, { color: colors.foreground }]}>{team.name}</Text>
              <View style={styles.recordRow}>
                <Text style={[styles.record, { color: team.primaryColor }]}>
                  {team.wins}-{team.losses}{team.ties > 0 ? `-${team.ties}` : ""} · {winPct}
                </Text>
                <View style={[styles.confBadge, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.confText, { color: colors.mutedForeground }]}>{team.conference} {team.division}</Text>
                </View>
              </View>
            </View>
          </View>
          <View style={[styles.teamStats, { borderTopColor: team.primaryColor + "30" }]}>
            <StatChip label="Conf Rank" value={`#${myRank}`} color={myRank <= 4 ? colors.nflGold : colors.mutedForeground} />
            <StatChip label="Pts For"   value={`${team.pointsFor}`}     color={colors.success} />
            <StatChip label="Pts Agst"  value={`${team.pointsAgainst}`} color={colors.danger} />
            <StatChip label="Cap Space" value={`$${team.capSpace}M`}    color={colors.nflGold} />
          </View>
        </View>
      )}

      {/* Role-specific panel */}
      {role !== "Scout" && (
        <View style={[styles.roleCard, { backgroundColor: roleColor + "15", borderColor: roleColor + "40" }]}>
          <View style={styles.roleCardHeader}>
            <Feather name={roleIcon as any} size={16} color={roleColor} />
            <Text style={[styles.roleCardTitle, { color: roleColor }]}>
              {role === "GM" ? "GM Dashboard" : "Coaching Staff"}
            </Text>
          </View>
          {role === "GM" ? (
            <View style={styles.roleStats}>
              <RoleStat label="Roster"   value={`${team?.roster.length ?? 0}`} />
              <RoleStat label="Cap Used" value={`$${team?.roster.reduce((s,p)=>s+p.salary,0).toFixed(0)}M`} />
              <RoleStat label="Cap Left" value={`$${team?.capSpace ?? 0}M`} />
              <RoleStat label="Picks"    value={`${team?.draftPicks.length ?? 0}`} />
            </View>
          ) : (
            <View style={styles.roleStats}>
              <RoleStat label="Scheme"    value={team?.offenseScheme ?? "—"} />
              <RoleStat label="Formation" value={team?.defenseFormation ?? "—"} />
              <RoleStat label="Game Plan" value={team?.gamePlan ?? "—"} />
              <RoleStat label="Week"      value={`${season?.currentWeek ?? 1}`} />
            </View>
          )}
          <View style={styles.quickActions}>
            <QuickBtn label={role === "GM" ? "Roster" : "Depth Chart"} icon="users"  color={roleColor} onPress={() => router.push("/(tabs)/roster")} />
            <QuickBtn label={role === "GM" ? "Free Agents" : "Game Plan"} icon={role === "GM" ? "user-plus" : "sliders"} color={colors.success} onPress={() => router.push("/(tabs)/roster")} />
          </View>
        </View>
      )}

      {role === "Scout" && (
        <View style={[styles.roleCard, { backgroundColor: colors.nflGold + "10", borderColor: colors.nflGold + "40" }]}>
          <View style={styles.roleCardHeader}>
            <Feather name="search" size={16} color={colors.nflGold} />
            <Text style={[styles.roleCardTitle, { color: colors.nflGold }]}>Scout View</Text>
          </View>
          <Text style={[styles.scoutDesc, { color: colors.mutedForeground }]}>
            You can view all franchise data and game results. Contact your GM or Coach to make roster and game plan decisions.
          </Text>
        </View>
      )}

      {/* Next Game */}
      {myGame && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Next Game</Text>
          {(() => {
            const home = season!.teams.find(t => t.id === myGame.homeTeamId)!;
            const away = season!.teams.find(t => t.id === myGame.awayTeamId)!;
            return (
              <TouchableOpacity
                onPress={() => router.push({ pathname: "/game/[id]", params: { id: myGame.id } })}
                activeOpacity={0.8}
                style={[styles.gameCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.gameCardInner}>
                  <View style={styles.gameTeamSide}>
                    <NFLTeamBadge abbreviation={home.abbreviation} primaryColor={home.primaryColor} size="sm" />
                    <Text style={[styles.gameTeamName, { color: colors.foreground }]} numberOfLines={1}>{home.name}</Text>
                  </View>
                  <View style={styles.gameCenterCol}>
                    {myGame.status === "final"
                      ? <Text style={[styles.gameScore, { color: colors.foreground }]}>{myGame.homeScore}–{myGame.awayScore}</Text>
                      : <><Text style={[styles.gameVs, { color: colors.mutedForeground }]}>vs</Text><Text style={[styles.gameWeekLabel, { color: colors.mutedForeground }]}>Week {myGame.week}</Text></>}
                    <Text style={[styles.gameStatus, { color: myGame.status === "final" ? colors.success : colors.warning }]}>
                      {myGame.status === "final" ? "FINAL" : "UPCOMING"}
                    </Text>
                  </View>
                  <View style={[styles.gameTeamSide, { alignItems: "flex-end" }]}>
                    <NFLTeamBadge abbreviation={away.abbreviation} primaryColor={away.primaryColor} size="sm" />
                    <Text style={[styles.gameTeamName, { color: colors.foreground, textAlign: "right" }]} numberOfLines={1}>{away.name}</Text>
                  </View>
                </View>
                <View style={[styles.simulateHint, { borderTopColor: colors.border }]}>
                  <Feather name={myGame.status === "final" ? "eye" : "play-circle"} size={14} color={colors.nflRed} />
                  <Text style={[styles.simulateHintText, { color: colors.nflRed }]}>
                    {myGame.status === "final" ? "View Play-by-Play" : "Watch Play-by-Play"}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })()}
        </View>
      )}

      {/* Sim Week */}
      {season && season.currentWeek <= season.totalWeeks && weekGames.some(g => g.status === "upcoming") && (
        <TouchableOpacity
          onPress={handleSimulateWeek}
          disabled={simulating || role === "Scout"}
          activeOpacity={0.8}
          style={[styles.simWeekBtn, { backgroundColor: simulating ? colors.secondary : role === "Scout" ? colors.secondary : colors.nflRed }]}
        >
          {simulating
            ? <ActivityIndicator color={colors.mutedForeground} size="small" />
            : <Feather name="fast-forward" size={18} color={role === "Scout" ? colors.mutedForeground : "#fff"} />}
          <Text style={[styles.simWeekText, { color: simulating || role === "Scout" ? colors.mutedForeground : "#fff" }]}>
            {simulating ? "Simulating Week..." : role === "Scout" ? `Sim Week ${season.currentWeek} (GM/Coach only)` : `Sim All Week ${season.currentWeek} Games`}
          </Text>
        </TouchableOpacity>
      )}

      {/* Conference Standings Snapshot */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{team?.conference ?? "AFC"} Standings</Text>
        {standings.slice(0, 6).map((t, idx) => (
          <View key={t.id} style={[styles.standingRow, { borderBottomColor: colors.border, backgroundColor: t.id === season?.playerTeamId ? t.primaryColor + "15" : "transparent" }]}>
            <Text style={[styles.standingPos, { color: idx < 3 ? colors.nflGold : colors.mutedForeground }]}>{idx + 1}</Text>
            <NFLTeamBadge abbreviation={t.abbreviation} primaryColor={t.primaryColor} size="xs" />
            <Text style={[styles.standingName, { color: t.id === season?.playerTeamId ? t.primaryColor : colors.foreground }]} numberOfLines={1}>{t.city} {t.name}</Text>
            <Text style={[styles.standingRecord, { color: colors.mutedForeground }]}>{t.wins}-{t.losses}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function StatChip({ label, value, color }: { label: string; value: string; color: string }) {
  const colors = useColors();
  return (
    <View style={{ alignItems: "center", gap: 2, flex: 1 }}>
      <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color }}>{value}</Text>
      <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>{label}</Text>
    </View>
  );
}

function RoleStat({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={{ alignItems: "center", gap: 2, flex: 1 }}>
      <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>{value}</Text>
      <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>{label}</Text>
    </View>
  );
}

function QuickBtn({ label, icon, color, onPress }: { label: string; icon: any; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[qbStyles.btn, { backgroundColor: color + "20", borderColor: color + "50" }]}>
      <Feather name={icon} size={14} color={color} />
      <Text style={[qbStyles.label, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}
const qbStyles = StyleSheet.create({
  btn:   { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, flex: 1 },
  label: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});

const styles = StyleSheet.create({
  center:        { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText:   { fontSize: 14, fontFamily: "Inter_400Regular" },
  content:       { paddingHorizontal: 18 },
  headerRow:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  headerRight:   { flexDirection: "row", alignItems: "center", gap: 8 },
  season:        { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 1 },
  week:          { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  syncBadge:     { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  syncText:      { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  liveDot:       { width: 6, height: 6, borderRadius: 3 },
  avatarBtn:     { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  franchiseCard: { borderRadius: 14, padding: 14, borderWidth: 1.5, marginBottom: 14 },
  franchiseTop:  { marginBottom: 10 },
  rolePill:      { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, marginBottom: 6 },
  rolePillText:  { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  franchiseName: { fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: -0.2 },
  displayName:   { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  joinCodeRow:   { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, marginTop: 4 },
  joinCodeLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  joinCode:      { fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: 4, flex: 1 },
  copiedText:    { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  inviteHint:    { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 6 },
  teamCard:      { borderRadius: 16, padding: 16, borderWidth: 1.5, marginBottom: 14 },
  teamCardTop:   { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14 },
  teamMeta:      { flex: 1 },
  teamCity:      { fontSize: 12, fontFamily: "Inter_500Medium" },
  teamName:      { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  recordRow:     { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 3 },
  record:        { fontSize: 15, fontFamily: "Inter_700Bold" },
  confBadge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  confText:      { fontSize: 10, fontFamily: "Inter_500Medium" },
  teamStats:     { flexDirection: "row", paddingTop: 12, borderTopWidth: 1 },
  roleCard:      { borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 14 },
  roleCardHeader:{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  roleCardTitle: { fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  roleStats:     { flexDirection: "row", marginBottom: 12 },
  quickActions:  { flexDirection: "row", gap: 8 },
  scoutDesc:     { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  section:       { marginBottom: 20 },
  sectionTitle:  { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 10, letterSpacing: -0.2 },
  gameCard:      { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  gameCardInner: { flexDirection: "row", alignItems: "center", padding: 14 },
  gameTeamSide:  { flex: 1, alignItems: "flex-start", gap: 6 },
  gameTeamName:  { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  gameCenterCol: { alignItems: "center", paddingHorizontal: 12 },
  gameScore:     { fontSize: 24, fontFamily: "Inter_700Bold" },
  gameVs:        { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  gameWeekLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  gameStatus:    { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1, marginTop: 2 },
  simulateHint:  { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 10, borderTopWidth: 1 },
  simulateHintText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  simWeekBtn:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 15, borderRadius: 14, marginBottom: 20 },
  simWeekText:   { fontSize: 15, fontFamily: "Inter_700Bold" },
  standingRow:   { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 1 },
  standingPos:   { fontSize: 14, fontFamily: "Inter_700Bold", width: 22 },
  standingName:  { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  standingRecord:{ fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
