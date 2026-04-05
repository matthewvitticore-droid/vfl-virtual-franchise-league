import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NFLTeamBadge } from "@/components/NFLTeamBadge";
import { UniformPreview } from "@/components/UniformPreview";
import { useColors } from "@/hooks/useColors";
import { NFLGame, NFLTeam, useNFL } from "@/context/NFLContext";
import { UniformSet } from "@/context/types";

type UniformVariant = "home" | "away" | "alternate";

const UNIFORM_OPTIONS: { key: UniformVariant; label: string; desc: string }[] = [
  { key: "home",      label: "Home",      desc: "Traditional home whites" },
  { key: "away",      label: "Away",      desc: "Road colour jersey" },
  { key: "alternate", label: "Alternate", desc: "Throwback/special edition" },
];

function makeDefaultUniform(primaryColor: string, secondaryColor: string): UniformSet {
  return {
    helmetColor: primaryColor,
    helmetLogoPlacement: "both",
    jerseyStyle: "traditional",
    jerseyColor: primaryColor,
    jerseyAccentColor: secondaryColor,
    numberFont: "block",
    numberColor: secondaryColor,
    numberOutlineColor: "#000000",
    pantColor: primaryColor,
    pantStripeStyle: "none",
    pantStripeColor: secondaryColor,
    sockColor: primaryColor,
    sockAccentColor: secondaryColor,
  };
}

export default function ScheduleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { season, getWeekGames, teamCustomization, setGameDayUniform } = useNFL();
  const [selectedWeek, setSelectedWeek] = useState(season?.currentWeek ?? 1);
  const [uniformGame, setUniformGame] = useState<NFLGame | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const totalWeeks = season?.totalWeeks ?? 18;
  const weekGames = useMemo(() => getWeekGames(selectedWeek), [selectedWeek, getWeekGames]);
  const myTeamId = season?.playerTeamId;

  const completedCount = weekGames.filter(g => g.status === "final").length;

  const myTeam = season?.teams.find(t => t.id === myTeamId);
  const primaryColor = teamCustomization?.primaryColor ?? myTeam?.primaryColor ?? colors.nflBlue;
  const secondaryColor = teamCustomization?.secondaryColor ?? myTeam?.secondaryColor ?? "#ffffff";

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
              onUniformPress={isMyGame && game.status !== "final" ? () => setUniformGame(game) : undefined}
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

      {/* Uniform Picker Modal */}
      <Modal
        visible={!!uniformGame}
        transparent
        animationType="slide"
        onRequestClose={() => setUniformGame(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Game Day Uniform</Text>
              <TouchableOpacity onPress={() => setUniformGame(null)}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
              Choose which uniform set to wear for this game.
            </Text>

            <View style={styles.uniformRow}>
              {UNIFORM_OPTIONS.map(opt => {
                const isSelected = (uniformGame?.gameDayUniform ?? "home") === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    onPress={() => {
                      if (uniformGame) {
                        setGameDayUniform(uniformGame.id, opt.key);
                        setUniformGame(prev => prev ? { ...prev, gameDayUniform: opt.key } : null);
                      }
                    }}
                    style={[
                      styles.uniformOption,
                      {
                        borderColor: isSelected ? primaryColor : colors.border,
                        backgroundColor: isSelected ? primaryColor + "12" : colors.card,
                      },
                    ]}
                  >
                    <UniformPreview
                      uniform={
                        teamCustomization?.uniforms?.[opt.key] ??
                        makeDefaultUniform(primaryColor, secondaryColor)
                      }
                      width={80}
                      height={130}
                    />
                    <Text style={[styles.uniformLabel, { color: isSelected ? primaryColor : colors.foreground }]}>
                      {opt.label}
                    </Text>
                    <Text style={[styles.uniformDesc, { color: colors.mutedForeground }]}>{opt.desc}</Text>
                    {isSelected && (
                      <View style={[styles.selectedCheck, { backgroundColor: primaryColor }]}>
                        <Feather name="check" size={10} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              onPress={() => setUniformGame(null)}
              style={[styles.doneBtn, { backgroundColor: primaryColor }]}
            >
              <Text style={styles.doneBtnText}>Confirm Uniform</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function GameRow({
  game, home, away, isMyGame, homeWon, awayWon, onPress, onUniformPress,
}: {
  game: NFLGame; home: NFLTeam; away: NFLTeam;
  isMyGame: boolean; homeWon: boolean; awayWon: boolean;
  onPress: () => void; onUniformPress?: () => void;
}) {
  const colors = useColors();

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
            {onUniformPress && (
              <TouchableOpacity
                onPress={e => { e.stopPropagation?.(); onUniformPress(); }}
                style={[styles.jerseyBtn, { backgroundColor: colors.nflBlue + "20", borderColor: colors.nflBlue + "50" }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="layers" size={11} color={colors.nflBlue} />
                <Text style={[styles.jerseyBtnText, { color: colors.nflBlue }]}>
                  {game.gameDayUniform ? game.gameDayUniform.toUpperCase() : "UNIFORM"}
                </Text>
              </TouchableOpacity>
            )}
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
  jerseyBtn: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  jerseyBtnText: { fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  empty: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.72)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  modalSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 20 },
  uniformRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  uniformOption: { flex: 1, alignItems: "center", padding: 12, borderRadius: 14, borderWidth: 1.5, gap: 6, position: "relative" },
  uniformLabel: { fontSize: 13, fontFamily: "Inter_700Bold" },
  uniformDesc: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
  selectedCheck: { position: "absolute", top: 8, right: 8, width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  doneBtn: { paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  doneBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
});
