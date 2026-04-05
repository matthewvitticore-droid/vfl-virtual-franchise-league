import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NFLTeamBadge } from "@/components/NFLTeamBadge";
import { PlayByPlayEvent, useNFL } from "@/context/NFLContext";
import { useColors } from "@/hooks/useColors";

const PLAY_DELAY_MS = 340;

function getPlayIcon(result: string) {
  if (result === "touchdown") return "zap";
  if (result === "interception" || result === "fumble") return "alert-triangle";
  if (result === "sack") return "x-circle";
  if (result === "fieldGoalGood") return "check-circle";
  if (result === "fieldGoalMiss") return "x-circle";
  if (result === "incomplete") return "minus-circle";
  return "chevron-right";
}

function getPlayColor(result: string, colors: ReturnType<typeof useColors>) {
  if (result === "touchdown") return colors.nflGold;
  if (result === "interception" || result === "fumble") return colors.danger;
  if (result === "sack") return colors.nflRed;
  if (result === "fieldGoalGood") return colors.success;
  if (result === "fieldGoalMiss") return colors.danger;
  if (result === "incomplete" || result === "loss") return colors.mutedForeground;
  return colors.foreground;
}

function DownDistanceBar({ play, homeAbbr, awayAbbr, homeColor, awayColor }: {
  play: PlayByPlayEvent; homeAbbr: string; awayAbbr: string; homeColor: string; awayColor: string;
}) {
  const colors = useColors();
  if (play.down === 0) return null;
  const downs = ["1st", "2nd", "3rd", "4th"];
  const downLabel = downs[play.down - 1] ?? `${play.down}th`;
  const linePos = Math.min(Math.max(play.yardLine, 0), 100);
  const teamColor = play.possession === "home" ? homeColor : awayColor;
  const abbr = play.possession === "home" ? homeAbbr : awayAbbr;

  return (
    <View style={[ddStyles.container, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
      <View style={[ddStyles.pill, { backgroundColor: teamColor + "30", borderColor: teamColor }]}>
        <Text style={[ddStyles.pillText, { color: teamColor }]}>{abbr} ball</Text>
      </View>
      <Text style={[ddStyles.downText, { color: colors.foreground }]}>
        {downLabel} & {play.yardsToGo}
      </Text>
      <View style={[ddStyles.field, { backgroundColor: colors.card }]}>
        <View style={[ddStyles.linePos, { left: `${linePos}%` as any, backgroundColor: teamColor }]} />
        <View style={[ddStyles.fieldEnd, { backgroundColor: colors.nflBlue + "40" }]} />
        <View style={[ddStyles.fieldEnd, { right: 0, backgroundColor: colors.nflRed + "40" }]} />
      </View>
      <Text style={[ddStyles.yardLine, { color: colors.mutedForeground }]}>
        {play.yardLine >= 50 ? `OPP ${100 - play.yardLine}` : `OWN ${play.yardLine}`}
      </Text>
    </View>
  );
}

const ddStyles = StyleSheet.create({
  container: { marginHorizontal: 14, borderRadius: 10, padding: 10, borderWidth: 1, marginBottom: 6 },
  pill: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, marginBottom: 6 },
  pillText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  downText: { fontSize: 13, fontFamily: "Inter_700Bold", marginBottom: 6 },
  field: { height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 4, position: "relative" },
  linePos: { position: "absolute", width: 2, height: "100%", top: 0 },
  fieldEnd: { position: "absolute", width: "10%", height: "100%", top: 0 },
  yardLine: { fontSize: 10, fontFamily: "Inter_400Regular" },
});

export default function GameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { season, simulateGame } = useNFL();
  const [simulating, setSimulating] = useState(false);
  const [visiblePlays, setVisiblePlays] = useState<PlayByPlayEvent[]>([]);
  const [liveScore, setLiveScore] = useState({ home: 0, away: 0 });
  const [liveGame, setLiveGame] = useState<any>(null);
  const [currentPlay, setCurrentPlay] = useState<PlayByPlayEvent | null>(null);
  const [quarter, setQuarter] = useState(1);
  const [speed, setSpeed] = useState<"slow" | "fast">("slow");
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const listRef = useRef<FlatList>(null);

  const storedGame = season?.games.find(g => g.id === id);
  const game = liveGame ?? storedGame;
  const home = season?.teams.find(t => t.id === game?.homeTeamId);
  const away = season?.teams.find(t => t.id === game?.awayTeamId);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    if (simulating) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [simulating]);

  const handleSimulate = useCallback(async () => {
    if (!game || game.status === "final") return;
    setSimulating(true);
    setVisiblePlays([]);
    setLiveScore({ home: 0, away: 0 });

    try {
      const result = await simulateGame(game.id);
      setLiveGame(result);

      const delay = speed === "fast" ? 80 : PLAY_DELAY_MS;
      for (let i = 0; i < result.plays.length; i++) {
        const play = result.plays[i];
        await new Promise<void>(r => setTimeout(r, delay));
        setVisiblePlays(prev => [play, ...prev]);
        setLiveScore({ ...play.score });
        setCurrentPlay(play);
        setQuarter(play.quarter);
        if (play.isScoring && Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } else if (play.isTurnover && Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      }
    } finally {
      setSimulating(false);
      setCurrentPlay(null);
    }
  }, [game, simulateGame, speed]);

  if (!game || !home || !away) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.nflRed} />
      </View>
    );
  }

  const displayScore = simulating ? liveScore : { home: game.homeScore, away: game.awayScore };
  const displayPlays = simulating ? visiblePlays : [...game.plays].reverse();
  const isFinal = game.status === "final";
  const homeWon = isFinal && game.homeScore > game.awayScore;
  const awayWon = isFinal && game.awayScore > game.homeScore;

  const quarterLabels = ["Q1", "Q2", "Q3", "Q4", "OT"];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Score Banner */}
      <View style={[styles.scoreBanner, { backgroundColor: colors.card, paddingTop: topPad + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.secondary }]}>
          <Feather name="x" size={18} color={colors.foreground} />
        </TouchableOpacity>

        <View style={styles.scoreRow}>
          {/* Away */}
          <View style={styles.teamScoreCol}>
            <NFLTeamBadge abbreviation={away.abbreviation} primaryColor={away.primaryColor} size="md" />
            <Text style={[styles.teamCity, { color: colors.mutedForeground }]}>{away.city}</Text>
            <Text style={[styles.teamNameScore, { color: awayWon ? away.primaryColor : colors.foreground }]}>{away.name}</Text>
            <Text style={[styles.teamScoreNum, { color: awayWon ? away.primaryColor : colors.foreground }]}>{displayScore.away}</Text>
          </View>

          {/* Middle */}
          <View style={styles.midBlock}>
            {simulating ? (
              <>
                <Animated.View style={[styles.liveDot, { backgroundColor: colors.danger, transform: [{ scale: pulseAnim }] }]} />
                <Text style={[styles.liveLabel, { color: colors.danger }]}>LIVE</Text>
                <Text style={[styles.quarterLabel, { color: colors.foreground }]}>{quarterLabels[(quarter - 1)] ?? "OT"}</Text>
              </>
            ) : isFinal ? (
              <>
                <Text style={[styles.finalText, { color: colors.mutedForeground }]}>FINAL</Text>
                <Text style={[styles.dashText, { color: colors.mutedForeground }]}>—</Text>
              </>
            ) : (
              <>
                <Text style={[styles.upcomingAt, { color: colors.mutedForeground }]}>Week {game.week}</Text>
                <Text style={[styles.dashText, { color: colors.mutedForeground }]}>vs</Text>
              </>
            )}
          </View>

          {/* Home */}
          <View style={styles.teamScoreCol}>
            <NFLTeamBadge abbreviation={home.abbreviation} primaryColor={home.primaryColor} size="md" />
            <Text style={[styles.teamCity, { color: colors.mutedForeground }]}>{home.city}</Text>
            <Text style={[styles.teamNameScore, { color: homeWon ? home.primaryColor : colors.foreground }]}>{home.name}</Text>
            <Text style={[styles.teamScoreNum, { color: homeWon ? home.primaryColor : colors.foreground }]}>{displayScore.home}</Text>
          </View>
        </View>

        {/* Down & Distance */}
        {currentPlay && simulating && (
          <DownDistanceBar
            play={currentPlay}
            homeAbbr={home.abbreviation}
            awayAbbr={away.abbreviation}
            homeColor={home.primaryColor}
            awayColor={away.primaryColor}
          />
        )}
      </View>

      {/* Simulate Controls */}
      {!isFinal || simulating ? (
        <View style={[styles.controls, { backgroundColor: colors.secondary, borderBottomColor: colors.border }]}>
          {!simulating ? (
            <>
              <TouchableOpacity
                onPress={handleSimulate}
                style={[styles.simBtn, { backgroundColor: colors.nflRed }]}
              >
                <Feather name="play" size={16} color="#fff" />
                <Text style={[styles.simBtnText, { color: "#fff" }]}>Simulate Game</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSpeed(s => s === "slow" ? "fast" : "slow")}
                style={[styles.speedBtn, { borderColor: colors.border }]}
              >
                <Feather name={speed === "fast" ? "zap" : "clock"} size={14} color={colors.mutedForeground} />
                <Text style={[styles.speedText, { color: colors.mutedForeground }]}>{speed === "fast" ? "Fast" : "Slow"}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.simulatingRow}>
              <ActivityIndicator color={colors.nflGold} size="small" />
              <Text style={[styles.simBtnText, { color: colors.nflGold }]}>Game in progress...</Text>
              <TouchableOpacity onPress={() => setSpeed(s => s === "slow" ? "fast" : "slow")} style={[styles.speedBtn, { borderColor: colors.border }]}>
                <Feather name={speed === "fast" ? "zap" : "clock"} size={12} color={colors.mutedForeground} />
                <Text style={[styles.speedText, { color: colors.mutedForeground }]}>{speed === "fast" ? "Fast" : "Slow"}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        <View style={[styles.controls, { backgroundColor: colors.secondary, borderBottomColor: colors.border }]}>
          <Text style={[styles.finalBanner, { color: colors.success }]}>
            {homeWon ? `${home.name} WIN` : awayWon ? `${away.name} WIN` : "TIE GAME"} · {game.plays.length} plays logged
          </Text>
        </View>
      )}

      {/* Play-by-Play Feed */}
      <FlatList
        ref={listRef}
        data={displayPlays}
        keyExtractor={(item, i) => `${item.id}-${i}`}
        contentContainerStyle={{ padding: 12, gap: 8, paddingBottom: Platform.OS === "web" ? 120 : 100 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !simulating ? (
            <View style={styles.emptyState}>
              <Feather name="radio" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.mutedForeground }]}>No plays yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>Hit Simulate to watch the game unfold play by play</Text>
            </View>
          ) : null
        }
        renderItem={({ item: play, index }) => {
          const isLive = simulating && index === 0;
          const color = getPlayColor(play.result, colors);
          const icon = getPlayIcon(play.result);
          const isBig = play.isScoring || play.isTurnover;
          const poss = play.possession === "home" ? home : away;

          return (
            <View style={[
              styles.playCard,
              {
                backgroundColor: isLive ? color + "15" : isBig ? color + "0f" : colors.card,
                borderColor: isLive ? color : isBig ? color + "60" : colors.border,
                borderLeftColor: poss.primaryColor,
                borderWidth: isLive ? 1.5 : 1,
                borderLeftWidth: 3,
              }
            ]}>
              <View style={styles.playTopRow}>
                <View style={[styles.quarterBadge, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.quarterBadgeText, { color: colors.mutedForeground }]}>
                    {play.quarter <= 4 ? `Q${play.quarter}` : "OT"}
                  </Text>
                </View>

                {play.down > 0 && (
                  <View style={[styles.downBadge, { backgroundColor: poss.primaryColor + "25" }]}>
                    <Text style={[styles.downBadgeText, { color: poss.primaryColor }]}>
                      {["1st", "2nd", "3rd", "4th"][play.down - 1] ?? "4th"} & {play.yardsToGo}
                    </Text>
                  </View>
                )}

                <Feather name={icon as any} size={14} color={color} />

                <View style={styles.playScoreRight}>
                  <Text style={[styles.playScoreText, { color: colors.foreground }]}>
                    {play.score.away}–{play.score.home}
                  </Text>
                </View>
              </View>

              <Text style={[
                styles.playDesc,
                {
                  color: isBig ? color : colors.foreground,
                  fontFamily: isBig ? "Inter_700Bold" : "Inter_400Regular",
                  fontSize: isBig ? 14 : 13,
                  lineHeight: isBig ? 20 : 18,
                }
              ]}>
                {play.description}
              </Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scoreBanner: { paddingBottom: 14 },
  backBtn: { position: "absolute", top: 12, right: 14, width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", zIndex: 10 },
  scoreRow: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 14, paddingBottom: 14 },
  teamScoreCol: { flex: 1, alignItems: "center", gap: 3 },
  teamCity: { fontSize: 10, fontFamily: "Inter_400Regular" },
  teamNameScore: { fontSize: 13, fontFamily: "Inter_700Bold", textAlign: "center" },
  teamScoreNum: { fontSize: 44, fontFamily: "Inter_700Bold", letterSpacing: -1 },
  midBlock: { alignItems: "center", justifyContent: "flex-end", paddingHorizontal: 14, paddingBottom: 6, gap: 2 },
  liveDot: { width: 10, height: 10, borderRadius: 5 },
  liveLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  quarterLabel: { fontSize: 16, fontFamily: "Inter_700Bold" },
  finalText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  upcomingAt: { fontSize: 12, fontFamily: "Inter_500Medium" },
  dashText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  controls: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, gap: 10, borderBottomWidth: 1 },
  simBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12 },
  simBtnText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  speedBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  speedText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  simulatingRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  finalBanner: { flex: 1, textAlign: "center", fontSize: 13, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 12, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  emptySubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  playCard: { borderRadius: 12, padding: 12, gap: 8 },
  playTopRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  quarterBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  quarterBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  downBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  downBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  playScoreRight: { marginLeft: "auto" },
  playScoreText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  playDesc: {},
});
