import {
  NFLTeam, NFLGame, Player, PlayerSeasonStats, PlayByPlayEvent, TeamGameStats, GameWeather,
  WeatherCondition, PlayType, PlayResult, GamePhase, DriveEntry, DriveResultType, NFLPosition,
} from "./types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(): string { return Math.random().toString(36).slice(2, 10); }
function rng(min: number, max: number) { return min + Math.random() * (max - min); }
function irng(min: number, max: number) { return Math.round(rng(min, max)); }
function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

// ─── Weather Generation ────────────────────────────────────────────────────────

const DOME_TEAMS = ["NVD","ORS","CHV","RNR","SMN","BBT","MBZ","SYS"];
const COLD_CITIES = ["HRT","BLF","ALF","PMN","CLD","MDI","MWW","GRF","SLB","CTR","RBZ","SCS"];
const DIRS = ["N","NE","E","SE","S","SW","W","NW"];

export function generateWeather(homeAbbr: string, week: number): GameWeather {
  if (DOME_TEAMS.includes(homeAbbr)) {
    return { condition: "Dome", temperature: 72, windSpeed: 0, windDirection: "N" };
  }
  const isCold = COLD_CITIES.includes(homeAbbr);
  const isLateSeason = week >= 13;
  const baseTemp = isCold ? (isLateSeason ? irng(15, 38) : irng(35, 60)) : irng(45, 85);
  const roll = Math.random();
  let condition: WeatherCondition;
  let windSpeed = 0;
  if (isLateSeason && isCold && roll < 0.15) { condition = "Snow"; windSpeed = irng(5, 20); }
  else if (roll < 0.25) { condition = "Rain"; windSpeed = irng(5, 18); }
  else if (roll < 0.45) { condition = "Wind"; windSpeed = irng(15, 30); }
  else if (roll < 0.65) { condition = "Cloudy"; windSpeed = irng(3, 12); }
  else { condition = "Clear"; windSpeed = irng(0, 10); }
  return { condition, temperature: baseTemp, windSpeed, windDirection: pick(DIRS) };
}

// ─── Weather Modifiers ────────────────────────────────────────────────────────

function weatherPassModifier(w: GameWeather): number {
  if (w.condition === "Dome" || w.condition === "Clear") return 1.0;
  if (w.condition === "Cloudy") return 0.97;
  if (w.condition === "Wind") return w.windSpeed > 20 ? 0.82 : 0.91;
  if (w.condition === "Rain") return 0.88;
  if (w.condition === "Snow") return 0.78;
  return 1.0;
}
function weatherTurnoverModifier(w: GameWeather): number {
  if (w.condition === "Rain") return 1.4;
  if (w.condition === "Snow") return 1.6;
  if (w.condition === "Wind") return w.windSpeed > 20 ? 1.2 : 1.0;
  return 1.0;
}

// ─── Player Lookup ────────────────────────────────────────────────────────────

function getPlayer(team: NFLTeam, pos: NFLPosition, depth = 1): Player | null {
  return team.roster.find(r => r.position === pos && r.depthOrder === depth)
      ?? team.roster.find(r => r.position === pos)
      ?? null;
}

function getPlayerName(team: NFLTeam, pos: NFLPosition, depth = 1): string {
  return getPlayer(team, pos, depth)?.name ?? "Unknown";
}

// ─── Per-Player Stat Tracking ─────────────────────────────────────────────────

function initStatLine(): PlayerSeasonStats {
  return {
    gamesPlayed: 0,
    passingYards: 0, passingTDs: 0, interceptions: 0, completions: 0, attempts: 0, qbRating: 0,
    rushingYards: 0, rushingTDs: 0, carries: 0,
    receivingYards: 0, receivingTDs: 0, receptions: 0, targets: 0,
    tackles: 0, sacks: 0, forcedFumbles: 0, defensiveINTs: 0, passDeflections: 0,
    yardsPerCarry: 0, yardsPerCatch: 0,
    fieldGoalsMade: 0, fieldGoalsAttempted: 0, puntsAverage: 0,
  };
}

function getOrInit(map: Record<string, PlayerSeasonStats>, id: string): PlayerSeasonStats {
  if (!map[id]) map[id] = initStatLine();
  return map[id];
}

// Scheme-aware receiver targeting — drives realistic stat spread
function pickSchemeReceiver(team: NFLTeam): Player | null {
  const wr1 = getPlayer(team, "WR", 1);
  const wr2 = getPlayer(team, "WR", 2);
  const te  = getPlayer(team, "TE", 1);
  const rb  = getPlayer(team, "RB", 1);
  const scheme = team.offenseScheme ?? "balanced";

  // [WR1, WR2, TE, RB] target share weights
  const weights =
    scheme === "air-raid"  ? [0.40, 0.28, 0.14, 0.18] :
    scheme === "run-heavy" ? [0.27, 0.16, 0.24, 0.33] :
    scheme === "spread"    ? [0.36, 0.28, 0.18, 0.18] :
                             [0.34, 0.24, 0.22, 0.20]; // balanced / default

  const players = [wr1, wr2, te, rb];
  const roll = Math.random();
  let cum = 0;
  for (let i = 0; i < players.length; i++) {
    cum += weights[i];
    if (roll < cum && players[i]) return players[i];
  }
  return wr1;
}

