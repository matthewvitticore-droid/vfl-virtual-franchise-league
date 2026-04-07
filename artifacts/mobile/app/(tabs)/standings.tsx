import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NFLTeamBadge } from "@/components/NFLTeamBadge";
import { UniformPreview } from "@/components/UniformPreview";
import { useColors } from "@/hooks/useColors";
import { Conference, Division, NFLGame, NFLTeam, useNFL } from "@/context/NFLContext";
import type { PlayoffSeed, PlayoffRound, UniformSet } from "@/context/types";

const CONFERENCES: Conference[] = ["Ironclad", "Gridiron"];
const DIVISIONS: Division[] = ["East", "North", "South", "West"];

const PLAYOFF_ROUND_LABELS: Record<PlayoffRound, string> = {
  wildCard: "Wild Card",
  divisional: "Divisional",
  conference: "Conference",
  vflBowl: "VFL Bowl",
};

type MainTab = "standings" | "schedule";

// ─── TeamRecord helpers ───────────────────────────────────────────────────────

interface TeamRecord {
  id: string;
  homeW: number; homeL: number;
  awayW: number; awayL: number;
  divW: number;  divL: number;
  streak: string;
}

function buildRecords(teams: NFLTeam[], games: any[]): Map<string, TeamRecord> {
  const map = new Map<string, TeamRecord>();
  for (const t of teams) {
    map.set(t.id, { id: t.id, homeW: 0, homeL: 0, awayW: 0, awayL: 0, divW: 0, divL: 0, streak: "—" });
  }
  const teamById = new Map(teams.map(t => [t.id, t]));
  const finalGames = [...games].filter(g => g.status === "final").sort((a, b) => a.week - b.week);

  for (const g of finalGames) {
    const homeTeam = teamById.get(g.homeTeamId);
    const awayTeam = teamById.get(g.awayTeamId);
    const homeWon = g.homeScore > g.awayScore;
    const isDivGame = homeTeam && awayTeam && homeTeam.division === awayTeam.division;
    const homeRec = map.get(g.homeTeamId);
    const awayRec = map.get(g.awayTeamId);
    if (homeRec) {
      if (homeWon) { homeRec.homeW++; if (isDivGame) homeRec.divW++; }
      else         { homeRec.homeL++; if (isDivGame) homeRec.divL++; }
    }
    if (awayRec) {
      if (!homeWon) { awayRec.awayW++; if (isDivGame) awayRec.divW++; }
      else          { awayRec.awayL++; if (isDivGame) awayRec.divL++; }
    }
  }

  for (const t of teams) {
    const teamGames = finalGames.filter(g => g.homeTeamId === t.id || g.awayTeamId === t.id).reverse();
    if (teamGames.length === 0) continue;
    const firstResult = teamGames[0].homeTeamId === t.id
      ? teamGames[0].homeScore > teamGames[0].awayScore
      : teamGames[0].awayScore > teamGames[0].homeScore;
    let count = 1;
    for (let i = 1; i < teamGames.length; i++) {
      const g = teamGames[i];
      const won = g.homeTeamId === t.id ? g.homeScore > g.awayScore : g.awayScore > g.homeScore;
      if (won === firstResult) count++;
      else break;
    }
    const rec = map.get(t.id)!;
    rec.streak = `${firstResult ? "W" : "L"}${count}`;
  }

  return map;
}

function makeDefaultUniform(primaryColor: string, secondaryColor: string): UniformSet {
  return {
    helmetColor: primaryColor, helmetLogoPlacement: "both", jerseyStyle: "traditional",
    jerseyColor: primaryColor, jerseyAccentColor: secondaryColor, numberFont: "block",
    numberColor: secondaryColor, numberOutlineColor: "#000000", pantColor: primaryColor,
    pantStripeStyle: "none", pantStripeColor: secondaryColor, sockColor: primaryColor, sockAccentColor: secondaryColor,
  };
}

