import {
  NFLTeam, NFLGame, PlayByPlayEvent, TeamGameStats, GameWeather,
  WeatherCondition, PlayType, PlayResult, GamePhase, DriveEntry, DriveResultType,
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
  const isLateSeaon = week >= 13;
  const baseTemp = isCold ? (isLateSeaon ? irng(15, 38) : irng(35, 60)) : irng(45, 85);
  const roll = Math.random();
  let condition: WeatherCondition;
  let windSpeed = 0;
  if (isLateSeaon && isCold && roll < 0.15) { condition = "Snow"; windSpeed = irng(5, 20); }
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

function getPlayerName(team: NFLTeam, pos: NFLPosition, depth = 1): string {
  const p = team.roster.find(r => r.position === pos && r.depthOrder === depth) ??
            team.roster.find(r => r.position === pos) ??
            { name: "Unknown" };
  return p.name;
}

function describePlay(
  playType: PlayType,
  result: PlayResult,
  yards: number,
  attacker: NFLTeam,
  defender: NFLTeam,
  isFatigue = false,
): { description: string; playerName?: string; targetName?: string } {
  const qb = getPlayerName(attacker, "QB");
  const rb = getPlayerName(attacker, "RB");
  const wr1 = getPlayerName(attacker, "WR");
  const wr2 = getPlayerName(attacker, "WR", 2);
  const te = getPlayerName(attacker, "TE");
  const de = getPlayerName(defender, "DE");
  const lb = getPlayerName(defender, "LB");
  const cb = getPlayerName(defender, "CB");
  const s = getPlayerName(defender, "S");

  if (playType === "kickoff") return { description: `${attacker.city} kicks off to start the drive.` };
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
    return result === "fieldGoalGood"
      ? { description: `${k} is good on the ${40 + irng(-10,10)}-yard field goal attempt!`, playerName: k }
      : { description: `${k} misses the ${40 + irng(-10,10)}-yard field goal — no good!`, playerName: k };
  }
  if (playType === "spike") return { description: `${qb} spikes the ball to stop the clock.`, playerName: qb };
  if (playType === "kneel") return { description: `${qb} takes a knee. ${attacker.abbreviation} running out the clock.`, playerName: qb };

  // Run plays
  if (playType === "run") {
    const carrier = Math.random() < 0.75 ? rb : qb;
    if (result === "touchdown") return {
      description: `${carrier} RUSHES IN FOR A TOUCHDOWN! ${yards} yards! ${attacker.abbreviation} score!`,
      playerName: carrier,
    };
    if (result === "fumble") return {
      description: `${carrier} FUMBLES the ball! ${getPlayerName(defender, "LB")} recovers for ${defender.abbreviation}!`,
      playerName: carrier, isTurnover: true,
    } as any;
    if (yards <= 0) return { description: `${carrier} is stuffed at the line by ${lb} for a loss of ${Math.abs(yards)}.`, playerName: carrier };
    if (yards >= 10) return { description: `${carrier} breaks free for ${yards} yards! Great burst through the hole!`, playerName: carrier };
    return { description: `${carrier} carries for ${yards} yard${yards !== 1 ? "s" : ""}.`, playerName: carrier };
  }

  // Pass plays
  const receivers = [wr1, wr2, te, rb];
  const receiver = pick(receivers);
  const fatigueNote = isFatigue ? " Fighting through fatigue," : "";
  if (result === "incomplete") return {
    description: `${qb} fires to ${receiver} — incomplete.${fatigueNote} Covered by ${cb}.`,
    playerName: qb, targetName: receiver,
  };
  if (result === "sack") return {
    description: `${de} sacks ${qb} for a loss of ${Math.abs(yards)} yards! QB pressure pays off.`,
    playerName: qb,
  };
  if (result === "interception") {
    const interceptor = Math.random() < 0.5 ? cb : s;
    return {
      description: `${qb} throws PICKED OFF by ${interceptor}! Terrible read — turnover ${defender.abbreviation}!`,
      playerName: qb, targetName: interceptor,
    };
  }
  if (result === "touchdown") return {
    description: `${qb} FINDS ${receiver} IN THE END ZONE! TOUCHDOWN ${attacker.abbreviation}! ${yards} yards!`,
    playerName: qb, targetName: receiver,
  };
  if (yards >= 20) return {
    description: `${qb} goes deep to ${receiver} for ${yards} yards! Big gain${isFatigue ? " despite the fatigue" : ""}!`,
    playerName: qb, targetName: receiver,
  };
  return {
    description: `${qb} connects with ${receiver} for ${yards} yards.${fatigueNote}`,
    playerName: qb, targetName: receiver,
  };
}

