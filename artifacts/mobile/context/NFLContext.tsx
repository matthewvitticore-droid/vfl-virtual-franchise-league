import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

export type Role = "GM" | "Coach";
export type Conference = "AFC" | "NFC";
export type Division = "North" | "South" | "East" | "West";
export type OffensePosition = "QB" | "RB" | "WR" | "TE" | "OL";
export type DefensePosition = "DE" | "DT" | "LB" | "CB" | "S";
export type SpecialPosition = "K" | "P";
export type NFLPosition = OffensePosition | DefensePosition | SpecialPosition;

export type ContractStatus = "Starter" | "Backup" | "Practice Squad" | "Free Agent";
export type PlayType = "run" | "pass" | "punt" | "fieldGoal" | "kickoff" | "extraPoint";
export type PlayResult = "gain" | "loss" | "touchdown" | "interception" | "fumble" | "incomplete" | "sack" | "penalty" | "fieldGoalGood" | "fieldGoalMiss" | "punt";
export type GamePhase = "pregame" | "q1" | "q2" | "halftime" | "q3" | "q4" | "overtime" | "final";
export type DriveResult = "touchdown" | "fieldGoal" | "punt" | "turnover" | "safety" | "missedFG";
export type GamePlan = "aggressive" | "balanced" | "conservative";
export type Formation = "4-3" | "3-4" | "nickel" | "dime";
export type OffenseScheme = "spread" | "pro-set" | "run-heavy" | "air-raid";

export interface Player {
  id: string;
  name: string;
  position: NFLPosition;
  age: number;
  overall: number;
  potential: number;
  speed: number;
  strength: number;
  awareness: number;
  specific: number; // position-specific main stat
  yearsExperience: number;
  contractYears: number;
  salary: number; // millions
  status: ContractStatus;
  depthOrder: number; // 1 = starter, 2 = backup, etc.
  stats: PlayerSeasonStats;
}

export interface PlayerSeasonStats {
  gamesPlayed: number;
  // Offense
  passingYards: number;
  passingTDs: number;
  interceptions: number;
  completions: number;
  attempts: number;
  rushingYards: number;
  rushingTDs: number;
  carries: number;
  receivingYards: number;
  receivingTDs: number;
  receptions: number;
  targets: number;
  // Defense
  tackles: number;
  sacks: number;
  forcedFumbles: number;
  defensiveINTs: number;
  // Special
  fieldGoalsMade: number;
  fieldGoalsAttempted: number;
  puntsAverage: number;
}

export interface DraftPick {
  id: string;
  round: number;
  pick: number;
  year: number;
  fromTeam: string;
}

export interface TradeOffer {
  id: string;
  fromTeamId: string;
  offered: string[]; // player IDs
  requested: string[]; // player IDs
  picksOffered: DraftPick[];
  picksRequested: DraftPick[];
}

export interface NFLTeam {
  id: string;
  city: string;
  name: string;
  abbreviation: string;
  conference: Conference;
  division: Division;
  primaryColor: string;
  secondaryColor: string;
  overall: number;
  roster: Player[];
  capSpace: number; // millions remaining
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  draftPicks: DraftPick[];
  // Coach settings
  defenseFormation: Formation;
  offenseScheme: OffenseScheme;
  gamePlan: GamePlan;
  // Depth overrides (position -> [player ids in order])
  depthChart: Partial<Record<NFLPosition, string[]>>;
}

export interface PlayByPlayEvent {
  id: string;
  quarter: number;
  minute: number;
  second: number;
  down: number;
  yardsToGo: number;
  yardLine: number;
  possession: "home" | "away";
  playType: PlayType;
  result: PlayResult;
  yardsGained: number;
  playerName?: string;
  targetName?: string;
  description: string; // broadcast-style
  score: { home: number; away: number };
  isPenalty?: boolean;
  isScoring?: boolean;
  isTurnover?: boolean;
}

export interface NFLGame {
  id: string;
  week: number;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  status: "upcoming" | "simulating" | "final";
  plays: PlayByPlayEvent[];
  phase: GamePhase;
  stats: {
    home: TeamGameStats;
    away: TeamGameStats;
  };
}

export interface TeamGameStats {
  passingYards: number;
  rushingYards: number;
  turnovers: number;
  timeOfPossessionSecs: number;
  thirdDownConversions: number;
  thirdDownAttempts: number;
  redZoneScores: number;
  redZoneAttempts: number;
  sacks: number;
  penalties: number;
  penaltyYards: number;
  firstDowns: number;
}

export interface DraftProspect {
  id: string;
  name: string;
  position: NFLPosition;
  college: string;
  overall: number;
  potential: number;
  round: number;
  pick: number;
}

export interface Season {
  year: number;
  currentWeek: number;
  totalWeeks: number;
  games: NFLGame[];
  teams: NFLTeam[];
  playerTeamId: string;
  activeRole: Role;
  draftBoard: DraftProspect[];
  freeAgents: Player[];
  tradeOffers: TradeOffer[];
  isPlayoffs: boolean;
}

// ─── NFL Team Data ───────────────────────────────────────────────────────────

