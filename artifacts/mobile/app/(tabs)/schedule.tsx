import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
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
import { NFLGame, NFLTeam, useNFL } from "@/context/NFLContext";

export default function ScheduleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { season, getWeekGames } = useNFL();
  const [selectedWeek, setSelectedWeek] = useState(season?.currentWeek ?? 1);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const totalWeeks = season?.totalWeeks ?? 18;
  const weekGames = useMemo(() => getWeekGames(selectedWeek), [selectedWeek, getWeekGames]);
  const myTeamId = season?.playerTeamId;

  const completedCount = weekGames.filter(g => g.status === "final").length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Schedule</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekScroll} style={{ marginTop: 10 }}>
          {Array.from({ length: totalWeeks }, (_, i) => i + 1).map(w => (
            <TouchableOpacity
              key={w}
              onPress={() => setSelectedWeek(w)}
              style={[
                styles.weekBtn,
                {
                  backgroundColor: w === selectedWeek ? colors.nflRed : colors.card,
                  borderColor: w === season?.currentWeek && w !== selectedWeek ? colors.nflRed + "80" : "transparent",
                  borderWidth: 1,
                },
              ]}
            >
              <Text style={[styles.weekBtnText, { color: w === selectedWeek ? "#fff" : colors.mutedForeground }]}>
                {w}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={[styles.weekInfo, { borderBottomColor: colors.border }]}>
        <Text style={[styles.weekLabel, { color: colors.foreground }]}>
          Week {selectedWeek}
          {selectedWeek === season?.currentWeek ? <Text style={{ color: colors.nflGold }}> · Current</Text> : ""}
        </Text>
        <Text style={[styles.gamesPlayed, { color: colors.mutedForeground }]}>
          {completedCount}/{weekGames.length} final
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === "web" ? 120 : 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {weekGames.map(game => {
          const home = season!.teams.find(t => t.id === game.homeTeamId)!;
          const away = season!.teams.find(t => t.id === game.awayTeamId)!;
          const isMyGame = game.homeTeamId === myTeamId || game.awayTeamId === myTeamId;
          const homeWon = game.status === "final" && game.homeScore > game.awayScore;
          const awayWon = game.status === "final" && game.awayScore > game.homeScore;
          return (
            <GameRow
              key={game.id}
              game={game}
              home={home}
              away={away}
              isMyGame={isMyGame}
              homeWon={homeWon}
              awayWon={awayWon}
              onPress={() => router.push({ pathname: "/game/[id]", params: { id: game.id } })}
            />
          );
        })}

        {weekGames.length === 0 && (
          <View style={styles.empty}>
            <Feather name="calendar" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No games scheduled</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function GameRow({ game, home, away, isMyGame, homeWon, awayWon, onPress }: { game: NFLGame; home: NFLTeam; away: NFLTeam; isMyGame: boolean; homeWon: boolean; awayWon: boolean; onPress: () => void }) {
  const colors = useColors();
  const myTeamId = useNFL().season?.playerTeamId;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.gameRow,
        {
          backgroundColor: colors.card,
          borderColor: isMyGame ? colors.nflGold + "60" : colors.border,
          borderWidth: isMyGame ? 1.5 : 1,
        },
      ]}
    >
      {isMyGame && (
        <View style={[styles.myGameBadge, { backgroundColor: colors.nflGold }]}>
          <Text style={styles.myGameText}>YOUR GAME</Text>
        </View>
      )}

      {/* Away team */}
      <View style={styles.teamSide}>
        <NFLTeamBadge abbreviation={away.abbreviation} primaryColor={away.primaryColor} size="sm" />
        <View style={styles.teamTextBlock}>
          <Text style={[styles.teamCitySmall, { color: colors.mutedForeground }]}>{away.city}</Text>
          <Text style={[styles.teamNameBold, { color: awayWon ? colors.success : colors.foreground }]} numberOfLines={1}>
            {away.name}
          </Text>
          <Text style={[styles.teamRecord, { color: colors.mutedForeground }]}>{away.wins}-{away.losses}</Text>
        </View>
      </View>

      {/* Score / Status */}
      <View style={styles.scoreBlock}>
        {game.status === "final" ? (
          <>
            <Text style={[styles.scoreText, { color: colors.foreground }]}>
              {game.awayScore}–{game.homeScore}
            </Text>
            <Text style={[styles.finalLabel, { color: colors.success }]}>FINAL</Text>
          </>
        ) : (
          <>
            <Text style={[styles.vsText, { color: colors.mutedForeground }]}>@</Text>
            <Text style={[styles.upcomingLabel, { color: colors.warning }]}>UPCOMING</Text>
          </>
        )}
      </View>

      {/* Home team */}
      <View style={[styles.teamSide, { alignItems: "flex-end" }]}>
        <View style={[styles.teamTextBlock, { alignItems: "flex-end" }]}>
          <Text style={[styles.teamCitySmall, { color: colors.mutedForeground }]}>{home.city}</Text>
          <Text style={[styles.teamNameBold, { color: homeWon ? colors.success : colors.foreground }]} numberOfLines={1}>
            {home.name}
          </Text>
          <Text style={[styles.teamRecord, { color: colors.mutedForeground }]}>{home.wins}-{home.losses}</Text>
        </View>
        <NFLTeamBadge abbreviation={home.abbreviation} primaryColor={home.primaryColor} size="sm" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  weekScroll: { gap: 6, paddingRight: 16 },
  weekBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  weekBtnText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  weekInfo: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  weekLabel: { fontSize: 15, fontFamily: "Inter_700Bold" },
  gamesPlayed: { fontSize: 12, fontFamily: "Inter_400Regular" },
  list: { padding: 14, gap: 10 },
  gameRow: { borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 8, overflow: "hidden" },
  myGameBadge: { position: "absolute", top: 0, left: "50%", paddingHorizontal: 10, paddingVertical: 3, borderBottomLeftRadius: 6, borderBottomRightRadius: 6, transform: [{ translateX: -30 }] },
  myGameText: { fontSize: 8, fontFamily: "Inter_700Bold", color: "#000", letterSpacing: 0.5 },
  teamSide: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  teamTextBlock: { flex: 1 },
  teamCitySmall: { fontSize: 10, fontFamily: "Inter_400Regular" },
  teamNameBold: { fontSize: 13, fontFamily: "Inter_700Bold" },
  teamRecord: { fontSize: 10, fontFamily: "Inter_400Regular" },
  scoreBlock: { alignItems: "center", paddingHorizontal: 10 },
  scoreText: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  finalLabel: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  vsText: { fontSize: 20, fontFamily: "Inter_700Bold" },
  upcomingLabel: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  empty: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