// ─── Core Simulation State ────────────────────────────────────────────────────

interface GameState {
  possession: "home" | "away";
  down: number;
  yardsToGo: number;
  yardLine: number;      // 1–99, direction of attack (1 = own goal line, 99 = opponent goal line)
  quarter: number;
  minute: number;
  second: number;
  homeScore: number;
  awayScore: number;
  homeTimeouts: number;
  awayTimeouts: number;
  momentum: number;      // -10 to +10 (positive = home)
  homeFatigue: number;   // accumulates per play
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
  const scoreDiff = state.possession === "home" ? state.homeScore - state.awayScore : state.awayScore - state.homeScore;
  const isLosingBig = scoreDiff < -14;
  const isWinningBig = scoreDiff > 14;
  const isEndOfHalf = (quarter === 2 || quarter === 4) && minute <= 2;
  const isEndOfGame = quarter === 4 && minute <= 4;

  // Punting
  if (down === 4 && yardsToGo > 3 && yardLine < 55) return "punt";
  // Field goal
  if (down === 4 && yardsToGo <= 3 && yardLine >= 65) return "fieldGoal";
  if (down === 4 && yardLine >= 75 && yardsToGo <= 8) return "fieldGoal";
  // Clock management
  if (isEndOfGame && isWinningBig) return Math.random() < 0.7 ? "run" : (minute <= 1 ? "kneel" : "run");
  if (isEndOfHalf && isLosingBig) return Math.random() < 0.6 ? "pass" : "spike";
  // Normal play calling
  const passModifier = weatherPassModifier(weather) * gamePlanAggression(attacker);
  const runPreference = attacker.offenseScheme === "run-heavy" ? 0.55 : attacker.offenseScheme === "air-raid" ? 0.22 : 0.42;
  if (down === 1 && yardsToGo >= 10) return Math.random() < runPreference ? "run" : "pass";
  if (down === 3 && yardsToGo >= 7) return Math.random() < 0.82 * passModifier ? "pass" : "run";
  if (down === 2 && yardsToGo <= 3) return Math.random() < 0.6 ? "run" : "pass";
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
  const qbOvr = getQBRating(attacker) / 100;
  const passAdj = weatherPassModifier(weather);
  const turnoverAdj = weatherTurnoverModifier(weather);
  const fatigue = state.possession === "home" ? state.homeFatigue : state.awayFatigue;
  const fatigueMultiplier = clamp(1 - fatigue * 0.002, 0.7, 1.0);
  const momBonus = state.possession === "home" ? state.momentum * 0.008 : -state.momentum * 0.008;
  const netAtk = clamp(atkOvr + momBonus, 0.3, 1.0) * fatigueMultiplier;
  const netDef = clamp(defOvr - momBonus * 0.5, 0.3, 1.0);

  // Punt
  if (playType === "punt") {
    const dist = irng(35, 55);
    return { result: "punt", yards: dist, isInjury: false };
  }
  // Field goal
  if (playType === "fieldGoal") {
    const dist = 100 - state.yardLine + 17;
    const successProb = clamp(0.95 - (dist - 30) * 0.018 - (weather.windSpeed > 20 ? 0.1 : 0), 0.2, 0.97);
    return { result: Math.random() < successProb ? "fieldGoalGood" : "fieldGoalMiss", yards: 0, isInjury: false };
  }
  // Extra point
  if (playType === "extraPoint") {
    return { result: Math.random() < 0.945 ? "fieldGoalGood" : "fieldGoalMiss", yards: 0, isInjury: false };
  }
  // Spike / kneel
  if (playType === "spike") return { result: "spike", yards: 0, isInjury: false };
  if (playType === "kneel") return { result: "kneel", yards: -1, isInjury: false };

