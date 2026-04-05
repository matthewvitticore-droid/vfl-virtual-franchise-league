import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MatchCard } from "@/components/MatchCard";
import { SectionHeader } from "@/components/SectionHeader";
import { TeamBadge } from "@/components/TeamBadge";
import { useGame } from "@/context/GameContext";
import { useColors } from "@/hooks/useColors";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { season, isLoading, getPlayerTeam, getLeagueTable, getMatchesForWeek, simulateWeek } = useGame();
  const [refreshing, setRefreshing] = React.useState(false);
  const [simulating, setSimulating] = React.useState(false);

  const playerTeam = getPlayerTeam();
  const table = getLeagueTable();
  const myPosition = useMemo(() => table.findIndex(t => t.id === season?.playerTeamId) + 1, [table, season]);
  const currentWeekMatches = useMemo(() => getMatchesForWeek(season?.currentWeek ?? 1), [season, getMatchesForWeek]);
  const myMatch = useMemo(
    () => currentWeekMatches.find(m => m.homeTeamId === season?.playerTeamId || m.awayTeamId === season?.playerTeamId),
    [currentWeekMatches, season]
  );

  const topTeam = table[0];
  const topThree = table.slice(0, 3);

  const handleSimulateWeek = async () => {
    setSimulating(true);
    try {
      await simulateWeek();
    } finally {
      setSimulating(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Setting up season...</Text>
      </View>
    );
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: Platform.OS === "web" ? 34 + 84 : 100 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>Season Manager</Text>
          <Text style={[styles.weekTitle, { color: colors.foreground }]}>
            Week {season?.currentWeek} / {season?.totalWeeks}
          </Text>
        </View>
        <View style={[styles.weekBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.weekBadgeText}>GW{season?.currentWeek}</Text>
        </View>
      </View>

      {/* Team Card */}
      {playerTeam && (
        <TouchableOpacity
          onPress={() => router.push("/(tabs)/squad")}
          activeOpacity={0.8}
          style={[styles.teamCard, { backgroundColor: playerTeam.color + "22", borderColor: playerTeam.color + "44" }]}
        >
          <View style={styles.teamCardInner}>
            <TeamBadge shortName={playerTeam.shortName} color={playerTeam.color} size="lg" />
            <View style={styles.teamInfo}>
              <Text style={[styles.teamName, { color: colors.foreground }]}>{playerTeam.name}</Text>
              <Text style={[styles.teamPos, { color: colors.mutedForeground }]}>
                {myPosition === 1 ? "1st" : myPosition === 2 ? "2nd" : myPosition === 3 ? "3rd" : `${myPosition}th`} place
              </Text>
              <View style={styles.statRow}>
                <StatChip label="W" value={playerTeam.wins} color={colors.success} />
                <StatChip label="D" value={playerTeam.draws} color={colors.warning} />
                <StatChip label="L" value={playerTeam.losses} color={colors.danger} />
                <StatChip label="Pts" value={playerTeam.points} color={colors.primary} />
              </View>
            </View>
          </View>
        </TouchableOpacity>
      )}

      {/* Simulate Week Button */}
      {season && season.currentWeek <= season.totalWeeks && (
        <TouchableOpacity
          onPress={handleSimulateWeek}
          disabled={simulating}
          activeOpacity={0.8}
          style={[styles.simulateBtn, { backgroundColor: simulating ? colors.secondary : colors.primary }]}
        >
          {simulating ? (
            <ActivityIndicator color={colors.background} size="small" />
          ) : (
            <Feather name="play-circle" size={20} color="#000" />
          )}
          <Text style={[styles.simulateBtnText, { color: simulating ? colors.mutedForeground : "#000" }]}>
            {simulating ? "Simulating..." : `Simulate Week ${season.currentWeek}`}
          </Text>
        </TouchableOpacity>
      )}

      {/* My This Week Match */}
      {myMatch && (
        <View style={styles.section}>
          <SectionHeader title="Your Match" subtitle={`Gameweek ${season?.currentWeek}`} />
          {(() => {
            const home = season!.teams.find(t => t.id === myMatch.homeTeamId)!;
            const away = season!.teams.find(t => t.id === myMatch.awayTeamId)!;
            return (
              <MatchCard
                match={myMatch}
                homeTeam={home}
                awayTeam={away}
                isPlayerMatch
                onPress={() => router.push({ pathname: "/match/[id]", params: { id: myMatch.id } })}
              />
            );
          })()}
        </View>
      )}

      {/* Top 3 */}
      <View style={styles.section}>
        <SectionHeader title="League Leaders" />
        {topThree.map((team, idx) => (
          <View key={team.id} style={[styles.leaderRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.leaderPos, { color: idx === 0 ? colors.gold : idx === 1 ? colors.silver : colors.bronze }]}>
              {idx + 1}
            </Text>
            <TeamBadge shortName={team.shortName} color={team.color} size="sm" />
            <Text style={[styles.leaderName, { color: colors.foreground }]}>{team.name}</Text>
            <View style={styles.leaderStats}>
              <Text style={[styles.leaderPts, { color: colors.primary }]}>{team.points}</Text>
              <Text style={[styles.leaderPtsLabel, { color: colors.mutedForeground }]}>pts</Text>
            </View>
          </View>
        ))}
      </View>

      {/* This Week's Other Fixtures */}
      {currentWeekMatches.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="This Week's Fixtures" />
          {currentWeekMatches.map(m => {
            const home = season!.teams.find(t => t.id === m.homeTeamId)!;
            const away = season!.teams.find(t => t.id === m.awayTeamId)!;
            return (
              <MatchCard
                key={m.id}
                match={m}
                homeTeam={home}
                awayTeam={away}
                isPlayerMatch={m.homeTeamId === season?.playerTeamId || m.awayTeamId === season?.playerTeamId}
                onPress={() => router.push({ pathname: "/match/[id]", params: { id: m.id } })}
              />
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[chipStyles.chip, { backgroundColor: color + "22" }]}>
      <Text style={[chipStyles.label, { color }]}>{label}</Text>
      <Text style={[chipStyles.value, { color }]}>{value}</Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  label: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  value: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
});

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  content: {
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  greeting: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  weekTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
    marginTop: 2,
  },
  weekBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  weekBadgeText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#000",
  },
  teamCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  teamCardInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  teamInfo: {
    flex: 1,
    gap: 4,
  },
  teamName: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  teamPos: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  statRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  simulateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 24,
  },
  simulateBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  section: {
    marginBottom: 24,
  },
  leaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  leaderPos: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    width: 24,
    textAlign: "center",
  },
  leaderName: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  leaderStats: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  leaderPts: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  leaderPtsLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
});