const NFL_TEAMS_CONFIG: Array<{
  city: string; name: string; abbreviation: string;
  conference: Conference; division: Division;
  primaryColor: string; secondaryColor: string; overall: number;
}> = [
  // AFC East
  { city: "Buffalo", name: "Bills", abbreviation: "BUF", conference: "AFC", division: "East", primaryColor: "#00338D", secondaryColor: "#C60C30", overall: 90 },
  { city: "Miami", name: "Dolphins", abbreviation: "MIA", conference: "AFC", division: "East", primaryColor: "#008E97", secondaryColor: "#FC4C02", overall: 83 },
  { city: "New England", name: "Patriots", abbreviation: "NE", conference: "AFC", division: "East", primaryColor: "#002244", secondaryColor: "#C60C30", overall: 76 },
  { city: "New York", name: "Jets", abbreviation: "NYJ", conference: "AFC", division: "East", primaryColor: "#125740", secondaryColor: "#000000", overall: 81 },
  // AFC North
  { city: "Baltimore", name: "Ravens", abbreviation: "BAL", conference: "AFC", division: "North", primaryColor: "#241773", secondaryColor: "#9E7C0C", overall: 91 },
  { city: "Cincinnati", name: "Bengals", abbreviation: "CIN", conference: "AFC", division: "North", primaryColor: "#FB4F14", secondaryColor: "#000000", overall: 84 },
  { city: "Cleveland", name: "Browns", abbreviation: "CLE", conference: "AFC", division: "North", primaryColor: "#311D00", secondaryColor: "#FF3C00", overall: 78 },
  { city: "Pittsburgh", name: "Steelers", abbreviation: "PIT", conference: "AFC", division: "North", primaryColor: "#FFB612", secondaryColor: "#101820", overall: 82 },
  // AFC South
  { city: "Houston", name: "Texans", abbreviation: "HOU", conference: "AFC", division: "South", primaryColor: "#03202F", secondaryColor: "#A71930", overall: 87 },
  { city: "Indianapolis", name: "Colts", abbreviation: "IND", conference: "AFC", division: "South", primaryColor: "#002C5F", secondaryColor: "#A2AAAD", overall: 80 },
  { city: "Jacksonville", name: "Jaguars", abbreviation: "JAX", conference: "AFC", division: "South", primaryColor: "#006778", secondaryColor: "#D7A22A", overall: 79 },
  { city: "Tennessee", name: "Titans", abbreviation: "TEN", conference: "AFC", division: "South", primaryColor: "#0C2340", secondaryColor: "#418FDE", overall: 75 },
  // AFC West
  { city: "Denver", name: "Broncos", abbreviation: "DEN", conference: "AFC", division: "West", primaryColor: "#FB4F14", secondaryColor: "#002244", overall: 77 },
  { city: "Kansas City", name: "Chiefs", abbreviation: "KC", conference: "AFC", division: "West", primaryColor: "#E31837", secondaryColor: "#FFB81C", overall: 95 },
  { city: "Las Vegas", name: "Raiders", abbreviation: "LV", conference: "AFC", division: "West", primaryColor: "#000000", secondaryColor: "#A5ACAF", overall: 76 },
  { city: "Los Angeles", name: "Chargers", abbreviation: "LAC", conference: "AFC", division: "West", primaryColor: "#0080C6", secondaryColor: "#FFC20E", overall: 82 },
  // NFC East
  { city: "Dallas", name: "Cowboys", abbreviation: "DAL", conference: "NFC", division: "East", primaryColor: "#003594", secondaryColor: "#869397", overall: 86 },
  { city: "New York", name: "Giants", abbreviation: "NYG", conference: "NFC", division: "East", primaryColor: "#0B2265", secondaryColor: "#A71930", overall: 74 },
  { city: "Philadelphia", name: "Eagles", abbreviation: "PHI", conference: "NFC", division: "East", primaryColor: "#004C54", secondaryColor: "#A5ACAF", overall: 89 },
  { city: "Washington", name: "Commanders", abbreviation: "WAS", conference: "NFC", division: "East", primaryColor: "#5A1414", secondaryColor: "#FFB612", overall: 80 },
  // NFC North
  { city: "Chicago", name: "Bears", abbreviation: "CHI", conference: "NFC", division: "North", primaryColor: "#0B162A", secondaryColor: "#C83803", overall: 79 },
  { city: "Detroit", name: "Lions", abbreviation: "DET", conference: "NFC", division: "North", primaryColor: "#0076B6", secondaryColor: "#B0B7BC", overall: 88 },
  { city: "Green Bay", name: "Packers", abbreviation: "GB", conference: "NFC", division: "North", primaryColor: "#203731", secondaryColor: "#FFB612", overall: 87 },
  { city: "Minnesota", name: "Vikings", abbreviation: "MIN", conference: "NFC", division: "North", primaryColor: "#4F2683", secondaryColor: "#FFC62F", overall: 83 },
  // NFC South
  { city: "Atlanta", name: "Falcons", abbreviation: "ATL", conference: "NFC", division: "South", primaryColor: "#A71930", secondaryColor: "#000000", overall: 80 },
  { city: "Carolina", name: "Panthers", abbreviation: "CAR", conference: "NFC", division: "South", primaryColor: "#0085CA", secondaryColor: "#101820", overall: 72 },
  { city: "New Orleans", name: "Saints", abbreviation: "NO", conference: "NFC", division: "South", primaryColor: "#D3BC8D", secondaryColor: "#101820", overall: 78 },
  { city: "Tampa Bay", name: "Buccaneers", abbreviation: "TB", conference: "NFC", division: "South", primaryColor: "#D50A0A", secondaryColor: "#FF7900", overall: 85 },
  // NFC West
  { city: "Arizona", name: "Cardinals", abbreviation: "ARI", conference: "NFC", division: "West", primaryColor: "#97233F", secondaryColor: "#000000", overall: 74 },
  { city: "Los Angeles", name: "Rams", abbreviation: "LAR", conference: "NFC", division: "West", primaryColor: "#003594", secondaryColor: "#FFA300", overall: 83 },
  { city: "San Francisco", name: "49ers", abbreviation: "SF", conference: "NFC", division: "West", primaryColor: "#AA0000", secondaryColor: "#B3995D", overall: 93 },
  { city: "Seattle", name: "Seahawks", abbreviation: "SEA", conference: "NFC", division: "West", primaryColor: "#002244", secondaryColor: "#69BE28", overall: 81 },
];

// ─── Player Generation ───────────────────────────────────────────────────────