  // Run play
  if (playType === "run") {
    const baseMean = (netAtk - netDef) * 12 + schemeRunBonus(attacker) * 0.1;
    const mean = clamp(baseMean + 3.5, 1, 10);
    const variance = 3.5;
    const yards = Math.round(clamp(mean + (Math.random() - 0.5) * variance * 3, -4, 25));
    const fumbleProb = 0.008 * turnoverAdj;
    if (Math.random() < fumbleProb) return { result: "fumble", yards: -1, isInjury: false };
    const tdProb = yards >= state.yardsToGo && state.yardLine + yards >= 100 ? 1 : 0;
    if (tdProb || state.yardLine + yards >= 100) return { result: "touchdown", yards, isInjury: false };
    const isInjury = Math.random() < 0.008;
    return { result: yards >= 0 ? "gain" : "loss", yards, isInjury };
  }

  // Pass play
  const sackProb = clamp((netDef - netAtk) * 0.15 + 0.04, 0.01, 0.18);
  if (Math.random() < sackProb) {
    return { result: "sack", yards: -irng(3, 12), isInjury: false };
  }
  const completionProb = clamp(qbOvr * passAdj * fatigueMultiplier * 0.7 + netAtk * 0.3 - netDef * 0.2, 0.35, 0.80);
  if (Math.random() > completionProb) {
    const intProb = clamp((1 - qbOvr) * 0.15 * turnoverAdj + (1 - completionProb) * 0.1, 0.02, 0.12);
    if (Math.random() < intProb) return { result: "interception", yards: -1, isInjury: false };
    return { result: "incomplete", yards: 0, isInjury: false };
  }
  // Completed pass
  const isDeep = Math.random() < 0.22 * gamePlanAggression(attacker);
  const mean = isDeep ? irng(18, 35) : irng(5, 14);
  const yards = Math.round(clamp(mean + (Math.random() - 0.5) * 6, 1, 45));
  if (state.yardLine + yards >= 100) return { result: "touchdown", yards, isInjury: false };
  const isInjury = Math.random() < 0.005;
  return { result: "gain", yards, isInjury };
}

// ─── Main Simulation ──────────────────────────────────────────────────────────