// NFL passer rating formula (0–158.3 scale)
function computeQBRating(att: number, comp: number, yds: number, tds: number, ints: number): number {
  if (att === 0) return 0;
  const a = clamp((comp / att - 0.3) * 5, 0, 2.375);
  const b = clamp((yds / att - 3) * 0.25, 0, 2.375);
  const c = clamp((tds / att) * 20, 0, 2.375);
  const d = clamp(2.375 - (ints / att) * 25, 0, 2.375);
  return Math.round(((a + b + c + d) / 6) * 100 * 10) / 10;
}

// Post-game: distribute tackles, pass deflections, forced fumbles across the defensive unit
function distributeDefensiveStats(
  defTeam: NFLTeam,
  oppPlays: number,
  pStats: Record<string, PlayerSeasonStats>,
): void {
  const lb1 = getPlayer(defTeam, "LB", 1);
  const lb2 = getPlayer(defTeam, "LB", 2);
  const cb1 = getPlayer(defTeam, "CB", 1);
  const cb2 = getPlayer(defTeam, "CB", 2);
  const s1  = getPlayer(defTeam, "S",  1);
  const s2  = getPlayer(defTeam, "S",  2);
  const de1 = getPlayer(defTeam, "DE", 1);
  const de2 = getPlayer(defTeam, "DE", 2);
  const dt1 = getPlayer(defTeam, "DT", 1);

  // Tackle distribution weights (must roughly sum to 1)
  const tacklePool: [Player | null, number][] = [
    [lb1, 0.26], [lb2, 0.16], [cb1, 0.13], [cb2, 0.09],
    [s1,  0.11], [s2,  0.06], [de1, 0.08], [de2, 0.04], [dt1, 0.07],
  ];
  const totalTackles = Math.round(oppPlays * rng(0.70, 0.85));
  for (const [p, w] of tacklePool) {
    if (!p) continue;
    const s = getOrInit(pStats, p.id);
    s.tackles += Math.max(0, Math.round(totalTackles * w + (Math.random() - 0.5) * 2));
  }

  // Pass deflections (CB/S-heavy)
  const deflPool: [Player | null, number][] = [
    [cb1, 0.40], [cb2, 0.28], [s1, 0.20], [lb1, 0.12],
  ];
  const totalDefl = irng(2, 7);
  for (const [p, w] of deflPool) {
    if (!p) continue;
    const s = getOrInit(pStats, p.id);
    s.passDeflections += Math.round(totalDefl * w);
  }

  // Forced fumbles (rare — DE/LB only)
  if (Math.random() < 0.35) {
    const ff = Math.random() < 0.6 ? de1 : lb1;
    if (ff) getOrInit(pStats, ff.id).forcedFumbles++;
  }
}

// Merge one game's stats into a player's running season total
export function mergePlayerStats(
  current: PlayerSeasonStats,
  game: PlayerSeasonStats,
): PlayerSeasonStats {
  const m: PlayerSeasonStats = {
    season: current.season,
    gamesPlayed:       current.gamesPlayed       + (game.gamesPlayed || 1),
    passingYards:      current.passingYards      + game.passingYards,
    passingTDs:        current.passingTDs        + game.passingTDs,
    interceptions:     current.interceptions     + game.interceptions,
    completions:       current.completions       + game.completions,
    attempts:          current.attempts          + game.attempts,
    rushingYards:      current.rushingYards      + game.rushingYards,
    rushingTDs:        current.rushingTDs        + game.rushingTDs,
    carries:           current.carries           + game.carries,
    receivingYards:    current.receivingYards    + game.receivingYards,
    receivingTDs:      current.receivingTDs      + game.receivingTDs,
    receptions:        current.receptions        + game.receptions,
    targets:           current.targets           + game.targets,
    tackles:           current.tackles           + game.tackles,
    sacks:             current.sacks             + game.sacks,
    forcedFumbles:     current.forcedFumbles     + game.forcedFumbles,
    defensiveINTs:     current.defensiveINTs     + game.defensiveINTs,
    passDeflections:   current.passDeflections   + game.passDeflections,
    fieldGoalsMade:    current.fieldGoalsMade    + game.fieldGoalsMade,
    fieldGoalsAttempted: current.fieldGoalsAttempted + game.fieldGoalsAttempted,
    // Per-unit stats — recomputed from totals
    yardsPerCarry: 0, yardsPerCatch: 0, qbRating: 0, puntsAverage: 0,
  };
  const totalCarries = m.carries;
  const totalRec     = m.receptions;
  const totalAtt     = m.attempts;
  if (totalCarries > 0) m.yardsPerCarry = parseFloat((m.rushingYards / totalCarries).toFixed(1));
  if (totalRec     > 0) m.yardsPerCatch = parseFloat((m.receivingYards / totalRec).toFixed(1));
  if (totalAtt     > 0) m.qbRating = computeQBRating(totalAtt, m.completions, m.passingYards, m.passingTDs, m.interceptions);
  // Punter average: carry through the per-game number (can't easily accumulate without game count)
  m.puntsAverage = game.puntsAverage > 0 ? game.puntsAverage : current.puntsAverage;
  return m;
}

// ─── Team Ratings ─────────────────────────────────────────────────────────────