const FIRST_NAMES = ["Josh", "Lamar", "Patrick", "Joe", "Dak", "Justin", "Jalen", "CJ", "Travis", "Stefon", "Tyreek", "Davante", "Cooper", "DeAndre", "Micah", "Myles", "Nick", "Aaron", "Quay", "Jordan", "Tua", "Sam", "Baker", "Derek", "Geno", "Mac", "Bryce", "CJ", "Anthony", "Nick", "Trevor", "Kenny", "Deshaun", "Jacoby", "Marcus", "Ryan", "Matt", "Kirk", "Darnell", "Chase"];
const LAST_NAMES = ["Allen", "Jackson", "Mahomes", "Burrow", "Prescott", "Herbert", "Hurts", "Stroud", "Kelce", "Diggs", "Hill", "Adams", "Kupp", "Hopkins", "Parsons", "Garrett", "Chubb", "Jones", "Walker", "Love", "Tagovailoa", "Darnold", "Mayfield", "Carr", "Wilson", "Jones", "Young", "Moody", "Richardson", "Bosa", "Lawrence", "Pickett", "Watson", "Brissett", "Mariota", "Tannehill", "Ryan", "Cousins", "Moore", "Thomas"];

const POSITION_POOLS: NFLPosition[][] = [
  ["QB"], ["QB"],
  ["RB"], ["RB"], ["RB"],
  ["WR"], ["WR"], ["WR"], ["WR"], ["WR"],
  ["TE"], ["TE"],
  ["OL"], ["OL"], ["OL"], ["OL"], ["OL"],
  ["DE"], ["DE"], ["DE"],
  ["DT"], ["DT"], ["DT"],
  ["LB"], ["LB"], ["LB"], ["LB"],
  ["CB"], ["CB"], ["CB"], ["CB"],
  ["S"], ["S"], ["S"],
  ["K"],
  ["P"],
];

