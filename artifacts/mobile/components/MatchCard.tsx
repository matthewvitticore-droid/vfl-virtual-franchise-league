import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { Match, Team } from "@/context/GameContext";
import { TeamBadge } from "./TeamBadge";

interface MatchCardProps {
  match: Match;
  homeTeam: Team;
  awayTeam: Team;
  isPlayerMatch?: boolean;
  onPress?: () => void;
}

export function MatchCard({ match, homeTeam, awayTeam, isPlayerMatch, onPress }: MatchCardProps) {
  const colors = useColors();

  const isCompleted = match.status === "completed";
  const homeWon = isCompleted && match.homeScore > match.awayScore;
  const awayWon = isCompleted && match.awayScore > match.homeScore;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isPlayerMatch ? colors.primary + "50" : colors.border,
          borderWidth: isPlayerMatch ? 1.5 : 1,
        },
      ]}
    >
      {isPlayerMatch && (
        <View style={[styles.playerBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.playerBadgeText}>YOUR MATCH</Text>
        </View>
      )}

      <View style={styles.row}>
        <View style={styles.teamSide}>
          <TeamBadge shortName={homeTeam.shortName} color={homeTeam.color} size="sm" />
          <Text
            style={[styles.teamName, { color: homeWon ? colors.success : colors.foreground }]}
            numberOfLines={1}
          >
            {homeTeam.name}
          </Text>
        </View>

        <View style={styles.scoreBox}>
          {isCompleted ? (
            <Text style={[styles.score, { color: colors.foreground }]}>
              {match.homeScore} - {match.awayScore}
            </Text>
          ) : (
            <Text style={[styles.upcoming, { color: colors.mutedForeground }]}>vs</Text>
          )}
        </View>

        <View style={[styles.teamSide, styles.teamSideRight]}>
          <Text
            style={[styles.teamName, { color: awayWon ? colors.success : colors.foreground, textAlign: "right" }]}
            numberOfLines={1}
          >
            {awayTeam.name}
          </Text>
          <TeamBadge shortName={awayTeam.shortName} color={awayTeam.color} size="sm" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    overflow: "hidden",
  },
  playerBadge: {
    position: "absolute",
    top: 0,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  playerBadgeText: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    color: "#000",
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  teamSide: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  teamSideRight: {
    justifyContent: "flex-end",
  },
  teamName: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  scoreBox: {
    paddingHorizontal: 16,
    alignItems: "center",
  },
  score: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  upcoming: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});
