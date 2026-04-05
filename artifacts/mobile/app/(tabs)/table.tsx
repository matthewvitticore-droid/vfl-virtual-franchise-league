import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TeamBadge } from "@/components/TeamBadge";
import { useGame } from "@/context/GameContext";
import { useColors } from "@/hooks/useColors";

export default function TableScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { season, getLeagueTable } = useGame();
  const table = getLeagueTable();

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>League Table</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          After Week {Math.max(0, (season?.currentWeek ?? 1) - 1)}
        </Text>
      </View>

      <View style={[styles.tableHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.colPos, { color: colors.mutedForeground }]}>#</Text>
        <Text style={[styles.colTeam, { color: colors.mutedForeground }]}>Team</Text>
        <Text style={[styles.colStat, { color: colors.mutedForeground }]}>P</Text>
        <Text style={[styles.colStat, { color: colors.mutedForeground }]}>W</Text>
        <Text style={[styles.colStat, { color: colors.mutedForeground }]}>D</Text>
        <Text style={[styles.colStat, { color: colors.mutedForeground }]}>L</Text>
        <Text style={[styles.colStat, { color: colors.mutedForeground }]}>GD</Text>
        <Text style={[styles.colPts, { color: colors.mutedForeground }]}>Pts</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 34 + 84 : 100 }}
      >
        {table.map((team, idx) => {
          const isPlayerTeam = team.id === season?.playerTeamId;
          const gd = team.goalsFor - team.goalsAgainst;
          const played = team.wins + team.draws + team.losses;
          const posColor =
            idx === 0 ? colors.gold :
            idx === 1 ? colors.silver :
            idx === 2 ? colors.bronze :
            idx <= 3 ? colors.accent :
            colors.mutedForeground;

          return (
            <View
              key={team.id}
              style={[
                styles.row,
                {
                  backgroundColor: isPlayerTeam ? colors.primary + "15" : "transparent",
                  borderBottomColor: colors.border,
                  borderLeftColor: isPlayerTeam ? colors.primary : "transparent",
                },
              ]}
            >
              <View style={[styles.posContainer, { borderRightColor: colors.border }]}>
                <Text style={[styles.colPos, { color: posColor }]}>{idx + 1}</Text>
              </View>
              <View style={styles.teamCell}>
                <TeamBadge shortName={team.shortName} color={team.color} size="sm" />
                <Text
                  style={[styles.teamName, { color: isPlayerTeam ? colors.primary : colors.foreground }]}
                  numberOfLines={1}
                >
                  {team.name}
                </Text>
                {isPlayerTeam && (
                  <View style={[styles.youBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.youBadgeText}>YOU</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.colStat, { color: colors.mutedForeground }]}>{played}</Text>
              <Text style={[styles.colStat, { color: colors.success }]}>{team.wins}</Text>
              <Text style={[styles.colStat, { color: colors.warning }]}>{team.draws}</Text>
              <Text style={[styles.colStat, { color: colors.danger }]}>{team.losses}</Text>
              <Text style={[styles.colStat, { color: gd >= 0 ? colors.success : colors.danger }]}>
                {gd > 0 ? `+${gd}` : gd}
              </Text>
              <Text style={[styles.colPts, { color: colors.foreground }]}>{team.points}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderLeftWidth: 3,
  },
  posContainer: {
    width: 28,
    alignItems: "center",
    paddingRight: 8,
    borderRightWidth: 1,
    marginRight: 12,
  },
  colPos: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    width: 20,
    textAlign: "center",
  },
  teamCell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  teamName: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  youBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  youBadgeText: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    color: "#000",
  },
  colStat: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    width: 30,
    textAlign: "center",
  },
  colPts: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    width: 34,
    textAlign: "center",
  },
});