function getOffenseRating(team: NFLTeam): number {
  const positions = ["QB","WR","RB","TE","OL"] as const;
  const players = team.roster.filter(p => positions.includes(p.position as any) && p.depthOrder === 1);
  if (players.length === 0) return team.overall;
  return players.reduce((s, p) => s + p.overall, 0) / players.length;
}

function getDefenseRating(team: NFLTeam): number {
  const positions = ["DE","DT","LB","CB","S"] as const;
  const players = team.roster.filter(p => positions.includes(p.position as any) && p.depthOrder === 1);
  if (players.length === 0) return team.overall;
  return players.reduce((s, p) => s + p.overall, 0) / players.length;
}

function getQBRating(team: NFLTeam): number {
  const qb = team.roster.find(p => p.position === "QB" && p.depthOrder === 1);
  return qb ? qb.overall : team.overall - 5;
}

// ─── Scheme Bonuses ───────────────────────────────────────────────────────────

function schemeRunBonus(team: NFLTeam): number {
  return team.offenseScheme === "run-heavy" ? 5 : team.offenseScheme === "spread" ? -3 : 0;
}
function schemePassBonus(team: NFLTeam): number {
  return team.offenseScheme === "air-raid" ? 6 : team.offenseScheme === "spread" ? 3 : team.offenseScheme === "run-heavy" ? -4 : 0;
}
function gamePlanAggression(team: NFLTeam): number {
  return team.gamePlan === "aggressive" ? 1.12 : team.gamePlan === "conservative" ? 0.88 : 1.0;
}

// ─── Play-By-Play Descriptions ────────────────────────────────────────────────

function describePlay(
  playType: PlayType,
  result: PlayResult,
  yards: number,
  attacker: NFLTeam,
  defender: NFLTeam,
  isFatigue = false,
): { description: string; playerName?: string; targetName?: string } {
  const qb  = getPlayerName(attacker, "QB");
  const rb  = getPlayerName(attacker, "RB");
  const wr1 = getPlayerName(attacker, "WR");
  const wr2 = getPlayerName(attacker, "WR", 2);
  const te  = getPlayerName(attacker, "TE");
  const de  = getPlayerName(defender, "DE");
  const lb  = getPlayerName(defender, "LB");
  const cb  = getPlayerName(defender, "CB");
  const s   = getPlayerName(defender, "S");

  if (playType === "kickoff")   return { description: `${attacker.city} kicks off to start the drive.` };
  if (playType === "extraPoint") {
    const k = getPlayerName(attacker, "K");
    return result === "fieldGoalGood"
      ? { description: `${k} converts the extra point. Good!`, playerName: k }
      : { description: `${k} misses the extra point! Block!`, playerName: k };
  }
  if (playType === "punt") {
    const p = getPlayerName(attacker, "P");
    return { description: `${p} punts the ball ${yards} yards.`, playerName: p };
  }
  if (playType === "fieldGoal") {
    const k = getPlayerName(attacker, "K");
    const dist = 40 + irng(-10, 10);
    return result === "fieldGoalGood"
      ? { description: `${k} is good on the ${dist}-yard field goal attempt!`, playerName: k }
      : { description: `${k} misses the ${dist}-yard field goal — no good!`, playerName: k };
  }
  if (playType === "spike") return { description: `${qb} spikes the ball to stop the clock.`, playerName: qb };
  if (playType === "kneel") return { description: `${qb} takes a knee. ${attacker.abbreviation} running out the clock.`, playerName: qb };

  if (playType === "run") {
    const carrier = Math.random() < 0.75 ? rb : qb;
    if (result === "touchdown") return { description: `${carrier} RUSHES IN FOR A TOUCHDOWN! ${yards} yards! ${attacker.abbreviation} score!`, playerName: carrier };
    if (result === "fumble")    return { description: `${carrier} FUMBLES the ball! ${getPlayerName(defender, "LB")} recovers for ${defender.abbreviation}!`, playerName: carrier } as any;
    if (yards <= 0)  return { description: `${carrier} is stuffed at the line by ${lb} for a loss of ${Math.abs(yards)}.`, playerName: carrier };
    if (yards >= 10) return { description: `${carrier} breaks free for ${yards} yards! Great burst through the hole!`, playerName: carrier };
    return { description: `${carrier} carries for ${yards} yard${yards !== 1 ? "s" : ""}.`, playerName: carrier };
  }

  // Pass plays
  const receivers = [wr1, wr2, te, rb];
  const receiver  = pick(receivers);
  const fatNote   = isFatigue ? " Fighting through fatigue," : "";
  if (result === "incomplete") return { description: `${qb} fires to ${receiver} — incomplete.${fatNote} Covered by ${cb}.`, playerName: qb, targetName: receiver };
  if (result === "sack")       return { description: `${de} sacks ${qb} for a loss of ${Math.abs(yards)} yards! QB pressure pays off.`, playerName: qb };
  if (result === "interception") {
    const interceptor = Math.random() < 0.5 ? cb : s;
    return { description: `${qb} throws PICKED OFF by ${interceptor}! Terrible read — turnover ${defender.abbreviation}!`, playerName: qb, targetName: interceptor };
  }
  if (result === "touchdown") return { description: `${qb} FINDS ${receiver} IN THE END ZONE! TOUCHDOWN ${attacker.abbreviation}! ${yards} yards!`, playerName: qb, targetName: receiver };
  if (yards >= 20) return { description: `${qb} goes deep to ${receiver} for ${yards} yards! Big gain${isFatigue ? " despite the fatigue" : ""}!`, playerName: qb, targetName: receiver };
  return { description: `${qb} connects with ${receiver} for ${yards} yards.${fatNote}`, playerName: qb, targetName: receiver };
}

