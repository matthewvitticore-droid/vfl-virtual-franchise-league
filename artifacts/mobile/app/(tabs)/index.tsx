import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NFLTeamBadge } from "@/components/NFLTeamBadge";
import { RoleToggle } from "@/components/RoleToggle";
import { useColors } from "@/hooks/useColors";
import { useNFL } from "@/context/NFLContext";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { season, isLoading, getPlayerTeam, getWeekGames, simulateWeek, getStandings, activeRole } = useNFL();
  const [simulating, setSimulating] = React.useState(false);

  const team = getPlayerTeam();
  const weekGames = useMemo(() => getWeekGames(season?.currentWeek ?? 1), [season, getWeekGames]);
  const myGame = useMemo(() =>
    weekGames.find(g => g.homeTeamId === season?.playerTeamId || g.awayTeamId === season?.playerTeamId),
    [weekGames, season]
  );
  const standings = getStandings(team?.conference);
  const myRank = standings.findIndex(t => t.id === season?.playerTeamId) + 1;

  const handleSimulateWeek = async () => {
    setSimulating(true);
    try { await simulateWeek(); } finally { setSimulating(false); }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.nflRed} size="large" />
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading franchise...</Text>
      </View>
    );
  }

  const winPct = team ? (team.wins / Math.max(1, team.wins + team.losses)).toFixed(3).replace("0.", ".") : ".000";
  const capUsed = team ? team.roster.reduce((s, p) => s + p.salary, 0).toFixed(1) : "0";

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 12, paddingBottom: Platform.OS === "web" ? 120 : 110 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.season, { color: colors.mutedForeground }]}>NFL {season?.year} Season</Text>
          <Text style={[styles.week, { color: colors.foreground }]}>Week {season?.currentWeek}</Text>
        </View>
        <View style={[styles.weekPill, { backgroundColor: colors.nflBlue }]}>
          <Text style={styles.weekPillText}>W{season?.currentWeek}</Text>
        </View>
      </View>

      {/* Role Toggle */}
      <View style={styles.roleRow}>
        <RoleToggle />
      </View>

      {/* Team Card */}
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
            <StatChip label="Rank" value={`#${myRank}`} color={myRank <= 3 ? colors.nflGold : colors.mutedForeground} />
            <StatChip label="Pts For" value={`${team.pointsFor}`} color={colors.success} />
            <StatChip label="Pts Against" value={`${team.pointsAgainst}`} color={colors.danger} />
            <StatChip label="Cap Space" value={`$${team.capSpace}M`} color={colors.nflGold} />
          </View>
        </View>
      )}

      {/* Role-specific quick info */}
      {activeRole === "GM" ? (
        <View style={[styles.roleCard, { backgroundColor: colors.nflBlue + "18", borderColor: colors.nflBlue + "40" }]}>
          <View style={styles.roleCardHeader}>
            <Feather name="briefcase" size={16} color={colors.nflBlue} />
            <Text style={[styles.roleCardTitle, { color: colors.nflBlue }]}>GM Dashboard</Text>
          </View>
          <View style={styles.roleStats}>
            <RoleStat label="Roster" value={`${team?.roster.length ?? 0} players`} />
            <RoleStat label="Cap Used" value={`$${capUsed}M`} />
            <RoleStat label="Cap Space" value={`$${team?.capSpace ?? 0}M`} />
            <RoleStat label="Draft Picks" value={`${team?.draftPicks.length ?? 0}`} />
          </View>
          <View style={styles.quickActions}>
            <QuickActionBtn label="Manage Roster" icon="users" color={colors.nflBlue} onPress={() => router.push("/(tabs)/roster")} />
            <QuickActionBtn label="Free Agency" icon="user-plus" color={colors.success} onPress={() => router.push("/(tabs)/roster")} />
          </View>
        </View>
      ) : (
        <View style={[styles.roleCard, { backgroundColor: colors.nflRed + "18", borderColor: colors.nflRed + "40" }]}>
          <View style={styles.roleCardHeader}>
            <Feather name="target" size={16} color={colors.nflRed} />
            <Text style={[styles.roleCardTitle, { color: colors.nflRed }]}>Coaching Staff</Text>
          </View>
          <View style={styles.roleStats}>
            <RoleStat label="Offense" value={team?.offenseScheme ?? "Pro-Set"} />
            <RoleStat label="Defense" value={team?.defenseFormation ?? "4-3"} />
            <RoleStat label="Game Plan" value={team?.gamePlan ?? "Balanced"} />
            <RoleStat label="Next Opp" value={myGame ? "Scheduled" : "BYE"} />
          </View>
          <View style={styles.quickActions}>
            <QuickActionBtn label="Depth Chart" icon="list" color={colors.nflRed} onPress={() => router.push("/(tabs)/roster")} />
            <QuickActionBtn label="Game Plan" icon="sliders" color={colors.warning} onPress={() => router.push("/(tabs)/roster")} />
          </View>
        </View>
      )}

      {/* Next Game */}
      {myGame && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Next Game</Text>
          {(() => {
            const home = season!.teams.find(t => t.id === myGame.homeTeamId)!;
            const away = season!.teams.find(t => t.id === myGame.awayTeamId)!;
            const isHome = myGame.homeTeamId === season?.playerTeamId;
            const opp = isHome ? away : home;
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
                    {myGame.status === "final" ? (
                      <Text style={[styles.gameScore, { color: colors.foreground }]}>{myGame.homeScore} – {myGame.awayScore}</Text>
                    ) : (
                      <>
                        <Text style={[styles.gameVs, { color: colors.mutedForeground }]}>vs</Text>
                        <Text style={[styles.gameWeek, { color: colors.mutedForeground }]}>Week {myGame.week}</Text>
                      </>
                    )}
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
                    {myGame.status === "final" ? "View Play-by-Play" : "Simulate & Watch"}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })()}
        </View>
      )}

      {/* Simulate Week Button */}
      {season && season.currentWeek <= season.totalWeeks && weekGames.some(g => g.status === "upcoming") && (
        <TouchableOpacity
          onPress={handleSimulateWeek}
          disabled={simulating}
          activeOpacity={0.8}
          style={[styles.simWeekBtn, { backgroundColor: simulating ? colors.secondary : colors.nflRed }]}
        >
          {simulating ? (
            <ActivityIndicator color={colors.mutedForeground} size="small" />
          ) : (
            <Feather name="fast-forward" size={18} color="#fff" />
          )}
          <Text style={[styles.simWeekText, { color: simulating ? colors.mutedForeground : "#fff" }]}>
            {simulating ? "Simulating Week..." : `Sim All Week ${season.currentWeek} Games`}
          </Text>
        </TouchableOpacity>
      )}

      {/* Conference Snapshot */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{team?.conference ?? "AFC"} Standings</Text>
        {standings.slice(0, 5).map((t, idx) => (
          <View key={t.id} style={[styles.standingRow, { borderBottomColor: colors.border, backgroundColor: t.id === season?.playerTeamId ? t.primaryColor + "18" : "transparent" }]}>
            <Text style={[styles.standingPos, { color: idx === 0 ? colors.nflGold : colors.mutedForeground }]}>{idx + 1}</Text>
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

function QuickActionBtn({ label, icon, color, onPress }: { label: string; icon: any; color: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <TouchableOpacity onPress={onPress} style={[qaStyles.btn, { backgroundColor: color + "20", borderColor: color + "50" }]}>
      <Feather name={icon} size={14} color={color} />
      <Text style={[qaStyles.label, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const qaStyles = StyleSheet.create({
  btn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, flex: 1 },
  label: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  content: { paddingHorizontal: 18 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  season: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 1 },
  week: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  weekPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  weekPillText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff" },
  roleRow: { marginBottom: 14 },
  teamCard: { borderRadius: 16, padding: 16, borderWidth: 1.5, marginBottom: 14 },
  teamCardTop: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14 },
  teamMeta: { flex: 1 },
  teamCity: { fontSize: 12, fontFamily: "Inter_500Medium" },
  teamName: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  recordRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 3 },
  record: { fontSize: 15, fontFamily: "Inter_700Bold" },
  confBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  confText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  teamStats: { flexDirection: "row", paddingTop: 12, borderTopWidth: 1 },
  roleCard: { borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 14 },
  roleCardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  roleCardTitle: { fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  roleStats: { flexDirection: "row", marginBottom: 12 },
  quickActions: { flexDirection: "row", gap: 8 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 10, letterSpacing: -0.2 },
  gameCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  gameCardInner: { flexDirection: "row", alignItems: "center", padding: 14 },
  gameTeamSide: { flex: 1, alignItems: "flex-start", gap: 6 },
  gameTeamName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  gameCenterCol: { alignItems: "center", paddingHorizontal: 12 },
  gameScore: { fontSize: 24, fontFamily: "Inter_700Bold" },
  gameVs: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  gameWeek: { fontSize: 11, fontFamily: "Inter_400Regular" },
  gameStatus: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1, marginTop: 2 },
  simulateHint: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 10, borderTopWidth: 1 },
  simulateHintText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  simWeekBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 15, borderRadius: 14, marginBottom: 20 },
  simWeekText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  standingRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 1 },
  standingPos: { fontSize: 14, fontFamily: "Inter_700Bold", width: 20 },
  standingName: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  standingRecord: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