export function simulateFullGame(
  homeTeam: NFLTeam,
  awayTeam: NFLTeam,
  week: number,
): NFLGame {
  const weather = generateWeather(homeTeam.abbreviation, week);
  const plays: PlayByPlayEvent[] = [];
  const drives: DriveEntry[] = [];
  const state = initState();

  const homeStats: TeamGameStats = { passingYards:0,rushingYards:0,totalYards:0,turnovers:0,thirdDownConversions:0,thirdDownAttempts:0,sacks:0,firstDowns:0,timeOfPossession:0,penalties:0,penaltyYards:0,redZoneAttempts:0,redZoneTDs:0 };
  const awayStats: TeamGameStats = { passingYards:0,rushingYards:0,totalYards:0,turnovers:0,thirdDownConversions:0,thirdDownAttempts:0,sacks:0,firstDowns:0,timeOfPossession:0,penalties:0,penaltyYards:0,redZoneAttempts:0,redZoneTDs:0 };

  function currentStats() { return state.possession === "home" ? homeStats : awayStats; }
  function currentAttacker() { return state.possession === "home" ? homeTeam : awayTeam; }
  function currentDefender() { return state.possession === "home" ? awayTeam : homeTeam; }

  function addDriveEntry(result: DriveResultType) {
    const startTime = state.currentDriveStartTime;
    const endYardLine = state.yardLine;
    drives.push({
      id: state.currentDriveId,
      teamId: state.possession === "home" ? homeTeam.id : awayTeam.id,
      quarter: state.currentDriveStartQuarter,
      startTime,
      startYardLine: state.currentDriveStartYardLine,
      plays: state.currentDrivePlays,
      yards: endYardLine - state.currentDriveStartYardLine,
      result,
    });
  }

  let playCount = 0;
  const MAX_PLAYS = 180;

  // Process quarters
  for (let q = 1; q <= 4 && playCount < MAX_PLAYS; q++) {
    state.quarter = q;
    state.minute = 15;
    state.second = 0;

    if (q === 3) {
      // Halftime — switch possession, reset fatigue slightly
      switchPossession(state);
      state.homeFatigue = Math.max(0, state.homeFatigue - 20);
      state.awayFatigue = Math.max(0, state.awayFatigue - 20);
    }

    while (state.minute > 0 || (state.minute === 0 && state.second > 0)) {
      if (playCount >= MAX_PLAYS) break;
      const attacker = currentAttacker();
      const defender = currentDefender();
      const isFatigue = (state.possession === "home" ? state.homeFatigue : state.awayFatigue) > 40;
      const playType = decidePlay(state, attacker, weather);
      const outcome = resolvePlay(playType, attacker, defender, state, weather);
      const stats = currentStats();

      // Advance clock
      const isRunClock = playType === "run" || outcome.result === "incomplete" || playType === "punt" || playType === "fieldGoal";
      const clockBurn = playType === "pass" && outcome.result === "gain" ? irng(25, 40) : irng(20, 45);
      advanceClock(state, clockBurn);

      // Fatigue accumulates
      if (state.possession === "home") state.homeFatigue = clamp(state.homeFatigue + 0.8, 0, 100);
      else state.awayFatigue = clamp(state.awayFatigue + 0.8, 0, 100);

      // Momentum update
      const isScoring = outcome.result === "touchdown" || outcome.result === "fieldGoalGood";
      const isTurnover = outcome.result === "interception" || outcome.result === "fumble";
      const momentumDelta = isScoring ? 4 : isTurnover ? -3 : outcome.yards > 15 ? 1 : outcome.result === "sack" ? -1 : 0;
      state.momentum = clamp(state.momentum + (state.possession === "home" ? momentumDelta : -momentumDelta), -10, 10);

      // Update stats
      if (playType === "run" && (outcome.result === "gain" || outcome.result === "loss" || outcome.result === "touchdown")) {
        stats.rushingYards += Math.max(0, outcome.yards);
      } else if (playType === "pass" && (outcome.result === "gain" || outcome.result === "touchdown")) {
        stats.passingYards += outcome.yards;
      } else if (outcome.result === "sack") {
        const oppStats = state.possession === "home" ? awayStats : homeStats;
        oppStats.sacks += 1;
      }
      if (outcome.result === "interception" || outcome.result === "fumble") stats.turnovers += 1;
      if (state.down === 3) { stats.thirdDownAttempts += 1; if (outcome.yards >= state.yardsToGo) stats.thirdDownConversions += 1; }
      stats.totalYards = stats.passingYards + stats.rushingYards;
      if (outcome.yards >= state.yardsToGo && (outcome.result === "gain" || outcome.result === "touchdown")) stats.firstDowns += 1;

      // Build description
      const playDesc = describePlay(playType, outcome.result, outcome.yards, attacker, defender, isFatigue);
      state.currentDrivePlays += 1;

      const playEvent: PlayByPlayEvent = {
        id: uid(),
        quarter: q,
        minute: state.minute,
        second: state.second,
        down: state.down,
        yardsToGo: state.yardsToGo,
        yardLine: state.yardLine,
        possession: state.possession,
        playType,
        result: outcome.result,
        yardsGained: outcome.yards,
        playerName: playDesc.playerName,
        targetName: playDesc.targetName,
        description: playDesc.description,
        score: { home: state.homeScore, away: state.awayScore },
        isScoring,
        isTurnover,
        isInjury: outcome.isInjury,
        injuredPlayerName: outcome.isInjury ? (playDesc.playerName ?? undefined) : undefined,
        momentum: state.momentum,
        driveId: state.currentDriveId,
      };

      // Handle outcomes
      if (outcome.result === "touchdown") {
        if (state.possession === "home") state.homeScore += 6;
        else state.awayScore += 6;
        addDriveEntry("TD");
        plays.push(playEvent);
        playCount++;

        // Extra point
        const xpOutcome = resolvePlay("extraPoint", attacker, defender, state, weather);
        const xpDesc = describePlay("extraPoint", xpOutcome.result, 0, attacker, defender);
        if (xpOutcome.result === "fieldGoalGood") {
          if (state.possession === "home") state.homeScore += 1;
          else state.awayScore += 1;
        }
        plays.push({ ...playEvent, id: uid(), playType: "extraPoint", result: xpOutcome.result, description: xpDesc.description, isScoring: false, isTurnover: false, score: { home: state.homeScore, away: state.awayScore }, driveId: state.currentDriveId });
        switchPossession(state);
      } else if (outcome.result === "fieldGoalGood") {
        if (state.possession === "home") state.homeScore += 3;
        else state.awayScore += 3;
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
        // Normal play — advance field position
        plays.push(playEvent);
        playCount++;
        if (outcome.result === "sack") {
          state.yardLine = clamp(state.yardLine + outcome.yards, 1, 99);
          state.down++;
          state.yardsToGo -= outcome.yards;
        } else if (outcome.result === "gain" || outcome.result === "loss" || outcome.result === "touchdown") {
          const moved = outcome.yards;
          state.yardLine = clamp(state.yardLine + moved, 1, 99);
          state.yardsToGo = Math.max(0, state.yardsToGo - moved);
          if (state.yardsToGo <= 0 || moved >= 10) {
            state.down = 1;
            state.yardsToGo = 10;
          } else {
            state.down++;
          }
        } else {
          // incomplete, spike, kneel
          if (playType !== "spike" && playType !== "kneel") state.down++;
        }

        // 4th down — turnover on downs if no special play
        if (state.down > 4) {
          addDriveEntry("Turnover on Downs");
          state.yardLine = 100 - state.yardLine;
          switchPossession(state);
        }
      }

      // Quarter end
      if (state.minute === 0 && state.second === 0) {
        if (q < 4) {
          addDriveEntry("Half");
        } else {
          addDriveEntry("End of Game");
        }
        break;
      }
    }
  }

  // Overtime if tied
  if (state.homeScore === state.awayScore) {
    state.possession = Math.random() < 0.5 ? "home" : "away";
    state.yardLine = 25;
    state.down = 1;
    state.yardsToGo = 10;
    // Simplified OT: first score wins
    for (let i = 0; i < 30; i++) {
      const attacker = currentAttacker();
      const defender = currentDefender();
      const playType = decidePlay(state, attacker, weather);
      const outcome = resolvePlay(playType, attacker, defender, state, weather);
      if (outcome.result === "touchdown" || outcome.result === "fieldGoalGood") {
        const pts = outcome.result === "touchdown" ? 7 : 3;
        if (state.possession === "home") state.homeScore += pts;
        else state.awayScore += pts;
        break;
      } else if (outcome.result === "interception" || outcome.result === "fumble") {
        switchPossession(state);
      } else {
        state.yardLine = clamp(state.yardLine + outcome.yards, 1, 99);
        state.yardsToGo = Math.max(0, state.yardsToGo - outcome.yards);
        if (state.yardsToGo <= 0) { state.down = 1; state.yardsToGo = 10; }
        else state.down++;
        if (state.down > 4) { state.yardLine = 100 - state.yardLine; switchPossession(state); }
      }
    }
  }

  homeStats.totalYards = homeStats.passingYards + homeStats.rushingYards;
  awayStats.totalYards = awayStats.passingYards + awayStats.rushingYards;

  return {
    id: uid(),
    week,
    homeTeamId: homeTeam.id,
    awayTeamId: awayTeam.id,
    homeScore: state.homeScore,
    awayScore: state.awayScore,
    status: "final",
    plays,
    drives,
    phase: "final",
    stats: { home: homeStats, away: awayStats },
    weather,
    location: homeTeam.stadium,
  };
}