// ─── Core Simulation State ────────────────────────────────────────────────────

interface GameState {
  possession: "home" | "away";
  down: number;
  yardsToGo: number;
  yardLine: number;
  quarter: number;
  minute: number;
  second: number;
  homeScore: number;
  awayScore: number;
  homeTimeouts: number;
  awayTimeouts: number;
  momentum: number;
  homeFatigue: number;
  awayFatigue: number;
  currentDriveId: string;
  currentDrivePlays: number;
  currentDriveStartYardLine: number;
  currentDriveStartTime: string;
  currentDriveStartQuarter: number;
}

function initState(): GameState {
  return {
    possession: Math.random() < 0.5 ? "home" : "away",
    down: 1, yardsToGo: 10, yardLine: 25,
    quarter: 1, minute: 15, second: 0,
    homeScore: 0, awayScore: 0,
    homeTimeouts: 3, awayTimeouts: 3,
    momentum: 0,
    homeFatigue: 0, awayFatigue: 0,
    currentDriveId: uid(),
    currentDrivePlays: 0,
    currentDriveStartYardLine: 25,
    currentDriveStartTime: "15:00",
    currentDriveStartQuarter: 1,
  };
}

function advanceClock(state: GameState, seconds: number) {
  let total = state.minute * 60 + state.second - seconds;
  if (total < 0) total = 0;
  state.minute = Math.floor(total / 60);
  state.second = total % 60;
}

function switchPossession(state: GameState) {
  state.possession = state.possession === "home" ? "away" : "home";
  state.down = 1;
  state.yardsToGo = 10;
  state.yardLine = 100 - state.yardLine;
  state.currentDriveId = uid();
  state.currentDrivePlays = 0;
  state.currentDriveStartYardLine = state.yardLine;
  state.currentDriveStartTime = `${state.minute}:${String(state.second).padStart(2, "0")}`;
  state.currentDriveStartQuarter = state.quarter;
}

// ─── Play Caller ──────────────────────────────────────────────────────────────

function decidePlay(state: GameState, attacker: NFLTeam, weather: GameWeather): PlayType {
  const { down, yardsToGo, yardLine, minute, quarter } = state;
  const scoreDiff  = state.possession === "home" ? state.homeScore - state.awayScore : state.awayScore - state.homeScore;
  const isLosingBig  = scoreDiff < -14;
  const isWinningBig = scoreDiff > 14;
  const isEndOfHalf  = (quarter === 2 || quarter === 4) && minute <= 2;
  const isEndOfGame  = quarter === 4 && minute <= 4;

  if (down === 4 && yardsToGo > 3 && yardLine < 55) return "punt";
  if (down === 4 && yardsToGo <= 3 && yardLine >= 65) return "fieldGoal";
  if (down === 4 && yardLine >= 75 && yardsToGo <= 8)  return "fieldGoal";
  if (isEndOfGame  && isWinningBig) return Math.random() < 0.7 ? "run" : (minute <= 1 ? "kneel" : "run");
  if (isEndOfHalf  && isLosingBig)  return Math.random() < 0.6 ? "pass" : "spike";

  const passModifier  = weatherPassModifier(weather) * gamePlanAggression(attacker);
  const runPreference = (
    { "run-heavy": 0.48, "air-raid": 0.30, "spread": 0.37, "pro-set": 0.42 } as Record<string, number>
  )[attacker.offenseScheme] ?? 0.40;
  if (down === 1 && yardsToGo >= 10) return Math.random() < runPreference ? "run" : "pass";
  if (down === 3 && yardsToGo >= 7)  return Math.random() < 0.82 * passModifier ? "pass" : "run";
  if (down === 2 && yardsToGo <= 3)  return Math.random() < 0.6 ? "run" : "pass";
  return Math.random() < 0.45 ? "run" : "pass";
}

// ─── Outcome Resolver ─────────────────────────────────────────────────────────

interface PlayOutcome { result: PlayResult; yards: number; isInjury: boolean }

