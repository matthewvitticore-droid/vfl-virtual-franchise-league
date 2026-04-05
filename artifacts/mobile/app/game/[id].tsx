import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Animated, FlatList, Platform, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NFLTeamBadge } from "@/components/NFLTeamBadge";
import { PlayByPlayEvent, useNFL } from "@/context/NFLContext";
import { useColors } from "@/hooks/useColors";

const PLAY_DELAY_MS = 320;

type GameTab = "plays" | "boxScore" | "drives" | "stats";

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

function getWeatherIcon(cond: string): any {
  const m: Record<string, any> = { Clear:"sun", Cloudy:"cloud", Wind:"wind", Rain:"cloud-drizzle", Snow:"cloud-snow", Dome:"home" };
  return m[cond] ?? "cloud";
}

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
  const [speed, setSpeed] = useState<"slow" | "fast">("slow");
  const [activeTab, setActiveTab] = useState<GameTab>("plays");
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const listRef = useRef<FlatList>(null);

  const storedGame = season?.games.find(g => g.id === id);
  const game = liveGame ?? storedGame;
  const home = season?.teams.find(t => t.id === game?.homeTeamId);
  const away = season?.teams.find(t => t.id === game?.awayTeamId);
  const playerTeam = season?.teams.find(t => t.id === season.playerTeamId);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    if (simulating) {
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue:1.3, duration:600, useNativeDriver:true }),
        Animated.timing(pulseAnim, { toValue:1, duration:600, useNativeDriver:true }),
      ])).start();
    } else { pulseAnim.stopAnimation(); pulseAnim.setValue(1); }
  }, [simulating]);

  const handleSimulate = useCallback(async () => {
    if (!game || game.status === "final") return;
    setSimulating(true);
    setVisiblePlays([]);
    setLiveScore({ home:0, away:0 });
    setActiveTab("plays");
    try {
      await simulateGame(game.id);
      const updated = season?.games.find(g => g.id === id);
      if (updated) {
        setLiveGame(updated);
        const delay = speed === "fast" ? 60 : PLAY_DELAY_MS;
        for (let i = 0; i < updated.plays.length; i++) {
          const play = updated.plays[i];
          await new Promise<void>(r => setTimeout(r, delay));
          setVisiblePlays(prev => [play, ...prev]);
          setLiveScore({ ...play.score });
          setCurrentPlay(play);
          if (play.isScoring && Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          else if (play.isTurnover && Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      }
    } finally { setSimulating(false); setCurrentPlay(null); }
  }, [game, simulateGame, speed, season, id]);

  if (!game || !home || !away) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.nflRed} />
      </View>
    );
  }

  const displayScore = simulating ? liveScore : { home: game.homeScore, away: game.awayScore };
  const displayPlays = simulating ? visiblePlays : [...(game.plays ?? [])].reverse();
  const isFinal = game.status === "final";
  const homeWon = isFinal && game.homeScore > game.awayScore;
  const awayWon = isFinal && game.awayScore > game.homeScore;
  const homeColor = home.primaryColor;
  const awayColor = away.primaryColor;
  const isPlayerHome = home.id === season?.playerTeamId;
  const isPlayerAway = away.id === season?.playerTeamId;
  const playerColor = isPlayerHome ? homeColor : isPlayerAway ? awayColor : colors.nflBlue;
  const quarter = currentPlay?.quarter ?? (isFinal ? 4 : 1);
  const quarterLabels = ["Q1","Q2","Q3","Q4","OT"];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Score Banner */}
      <View style={[styles.scoreBanner, { backgroundColor: colors.card, paddingTop: topPad + 4, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.secondary }]}>
          <Feather name="chevron-left" size={18} color={colors.foreground} />
        </TouchableOpacity>

        {/* Weather + location */}
        {game.weather && (
          <View style={[styles.weatherStrip, { backgroundColor: colors.secondary }]}>
            <Feather name={getWeatherIcon(game.weather.condition)} size={11} color={colors.mutedForeground} />
            <Text style={[styles.weatherText, { color: colors.mutedForeground }]}>
              {game.location} · {game.weather.condition}
              {game.weather.condition !== "Dome" ? ` · ${game.weather.temperature}°F · ${game.weather.windSpeed}mph` : ""}
            </Text>
          </View>
        )}

        <View style={styles.scoreRow}>
          {/* Away */}
          <View style={styles.teamScoreCol}>
            <NFLTeamBadge abbreviation={away.abbreviation} primaryColor={away.primaryColor} size="md" />
            <Text style={[styles.teamCity, { color: colors.mutedForeground }]}>{away.city}</Text>
            <Text style={[styles.teamName, { color: awayWon ? awayColor : colors.foreground }]}>{away.name}</Text>
            <Text style={[styles.scoreNum, { color: awayWon ? awayColor : colors.foreground }]}>{displayScore.away}</Text>
            {isFinal && <Text style={[styles.recordTag, { color: colors.mutedForeground }]}>{away.wins}-{away.losses}</Text>}
          </View>

          {/* Center */}
          <View style={styles.centerBlock}>
            {simulating ? (
              <>
                <Animated.View style={[styles.liveDot, { backgroundColor: colors.danger, transform: [{ scale: pulseAnim }] }]} />
                <Text style={[styles.liveLabel, { color: colors.danger }]}>LIVE</Text>
                <Text style={[styles.quarterLabel, { color: colors.foreground }]}>{quarterLabels[(quarter - 1)] ?? "OT"}</Text>
              </>
            ) : isFinal ? (
              <Text style={[styles.finalText, { color: colors.success }]}>FINAL</Text>
            ) : (
              <Text style={[styles.vsText, { color: colors.mutedForeground }]}>VS</Text>
            )}
            <Text style={[styles.weekText, { color: colors.mutedForeground }]}>Week {game.week}</Text>
          </View>

          {/* Home */}
          <View style={styles.teamScoreCol}>
            <NFLTeamBadge abbreviation={home.abbreviation} primaryColor={home.primaryColor} size="md" />
            <Text style={[styles.teamCity, { color: colors.mutedForeground }]}>{home.city}</Text>
            <Text style={[styles.teamName, { color: homeWon ? homeColor : colors.foreground }]}>{home.name}</Text>
            <Text style={[styles.scoreNum, { color: homeWon ? homeColor : colors.foreground }]}>{displayScore.home}</Text>
            {isFinal && <Text style={[styles.recordTag, { color: colors.mutedForeground }]}>{home.wins}-{home.losses}</Text>}
          </View>
        </View>

        {/* Down & distance bar during sim */}
        {currentPlay && simulating && currentPlay.down > 0 && (
          <View style={[styles.ddBar, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            {(() => {
              const poss = currentPlay.possession === "home" ? home : away;
              const pc = poss.primaryColor;
              const down = ["1st","2nd","3rd","4th"][currentPlay.down - 1] ?? "4th";
              const yl = currentPlay.yardLine >= 50 ? `OPP ${100 - currentPlay.yardLine}` : `OWN ${currentPlay.yardLine}`;
              return (
                <View style={{ flexDirection:"row", alignItems:"center", gap:8, flex:1 }}>
                  <View style={[styles.ddTeamPill, { backgroundColor: pc + "30", borderColor: pc }]}>
                    <Text style={[styles.ddTeamText, { color: pc }]}>{poss.abbreviation}</Text>
                  </View>
                  <Text style={[styles.ddText, { color: colors.foreground }]}>{down} & {currentPlay.yardsToGo}</Text>
                  <View style={[styles.fieldBar, { backgroundColor: colors.card }]}>
                    <View style={[styles.fieldLine, { left: `${currentPlay.yardLine}%` as any, backgroundColor: pc }]} />
                  </View>
                  <Text style={[styles.ddYardLine, { color: colors.mutedForeground }]}>{yl}</Text>
                </View>
              );
            })()}
          </View>
        )}

        {/* Momentum bar during sim */}
        {currentPlay && simulating && (
          <View style={[styles.momentumRow, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.momentumLabel, { color: awayColor }]}>{away.abbreviation}</Text>
            <View style={[styles.momentumTrack, { backgroundColor: colors.card }]}>
              <View style={[styles.momentumFill, {
                width: `${50 + currentPlay.momentum * 4}%`,
                backgroundColor: currentPlay.momentum >= 0 ? homeColor : awayColor,
              }]} />
              <View style={styles.momentumCenter} />
            </View>
            <Text style={[styles.momentumLabel, { color: homeColor }]}>{home.abbreviation}</Text>
          </View>
        )}
      </View>

      {/* Sim control */}
      {(!isFinal || simulating) ? (
        <View style={[styles.controls, { backgroundColor: colors.secondary, borderBottomColor: colors.border }]}>
          {!simulating ? (
            <>
              <TouchableOpacity onPress={handleSimulate} style={[styles.simBtn, { backgroundColor: playerColor }]}>
                <Feather name="play" size={16} color="#fff" />
                <Text style={styles.simBtnText}>Simulate Game</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setSpeed(s => s === "slow" ? "fast" : "slow")} style={[styles.speedBtn, { borderColor: colors.border }]}>
                <Feather name={speed === "fast" ? "zap" : "clock"} size={13} color={colors.mutedForeground} />
                <Text style={[styles.speedLabel, { color: colors.mutedForeground }]}>{speed === "fast" ? "Fast" : "Slow"}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.simulatingRow}>
              <ActivityIndicator color={colors.nflGold} size="small" />
              <Text style={[styles.simBtnText, { color: colors.nflGold }]}>Game in progress...</Text>
              <TouchableOpacity onPress={() => setSpeed(s => s === "slow" ? "fast" : "slow")} style={[styles.speedBtn, { borderColor: colors.border }]}>
                <Feather name={speed === "fast" ? "zap" : "clock"} size={12} color={colors.mutedForeground} />
                <Text style={[styles.speedLabel, { color: colors.mutedForeground }]}>{speed === "fast" ? "Fast" : "Slow"}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        <View style={[styles.controls, { backgroundColor: colors.secondary, borderBottomColor: colors.border }]}>
          <Text style={[styles.finalBanner, { color: homeWon ? homeColor : awayWon ? awayColor : colors.mutedForeground }]}>
            {homeWon ? `${home.name} WIN` : awayWon ? `${away.name} WIN` : "TIE GAME"} · {game.plays?.length ?? 0} plays
          </Text>
        </View>
      )}

      {/* Tab bar */}
      {isFinal && (
        <View style={[styles.gameTabs, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          {([
            { key:"plays",   label:"Play-by-Play", icon:"radio" },
            { key:"boxScore",label:"Box Score",    icon:"grid" },
            { key:"drives",  label:"Drives",       icon:"arrow-right-circle" },
            { key:"stats",   label:"Stats",        icon:"bar-chart" },
          ] as const).map(t => (
            <TouchableOpacity key={t.key} onPress={() => setActiveTab(t.key as GameTab)}
              style={[styles.gameTab, { borderBottomColor: activeTab===t.key ? playerColor : "transparent" }]}>
              <Feather name={t.icon as any} size={13} color={activeTab===t.key ? playerColor : colors.mutedForeground} />
              <Text style={[styles.gameTabLabel, { color: activeTab===t.key ? playerColor : colors.mutedForeground }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Content */}
      {(activeTab === "plays" || !isFinal) && (
        <FlatList
          ref={listRef}
          data={displayPlays}
          keyExtractor={(item, i) => `${item.id}-${i}`}
          contentContainerStyle={{ padding:12, gap:7, paddingBottom: Platform.OS === "web" ? 120 : 100 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={!simulating ? (
            <View style={styles.emptyState}>
              <Feather name="play-circle" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.mutedForeground }]}>Ready to simulate</Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>Tap Simulate Game to watch this matchup unfold play-by-play</Text>
            </View>
          ) : null}
          renderItem={({ item: play, index }) => {
            const isLive = simulating && index === 0;
            const color = getPlayColor(play.result, colors);
            const icon = getPlayIcon(play.result);
            const isBig = play.isScoring || play.isTurnover;
            const poss = play.possession === "home" ? home : away;
            return (
              <View style={[styles.playCard, {
                backgroundColor: isLive ? color+"15" : isBig ? color+"10" : colors.card,
                borderColor: isLive ? color : isBig ? color+"60" : colors.border,
                borderLeftColor: poss.primaryColor, borderWidth: isLive ? 1.5 : 1, borderLeftWidth: 4,
              }]}>
                <View style={styles.playTopRow}>
                  <View style={[styles.qBadge, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.qBadgeText, { color: colors.mutedForeground }]}>
                      {play.quarter <= 4 ? `Q${play.quarter}` : "OT"} {play.minute}:{String(play.second).padStart(2,"0")}
                    </Text>
                  </View>
                  {play.down > 0 && (
                    <View style={[styles.downBadge, { backgroundColor: poss.primaryColor + "25" }]}>
                      <Text style={[styles.downBadgeText, { color: poss.primaryColor }]}>
                        {["1st","2nd","3rd","4th"][play.down-1] ?? "4th"} & {play.yardsToGo}
                      </Text>
                    </View>
                  )}
                  {play.isInjury && <Feather name="alert-circle" size={13} color={colors.danger} />}
                  <Feather name={icon as any} size={13} color={color} />
                  <Text style={[styles.playScore, { color: colors.foreground }]}>{play.score.away}–{play.score.home}</Text>
                </View>
                <Text style={[styles.playDesc, { color: isBig ? color : colors.foreground, fontFamily: isBig ? "Inter_700Bold" : "Inter_400Regular", fontSize: isBig ? 14 : 13, lineHeight: isBig ? 20 : 18 }]}>
                  {play.description}
                </Text>
                {play.isInjury && play.injuredPlayerName && (
                  <View style={[styles.injuryBanner, { backgroundColor: colors.danger+"15" }]}>
                    <Feather name="alert-circle" size={11} color={colors.danger} />
                    <Text style={[styles.injuryText, { color: colors.danger }]}>{play.injuredPlayerName} injury during the play</Text>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}

      {/* Box Score tab */}
      {activeTab === "boxScore" && isFinal && (
        <ScrollView contentContainerStyle={{ padding:16, paddingBottom:100 }}>
          {[
            { label:"Passing Yards", home: game.stats.home.passingYards, away: game.stats.away.passingYards },
            { label:"Rushing Yards", home: game.stats.home.rushingYards, away: game.stats.away.rushingYards },
            { label:"Total Yards",   home: game.stats.home.totalYards,   away: game.stats.away.totalYards },
            { label:"First Downs",   home: game.stats.home.firstDowns,   away: game.stats.away.firstDowns },
            { label:"Turnovers",     home: game.stats.home.turnovers,    away: game.stats.away.turnovers, invert:true },
            { label:"Sacks",         home: game.stats.home.sacks,        away: game.stats.away.sacks },
            { label:"3rd Down",      home: `${game.stats.home.thirdDownConversions}/${game.stats.home.thirdDownAttempts}`, away: `${game.stats.away.thirdDownConversions}/${game.stats.away.thirdDownAttempts}` },
          ].map(row => (
            <View key={row.label} style={[styles.boxRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.boxStat, { color: colors.foreground }]}>{row.home}</Text>
              <Text style={[styles.boxLabel, { color: colors.mutedForeground }]}>{row.label}</Text>
              <Text style={[styles.boxStat, { color: colors.foreground, textAlign:"right" }]}>{row.away}</Text>
            </View>
          ))}

          <View style={[styles.scoreSummaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.scoreSumTitle, { color: colors.mutedForeground }]}>FINAL SCORE</Text>
            <View style={styles.scoreSumRow}>
              <View style={{ alignItems:"center", flex:1 }}>
                <NFLTeamBadge abbreviation={away.abbreviation} primaryColor={away.primaryColor} size="sm" />
                <Text style={[styles.scoreSumTeam, { color: awayWon ? awayColor : colors.mutedForeground }]}>{away.abbreviation}</Text>
                <Text style={[styles.scoreSumNum, { color: awayWon ? awayColor : colors.foreground }]}>{game.awayScore}</Text>
              </View>
              <Text style={[styles.scoreSumVs, { color: colors.mutedForeground }]}>—</Text>
              <View style={{ alignItems:"center", flex:1 }}>
                <NFLTeamBadge abbreviation={home.abbreviation} primaryColor={home.primaryColor} size="sm" />
                <Text style={[styles.scoreSumTeam, { color: homeWon ? homeColor : colors.mutedForeground }]}>{home.abbreviation}</Text>
                <Text style={[styles.scoreSumNum, { color: homeWon ? homeColor : colors.foreground }]}>{game.homeScore}</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Drive Chart tab */}
      {activeTab === "drives" && isFinal && (
        <ScrollView contentContainerStyle={{ padding:16, paddingBottom:100 }}>
          {(game.drives ?? []).map((drive, i) => {
            const driveTeam = drive.teamId === home.id ? home : away;
            const tc = driveTeam.primaryColor;
            const resultColors: Record<string, string> = {
              TD: colors.nflGold, FG: colors.success, Punt: colors.mutedForeground,
              Turnover: colors.danger, "Turnover on Downs": colors.nflRed,
            };
            const rc = resultColors[drive.result] ?? colors.mutedForeground;
            return (
              <View key={drive.id} style={[styles.driveCard, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: tc }]}>
                <View style={styles.driveTop}>
                  <View style={[styles.drivePill, { backgroundColor: tc+"25", borderColor: tc }]}>
                    <Text style={[styles.drivePillText, { color: tc }]}>{driveTeam.abbreviation}</Text>
                  </View>
                  <Text style={[styles.driveQuarter, { color: colors.mutedForeground }]}>Q{drive.quarter}</Text>
                  <View style={{ flex:1 }} />
                  <View style={[styles.driveResult, { backgroundColor: rc+"20" }]}>
                    <Text style={[styles.driveResultText, { color: rc }]}>{drive.result}</Text>
                  </View>
                </View>
                <View style={styles.driveStats}>
                  <DriveStat label="Start" value={`Own ${drive.startYardLine}`} />
                  <DriveStat label="Plays" value={`${drive.plays}`} />
                  <DriveStat label="Yards" value={`${Math.max(0, drive.yards)}`} />
                </View>
                {/* Field position bar */}
                <View style={[styles.driveFieldBar, { backgroundColor: colors.secondary }]}>
                  <View style={[styles.driveFieldFill, { width: `${Math.min(100, Math.max(5, drive.startYardLine + Math.max(0, drive.yards)))}%`, backgroundColor: tc + "60" }]} />
                  <View style={[styles.driveFieldStart, { left: `${drive.startYardLine}%` as any, backgroundColor: tc }]} />
                </View>
              </View>
            );
          })}
          {(game.drives?.length ?? 0) === 0 && (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: colors.mutedForeground }]}>No drive data</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Stats Sheet tab */}
      {activeTab === "stats" && isFinal && (
        <ScrollView contentContainerStyle={{ padding:16, paddingBottom:100 }}>
          <Text style={[styles.statsTitle, { color: colors.foreground }]}>Passing</Text>
          {[...home.roster.filter(p=>p.position==="QB").slice(0,1), ...away.roster.filter(p=>p.position==="QB").slice(0,1)].map(p => (
            <View key={p.id} style={[styles.statPlayerRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flex:1 }}>
                <Text style={[styles.statPlayerName, { color: colors.foreground }]}>{p.name}</Text>
                <Text style={[styles.statPlayerTeam, { color: colors.mutedForeground }]}>
                  {home.roster.some(r=>r.id===p.id) ? home.abbreviation : away.abbreviation} · QB
                </Text>
              </View>
              <StatCell label="YDS" value={`${p.stats.passingYards || irng(150,300)}`} colors={colors} />
              <StatCell label="TD"  value={`${p.stats.passingTDs || irng(0,3)}`} colors={colors} />
              <StatCell label="INT" value={`${p.stats.interceptions || irng(0,2)}`} colors={colors} />
            </View>
          ))}
          <Text style={[styles.statsTitle, { color: colors.foreground, marginTop:14 }]}>Rushing</Text>
          {[...home.roster.filter(p=>p.position==="RB").slice(0,1), ...away.roster.filter(p=>p.position==="RB").slice(0,1)].map(p => (
            <View key={p.id} style={[styles.statPlayerRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flex:1 }}>
                <Text style={[styles.statPlayerName, { color: colors.foreground }]}>{p.name}</Text>
                <Text style={[styles.statPlayerTeam, { color: colors.mutedForeground }]}>
                  {home.roster.some(r=>r.id===p.id) ? home.abbreviation : away.abbreviation} · RB
                </Text>
              </View>
              <StatCell label="YDS" value={`${p.stats.rushingYards || irng(40,120)}`} colors={colors} />
              <StatCell label="ATT" value={`${p.stats.carries || irng(8,22)}`} colors={colors} />
              <StatCell label="TD"  value={`${p.stats.rushingTDs || irng(0,2)}`} colors={colors} />
            </View>
          ))}
          <Text style={[styles.statsTitle, { color: colors.foreground, marginTop:14 }]}>Receiving</Text>
          {[...home.roster.filter(p=>p.position==="WR").slice(0,1), ...away.roster.filter(p=>p.position==="WR").slice(0,1)].map(p => (
            <View key={p.id} style={[styles.statPlayerRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flex:1 }}>
                <Text style={[styles.statPlayerName, { color: colors.foreground }]}>{p.name}</Text>
                <Text style={[styles.statPlayerTeam, { color: colors.mutedForeground }]}>
                  {home.roster.some(r=>r.id===p.id) ? home.abbreviation : away.abbreviation} · WR
                </Text>
              </View>
              <StatCell label="REC" value={`${p.stats.receptions || irng(3,9)}`} colors={colors} />
              <StatCell label="YDS" value={`${p.stats.receivingYards || irng(40,120)}`} colors={colors} />
              <StatCell label="TD"  value={`${p.stats.receivingTDs || irng(0,2)}`} colors={colors} />
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function irng(min: number, max: number) { return Math.round(min + Math.random() * (max - min)); }

function DriveStat({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={{ flex:1, alignItems:"center" }}>
      <Text style={{ fontSize:14, fontFamily:"Inter_700Bold", color:colors.foreground }}>{value}</Text>
      <Text style={{ fontSize:9, fontFamily:"Inter_500Medium", color:colors.mutedForeground }}>{label}</Text>
    </View>
  );
}

function StatCell({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={{ alignItems:"center", minWidth:42 }}>
      <Text style={{ fontSize:14, fontFamily:"Inter_700Bold", color:colors.foreground }}>{value}</Text>
      <Text style={{ fontSize:9, fontFamily:"Inter_500Medium", color:colors.mutedForeground }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex:1 },
  center:          { flex:1, alignItems:"center", justifyContent:"center" },
  scoreBanner:     { borderBottomWidth:1, paddingBottom:8 },
  backBtn:         { position:"absolute", top:8, left:14, width:32, height:32, borderRadius:16, alignItems:"center", justifyContent:"center", zIndex:10 },
  weatherStrip:    { flexDirection:"row", alignItems:"center", gap:5, paddingHorizontal:52, paddingVertical:5, marginBottom:4 },
  weatherText:     { fontSize:11, fontFamily:"Inter_400Regular", flex:1 },
  scoreRow:        { flexDirection:"row", alignItems:"flex-end", paddingHorizontal:14, paddingBottom:8 },
  teamScoreCol:    { flex:1, alignItems:"center", gap:2 },
  teamCity:        { fontSize:10, fontFamily:"Inter_400Regular" },
  teamName:        { fontSize:12, fontFamily:"Inter_700Bold", textAlign:"center" },
  scoreNum:        { fontSize:42, fontFamily:"Inter_700Bold", letterSpacing:-1 },
  recordTag:       { fontSize:10, fontFamily:"Inter_500Medium" },
  centerBlock:     { alignItems:"center", justifyContent:"flex-end", paddingHorizontal:10, paddingBottom:6, gap:2 },
  liveDot:         { width:10, height:10, borderRadius:5 },
  liveLabel:       { fontSize:10, fontFamily:"Inter_700Bold", letterSpacing:1 },
  quarterLabel:    { fontSize:14, fontFamily:"Inter_700Bold" },
  finalText:       { fontSize:12, fontFamily:"Inter_700Bold", letterSpacing:1 },
  vsText:          { fontSize:18, fontFamily:"Inter_700Bold" },
  weekText:        { fontSize:10, fontFamily:"Inter_400Regular" },
  ddBar:           { marginHorizontal:14, borderRadius:8, padding:8, borderWidth:1, marginBottom:6, flexDirection:"row", alignItems:"center" },
  ddTeamPill:      { paddingHorizontal:7, paddingVertical:2, borderRadius:5, borderWidth:1 },
  ddTeamText:      { fontSize:10, fontFamily:"Inter_700Bold" },
  ddText:          { fontSize:13, fontFamily:"Inter_700Bold" },
  fieldBar:        { flex:1, height:6, borderRadius:3, overflow:"hidden", position:"relative" },
  fieldLine:       { position:"absolute", width:2, height:"100%", top:0 },
  ddYardLine:      { fontSize:10, fontFamily:"Inter_400Regular" },
  momentumRow:     { flexDirection:"row", alignItems:"center", gap:8, marginHorizontal:14, borderRadius:6, paddingHorizontal:8, paddingVertical:4, marginBottom:4 },
  momentumLabel:   { fontSize:10, fontFamily:"Inter_700Bold", width:30 },
  momentumTrack:   { flex:1, height:4, borderRadius:2, overflow:"hidden" },
  momentumFill:    { height:"100%", borderRadius:2 },
  momentumCenter:  { position:"absolute", left:"50%", width:1, height:"100%", backgroundColor:"#ffffff40", top:0 },
  controls:        { flexDirection:"row", alignItems:"center", paddingHorizontal:14, paddingVertical:10, gap:10, borderBottomWidth:1 },
  simBtn:          { flex:1, flexDirection:"row", alignItems:"center", justifyContent:"center", gap:8, paddingVertical:12, borderRadius:12 },
  simBtnText:      { fontSize:15, fontFamily:"Inter_700Bold", color:"#fff" },
  speedBtn:        { flexDirection:"row", alignItems:"center", gap:4, paddingHorizontal:10, paddingVertical:10, borderRadius:9, borderWidth:1 },
  speedLabel:      { fontSize:11, fontFamily:"Inter_500Medium" },
  simulatingRow:   { flex:1, flexDirection:"row", alignItems:"center", gap:10 },
  finalBanner:     { flex:1, textAlign:"center", fontSize:13, fontFamily:"Inter_700Bold", letterSpacing:0.3 },
  gameTabs:        { flexDirection:"row", borderBottomWidth:1 },
  gameTab:         { flex:1, alignItems:"center", paddingVertical:9, flexDirection:"row", justifyContent:"center", gap:4, borderBottomWidth:2.5 },
  gameTabLabel:    { fontSize:11, fontFamily:"Inter_600SemiBold" },
  emptyState:      { alignItems:"center", paddingVertical:60, gap:12, paddingHorizontal:30 },
  emptyTitle:      { fontSize:16, fontFamily:"Inter_700Bold" },
  emptySubtitle:   { fontSize:13, fontFamily:"Inter_400Regular", textAlign:"center" },
  playCard:        { borderRadius:12, padding:12, gap:7 },
  playTopRow:      { flexDirection:"row", alignItems:"center", gap:6 },
  qBadge:          { paddingHorizontal:7, paddingVertical:3, borderRadius:6 },
  qBadgeText:      { fontSize:10, fontFamily:"Inter_600SemiBold" },
  downBadge:       { paddingHorizontal:7, paddingVertical:3, borderRadius:6 },
  downBadgeText:   { fontSize:10, fontFamily:"Inter_700Bold" },
  playScore:       { marginLeft:"auto", fontSize:14, fontFamily:"Inter_700Bold" },
  playDesc:        {},
  injuryBanner:    { flexDirection:"row", alignItems:"center", gap:5, padding:6, borderRadius:6, marginTop:2 },
  injuryText:      { fontSize:11, fontFamily:"Inter_500Medium" },
  boxRow:          { flexDirection:"row", alignItems:"center", justifyContent:"space-between", padding:12, borderRadius:10, borderWidth:1, marginBottom:6 },
  boxStat:         { fontSize:16, fontFamily:"Inter_700Bold", flex:1 },
  boxLabel:        { fontSize:12, fontFamily:"Inter_400Regular", flex:1, textAlign:"center" },
  scoreSummaryCard:{ borderRadius:14, borderWidth:1, padding:16, marginTop:8 },
  scoreSumTitle:   { fontSize:10, fontFamily:"Inter_600SemiBold", letterSpacing:1, textAlign:"center", marginBottom:10 },
  scoreSumRow:     { flexDirection:"row", alignItems:"center" },
  scoreSumVs:      { fontSize:24, fontFamily:"Inter_700Bold", paddingHorizontal:20 },
  scoreSumTeam:    { fontSize:12, fontFamily:"Inter_700Bold", marginTop:4 },
  scoreSumNum:     { fontSize:40, fontFamily:"Inter_700Bold" },
  driveCard:       { borderRadius:12, borderWidth:1, borderLeftWidth:4, padding:12, marginBottom:8, gap:8 },
  driveTop:        { flexDirection:"row", alignItems:"center", gap:8 },
  drivePill:       { paddingHorizontal:7, paddingVertical:2, borderRadius:5, borderWidth:1 },
  drivePillText:   { fontSize:11, fontFamily:"Inter_700Bold" },
  driveQuarter:    { fontSize:12, fontFamily:"Inter_400Regular" },
  driveResult:     { paddingHorizontal:8, paddingVertical:3, borderRadius:6 },
  driveResultText: { fontSize:11, fontFamily:"Inter_700Bold" },
  driveStats:      { flexDirection:"row" },
  driveFieldBar:   { height:6, borderRadius:3, overflow:"hidden", position:"relative" },
  driveFieldFill:  { height:"100%", borderRadius:3 },
  driveFieldStart: { position:"absolute", width:2, height:"100%", top:0 },
  statsTitle:      { fontSize:15, fontFamily:"Inter_700Bold", marginBottom:8 },
  statPlayerRow:   { flexDirection:"row", alignItems:"center", padding:12, borderRadius:10, borderWidth:1, marginBottom:6, gap:10 },
  statPlayerName:  { fontSize:13, fontFamily:"Inter_600SemiBold" },
  statPlayerTeam:  { fontSize:11, fontFamily:"Inter_400Regular", marginTop:1 },
});