function rn() { return `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`; }
function rs(base: number, v = 8) { return Math.min(99, Math.max(40, Math.round(base + (Math.random() - 0.5) * v * 2))); }
function uid() { return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`; }

function emptyStats(): PlayerSeasonStats {
  return { gamesPlayed: 0, passingYards: 0, passingTDs: 0, interceptions: 0, completions: 0, attempts: 0, rushingYards: 0, rushingTDs: 0, carries: 0, receivingYards: 0, receivingTDs: 0, receptions: 0, targets: 0, tackles: 0, sacks: 0, forcedFumbles: 0, defensiveINTs: 0, fieldGoalsMade: 0, fieldGoalsAttempted: 0, puntsAverage: 0 };
}

function emptyGameStats(): TeamGameStats {
  return { passingYards: 0, rushingYards: 0, turnovers: 0, timeOfPossessionSecs: 0, thirdDownConversions: 0, thirdDownAttempts: 0, redZoneScores: 0, redZoneAttempts: 0, sacks: 0, penalties: 0, penaltyYards: 0, firstDowns: 0 };
}

function generateRoster(teamOverall: number): Player[] {
  const players: Player[] = [];
  POSITION_POOLS.forEach((positions, idx) => {
    const pos = positions[0];
    const base = teamOverall + (Math.random() - 0.5) * 24;
    const overall = rs(base, 4);
    players.push({
      id: uid(),
      name: rn(),
      position: pos,
      age: 22 + Math.floor(Math.random() * 14),
      overall,
      potential: rs(Math.max(overall, 70), 10),
      speed: rs(base, 10),
      strength: rs(base, 10),
      awareness: rs(base, 10),
      specific: rs(base + 5, 6),
      yearsExperience: Math.floor(Math.random() * 12),
      contractYears: 1 + Math.floor(Math.random() * 4),
      salary: Math.round((0.5 + (overall / 99) * 25 + Math.random() * 3) * 10) / 10,
      status: idx < 22 ? "Starter" : "Backup",
      depthOrder: idx < 22 ? 1 : 2,
      stats: emptyStats(),
    });
  });
  return players;
}

function generateFreeAgents(): Player[] {
  return Array.from({ length: 30 }, () => {
    const pos = (["QB", "RB", "WR", "TE", "CB", "LB", "DE"] as NFLPosition[])[Math.floor(Math.random() * 7)];
    const overall = rs(68, 12);
    return {
      id: uid(),
      name: rn(),
      position: pos,
      age: 25 + Math.floor(Math.random() * 8),
      overall,
      potential: rs(overall, 8),
      speed: rs(overall, 10),
      strength: rs(overall, 10),
      awareness: rs(overall, 10),
      specific: rs(overall, 6),
      yearsExperience: Math.floor(Math.random() * 8),
      contractYears: 1 + Math.floor(Math.random() * 2),
      salary: Math.round((0.5 + (overall / 99) * 8 + Math.random() * 2) * 10) / 10,
      status: "Free Agent",
      depthOrder: 3,
      stats: emptyStats(),
    };
  });
}

function generateDraftBoard(): DraftProspect[] {
  const prospects: DraftProspect[] = [];
  const positions: NFLPosition[] = ["QB", "RB", "WR", "TE", "OL", "DE", "DT", "LB", "CB", "S"];
  let pickNum = 1;
  for (let round = 1; round <= 7; round++) {
    for (let pick = 1; pick <= 32; pick++) {
      const pos = positions[Math.floor(Math.random() * positions.length)];
      const overallBase = round === 1 ? 78 : round === 2 ? 72 : round <= 4 ? 66 : 60;
      prospects.push({
        id: uid(),
        name: rn(),
        position: pos,
        college: ["Alabama", "Georgia", "Ohio State", "Michigan", "LSU", "Clemson", "Texas", "Oregon", "USC", "Penn State"][Math.floor(Math.random() * 10)],
        overall: rs(overallBase, 6),
        potential: rs(overallBase + 5, 8),
        round,
        pick,
      });
      pickNum++;
    }
  }
  return prospects;
}

function generateSchedule(teams: NFLTeam[]): NFLGame[] {
  const games: NFLGame[] = [];
  const ids = teams.map(t => t.id);

  // Simple round-robin style, 18 weeks of games
  for (let week = 1; week <= 18; week++) {
    const shuffled = [...ids].sort(() => Math.random() - 0.5);
    for (let i = 0; i < shuffled.length; i += 2) {
      if (i + 1 < shuffled.length) {
        games.push({
          id: uid(),
          week,
          homeTeamId: shuffled[i],
          awayTeamId: shuffled[i + 1],
          homeScore: 0,
          awayScore: 0,
          status: "upcoming",
          plays: [],
          phase: "pregame",
          stats: { home: emptyGameStats(), away: emptyGameStats() },
        });
      }
    }
  }
  return games;
}

// ─── Play Simulation ─────────────────────────────────────────────────────────

const BROADCAST_PHRASES = {
  runGain: ["breaks through the line", "finds a crease", "powers ahead", "takes the handoff and grinds out", "reads the block and picks up"],
  runLoss: ["stuffed at the line", "met immediately in the backfield", "swamped by the defense", "goes nowhere on"],
  passComplete: ["fires a strike", "finds his man for", "threads the needle", "drops a dime", "connects on"],
  passIncomplete: ["sails incomplete", "drops the ball", "overthrows", "can't haul it in", "breaks up the pass on"],
  sack: ["SACKED!", "gets taken down behind the line!", "pressure gets home!", "QB is brought down for a loss!"],
  touchdown: ["TOUCHDOWN!", "IT'S SIX!", "HE'S IN THE END ZONE!", "TOUCHES DOWN!", "PAYDIRT!"],
  interception: ["INTERCEPTED!", "PICKS IT OFF!", "TURNOVER!", "TIPPED AND CAUGHT!", "GOING THE OTHER WAY!"],
  fumble: ["FUMBLE!", "BALL ON THE GROUND!", "TURNOVER ON THE FUMBLE!", "STRIPS THE BALL!"],
  fieldGoalGood: ["IT'S GOOD!", "SPLITS THE UPRIGHTS!", "THREE POINTS!", "GOOD FROM"],
  fieldGoalMiss: ["NO GOOD!", "WIDE LEFT!", "SHORT!", "MISSES THE KICK!"],
  punt: ["PUNTS IT AWAY", "BOOTS ONE DEEP", "PINS THEM BACK", "GETS GREAT HANG TIME"],
  penalty: ["FLAG ON THE PLAY", "PENALTY ON THE OFFENSE", "PENALTY ON THE DEFENSE", "YELLOW FLAG"],
};

function getBroadcastPhrase(key: keyof typeof BROADCAST_PHRASES): string {
  const arr = BROADCAST_PHRASES[key];
  return arr[Math.floor(Math.random() * arr.length)];
}

function ordinal(n: number) { return ["1st", "2nd", "3rd", "4th"][n - 1] ?? `${n}th`; }

function simulateFullGame(home: NFLTeam, away: NFLTeam): NFLGame {
  const plays: PlayByPlayEvent[] = [];
  const score = { home: 0, away: 0 };
  const gameStats = { home: emptyGameStats(), away: emptyGameStats() };

  const homePower = home.overall + (Math.random() - 0.5) * 10;
  const awayPower = away.overall + (Math.random() - 0.5) * 10;

  // Adjust for game plan
  const homeAggrMod = home.gamePlan === "aggressive" ? 1.1 : home.gamePlan === "conservative" ? 0.9 : 1.0;
  const awayAggrMod = away.gamePlan === "aggressive" ? 1.1 : away.gamePlan === "conservative" ? 0.9 : 1.0;

  // Get skill players
  function getStarters(team: NFLTeam, positions: NFLPosition[]) {
    return positions.map(pos => {
      const atPos = team.roster.filter(p => p.position === pos).sort((a, b) => a.depthOrder - b.depthOrder);
      return atPos[0] ?? team.roster[0];
    });
  }

  function getQB(team: NFLTeam) { return getStarters(team, ["QB"])[0]; }
  function getRB(team: NFLTeam) { return getStarters(team, ["RB"])[0]; }
  function getWR(team: NFLTeam) { return getStarters(team, ["WR"])[0]; }
  function getTE(team: NFLTeam) { return getStarters(team, ["TE"])[0]; }
  function getK(team: NFLTeam) { return team.roster.find(p => p.position === "K") ?? team.roster[0]; }
  function getP(team: NFLTeam) { return team.roster.find(p => p.position === "P") ?? team.roster[0]; }
  function getDL(team: NFLTeam) { return getStarters(team, ["DE"])[0]; }
  function getLB(team: NFLTeam) { return getStarters(team, ["LB"])[0]; }
  function getCB(team: NFLTeam) { return getStarters(team, ["CB"])[0]; }

  let totalGameSeconds = 0;
  const QUARTER_SECONDS = 15 * 60;

  interface DriveState {
    possession: "home" | "away";
    yardLine: number;
    down: number;
    yardsToGo: number;
    quarter: number;
    secondsLeft: number;
    driveSeconds: number;
  }

  function addPlay(ds: DriveState, type: PlayType, result: PlayResult, yards: number, desc: string, extras?: Partial<PlayByPlayEvent>) {
    const timeUsed = type === "punt" || type === "kickoff" ? 5 : Math.floor(20 + Math.random() * 20);
    const min = Math.floor(ds.secondsLeft / 60);
    const sec = ds.secondsLeft % 60;

    plays.push({
      id: uid(),
      quarter: ds.quarter,
      minute: min,
      second: sec,
      down: ds.down,
      yardsToGo: ds.yardsToGo,
      yardLine: ds.yardLine,
      possession: ds.possession,
      playType: type,
      result,
      yardsGained: yards,
      description: desc,
      score: { ...score },
      isScoring: result === "touchdown" || result === "fieldGoalGood",
      isTurnover: result === "interception" || result === "fumble",
      ...extras,
    });
    ds.secondsLeft = Math.max(0, ds.secondsLeft - timeUsed);
    ds.driveSeconds += timeUsed;
    totalGameSeconds += timeUsed;
  }

  function simulateDrive(ds: DriveState): DriveResult {
    const offTeam = ds.possession === "home" ? home : away;
    const defTeam = ds.possession === "home" ? away : home;
    const offPower = (ds.possession === "home" ? homePower : awayPower) * (ds.possession === "home" ? homeAggrMod : awayAggrMod);
    const defPower = (ds.possession === "home" ? awayPower : homePower);
    const offAdv = offPower / (offPower + defPower);

    const qb = getQB(offTeam);
    const rb = getRB(offTeam);
    const wr = getWR(offTeam);
    const te = getTE(offTeam);
    const k = getK(offTeam);
    const p = getP(offTeam);
    const dl = getDL(defTeam);
    const lb = getLB(defTeam);
    const cb = getCB(defTeam);

    const side = ds.possession;
    const oStats = side === "home" ? gameStats.home : gameStats.away;
    const dStats = side === "home" ? gameStats.away : gameStats.home;

    let plays_count = 0;

    while (ds.down <= 4 && ds.yardLine < 100 && ds.secondsLeft > 0) {
      plays_count++;
      if (plays_count > 20) break; // safety

      // Red zone tracking
      if (ds.yardLine >= 80) {
        oStats.redZoneAttempts++;
      }

      // 4th down decision
      if (ds.down === 4) {
        const inRange = ds.yardLine >= 62; // ~50 yard field goal
        const yardage = 100 - ds.yardLine;
        const goForIt = offAdv > 0.55 && ds.yardsToGo <= 2 && ds.yardLine >= 40;

        if (ds.yardsToGo > 4 && !inRange) {
          // Punt
          const puntYards = Math.floor(40 + Math.random() * 20);
          addPlay(ds, "punt", "punt", puntYards,
            `${p.name} ${getBroadcastPhrase("punt")} — ${puntYards} yards. Possession changes.`);
          return "punt";
        }

        if (inRange && !goForIt) {
          // Field goal attempt
          const dist = 100 - ds.yardLine + 17;
          const fgChance = k.specific > 80 ? 0.88 : k.specific > 70 ? 0.78 : 0.65;
          const made = Math.random() < fgChance - (dist > 50 ? 0.15 : 0);
          if (made) {
            score[side] += 3;
            k.stats.fieldGoalsMade++;
            k.stats.fieldGoalsAttempted++;
            oStats.redZoneScores += ds.yardLine >= 80 ? 1 : 0;
            addPlay(ds, "fieldGoal", "fieldGoalGood", 0,
              `${k.name} lines up for the ${dist}-yarder... ${getBroadcastPhrase("fieldGoalGood")} ${dist} yards! ${score.home} - ${score.away}`,
              { isScoring: true });
            return "fieldGoal";
          } else {
            k.stats.fieldGoalsAttempted++;
            addPlay(ds, "fieldGoal", "fieldGoalMiss", 0,
              `${k.name} attempts the ${dist}-yarder... ${getBroadcastPhrase("fieldGoalMiss")}. Turnover on downs.`);
            return "missedFG";
          }
        }
        if (!goForIt) { return "punt"; }
      }

      // 3rd down tracking
      if (ds.down === 3) oStats.thirdDownAttempts++;

      // Play call
      const preferPass = offTeam.offenseScheme === "air-raid" || offTeam.offenseScheme === "spread" || ds.yardsToGo >= 7;
      const preferRun = offTeam.offenseScheme === "run-heavy" || (ds.yardsToGo <= 3 && ds.down <= 2);
      const passChance = preferPass ? 0.68 : preferRun ? 0.42 : 0.55;
      const isPass = Math.random() < passChance;

      if (isPass) {
        // Check sack
        const sackChance = defTeam.defenseFormation === "4-3" ? 0.07 : defTeam.defenseFormation === "3-4" ? 0.09 : 0.06;
        if (Math.random() < sackChance * (1 - offAdv)) {
          const sackYards = -(Math.floor(3 + Math.random() * 9));
          dStats.sacks++;
          const tackler = Math.random() > 0.5 ? dl.name : lb.name;
          addPlay(ds, "pass", "sack", sackYards,
            `${getBroadcastPhrase("sack")} ${qb.name} is brought down by ${tackler} for a ${Math.abs(sackYards)}-yard loss. ${ordinal(ds.down)} & ${ds.yardsToGo} becomes ${ordinal(ds.down)} & ${ds.yardsToGo - sackYards}.`,
            { playerName: qb.name });
          ds.yardLine += sackYards;
          ds.yardsToGo -= sackYards;
          ds.down++;
          continue;
        }

        // INT chance
        const intChance = 0.035 * (1 - offAdv) * (qb.specific < 70 ? 1.4 : 1);
        if (Math.random() < intChance) {
          const returner = Math.random() > 0.5 ? cb.name : lb.name;
          cb.stats.defensiveINTs++;
          oStats.turnovers++;
          qb.stats.interceptions++;
          qb.stats.attempts++;
          addPlay(ds, "pass", "interception", 0,
            `${qb.name} goes to the air and ${getBroadcastPhrase("interception")} — ${returner} makes the play. TURNOVER.`,
            { playerName: qb.name, targetName: returner, isTurnover: true });
          return "turnover";
        }

        // Completion
        const completionBase = qb.specific / 99 + offAdv * 0.3;
        const isComplete = Math.random() < Math.min(0.78, Math.max(0.42, completionBase));
        const receivers = [wr, te];
        const target = receivers[Math.floor(Math.random() * receivers.length)];

        if (isComplete) {
          const yards = Math.floor(Math.random() * (offAdv > 0.5 ? 18 : 12)) + 2;
          const total = Math.min(yards, 100 - ds.yardLine);
          qb.stats.completions++;
          qb.stats.attempts++;
          qb.stats.passingYards += total;
          target.stats.receptions++;
          target.stats.targets++;
          target.stats.receivingYards += total;
          oStats.passingYards += total;
          oStats.firstDowns += total >= ds.yardsToGo ? 1 : 0;

          if (ds.down === 3 && total >= ds.yardsToGo) oStats.thirdDownConversions++;

          ds.yardLine += total;

          if (ds.yardLine >= 100) {
            // TOUCHDOWN
            score[side] += 6;
            qb.stats.passingTDs++;
            target.stats.receivingTDs++;
            oStats.redZoneScores += ds.yardLine >= 80 ? 1 : 0;
            addPlay(ds, "pass", "touchdown", total,
              `${qb.name} ${getBroadcastPhrase("passComplete")} ${target.name} for ${total} yards... ${getBroadcastPhrase("touchdown")} ${score.home} - ${score.away}`,
              { playerName: qb.name, targetName: target.name, isScoring: true });
            // PAT
            score[side] += 1;
            plays.push({ ...plays[plays.length - 1], id: uid(), playType: "extraPoint", result: "gain", yardsGained: 0, description: `Extra point is GOOD. ${score.home} - ${score.away}`, score: { ...score } });
            return "touchdown";
          }

          const newYards = ds.yardsToGo - total;
          if (newYards <= 0) {
            addPlay(ds, "pass", "gain", total,
              `${qb.name} ${getBroadcastPhrase("passComplete")} ${target.name} — ${total} yards! First down.`,
              { playerName: qb.name, targetName: target.name });
            ds.down = 1; ds.yardsToGo = 10;
          } else {
            addPlay(ds, "pass", "gain", total,
              `${qb.name} ${getBroadcastPhrase("passComplete")} ${target.name} — ${total} yards.`,
              { playerName: qb.name, targetName: target.name });
            ds.down++; ds.yardsToGo = newYards;
          }
        } else {
          qb.stats.attempts++;
          target.stats.targets++;
          addPlay(ds, "pass", "incomplete", 0,
            `${qb.name} ${getBroadcastPhrase("passIncomplete")} — intended for ${target.name}. Incomplete.`,
            { playerName: qb.name, targetName: target.name });
          ds.down++;
        }
      } else {
        // Run play
        const avgGain = (rb.speed / 15) + (offAdv * 2) - (defTeam.defenseFormation === "4-3" ? 0.5 : 0);
        const yards = Math.floor((Math.random() * 12) - 2 + avgGain);
        const actual = Math.min(Math.max(yards, -3), 100 - ds.yardLine);
        rb.stats.carries++;
        rb.stats.rushingYards += Math.max(0, actual);
        oStats.rushingYards += Math.max(0, actual);

        // Fumble
        if (Math.random() < 0.012 * (1 - offAdv)) {
          rb.stats.carries--;
          const tackler = lb.name;
          oStats.turnovers++;
          addPlay(ds, "run", "fumble", 0,
            `${rb.name} takes the handoff and ${getBroadcastPhrase("fumble")} — ${tackler} recovers. TURNOVER.`,
            { playerName: rb.name, isTurnover: true });
          return "turnover";
        }

        if (ds.down === 3 && actual >= ds.yardsToGo) oStats.thirdDownConversions++;
        oStats.firstDowns += actual >= ds.yardsToGo ? 1 : 0;
        ds.yardLine += actual;

        if (ds.yardLine >= 100) {
          score[side] += 6;
          rb.stats.rushingTDs++;
          oStats.redZoneScores += 1;
          addPlay(ds, "run", "touchdown", actual,
            `${rb.name} ${getBroadcastPhrase("runGain")} ${actual >= 0 ? actual : 0} yards and is... ${getBroadcastPhrase("touchdown")} ${score.home} - ${score.away}`,
            { playerName: rb.name, isScoring: true });
          score[side] += 1;
          plays.push({ ...plays[plays.length - 1], id: uid(), playType: "extraPoint", result: "gain", yardsGained: 0, description: `Extra point is GOOD. ${score.home} - ${score.away}`, score: { ...score } });
          return "touchdown";
        }

        if (actual < 0) {
          addPlay(ds, "run", "loss", actual,
            `${rb.name} ${getBroadcastPhrase("runLoss")} the handoff — loss of ${Math.abs(actual)}.`,
            { playerName: rb.name });
          ds.down++; ds.yardsToGo -= actual;
        } else if (actual >= ds.yardsToGo) {
          addPlay(ds, "run", "gain", actual,
            `${rb.name} ${getBroadcastPhrase("runGain")} ${actual} yards. First down!`,
            { playerName: rb.name });
          ds.down = 1; ds.yardsToGo = 10;
        } else {
          addPlay(ds, "run", "gain", actual,
            `${rb.name} ${getBroadcastPhrase("runGain")} ${actual} yard${actual !== 1 ? "s" : ""}.`,
            { playerName: rb.name });
          ds.down++; ds.yardsToGo -= actual;
        }
      }
    }
    return "punt";
  }

  // Main game loop — 4 quarters
  let possession: "home" | "away" = Math.random() > 0.5 ? "home" : "away";

  for (let q = 1; q <= 4; q++) {
    let secondsLeft = QUARTER_SECONDS;
    const qLabel = ["Q1", "Q2", "Q3", "Q4"][q - 1];

    // Quarter start marker
    plays.push({
      id: uid(), quarter: q, minute: 15, second: 0,
      down: 0, yardsToGo: 0, yardLine: 0, possession,
      playType: "kickoff", result: "gain", yardsGained: 0,
      description: q === 1 ? `KICKOFF — ${home.name} vs ${away.name}. The game is underway!`
        : q === 3 ? `SECOND HALF KICKOFF. ${score.home} - ${score.away}`
        : `Start of ${qLabel}. ${score.home} - ${score.away}`,
      score: { ...score },
    });

    while (secondsLeft > 30) {
      const yardLine = 25;
      const ds: DriveState = {
        possession,
        yardLine,
        down: 1,
        yardsToGo: 10,
        quarter: q,
        secondsLeft,
        driveSeconds: 0,
      };

      const result = simulateDrive(ds);
      secondsLeft = ds.secondsLeft;

      // Flip possession
      possession = possession === "home" ? "away" : "home";

      if (secondsLeft <= 0) break;
    }

    if (q === 2) {
      plays.push({ id: uid(), quarter: 2, minute: 0, second: 0, down: 0, yardsToGo: 0, yardLine: 0, possession, playType: "punt", result: "punt", yardsGained: 0, description: `HALFTIME. ${home.name} ${score.home}, ${away.name} ${score.away}.`, score: { ...score } });
    }
  }

  // Overtime if tied
  if (score.home === score.away) {
    plays.push({ id: uid(), quarter: 5, minute: 10, second: 0, down: 0, yardsToGo: 0, yardLine: 0, possession, playType: "kickoff", result: "gain", yardsGained: 0, description: `OVERTIME! First team to score wins. Coin flip — ${possession === "home" ? home.name : away.name} will receive.`, score: { ...score } });
    const ds: DriveState = { possession, yardLine: 25, down: 1, yardsToGo: 10, quarter: 5, secondsLeft: 600, driveSeconds: 0 };
    for (let ot = 0; ot < 8; ot++) {
      const result = simulateDrive(ds);
      if (result === "touchdown" || result === "fieldGoal") break;
      if (score.home !== score.away) break;
      ds.possession = ds.possession === "home" ? "away" : "home";
    }
    // If still tied, give home team win
    if (score.home === score.away) score.home++;
  }

  plays.push({
    id: uid(), quarter: 4, minute: 0, second: 0, down: 0, yardsToGo: 0, yardLine: 0, possession,
    playType: "punt", result: "punt", yardsGained: 0,
    description: `FINAL SCORE: ${home.city} ${home.name} ${score.home}, ${away.city} ${away.name} ${score.away}. ${score.home > score.away ? `${home.name} WIN!` : `${away.name} WIN!`}`,
    score: { ...score }, isScoring: false,
  });

  return {
    id: uid(),
    week: 0,
    homeTeamId: home.id,
    awayTeamId: away.id,
    homeScore: score.home,
    awayScore: score.away,
    status: "final",
    plays,
    phase: "final",
    stats: gameStats,
  };
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface NFLContextType {
  season: Season | null;
  isLoading: boolean;
  activeRole: Role;
  setRole: (r: Role) => void;
  getTeam: (id: string) => NFLTeam | undefined;
  getPlayerTeam: () => NFLTeam | undefined;
  getStandings: (conference?: Conference) => NFLTeam[];
  getWeekGames: (week: number) => NFLGame[];
  simulateGame: (gameId: string) => Promise<NFLGame>;
  simulateWeek: () => Promise<void>;
  signFreeAgent: (playerId: string) => Promise<void>;
  releasePlayer: (playerId: string) => Promise<void>;
  updateDepthOrder: (playerId: string, depthOrder: number) => Promise<void>;
  updateGamePlan: (plan: GamePlan) => Promise<void>;
  updateFormation: (formation: Formation) => Promise<void>;
  updateOffenseScheme: (scheme: OffenseScheme) => Promise<void>;
  resetSeason: () => Promise<void>;
}

const NFLContext = createContext<NFLContextType | null>(null);

function initSeason(): Season {
  const teams: NFLTeam[] = NFL_TEAMS_CONFIG.map((cfg, i) => ({
    id: `team-${i}`,
    city: cfg.city,
    name: cfg.name,
    abbreviation: cfg.abbreviation,
    conference: cfg.conference,
    division: cfg.division,
    primaryColor: cfg.primaryColor,
    secondaryColor: cfg.secondaryColor,
    overall: cfg.overall,
    roster: generateRoster(cfg.overall),
    capSpace: Math.round(50 + Math.random() * 80),
    wins: 0,
    losses: 0,
    ties: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    draftPicks: [
      { id: uid(), round: 1, pick: i + 1, year: 2026, fromTeam: `team-${i}` },
      { id: uid(), round: 2, pick: i + 1, year: 2026, fromTeam: `team-${i}` },
      { id: uid(), round: 3, pick: i + 1, year: 2026, fromTeam: `team-${i}` },
    ],
    defenseFormation: "4-3",
    offenseScheme: "pro-set",
    gamePlan: "balanced",
    depthChart: {},
  }));

  const games = generateSchedule(teams);

  return {
    year: 2026,
    currentWeek: 1,
    totalWeeks: 18,
    games,
    teams,
    playerTeamId: teams[13].id, // Kansas City Chiefs
    activeRole: "GM",
    draftBoard: generateDraftBoard(),
    freeAgents: generateFreeAgents(),
    tradeOffers: [],
    isPlayoffs: false,
  };
}

export function NFLProvider({ children }: { children: React.ReactNode }) {
  const [season, setSeason] = useState<Season | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem("nfl_season_v2");
        if (raw) setSeason(JSON.parse(raw));
        else { const s = initSeason(); setSeason(s); await AsyncStorage.setItem("nfl_season_v2", JSON.stringify(s)); }
      } catch { setSeason(initSeason()); }
      finally { setIsLoading(false); }
    })();
  }, []);

  const save = useCallback(async (s: Season) => {
    setSeason(s);
    await AsyncStorage.setItem("nfl_season_v2", JSON.stringify(s));
  }, []);

  const activeRole = season?.activeRole ?? "GM";

  const setRole = useCallback((r: Role) => {
    if (!season) return;
    save({ ...season, activeRole: r });
  }, [season, save]);

  const getTeam = useCallback((id: string) => season?.teams.find(t => t.id === id), [season]);
  const getPlayerTeam = useCallback(() => season?.teams.find(t => t.id === season.playerTeamId), [season]);

  const getStandings = useCallback((conference?: Conference): NFLTeam[] => {
    if (!season) return [];
    let teams = conference ? season.teams.filter(t => t.conference === conference) : [...season.teams];
    return teams.sort((a, b) => {
      const pctA = a.wins / Math.max(1, a.wins + a.losses);
      const pctB = b.wins / Math.max(1, b.wins + b.losses);
      if (Math.abs(pctB - pctA) > 0.001) return pctB - pctA;
      return b.pointsFor - a.pointsFor;
    });
  }, [season]);

  const getWeekGames = useCallback((week: number) => season?.games.filter(g => g.week === week) ?? [], [season]);

  const simulateGame = useCallback(async (gameId: string): Promise<NFLGame> => {
    if (!season) throw new Error("no season");
    const idx = season.games.findIndex(g => g.id === gameId);
    if (idx === -1) throw new Error("game not found");
    const game = season.games[idx];
    const home = season.teams.find(t => t.id === game.homeTeamId)!;
    const away = season.teams.find(t => t.id === game.awayTeamId)!;

    const result = simulateFullGame(home, away);
    result.id = game.id;
    result.week = game.week;

    const homeWon = result.homeScore > result.awayScore;
    const tied = result.homeScore === result.awayScore;

    const updatedGames = [...season.games];
    updatedGames[idx] = result;

    const updatedTeams = season.teams.map(t => {
      if (t.id === home.id) return { ...t, wins: t.wins + (homeWon ? 1 : 0), losses: t.losses + (!homeWon && !tied ? 1 : 0), ties: t.ties + (tied ? 1 : 0), pointsFor: t.pointsFor + result.homeScore, pointsAgainst: t.pointsAgainst + result.awayScore };
      if (t.id === away.id) return { ...t, wins: t.wins + (!homeWon && !tied ? 1 : 0), losses: t.losses + (homeWon ? 1 : 0), ties: t.ties + (tied ? 1 : 0), pointsFor: t.pointsFor + result.awayScore, pointsAgainst: t.pointsAgainst + result.homeScore };
      return t;
    });

    await save({ ...season, games: updatedGames, teams: updatedTeams });
    return result;
  }, [season, save]);

  const simulateWeek = useCallback(async () => {
    if (!season) return;
    const weekGames = season.games.filter(g => g.week === season.currentWeek && g.status === "upcoming");
    let s = { ...season };

    for (const game of weekGames) {
      const home = s.teams.find(t => t.id === game.homeTeamId)!;
      const away = s.teams.find(t => t.id === game.awayTeamId)!;
      const result = simulateFullGame(home, away);
      result.id = game.id;
      result.week = game.week;

      const homeWon = result.homeScore > result.awayScore;
      const tied = result.homeScore === result.awayScore;

      const gi = s.games.findIndex(g2 => g2.id === game.id);
      const updatedGames = [...s.games];
      updatedGames[gi] = result;
      const updatedTeams = s.teams.map(t => {
        if (t.id === home.id) return { ...t, wins: t.wins + (homeWon ? 1 : 0), losses: t.losses + (!homeWon && !tied ? 1 : 0), ties: t.ties + (tied ? 1 : 0), pointsFor: t.pointsFor + result.homeScore, pointsAgainst: t.pointsAgainst + result.awayScore };
        if (t.id === away.id) return { ...t, wins: t.wins + (!homeWon && !tied ? 1 : 0), losses: t.losses + (homeWon ? 1 : 0), ties: t.ties + (tied ? 1 : 0), pointsFor: t.pointsFor + result.awayScore, pointsAgainst: t.pointsAgainst + result.homeScore };
        return t;
      });
      s = { ...s, games: updatedGames, teams: updatedTeams };
    }

    const nextWeek = Math.min(s.currentWeek + 1, s.totalWeeks);
    await save({ ...s, currentWeek: nextWeek });
  }, [season, save]);

  const signFreeAgent = useCallback(async (playerId: string) => {
    if (!season) return;
    const fa = season.freeAgents.find(p => p.id === playerId);
    if (!fa) return;
    const playerTeam = season.teams.find(t => t.id === season.playerTeamId)!;
    const updatedTeams = season.teams.map(t => t.id === season.playerTeamId ? { ...t, roster: [...t.roster, { ...fa, status: "Backup" as ContractStatus }], capSpace: t.capSpace - fa.salary } : t);
    const updatedFAs = season.freeAgents.filter(p => p.id !== playerId);
    await save({ ...season, teams: updatedTeams, freeAgents: updatedFAs });
  }, [season, save]);

  const releasePlayer = useCallback(async (playerId: string) => {
    if (!season) return;
    const playerTeam = season.teams.find(t => t.id === season.playerTeamId)!;
    const player = playerTeam.roster.find(p => p.id === playerId);
    if (!player) return;
    const updatedTeams = season.teams.map(t => t.id === season.playerTeamId ? { ...t, roster: t.roster.filter(p => p.id !== playerId), capSpace: t.capSpace + player.salary } : t);
    await save({ ...season, teams: updatedTeams, freeAgents: [...season.freeAgents, { ...player, status: "Free Agent" }] });
  }, [season, save]);

  const updateDepthOrder = useCallback(async (playerId: string, depthOrder: number) => {
    if (!season) return;
    const updatedTeams = season.teams.map(t => t.id === season.playerTeamId ? { ...t, roster: t.roster.map(p => p.id === playerId ? { ...p, depthOrder } : p) } : t);
    await save({ ...season, teams: updatedTeams });
  }, [season, save]);

  const updateGamePlan = useCallback(async (plan: GamePlan) => {
    if (!season) return;
    const updatedTeams = season.teams.map(t => t.id === season.playerTeamId ? { ...t, gamePlan: plan } : t);
    await save({ ...season, teams: updatedTeams });
  }, [season, save]);

  const updateFormation = useCallback(async (formation: Formation) => {
    if (!season) return;
    const updatedTeams = season.teams.map(t => t.id === season.playerTeamId ? { ...t, defenseFormation: formation } : t);
    await save({ ...season, teams: updatedTeams });
  }, [season, save]);

  const updateOffenseScheme = useCallback(async (scheme: OffenseScheme) => {
    if (!season) return;
    const updatedTeams = season.teams.map(t => t.id === season.playerTeamId ? { ...t, offenseScheme: scheme } : t);
    await save({ ...season, teams: updatedTeams });
  }, [season, save]);

  const resetSeason = useCallback(async () => {
    const s = initSeason();
    await AsyncStorage.setItem("nfl_season_v2", JSON.stringify(s));
    setSeason(s);
  }, []);

  return (
    <NFLContext.Provider value={{ season, isLoading, activeRole, setRole, getTeam, getPlayerTeam, getStandings, getWeekGames, simulateGame, simulateWeek, signFreeAgent, releasePlayer, updateDepthOrder, updateGamePlan, updateFormation, updateOffenseScheme, resetSeason }}>
      {children}
    </NFLContext.Provider>
  );
}

export function useNFL() {
  const ctx = useContext(NFLContext);
  if (!ctx) throw new Error("useNFL must be used within NFLProvider");
  return ctx;
}