function resolvePlay(
  playType: PlayType,
  attacker: NFLTeam,
  defender: NFLTeam,
  state: GameState,
  weather: GameWeather,
): PlayOutcome {
  const atkOvr = getOffenseRating(attacker) / 100;
  const defOvr = getDefenseRating(defender) / 100;
  const qbOvr  = getQBRating(attacker) / 100;
  const passAdj     = weatherPassModifier(weather);
  const turnoverAdj = weatherTurnoverModifier(weather);
  const fatigue     = state.possession === "home" ? state.homeFatigue : state.awayFatigue;
  const fatigueMult = clamp(1 - fatigue * 0.002, 0.7, 1.0);
  const momBonus    = state.possession === "home" ? state.momentum * 0.008 : -state.momentum * 0.008;
  const netAtk = clamp(atkOvr + momBonus, 0.3, 1.0) * fatigueMult;
  const netDef = clamp(defOvr - momBonus * 0.5, 0.3, 1.0);

  if (playType === "punt") {
    // Rating-aware punt distance
    const punterKP = getPlayer(attacker, "P")?.posRatings.kickPower ?? 75;
    const bonus = Math.floor((punterKP - 75) / 5);
    return { result: "punt", yards: irng(35 + bonus, 55 + bonus), isInjury: false };
  }
  if (playType === "fieldGoal") {
    const dist = 100 - state.yardLine + 17;
    const kickerAcc = getPlayer(attacker, "K")?.posRatings.kickAccuracy ?? 75;
    const kickBonus = (kickerAcc - 75) * 0.003;
    const successProb = clamp(0.95 - (dist - 30) * 0.018 - (weather.windSpeed > 20 ? 0.10 : 0) + kickBonus, 0.15, 0.97);
    return { result: Math.random() < successProb ? "fieldGoalGood" : "fieldGoalMiss", yards: 0, isInjury: false };
  }
  if (playType === "extraPoint") {
    return { result: Math.random() < 0.945 ? "fieldGoalGood" : "fieldGoalMiss", yards: 0, isInjury: false };
  }
  if (playType === "spike") return { result: "spike", yards: 0, isInjury: false };
  if (playType === "kneel") return { result: "kneel", yards: -1, isInjury: false };

  // Run play — base YPC driven by RB position ratings; OL and defense adjust; max 18 yds
  if (playType === "run") {
    const rb  = getPlayer(attacker, "RB");
    const ol1 = getPlayer(attacker, "OL");
    // RB rating → target YPC: 60 OVR ≈ 2.8, 75 OVR ≈ 3.7, 95 OVR ≈ 4.8
    const rbBCV = rb?.posRatings.ballCarrierVision ?? 70;
    const rbBTK = rb?.posRatings.breakTackle       ?? 70;
    const rbACC = rb?.posRatings.acceleration       ?? 70;
    const rbYPC = 2.8 + (rbBCV - 60) * 0.04 + (rbBTK - 60) * 0.025 + (rbACC - 60) * 0.015;
    // OL run-block helps, defense counters
    const olAdj  = ol1 ? (ol1.posRatings.runBlock - 75) * 0.025 : 0;
    const defAdj = (netDef - 0.72) * -4;   // strong D sheds ~0.4–0.8 yds
    const schAdj = attacker.offenseScheme === "run-heavy" ? 0.35 : attacker.offenseScheme === "air-raid" ? -0.25 : 0;
    const mean   = clamp(rbYPC + olAdj + defAdj + schAdj, 1.8, 6.5);
    const yards  = Math.round(clamp(mean + (Math.random() - 0.5) * 2.8 * 3, -3, 18));
    const fumbleProb = 0.007 * turnoverAdj;
    if (Math.random() < fumbleProb) return { result: "fumble", yards: -1, isInjury: false };
    if (state.yardLine + yards >= 100) return { result: "touchdown", yards, isInjury: false };
    return { result: yards >= 0 ? "gain" : "loss", yards, isInjury: Math.random() < 0.008 };
  }

  // Pass play — rating-aware: QB throw accuracy/power, WR catching/route running
  const qb  = getPlayer(attacker, "QB");
  const wr1 = getPlayer(attacker, "WR");
  // QB accuracy and WR skill each shift completion % meaningfully
  const qbThrowAcc  = qb  ? (qb.posRatings.throwAccMid  - 75) * 0.003 + (qb.posRatings.throwAccDeep - 75) * 0.002 : 0;
  const wrCatchBonus = wr1 ? (wr1.posRatings.catching    - 75) * 0.003 + (wr1.posRatings.routeRunning - 75) * 0.001 : 0;
  const sackProb = clamp((netDef - netAtk) * 0.13 + 0.04, 0.015, 0.16);
  if (Math.random() < sackProb) return { result: "sack", yards: -irng(3, 10), isInjury: false };

  // Completion %: QB OVR dominates; 68 OVR ≈ 54%, 80 OVR ≈ 63%, 95 OVR ≈ 73%
  const completionProb = clamp(
    qbOvr * passAdj * fatigueMult * 0.80 + netAtk * 0.15 - netDef * 0.15 + qbThrowAcc + wrCatchBonus,
    0.30, 0.76,
  );
  if (Math.random() > completionProb) {
    // INT rate scales sharply with QB rating — bad QBs throw far more picks
    const intProb = clamp(0.07 - (qbOvr - 0.60) * 0.10, 0.025, 0.11) * turnoverAdj;
    if (Math.random() < intProb) return { result: "interception", yards: -1, isInjury: false };
    return { result: "incomplete", yards: 0, isInjury: false };
  }

  // Deep ball: elite arms go deep more; rate capped at 18% (real NFL ≈ 10–16%)
  const qbThrowPow = qb ? (qb.posRatings.throwPower - 75) * 0.004 : 0;
  const schDeepAdj = attacker.offenseScheme === "air-raid" ? 0.03 : attacker.offenseScheme === "run-heavy" ? -0.02 : 0;
  const deepBallProb = clamp(0.08 + qbThrowPow + schDeepAdj, 0.05, 0.18);
  const isDeep = Math.random() < deepBallProb;
  // Short: avg ~9 yds/catch  |  Deep: avg ~21 yds/catch  (NFL realistic per completion)
  const mean   = isDeep ? irng(15, 28) : irng(5, 13);
  const yards  = Math.round(clamp(mean + (Math.random() - 0.5) * 5, 1, 35));
  if (state.yardLine + yards >= 100) return { result: "touchdown", yards, isInjury: false };
  return { result: "gain", yards, isInjury: Math.random() < 0.005 };
}