const UNIFORM_OPTIONS: { key: "home" | "away" | "alternate"; label: string; desc: string }[] = [
  { key: "home",      label: "Home",      desc: "Traditional home whites" },
  { key: "away",      label: "Away",      desc: "Road colour jersey" },
  { key: "alternate", label: "Alternate", desc: "Throwback/special edition" },
];

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function StandingsScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const { season, getStandings, getWeekGames, teamCustomization, setGameDayUniform } = useNFL();

  const [mainTab,      setMainTab]      = useState<MainTab>("standings");
  const [activeConf,   setActiveConf]   = useState<Conference>("Ironclad");
  const [viewMode,     setViewMode]     = useState<"division" | "conference">("division");
  const [selectedWeek, setSelectedWeek] = useState(season?.currentWeek ?? 1);
  const [showBracket,  setShowBracket]  = useState(false);
  const [uniformGame,  setUniformGame]  = useState<NFLGame | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  // ── Standings data ──────────────────────────────────────────────────────────
  const confTeams = getStandings(activeConf);
  const records = useMemo(() => {
    if (!season) return new Map<string, TeamRecord>();
    return buildRecords(season.teams, season.games);
  }, [season]);
  const playoffSeeds = useMemo(() => {
    if (!season?.playoffSeeds) return new Map<string, PlayoffSeed>();
    return new Map(season.playoffSeeds.map(ps => [ps.teamId, ps]));
  }, [season]);

  // ── Schedule data ───────────────────────────────────────────────────────────
  const totalWeeks    = season?.totalWeeks ?? 18;
  const weekGames     = useMemo(() => getWeekGames(selectedWeek), [selectedWeek, getWeekGames]);
  const myTeamId      = season?.playerTeamId;
  const completedCount = weekGames.filter(g => g.status === "final").length;
  const myTeam        = season?.teams.find(t => t.id === myTeamId);
  const primaryColor  = teamCustomization?.primaryColor ?? myTeam?.primaryColor ?? colors.nflBlue;
  const secondaryColor = teamCustomization?.secondaryColor ?? myTeam?.secondaryColor ?? "#ffffff";
  const myByeWeek     = season?.byeWeeks?.[myTeamId ?? ""];
  const isPlayoffs    = season?.isPlayoffs ?? false;
  const isByeWeek     = selectedWeek === myByeWeek;

  function getWeekLabel(w: number): string {
    if (w <= 18) return `${w}`;
    const rounds: PlayoffRound[] = ["wildCard", "divisional", "conference", "vflBowl"];
    const off = w - 18;
    return rounds[off - 1] ? PLAYOFF_ROUND_LABELS[rounds[off - 1]].split(" ")[0] : `P${off}`;
  }

  function getWeekFullLabel(w: number): string {
    if (w <= 18) {
      if (w === myByeWeek) return `Week ${w} · YOUR BYE`;
      return `Week ${w}`;
    }
    const rounds: PlayoffRound[] = ["wildCard", "divisional", "conference", "vflBowl"];
    const off = w - 18;
    return rounds[off - 1] ? PLAYOFF_ROUND_LABELS[rounds[off - 1]] : `Playoff Week ${off}`;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {mainTab === "standings" ? "Standings" : "Schedule"}
          </Text>
          {mainTab === "schedule" && isPlayoffs && (
            <TouchableOpacity
              onPress={() => setShowBracket(!showBracket)}
              style={[styles.bracketBtn, { backgroundColor: colors.nflGold + "20", borderColor: colors.nflGold + "60" }]}
            >
              <Feather name="award" size={13} color={colors.nflGold} />
              <Text style={[styles.bracketBtnText, { color: colors.nflGold }]}>Bracket</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Main tab toggle */}
        <View style={[styles.mainTabRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          {(["standings", "schedule"] as MainTab[]).map(t => (
            <TouchableOpacity
              key={t}
              onPress={() => setMainTab(t)}
              style={[styles.mainTabBtn, { backgroundColor: mainTab === t ? colors.nflBlue : "transparent" }]}
            >
              <Feather
                name={t === "standings" ? "bar-chart-2" : "calendar"}
                size={13}
                color={mainTab === t ? "#fff" : colors.mutedForeground}
              />
              <Text style={[styles.mainTabText, { color: mainTab === t ? "#fff" : colors.mutedForeground }]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Standings: conference toggle + view mode */}
        {mainTab === "standings" && (
          <>
            <View style={[styles.confToggle, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              {CONFERENCES.map(conf => (
                <TouchableOpacity
                  key={conf}
                  onPress={() => setActiveConf(conf)}
                  style={[styles.confBtn, { backgroundColor: activeConf === conf ? colors.nflGold : "transparent" }]}
                >
                  <Text style={[styles.confBtnText, { color: activeConf === conf ? "#000" : colors.mutedForeground }]}>{conf}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={[styles.viewModeRow, { borderBottomColor: colors.border }]}>
              {(["division", "conference"] as const).map(mode => (
                <TouchableOpacity
                  key={mode}
                  onPress={() => setViewMode(mode)}
                  style={[styles.viewModeBtn, viewMode === mode && { borderBottomColor: colors.nflGold, borderBottomWidth: 2 }]}
                >
                  <Text style={[styles.viewModeBtnText, { color: viewMode === mode ? colors.nflGold : colors.mutedForeground }]}>
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Schedule: week strip */}
        {mainTab === "schedule" && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekScroll} style={{ marginTop: 8 }}>
            {Array.from({ length: totalWeeks }, (_, i) => i + 1).map(w => {
              const isBye     = w === myByeWeek;
              const isPlayoffW = w > 18;
              const isCurrent = w === season?.currentWeek;
              const isSelected = w === selectedWeek;
              return (
                <TouchableOpacity
                  key={w}
                  onPress={() => setSelectedWeek(w)}
                  style={[
                    styles.weekBtn,
                    {
                      backgroundColor: isSelected ? (isPlayoffW ? colors.nflGold : colors.nflRed) : isBye ? colors.secondary : colors.card,
                      borderColor: isCurrent && !isSelected ? colors.nflRed + "80" : isBye && !isSelected ? colors.nflGold + "80" : "transparent",
                      borderWidth: 1.5,
                      minWidth: isPlayoffW ? 48 : 36,
                      paddingHorizontal: isPlayoffW ? 6 : 0,
                    },
                  ]}
                >
                  <Text style={[styles.weekBtnText, {
                    color: isSelected ? "#fff" : isBye ? colors.nflGold : colors.mutedForeground,
                    fontSize: isPlayoffW ? 9 : 12,
                  }]}>
                    {getWeekLabel(w)}
                  </Text>
                  {isBye && !isSelected && <View style={[styles.byeDot, { backgroundColor: colors.nflGold }]} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Schedule: week info bar */}
      {mainTab === "schedule" && (
        <View style={[styles.weekInfo, { borderBottomColor: colors.border }]}>
          <View>
            <Text style={[styles.weekLabel, { color: colors.foreground }]}>
              {getWeekFullLabel(selectedWeek)}
              {selectedWeek === season?.currentWeek ? <Text style={{ color: colors.nflGold }}> · Current</Text> : ""}
            </Text>
            {isByeWeek && (
              <Text style={[styles.byeLabel, { color: colors.nflGold }]}>Your team is on bye this week</Text>
            )}
          </View>
          <Text style={[styles.gamesPlayed, { color: colors.mutedForeground }]}>
            {completedCount}/{weekGames.length} final
          </Text>
        </View>
      )}

      {/* Schedule: playoff bracket */}
      {mainTab === "schedule" && isPlayoffs && showBracket && season && (
        <PlayoffBracketPanel season={season} colors={colors} />
      )}

      {/* ── STANDINGS VIEW ─────────────────────────────────────────────── */}
      {mainTab === "standings" && (
        <ScrollView contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 120 : 110 }} showsVerticalScrollIndicator={false}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ minWidth: "100%" }}>
              <View style={[styles.colHeader, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.colTeam, { color: colors.mutedForeground }]}>TEAM</Text>
                <ColH label="W"    color={colors.mutedForeground} w={30} />
                <ColH label="L"    color={colors.mutedForeground} w={30} />
                <ColH label="PCT"  color={colors.mutedForeground} w={44} />
                <ColH label="PF"   color={colors.mutedForeground} w={38} />
                <ColH label="PA"   color={colors.mutedForeground} w={38} />
                <ColH label="DIFF" color={colors.mutedForeground} w={44} />
                <ColH label="HOME" color={colors.mutedForeground} w={50} />
                <ColH label="AWAY" color={colors.mutedForeground} w={50} />
                <ColH label="DIV"  color={colors.mutedForeground} w={46} />
                <ColH label="STRK" color={colors.mutedForeground} w={46} />
              </View>
              {viewMode === "division" ? (
                DIVISIONS.map(div => {
                  const divTeams = confTeams.filter(t => t.division === div);
                  if (divTeams.length === 0) return null;
                  return (
                    <View key={div} style={styles.divSection}>
                      <View style={[styles.divHeader, { backgroundColor: colors.nflBlue + "25" }]}>
                        <Text style={[styles.divHeaderText, { color: colors.nflGold }]}>{activeConf} {div}</Text>
                      </View>
                      {divTeams.map((t, idx) => (
                        <TeamRow key={t.id} team={t} rank={idx + 1} myTeamId={season?.playerTeamId} rec={records.get(t.id)} colors={colors} playoffSeed={playoffSeeds.get(t.id)} />
                      ))}
                    </View>
                  );
                })
              ) : (
                <View>
                  {confTeams.map((t, idx) => (
                    <TeamRow key={t.id} team={t} rank={idx + 1} myTeamId={season?.playerTeamId} showDivision rec={records.get(t.id)} colors={colors} playoffSeed={playoffSeeds.get(t.id)} />
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </ScrollView>
      )}

      {/* ── SCHEDULE VIEW ─────────────────────────────────────────────────── */}
      {mainTab === "schedule" && (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === "web" ? 120 : 110 }]} showsVerticalScrollIndicator={false}>
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
                onUniformPress={isMyGame && game.status !== "final" && !game.isPlayoffGame ? () => setUniformGame(game) : undefined}
                colors={colors}
              />
            );
          })}
          {weekGames.length === 0 && (
            <View style={styles.empty}>
              <Feather name={isByeWeek ? "coffee" : "calendar"} size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {isByeWeek ? "Bye Week" : "No Games"}
              </Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {isByeWeek ? "Your team rests and recovers this week." : "No games scheduled for this week."}
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Uniform Picker Modal */}
      <Modal visible={!!uniformGame} transparent animationType="slide" onRequestClose={() => setUniformGame(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Game Day Uniform</Text>
              <TouchableOpacity onPress={() => setUniformGame(null)}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>Choose which uniform set to wear for this game.</Text>
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
                    style={[styles.uniformOption, { borderColor: isSelected ? primaryColor : colors.border, backgroundColor: isSelected ? primaryColor + "12" : colors.card }]}
                  >
                    <UniformPreview
                      uniform={teamCustomization?.uniforms?.[opt.key] ?? makeDefaultUniform(primaryColor, secondaryColor)}
                      width={80} height={130}
                    />
                    <Text style={[styles.uniformLabel, { color: isSelected ? primaryColor : colors.foreground }]}>{opt.label}</Text>
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
            <TouchableOpacity onPress={() => setUniformGame(null)} style={[styles.doneBtn, { backgroundColor: primaryColor }]}>
              <Text style={styles.doneBtnText}>Confirm Uniform</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Playoff Bracket Panel ────────────────────────────────────────────────────

function PlayoffBracketPanel({ season, colors }: { season: any; colors: any }) {
  const ROUNDS: PlayoffRound[] = ["wildCard", "divisional", "conference", "vflBowl"];
  const teamById = new Map(season.teams.map((t: NFLTeam) => [t.id, t]));
  return (
    <View style={[styles.bracketPanel, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      <Text style={[styles.bracketTitle, { color: colors.nflGold }]}>PLAYOFF BRACKET</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.bracketRow}>
          {ROUNDS.map(round => {
            const roundGames = season.games.filter((g: NFLGame) => g.isPlayoffGame && g.playoffRound === round);
            const isActive = season.playoffRound === round;
            return (
              <View key={round} style={[styles.bracketColumn, isActive && { borderColor: colors.nflGold + "50", borderWidth: 1, borderRadius: 10, padding: 2 }]}>
                <Text style={[styles.bracketRoundLabel, { color: isActive ? colors.nflGold : colors.mutedForeground }]}>
                  {PLAYOFF_ROUND_LABELS[round]}
                </Text>
                {roundGames.length === 0 && (
                  <View style={[styles.bracketGame, { backgroundColor: colors.secondary, opacity: 0.4 }]}>
                    <Text style={[styles.bracketTBD, { color: colors.mutedForeground }]}>TBD</Text>
                  </View>
                )}
                {roundGames.map((g: NFLGame) => {
                  const home = teamById.get(g.homeTeamId);
                  const away = teamById.get(g.awayTeamId);
                  const winnerId = g.status === "final" ? (g.homeScore >= g.awayScore ? g.homeTeamId : g.awayTeamId) : null;
                  return (
                    <View key={g.id} style={[styles.bracketGame, { backgroundColor: colors.secondary }]}>
                      {away && <BracketTeam team={away} score={g.status === "final" ? g.awayScore : undefined} won={winnerId === away.id} seed={g.playoffSeedAway} colors={colors} />}
                      <View style={[styles.bracketDivider, { backgroundColor: colors.border }]} />
                      {home && <BracketTeam team={home} score={g.status === "final" ? g.homeScore : undefined} won={winnerId === home.id} seed={g.playoffSeedHome} colors={colors} />}
                    </View>
                  );
                })}
                {round === "vflBowl" && season.vflBowlWinnerId && (
                  <View style={[styles.championBadge, { backgroundColor: colors.nflGold + "20", borderColor: colors.nflGold }]}>
                    <Feather name="award" size={14} color={colors.nflGold} />
                    <Text style={[styles.championText, { color: colors.nflGold }]}>
                      {(teamById.get(season.vflBowlWinnerId) as NFLTeam)?.abbreviation} Champions!
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function BracketTeam({ team, score, won, seed, colors }: { team: NFLTeam; score?: number; won: boolean; seed?: number; colors: any }) {
  return (
    <View style={styles.bracketTeamRow}>
      {seed !== undefined && <Text style={[styles.bracketSeed, { color: colors.mutedForeground }]}>{seed}</Text>}
      <NFLTeamBadge abbreviation={team.abbreviation} primaryColor={team.primaryColor} size="xs" />
      <Text style={[styles.bracketTeamAbbr, { color: won ? colors.nflGold : colors.foreground, fontFamily: won ? "Inter_700Bold" : "Inter_500Medium" }]} numberOfLines={1}>
        {team.abbreviation}
      </Text>
      {score !== undefined && (
        <Text style={[styles.bracketScore, { color: won ? colors.nflGold : colors.mutedForeground, fontFamily: won ? "Inter_700Bold" : "Inter_400Regular" }]}>
          {score}
        </Text>
      )}
    </View>
  );
}

// ─── Game Row ─────────────────────────────────────────────────────────────────

function GameRow({ game, home, away, isMyGame, homeWon, awayWon, onPress, onUniformPress, colors }: {
  game: NFLGame; home: NFLTeam; away: NFLTeam; isMyGame: boolean; homeWon: boolean; awayWon: boolean;
  onPress: () => void; onUniformPress?: () => void; colors: any;
}) {
  const isPlayoff = game.isPlayoffGame;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.gameRow,
        {
          backgroundColor: colors.card,
          borderColor: isMyGame ? colors.nflGold + "60" : isPlayoff ? colors.nflBlue + "50" : colors.border,
          borderWidth: isMyGame || isPlayoff ? 1.5 : 1,
        },
      ]}
    >
      {isMyGame && (
        <View style={[styles.myGameBadge, { backgroundColor: colors.nflGold }]}>
          <Text style={styles.myGameText}>YOUR GAME</Text>
        </View>
      )}
      {isPlayoff && !isMyGame && (
        <View style={[styles.myGameBadge, { backgroundColor: colors.nflBlue }]}>
          <Text style={styles.myGameText}>
            {game.playoffConference} · {game.playoffRound ? PLAYOFF_ROUND_LABELS[game.playoffRound] : "PLAYOFF"}
          </Text>
        </View>
      )}
      <View style={styles.teamSide}>
        <NFLTeamBadge abbreviation={away.abbreviation} primaryColor={away.primaryColor} size="sm" />
        <View style={styles.teamTextBlock}>
          <Text style={[styles.teamCitySmall, { color: colors.mutedForeground }]}>{away.city}</Text>
          <Text style={[styles.teamNameBold, { color: awayWon ? colors.success : colors.foreground }]} numberOfLines={1}>{away.name}</Text>
          {game.playoffSeedAway
            ? <Text style={[styles.teamRecord, { color: colors.nflBlue }]}>Seed #{game.playoffSeedAway}</Text>
            : <Text style={[styles.teamRecord, { color: colors.mutedForeground }]}>{away.wins}-{away.losses}</Text>}
        </View>
      </View>
      <View style={styles.scoreBlock}>
        {game.status === "final" ? (
          <>
            <Text style={[styles.scoreText, { color: colors.foreground }]}>{game.awayScore}–{game.homeScore}</Text>
            <Text style={[styles.finalLabel, { color: colors.success }]}>FINAL</Text>
          </>
        ) : (
          <>
            <Text style={[styles.vsText, { color: colors.mutedForeground }]}>@</Text>
            <Text style={[styles.upcomingLabel, { color: isPlayoff ? colors.nflGold : colors.warning }]}>
              {isPlayoff ? "PLAYOFF" : "UPCOMING"}
            </Text>
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
      <View style={[styles.teamSide, { alignItems: "flex-end" }]}>
        <View style={[styles.teamTextBlock, { alignItems: "flex-end" }]}>
          <Text style={[styles.teamCitySmall, { color: colors.mutedForeground }]}>{home.city}</Text>
          <Text style={[styles.teamNameBold, { color: homeWon ? colors.success : colors.foreground }]} numberOfLines={1}>{home.name}</Text>
          {game.playoffSeedHome
            ? <Text style={[styles.teamRecord, { color: colors.nflBlue }]}>Seed #{game.playoffSeedHome}</Text>
            : <Text style={[styles.teamRecord, { color: colors.mutedForeground }]}>{home.wins}-{home.losses}</Text>}
        </View>
        <NFLTeamBadge abbreviation={home.abbreviation} primaryColor={home.primaryColor} size="sm" />
      </View>
    </TouchableOpacity>
  );
}

// ─── Standings helpers ────────────────────────────────────────────────────────

function ColH({ label, color, w }: { label: string; color: string; w: number }) {
  return <Text style={{ width: w, textAlign: "center", fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.5, color }}>{label}</Text>;
}

function ColV({ value, color, w, bold }: { value: string; color: string; w: number; bold?: boolean }) {
  return (
    <Text style={{ width: w, textAlign: "center", fontSize: 11, fontFamily: bold ? "Inter_700Bold" : "Inter_400Regular", color }}>
      {value}
    </Text>
  );
}

function TeamRow({ team, rank, myTeamId, showDivision, rec, colors, playoffSeed }: {
  team: NFLTeam; rank: number; myTeamId?: string; showDivision?: boolean; rec?: TeamRecord; colors: any; playoffSeed?: PlayoffSeed;
}) {
  const isMe = team.id === myTeamId;
  const total = team.wins + team.losses + team.ties;
  const pct = total === 0 ? ".000" : (team.wins / total).toFixed(3).replace("0.", ".");
  const diff = team.pointsFor - team.pointsAgainst;
  const diffStr = diff > 0 ? `+${diff}` : `${diff}`;
  const rankColor = rank === 1 ? "#FFD700" : rank <= 4 ? colors.success : colors.mutedForeground;
  const isByeTeam = playoffSeed && playoffSeed.seed === 1;

  const streakColor = (s: string) => {
    if (!s || s === "—") return colors.mutedForeground;
    return s.startsWith("W") ? colors.success : colors.danger;
  };

  return (
    <View style={[styles.teamRow, { backgroundColor: isMe ? team.primaryColor + "15" : "transparent", borderBottomColor: colors.border, borderLeftColor: isMe ? team.primaryColor : "transparent" }]}>
      <Text style={[styles.rankText, { color: rankColor }]}>{rank}</Text>
      <View style={styles.teamCell}>
        <NFLTeamBadge abbreviation={team.abbreviation} primaryColor={team.primaryColor} size="xs" />
        <View style={{ minWidth: 0 }}>
          <Text style={[styles.teamName, { color: isMe ? team.primaryColor : colors.foreground }]} numberOfLines={1}>
            {team.city} {team.name}
          </Text>
          {showDivision && <Text style={[styles.divisionLabel, { color: colors.mutedForeground }]}>{team.division}</Text>}
        </View>
        {isMe && <View style={[styles.youBadge, { backgroundColor: team.primaryColor }]}><Text style={styles.youBadgeText}>YOU</Text></View>}
        {playoffSeed && (
          <View style={[styles.seedBadge, {
            backgroundColor: playoffSeed.isDivisionWinner ? colors.nflGold + "25" : colors.success + "20",
            borderColor:     playoffSeed.isDivisionWinner ? colors.nflGold + "80" : colors.success + "60",
          }]}>
            <Text style={[styles.seedBadgeText, { color: playoffSeed.isDivisionWinner ? colors.nflGold : colors.success }]}>
              {isByeTeam ? "🏆" : ""}{playoffSeed.seed}
            </Text>
          </View>
        )}
      </View>
      <ColV value={`${team.wins}`}          color={colors.success}         w={30} bold />
      <ColV value={`${team.losses}`}        color={colors.danger}          w={30} bold />
      <ColV value={pct}                     color={colors.foreground}      w={44} />
      <ColV value={`${team.pointsFor}`}     color={colors.mutedForeground} w={38} />
      <ColV value={`${team.pointsAgainst}`} color={colors.mutedForeground} w={38} />
      <ColV value={diffStr}                 color={diff >= 0 ? colors.success : colors.danger} w={44} bold />
      <ColV value={rec ? `${rec.homeW}-${rec.homeL}` : "—"} color={colors.mutedForeground} w={50} />
      <ColV value={rec ? `${rec.awayW}-${rec.awayL}` : "—"} color={colors.mutedForeground} w={50} />
      <ColV value={rec ? `${rec.divW}-${rec.divL}` : "—"}   color={colors.mutedForeground} w={46} />
      <ColV value={rec?.streak ?? "—"} color={streakColor(rec?.streak ?? "")} w={46} bold />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:       { flex: 1 },
  header:          { paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1 },
  titleRow:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  title:           { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },

  mainTabRow:      { flexDirection: "row", borderRadius: 10, padding: 3, borderWidth: 1, marginBottom: 10 },
  mainTabBtn:      { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8, borderRadius: 8 },
  mainTabText:     { fontSize: 13, fontFamily: "Inter_700Bold" },

  confToggle:      { flexDirection: "row", borderRadius: 10, padding: 3, borderWidth: 1, marginBottom: 10 },
  confBtn:         { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
  confBtnText:     { fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },

  viewModeRow:     { flexDirection: "row", borderBottomWidth: 1 },
  viewModeBtn:     { flex: 1, alignItems: "center", paddingVertical: 10 },
  viewModeBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  colHeader:       { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 7 },
  colTeam:         { width: 148, fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.5, paddingLeft: 32 },
  divSection:      { marginBottom: 4 },
  divHeader:       { paddingHorizontal: 16, paddingVertical: 7 },
  divHeaderText:   { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.8, textTransform: "uppercase" },
  teamRow:         { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 10, borderBottomWidth: 1, borderLeftWidth: 3 },
  rankText:        { fontSize: 12, fontFamily: "Inter_700Bold", width: 20, textAlign: "center" },
  teamCell:        { width: 148, flexDirection: "row", alignItems: "center", gap: 6, paddingRight: 4 },
  teamName:        { fontSize: 11, fontFamily: "Inter_600SemiBold", flexShrink: 1 },
  divisionLabel:   { fontSize: 9, fontFamily: "Inter_400Regular" },
  seedBadge:       { borderRadius: 6, borderWidth: 1, paddingHorizontal: 5, paddingVertical: 2, marginLeft: 2 },
  seedBadgeText:   { fontSize: 9, fontFamily: "Inter_700Bold" },
  youBadge:        { paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 },
  youBadgeText:    { fontSize: 7, fontFamily: "Inter_700Bold", color: "#000" },

  // Schedule
  weekScroll:      { gap: 6, paddingRight: 16 },
  weekBtn:         { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", position: "relative" },
  weekBtnText:     { fontSize: 12, fontFamily: "Inter_700Bold" },
  byeDot:          { position: "absolute", top: 4, right: 4, width: 5, height: 5, borderRadius: 3 },
  weekInfo:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  weekLabel:       { fontSize: 15, fontFamily: "Inter_700Bold" },
  byeLabel:        { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  gamesPlayed:     { fontSize: 12, fontFamily: "Inter_400Regular" },
  list:            { padding: 14, gap: 10 },
  bracketBtn:      { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  bracketBtnText:  { fontSize: 12, fontFamily: "Inter_700Bold" },
  bracketPanel:    { borderBottomWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
  bracketTitle:    { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1.5, marginBottom: 10 },
  bracketRow:      { flexDirection: "row", gap: 12 },
  bracketColumn:   { gap: 8, minWidth: 110 },
  bracketRoundLabel: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.8, textAlign: "center", marginBottom: 4 },
  bracketGame:     { borderRadius: 10, padding: 8, gap: 4 },
  bracketTBD:      { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: 8 },
  bracketTeamRow:  { flexDirection: "row", alignItems: "center", gap: 5 },
  bracketSeed:     { fontSize: 9, fontFamily: "Inter_600SemiBold", width: 12, textAlign: "center" },
  bracketTeamAbbr: { flex: 1, fontSize: 12 },
  bracketScore:    { fontSize: 13 },
  bracketDivider:  { height: 1, marginVertical: 2 },
  championBadge:   { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 8, borderWidth: 1, padding: 8, marginTop: 4 },
  championText:    { fontSize: 11, fontFamily: "Inter_700Bold" },
  gameRow:         { borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 8, overflow: "hidden" },
  myGameBadge:     { position: "absolute", top: 0, left: "50%", paddingHorizontal: 10, paddingVertical: 3, borderBottomLeftRadius: 6, borderBottomRightRadius: 6, transform: [{ translateX: -40 }] },
  myGameText:      { fontSize: 8, fontFamily: "Inter_700Bold", color: "#000", letterSpacing: 0.5 },
  teamSide:        { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  teamTextBlock:   { flex: 1 },
  teamCitySmall:   { fontSize: 10, fontFamily: "Inter_400Regular" },
  teamNameBold:    { fontSize: 13, fontFamily: "Inter_700Bold" },
  teamRecord:      { fontSize: 10, fontFamily: "Inter_400Regular" },
  scoreBlock:      { alignItems: "center", paddingHorizontal: 10 },
  scoreText:       { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  finalLabel:      { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  vsText:          { fontSize: 20, fontFamily: "Inter_700Bold" },
  upcomingLabel:   { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  jerseyBtn:       { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  jerseyBtnText:   { fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  empty:           { alignItems: "center", paddingVertical: 60, gap: 8 },
  emptyTitle:      { fontSize: 18, fontFamily: "Inter_700Bold" },
  emptyText:       { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  // Uniform modal
  modalOverlay:    { flex: 1, backgroundColor: "rgba(0,0,0,0.72)", justifyContent: "flex-end" },
  modalSheet:      { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 24, paddingBottom: 40 },
  modalHeader:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  modalTitle:      { fontSize: 20, fontFamily: "Inter_700Bold" },
  modalSub:        { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 20 },
  uniformRow:      { flexDirection: "row", gap: 10, marginBottom: 20 },
  uniformOption:   { flex: 1, alignItems: "center", padding: 10, borderRadius: 14, borderWidth: 2, gap: 6, position: "relative" },
  uniformLabel:    { fontSize: 13, fontFamily: "Inter_700Bold" },
  uniformDesc:     { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
  selectedCheck:   { position: "absolute", top: 6, right: 6, width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  doneBtn:         { paddingVertical: 15, borderRadius: 14, alignItems: "center" },
  doneBtnText:     { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
});