// ─── Main Simulation ──────────────────────────────────────────────────────────

export function simulateFullGame(
  homeTeam: NFLTeam,
  awayTeam: NFLTeam,
  week: number,
): NFLGame {
  const weather = generateWeather(homeTeam.abbreviation, week);
  const plays:  PlayByPlayEvent[] = [];
  const drives: DriveEntry[]      = [];
  const state = initState();

  const homeStats: TeamGameStats = { passingYards:0,rushingYards:0,totalYards:0,turnovers:0,thirdDownConversions:0,thirdDownAttempts:0,sacks:0,firstDowns:0,timeOfPossession:0,penalties:0,penaltyYards:0,redZoneAttempts:0,redZoneTDs:0 };
  const awayStats: TeamGameStats = { passingYards:0,rushingYards:0,totalYards:0,turnovers:0,thirdDownConversions:0,thirdDownAttempts:0,sacks:0,firstDowns:0,timeOfPossession:0,penalties:0,penaltyYards:0,redZoneAttempts:0,redZoneTDs:0 };

  // Per-player stat lines (keyed by player ID)
  const pStats: Record<string, PlayerSeasonStats> = {};

  // Punt tracking for averages
  const puntYardMap:  Record<string, number> = {};
  const puntCountMap: Record<string, number> = {};

  // Offensive play counts for each team (used for tackle distribution)
  let homePlays = 0;
  let awayPlays = 0;

  function currentStats()    { return state.possession === "home" ? homeStats : awayStats; }
  function currentAttacker() { return state.possession === "home" ? homeTeam  : awayTeam; }
  function currentDefender() { return state.possession === "home" ? awayTeam  : homeTeam; }

  function addDriveEntry(result: DriveResultType) {
    drives.push({
      id: state.currentDriveId,
      teamId: state.possession === "home" ? homeTeam.id : awayTeam.id,
      quarter: state.currentDriveStartQuarter,
      startTime: state.currentDriveStartTime,
      startYardLine: state.currentDriveStartYardLine,
      plays: state.currentDrivePlays,
      yards: state.yardLine - state.currentDriveStartYardLine,
      result,
    });
  }

  let playCount = 0;
  const MAX_PLAYS = 180;

  for (let q = 1; q <= 4 && playCount < MAX_PLAYS; q++) {
    state.quarter = q;
    state.minute  = 15;
    state.second  = 0;

    if (q === 3) {
      switchPossession(state);
      state.homeFatigue = Math.max(0, state.homeFatigue - 20);
      state.awayFatigue = Math.max(0, state.awayFatigue - 20);
    }

    while (state.minute > 0 || (state.minute === 0 && state.second > 0)) {
      if (playCount >= MAX_PLAYS) break;
      const attacker  = currentAttacker();
      const defender  = currentDefender();
      const isFatigue = (state.possession === "home" ? state.homeFatigue : state.awayFatigue) > 40;
      const playType  = decidePlay(state, attacker, weather);
      const outcome   = resolvePlay(playType, attacker, defender, state, weather);
      const stats     = currentStats();

      // Track offensive play count
      if (state.possession === "home") homePlays++; else awayPlays++;

      // Clock
      const clockBurn = playType === "pass" && outcome.result === "gain" ? irng(25, 40) : irng(20, 45);
      advanceClock(state, clockBurn);

      // Fatigue
      if (state.possession === "home") state.homeFatigue = clamp(state.homeFatigue + 0.8, 0, 100);
      else state.awayFatigue = clamp(state.awayFatigue + 0.8, 0, 100);

      // Momentum
      const isScoring  = outcome.result === "touchdown" || outcome.result === "fieldGoalGood";
      const isTurnover = outcome.result === "interception" || outcome.result === "fumble";
      const momDelta   = isScoring ? 4 : isTurnover ? -3 : outcome.yards > 15 ? 1 : outcome.result === "sack" ? -1 : 0;
      state.momentum   = clamp(state.momentum + (state.possession === "home" ? momDelta : -momDelta), -10, 10);

      // ── Team box-score stats ──────────────────────────────────────────────
      if (playType === "run" && (outcome.result === "gain" || outcome.result === "loss" || outcome.result === "touchdown")) {
        stats.rushingYards += Math.max(0, outcome.yards);
      } else if (playType === "pass" && (outcome.result === "gain" || outcome.result === "touchdown")) {
        stats.passingYards += outcome.yards;
      } else if (outcome.result === "sack") {
        const oppStats = state.possession === "home" ? awayStats : homeStats;
        oppStats.sacks += 1;
      }
      if (isTurnover) stats.turnovers += 1;
      if (state.down === 3) {
        stats.thirdDownAttempts += 1;
        if (outcome.yards >= state.yardsToGo) stats.thirdDownConversions += 1;
      }
      stats.totalYards = stats.passingYards + stats.rushingYards;
      if (outcome.yards >= state.yardsToGo && (outcome.result === "gain" || outcome.result === "touchdown")) stats.firstDowns += 1;

      // ── Per-player stat tracking ──────────────────────────────────────────

      // --- Run plays: ball carrier (RB or QB scramble) ---
      if (playType === "run" && (outcome.result === "gain" || outcome.result === "loss" || outcome.result === "touchdown" || outcome.result === "fumble")) {
        const rbPlayer  = getPlayer(attacker, "RB");
        const qbPlayer  = getPlayer(attacker, "QB");
        const qbMobility = qbPlayer?.posRatings.mobility ?? 50;
        // More mobile QBs scramble more; spread/air-raid QBs also scramble more
        const scrambleChance = clamp(0.08 + (qbMobility - 50) * 0.003 + (attacker.offenseScheme === "spread" ? 0.05 : 0), 0.05, 0.25);
        const isScramble = Math.random() < scrambleChance;
        const carrier = isScramble ? qbPlayer : rbPlayer;
        if (carrier && outcome.result !== "fumble") {
          const ps = getOrInit(pStats, carrier.id);
          ps.carries++;
          ps.rushingYards += Math.max(0, outcome.yards);
          if (outcome.result === "touchdown") ps.rushingTDs++;
        }
        // Fumble: forced fumble for defender
        if (outcome.result === "fumble") {
          const lb1 = getPlayer(defender, "LB");
          const de1 = getPlayer(defender, "DE");
          const ff  = Math.random() < 0.5 ? lb1 : de1;
          if (ff) getOrInit(pStats, ff.id).forcedFumbles++;
        }
      }

      // --- Pass plays ---
      if (playType === "pass") {
        const qbPlayer = getPlayer(attacker, "QB");

        // QB stats (all pass outcomes except sack)
        if (qbPlayer && outcome.result !== "sack") {
          const qps = getOrInit(pStats, qbPlayer.id);
          qps.attempts++;
          if (outcome.result === "gain" || outcome.result === "touchdown") {
            qps.completions++;
            qps.passingYards += outcome.yards;
            if (outcome.result === "touchdown") qps.passingTDs++;
          }
          if (outcome.result === "interception") qps.interceptions++;
        }

        // Receiver stats (completions + targets on incomplete/INT)
        if (outcome.result !== "sack") {
          const receiver = pickSchemeReceiver(attacker);
          if (receiver) {
            const rps = getOrInit(pStats, receiver.id);
            rps.targets++;
            if (outcome.result === "gain" || outcome.result === "touchdown") {
              rps.receptions++;
              rps.receivingYards += outcome.yards;
              if (outcome.result === "touchdown") rps.receivingTDs++;
            }
          }
        }

        // Sack: assign to defensive pass rusher
        if (outcome.result === "sack") {
          const de1 = getPlayer(defender, "DE");
          const de2 = getPlayer(defender, "DE", 2);
          const lb1 = getPlayer(defender, "LB");
          const roll = Math.random();
          const sacker = roll < 0.55 ? de1 : roll < 0.80 ? de2 : lb1;
          if (sacker) getOrInit(pStats, sacker.id).sacks++;
        }

        // Defensive INT: assign to DB
        if (outcome.result === "interception") {
          const cb1 = getPlayer(defender, "CB");
          const cb2 = getPlayer(defender, "CB", 2);
          const s1  = getPlayer(defender, "S");
          const roll = Math.random();
          const interceptor = roll < 0.50 ? cb1 : roll < 0.80 ? s1 : cb2;
          if (interceptor) getOrInit(pStats, interceptor.id).defensiveINTs++;
        }
      }

      // --- Kicker stats ---
      if (playType === "fieldGoal") {
        const kPlayer = getPlayer(attacker, "K");
        if (kPlayer) {
          const kps = getOrInit(pStats, kPlayer.id);
          kps.fieldGoalsAttempted++;
          if (outcome.result === "fieldGoalGood") kps.fieldGoalsMade++;
        }
      }

      // --- Punter stats ---
      if (playType === "punt") {
        const pPlayer = getPlayer(attacker, "P");
        if (pPlayer) {
          puntYardMap[pPlayer.id]  = (puntYardMap[pPlayer.id]  ?? 0) + outcome.yards;
          puntCountMap[pPlayer.id] = (puntCountMap[pPlayer.id] ?? 0) + 1;
        }
      }

      // ── Build play-by-play event ──────────────────────────────────────────
      const playDesc = describePlay(playType, outcome.result, outcome.yards, attacker, defender, isFatigue);
      state.currentDrivePlays += 1;

      const playEvent: PlayByPlayEvent = {
        id: uid(), quarter: q, minute: state.minute, second: state.second,
        down: state.down, yardsToGo: state.yardsToGo, yardLine: state.yardLine,
        possession: state.possession, playType, result: outcome.result,
        yardsGained: outcome.yards, playerName: playDesc.playerName,
        targetName: playDesc.targetName, description: playDesc.description,
        score: { home: state.homeScore, away: state.awayScore },
        isScoring, isTurnover, isInjury: outcome.isInjury,
        injuredPlayerName: outcome.isInjury ? (playDesc.playerName ?? undefined) : undefined,
        momentum: state.momentum, driveId: state.currentDriveId,
      };

      // ── Handle play outcomes ──────────────────────────────────────────────
      if (outcome.result === "touchdown") {
        if (state.possession === "home") state.homeScore += 6; else state.awayScore += 6;
        addDriveEntry("TD");
        plays.push(playEvent);
        playCount++;
        const xpOutcome = resolvePlay("extraPoint", attacker, defender, state, weather);
        const xpDesc    = describePlay("extraPoint", xpOutcome.result, 0, attacker, defender);
        if (xpOutcome.result === "fieldGoalGood") { if (state.possession === "home") state.homeScore += 1; else state.awayScore += 1; }
        plays.push({ ...playEvent, id: uid(), playType: "extraPoint", result: xpOutcome.result, description: xpDesc.description, isScoring: false, isTurnover: false, score: { home: state.homeScore, away: state.awayScore }, driveId: state.currentDriveId });
        switchPossession(state);
      } else if (outcome.result === "fieldGoalGood") {
        if (state.possession === "home") state.homeScore += 3; else state.awayScore += 3;
        addDriveEntry("FG");
        plays.push(playEvent);
        playCount++;
        switchPossession(state);
      } else if (outcome.result === "fieldGoalMiss" || outcome.result === "punt") {
        addDriveEntry(outcome.result === "punt" ? "Punt" : "Turnover on Downs");
        plays.push(playEvent);
        playCount++;
        state.yardLine = outcome.result === "punt" ? Math.max(5, 100 - outcome.yards) : 20;
        switchPossession(state);
      } else if (outcome.result === "interception" || outcome.result === "fumble") {
        addDriveEntry("Turnover");
        plays.push(playEvent);
        playCount++;
        state.yardLine = clamp(100 - state.yardLine, 5, 80);
        switchPossession(state);
      } else {
        plays.push(playEvent);
        playCount++;
        if (outcome.result === "sack") {
          state.yardLine = clamp(state.yardLine + outcome.yards, 1, 99);
          state.down++;
          state.yardsToGo -= outcome.yards;
        } else if (outcome.result === "gain" || outcome.result === "loss") {
          const moved = outcome.yards;
          state.yardLine = clamp(state.yardLine + moved, 1, 99);
          state.yardsToGo = Math.max(0, state.yardsToGo - moved);
          if (state.yardsToGo <= 0 || moved >= 10) { state.down = 1; state.yardsToGo = 10; }
          else state.down++;
        } else {
          if (playType !== "spike" && playType !== "kneel") state.down++;
        }
        if (state.down > 4) {
          addDriveEntry("Turnover on Downs");
          state.yardLine = 100 - state.yardLine;
          switchPossession(state);
        }
      }

      if (state.minute === 0 && state.second === 0) {
        if (q < 4) addDriveEntry("Half"); else addDriveEntry("End of Game");
        break;
      }
    }
  }

  // Overtime
  if (state.homeScore === state.awayScore) {
    state.possession = Math.random() < 0.5 ? "home" : "away";
    state.yardLine   = 25;
    state.down       = 1;
    state.yardsToGo  = 10;
    for (let i = 0; i < 30; i++) {
      const attacker = currentAttacker();
      const defender = currentDefender();
      const playType = decidePlay(state, attacker, weather);
      const outcome  = resolvePlay(playType, attacker, defender, state, weather);
      if (outcome.result === "touchdown" || outcome.result === "fieldGoalGood") {
        const pts = outcome.result === "touchdown" ? 7 : 3;
        if (state.possession === "home") state.homeScore += pts; else state.awayScore += pts;
        break;
      } else if (outcome.result === "interception" || outcome.result === "fumble") {
        switchPossession(state);
      } else {
        state.yardLine  = clamp(state.yardLine + outcome.yards, 1, 99);
        state.yardsToGo = Math.max(0, state.yardsToGo - outcome.yards);
        if (state.yardsToGo <= 0) { state.down = 1; state.yardsToGo = 10; } else state.down++;
        if (state.down > 4) { state.yardLine = 100 - state.yardLine; switchPossession(state); }
      }
    }
  }

  homeStats.totalYards = homeStats.passingYards + homeStats.rushingYards;
  awayStats.totalYards = awayStats.passingYards + awayStats.rushingYards;

  // ── Post-game: distribute defensive tackles/pass deflections/forced fumbles ──
  distributeDefensiveStats(homeTeam, awayPlays, pStats);
  distributeDefensiveStats(awayTeam, homePlays, pStats);

  // Punter averages
  for (const [id, yards] of Object.entries(puntYardMap)) {
    const count = puntCountMap[id] ?? 1;
    getOrInit(pStats, id).puntsAverage = parseFloat((yards / count).toFixed(1));
  }

  // Per-unit derived stats and QB rating
  for (const s of Object.values(pStats)) {
    if (s.carries    > 0) s.yardsPerCarry = parseFloat((s.rushingYards   / s.carries).toFixed(1));
    if (s.receptions > 0) s.yardsPerCatch = parseFloat((s.receivingYards / s.receptions).toFixed(1));
    if (s.attempts   > 0) s.qbRating = computeQBRating(s.attempts, s.completions, s.passingYards, s.passingTDs, s.interceptions);
  }

  // Mark all depth-1 players as having played in this game
  for (const team of [homeTeam, awayTeam]) {
    for (const p of team.roster.filter(pl => pl.depthOrder === 1)) {
      getOrInit(pStats, p.id).gamesPlayed = 1;
    }
  }

  return {
    id: uid(), week,
    homeTeamId: homeTeam.id, awayTeamId: awayTeam.id,
    homeScore: state.homeScore, awayScore: state.awayScore,
    status: "final", plays, drives, phase: "final",
    stats: { home: homeStats, away: awayStats },
    playerStats: pStats,
    weather, location: homeTeam.stadium,
  };
}
