import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Role = "GM" | "Coach" | "Scout";
export type Conference = "AFC" | "NFC";
export type Division = "North" | "South" | "East" | "West";
export type NFLPosition = "QB" | "RB" | "WR" | "TE" | "OL" | "DE" | "DT" | "LB" | "CB" | "S" | "K" | "P";
export type ContractStatus = "Starter" | "Backup" | "Practice Squad" | "Free Agent";
export type GamePlan = "aggressive" | "balanced" | "conservative";
export type Formation = "4-3" | "3-4" | "nickel" | "dime";
export type OffenseScheme = "spread" | "pro-set" | "run-heavy" | "air-raid";
export type PlayType = "run" | "pass" | "punt" | "fieldGoal" | "kickoff" | "extraPoint";
export type PlayResult = "gain" | "loss" | "touchdown" | "interception" | "fumble" | "incomplete" | "sack" | "fieldGoalGood" | "fieldGoalMiss" | "punt";
export type GamePhase = "pregame" | "q1" | "q2" | "halftime" | "q3" | "q4" | "overtime" | "final";

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
  specific: number;
  yearsExperience: number;
  contractYears: number;
  salary: number;
  status: ContractStatus;
  depthOrder: number;
  stats: PlayerSeasonStats;
}

export interface PlayerSeasonStats {
  gamesPlayed: number;
  passingYards: number; passingTDs: number; interceptions: number;
  completions: number; attempts: number;
  rushingYards: number; rushingTDs: number; carries: number;
  receivingYards: number; receivingTDs: number; receptions: number; targets: number;
  tackles: number; sacks: number; forcedFumbles: number; defensiveINTs: number;
  fieldGoalsMade: number; fieldGoalsAttempted: number; puntsAverage: number;
}

export interface DraftPick {
  id: string; round: number; pick: number; year: number; fromTeam: string;
}

export interface DraftProspect {
  id: string; name: string; position: NFLPosition;
  college: string; overall: number; potential: number; round: number; pick: number;
}

export interface NFLTeam {
  id: string; city: string; name: string; abbreviation: string;
  conference: Conference; division: Division;
  primaryColor: string; secondaryColor: string;
  overall: number; roster: Player[]; capSpace: number;
  wins: number; losses: number; ties: number; pointsFor: number; pointsAgainst: number;
  draftPicks: DraftPick[];
  defenseFormation: Formation; offenseScheme: OffenseScheme; gamePlan: GamePlan;
  depthChart: Partial<Record<NFLPosition, string[]>>;
}

export interface PlayByPlayEvent {
  id: string; quarter: number; minute: number; second: number;
  down: number; yardsToGo: number; yardLine: number;
  possession: "home" | "away"; playType: PlayType; result: PlayResult;
  yardsGained: number; playerName?: string; targetName?: string;
  description: string; score: { home: number; away: number };
  isScoring?: boolean; isTurnover?: boolean;
}

export interface TeamGameStats {
  passingYards: number; rushingYards: number; turnovers: number;
  thirdDownConversions: number; thirdDownAttempts: number;
  sacks: number; firstDowns: number;
}

export interface NFLGame {
  id: string; week: number; homeTeamId: string; awayTeamId: string;
  homeScore: number; awayScore: number;
  status: "upcoming" | "simulating" | "final";
  plays: PlayByPlayEvent[]; phase: GamePhase;
  stats: { home: TeamGameStats; away: TeamGameStats };
}

export interface Season {
  year: number; currentWeek: number; totalWeeks: number;
  games: NFLGame[]; teams: NFLTeam[];
  playerTeamId: string;
  draftBoard: DraftProspect[];
  freeAgents: Player[];
  isPlayoffs: boolean;
}

// ─── Name Pool ────────────────────────────────────────────────────────────────
// Diverse, realistic-sounding fictional names (not real NFL players)

const FIRST_NAMES = [
  // African-American names
  "Darius","Malik","Quinton","Terrell","Javion","DeShawn","Kendrick","Marquise","Tyrese","Lamont",
  "Cortez","Devonte","Jamarion","Kelvin","Rasheed","Antione","Deontae","Jermaine","Levonte","Dwayne",
  "Kareem","Trevon","Jaquavious","Elroy","Darnell","Cortavious","Marshawn","Jakeem","Levon","Devante",
  // Hispanic names
  "Alejandro","Carlos","Diego","Eduardo","Emilio","Fernando","Gabriel","Hector","Ivan","Jorge",
  "Luis","Marco","Mateo","Miguel","Nicolas","Oscar","Pablo","Rafael","Ricardo","Roberto",
  "Santiago","Sebastian","Sergio","Victor","Xavier","Andres","Cristian","Fabian","Gustavo","Julio",
  // Common American names (diverse)
  "Tyler","Brandon","Cody","Nathan","Derek","Chad","Blake","Tanner","Logan","Hunter",
  "Austin","Colton","Chase","Garrett","Parker","Drew","Cole","Cameron","Preston","Trevor",
  "Brennan","Shane","Dylan","Evan","Nolan","Griffin","Reid","Connor","Quinn","Liam",
  "Owen","Finn","Declan","Callum","Rory","Kieran","Cian","Sean","Aiden","Colm",
  // International-origin names
  "Karim","Amara","Ibrahim","Moussa","Oumar","Samba","Cheik","Ndoye","Mbaye","Diallo",
  "Takoda","Sequoia","Colt","Rowdy","Wade","Wyatt","Buck","Clint","Jed","Cody",
  "Leandro","Valentino","Bruno","Luca","Giovanni","Nico","Dante","Angelo","Adriano","Cesare",
  // More variety
  "Gideon","Solomon","Ezekiel","Nathaniel","Jeremiah","Obadiah","Thaddeus","Cornelius","Reginald","Percival",
  "Floyd","Clyde","Elmer","Otis","Rufus","Roscoe","Virgil","Woodrow","Alvin","Sherman",
  "Cyrus","Theron","Alaric","Leif","Soren","Viggo","Torsten","Henrik","Lars","Bjorn",
];

const LAST_NAMES = [
  // Common African-American surnames
  "Washington","Jefferson","Robinson","Williams","Johnson","Davis","Harris","Thompson","Jackson","Thomas",
  "Walker","White","Lewis","Hall","Clark","Young","Allen","Scott","Green","Baker",
  "Adams","Nelson","Carter","Mitchell","Perez","Turner","Phillips","Campbell","Parker","Evans",
  // Hispanic surnames
  "Gonzalez","Rodriguez","Martinez","Garcia","Hernandez","Lopez","Flores","Torres","Ramirez","Cruz",
  "Reyes","Morales","Ortiz","Gutierrez","Chavez","Ramos","Ruiz","Medina","Castillo","Vargas",
  // Mixed American surnames
  "Morrison","Patterson","Chambers","Hawkins","Ferguson","Gardner","Montgomery","Bishop","Cunningham","Harrison",
  "Gallagher","Donovan","Fitzgerald","Callahan","Sullivan","Connelly","Mcdermott","Brennan","Sheridan","Hanlon",
  "Kowalski","Novak","Petrov","Volkov","Popov","Sokolov","Leblanc","Bouchard","Tremblay","Gagnon",
  // Distinctive / memorable surnames
  "Mercer","Sloane","Briggs","Holt","Drake","Steele","Cross","Stone","Fox","Chase",
  "Vega","Montoya","Delgado","Fuentes","Santana","Romero","Campos","Acosta","Herrera","Ibarra",
  "Okafor","Mensah","Asante","Boateng","Antwi","Owusu","Adjei","Darko","Acheampong","Gyimah",
  "Diallo","Kouyate","Coulibaly","Traore","Keita","Doumbia","Camara","Bah","Balde","Toure",
  "Sterling","Whitfield","Redmond","Blackwood","Longfellow","Ashworth","Cromwell","Fairbanks","Hathaway","Prescott",
  "Whitmore","Dunmore","Ashby","Foxworth","Kenmore","Langley","Merriweather","Northcott","Pemberton","Ravenswood",
  "Combs","Grimes","Sykes","Booker","Bonner","Bridges","Cannon","Clements","Dade","Farrow",
];

function rn(): string {
  return `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`;
}

// ─── Realistic Rating Generation ─────────────────────────────────────────────
// Normal-ish distribution centered on base, with position-depth adjustments

function gaussianRandom(mean: number, stdDev: number, min = 45, max = 99): number {
  // Box-Muller transform
  const u1 = Math.random(), u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  // Clamp hard — avoid clustering at ceiling
  return Math.round(Math.min(max, Math.max(min, mean + z * stdDev)));
}

function genRating(teamBase: number, isStarter: boolean, isElite: boolean): number {
  // Cap the team base so very elite teams don't produce all 98s
  const clampedBase = Math.min(teamBase, 88);
  if (isElite) {
    // Only top stars get elite treatment, capped at 97 — rare, genuine elites
    return gaussianRandom(clampedBase + 5, 2, 85, 97);
  }
  if (isStarter) {
    // Starters: team rating ± 3 (tighter spread, more realistic variance)
    return gaussianRandom(clampedBase, 4, 60, 95);
  }
  // Backups: clearly weaker — 17pt penalty, tight spread
  return gaussianRandom(clampedBase - 17, 4, 48, 82);
}

function genSalary(overall: number, pos: NFLPosition): number {
  // NFL-realistic max salaries per position
  const maxByPos: Record<NFLPosition, number> = {
    QB: 40, WR: 20, DE: 22, CB: 18, LB: 16,
    RB: 12, TE: 18, OL: 17, DT: 15, S: 13, K: 6, P: 4,
  };
  const minSalary = 0.9; // NFL vet minimum
  const max = maxByPos[pos] ?? 15;
  // t=0 at overall=48 (worst), t=1 at overall=98 (elite)
  const t = Math.max(0, Math.min(1, (overall - 48) / 50));
  // t^4 curve — steep exponential: backups earn near-minimum, only stars reach high
  // t^4: backup (74 OVR) t≈0.52, t^4=0.073 → ~7% of max → ~$1-2M (✓)
  //       starter (85 OVR) t≈0.74, t^4=0.300 → ~30% of max → ~$4-6M (✓)
  //       star    (93 OVR) t≈0.90, t^4=0.656 → ~66% of max → ~$10-25M (✓)
  const base = minSalary + Math.pow(t, 4) * (max - minSalary);
  const noise = (Math.random() - 0.5) * max * 0.12;
  return Math.round(Math.max(minSalary, Math.min(max, base + noise)) * 10) / 10;
}

function emptyStats(): PlayerSeasonStats {
  return {
    gamesPlayed: 0, passingYards: 0, passingTDs: 0, interceptions: 0,
    completions: 0, attempts: 0, rushingYards: 0, rushingTDs: 0, carries: 0,
    receivingYards: 0, receivingTDs: 0, receptions: 0, targets: 0,
    tackles: 0, sacks: 0, forcedFumbles: 0, defensiveINTs: 0,
    fieldGoalsMade: 0, fieldGoalsAttempted: 0, puntsAverage: 0,
  };
}

function emptyGameStats(): TeamGameStats {
  return { passingYards: 0, rushingYards: 0, turnovers: 0, thirdDownConversions: 0, thirdDownAttempts: 0, sacks: 0, firstDowns: 0 };
}

// ─── Roster Template ──────────────────────────────────────────────────────────

interface PositionSlot {
  pos: NFLPosition;
  depth: number; // 1=starter, 2=backup, 3=3rd string
  isElite?: boolean;
}

const ROSTER_TEMPLATE: PositionSlot[] = [
  // Offense
  { pos: "QB", depth: 1 }, { pos: "QB", depth: 2 }, { pos: "QB", depth: 3 },
  { pos: "RB", depth: 1 }, { pos: "RB", depth: 1, isElite: false }, { pos: "RB", depth: 2 }, { pos: "RB", depth: 2 },
  { pos: "WR", depth: 1, isElite: true }, { pos: "WR", depth: 1 }, { pos: "WR", depth: 1 },
  { pos: "WR", depth: 2 }, { pos: "WR", depth: 2 }, { pos: "WR", depth: 3 },
  { pos: "TE", depth: 1 }, { pos: "TE", depth: 2 }, { pos: "TE", depth: 3 },
  { pos: "OL", depth: 1 }, { pos: "OL", depth: 1 }, { pos: "OL", depth: 1 }, { pos: "OL", depth: 1 }, { pos: "OL", depth: 1 },
  { pos: "OL", depth: 2 }, { pos: "OL", depth: 2 }, { pos: "OL", depth: 2 },
  // Defense
  { pos: "DE", depth: 1, isElite: false }, { pos: "DE", depth: 1 }, { pos: "DE", depth: 2 }, { pos: "DE", depth: 2 },
  { pos: "DT", depth: 1 }, { pos: "DT", depth: 1 }, { pos: "DT", depth: 2 }, { pos: "DT", depth: 2 },
  { pos: "LB", depth: 1, isElite: false }, { pos: "LB", depth: 1 }, { pos: "LB", depth: 1 },
  { pos: "LB", depth: 2 }, { pos: "LB", depth: 2 },
  { pos: "CB", depth: 1, isElite: false }, { pos: "CB", depth: 1 }, { pos: "CB", depth: 1 },
  { pos: "CB", depth: 2 }, { pos: "CB", depth: 2 },
  { pos: "S", depth: 1 }, { pos: "S", depth: 1 }, { pos: "S", depth: 2 }, { pos: "S", depth: 2 },
  // Special Teams
  { pos: "K", depth: 1 }, { pos: "P", depth: 1 },
];

function generateRoster(teamOverall: number): Player[] {
  return ROSTER_TEMPLATE.map((slot, i) => {
    const isStarter = slot.depth === 1;
    const isElite = slot.isElite === true && Math.random() < 0.15; // ~15% of designated slots become true stars
    const overall = genRating(teamOverall, isStarter, isElite);
    const pos = slot.pos;
    const exp = isStarter ? Math.floor(2 + Math.random() * 10) : Math.floor(Math.random() * 6);
    const age = 21 + exp + Math.floor(Math.random() * 4);

    return {
      id: uid(),
      name: rn(),
      position: pos,
      age,
      overall,
      potential: Math.min(99, overall + Math.floor(Math.random() * (age < 26 ? 12 : 5))),
      speed: genRating(teamOverall + (["WR","CB","RB"].includes(pos) ? 3 : -2), isStarter, false),
      strength: genRating(teamOverall + (["OL","DE","DT"].includes(pos) ? 3 : -2), isStarter, false),
      awareness: genRating(teamOverall + (["QB","S","LB"].includes(pos) ? 3 : -2), isStarter, false),
      specific: genRating(teamOverall + 2, isStarter, isElite),
      yearsExperience: exp,
      contractYears: 1 + Math.floor(Math.random() * 4),
      salary: genSalary(overall, pos),
      status: isStarter ? "Starter" : slot.depth === 3 ? "Practice Squad" : "Backup",
      depthOrder: slot.depth,
      stats: emptyStats(),
    };
  });
}

function generateFreeAgents(count = 40): Player[] {
  const positions: NFLPosition[] = ["QB","RB","WR","TE","OL","DE","DT","LB","CB","S","K","P"];
  return Array.from({ length: count }, () => {
    const pos = positions[Math.floor(Math.random() * positions.length)];
    const overall = gaussianRandom(67, 7);
    const exp = Math.floor(1 + Math.random() * 10);
    return {
      id: uid(),
      name: rn(),
      position: pos,
      age: 22 + exp + Math.floor(Math.random() * 4),
      overall,
      potential: Math.min(99, overall + Math.floor(Math.random() * 8)),
      speed: gaussianRandom(overall, 8),
      strength: gaussianRandom(overall, 8),
      awareness: gaussianRandom(overall, 8),
      specific: gaussianRandom(overall + 2, 5),
      yearsExperience: exp,
      contractYears: 1 + Math.floor(Math.random() * 2),
      salary: genSalary(overall, pos),
      status: "Free Agent",
      depthOrder: 3,
      stats: emptyStats(),
    };
  });
}

function generateDraftBoard(): DraftProspect[] {
  const positions: NFLPosition[] = ["QB","RB","WR","TE","OL","DE","DT","LB","CB","S"];
  const colleges = [
    "Alabama","Georgia","Ohio State","Michigan","LSU","Clemson","Texas","Oregon",
    "USC","Penn State","Notre Dame","Florida","Oklahoma","Auburn","Tennessee",
    "Wisconsin","Iowa","Nebraska","TCU","Baylor","Ole Miss","Miami","Florida State",
    "North Carolina","Virginia Tech","Pittsburgh","Syracuse","Boston College","Wake Forest","Duke",
  ];
  const prospects: DraftProspect[] = [];
  for (let round = 1; round <= 7; round++) {
    for (let pick = 1; pick <= 32; pick++) {
      const pos = positions[Math.floor(Math.random() * positions.length)];
      // Round 1: elite; Round 2-3: good; Round 4-7: developmental
      const baseMeans = [82, 76, 72, 68, 64, 61, 58];
      const base = baseMeans[round - 1] ?? 58;
      const overall = gaussianRandom(base, 4);
      prospects.push({
        id: uid(),
        name: rn(),
        position: pos,
        college: colleges[Math.floor(Math.random() * colleges.length)],
        overall,
        potential: Math.min(99, overall + Math.floor(Math.random() * (round <= 2 ? 14 : 8))),
        round,
        pick,
      });
    }
  }
  return prospects;
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ─── NFL Teams Config ─────────────────────────────────────────────────────────

const NFL_TEAMS_CONFIG: Array<{
  city: string; name: string; abbreviation: string;
  conference: Conference; division: Division;
  primaryColor: string; secondaryColor: string; overall: number;
}> = [
  { city: "Buffalo",      name: "Bills",       abbreviation: "BUF", conference: "AFC", division: "East",  primaryColor: "#00338D", secondaryColor: "#C60C30", overall: 88 },
  { city: "Miami",        name: "Dolphins",    abbreviation: "MIA", conference: "AFC", division: "East",  primaryColor: "#008E97", secondaryColor: "#FC4C02", overall: 81 },
  { city: "New England",  name: "Patriots",    abbreviation: "NE",  conference: "AFC", division: "East",  primaryColor: "#002244", secondaryColor: "#C60C30", overall: 74 },
  { city: "New York",     name: "Jets",        abbreviation: "NYJ", conference: "AFC", division: "East",  primaryColor: "#125740", secondaryColor: "#000000", overall: 79 },
  { city: "Baltimore",    name: "Ravens",      abbreviation: "BAL", conference: "AFC", division: "North", primaryColor: "#241773", secondaryColor: "#9E7C0C", overall: 90 },
  { city: "Cincinnati",   name: "Bengals",     abbreviation: "CIN", conference: "AFC", division: "North", primaryColor: "#FB4F14", secondaryColor: "#000000", overall: 83 },
  { city: "Cleveland",    name: "Browns",      abbreviation: "CLE", conference: "AFC", division: "North", primaryColor: "#311D00", secondaryColor: "#FF3C00", overall: 77 },
  { city: "Pittsburgh",   name: "Steelers",    abbreviation: "PIT", conference: "AFC", division: "North", primaryColor: "#FFB612", secondaryColor: "#101820", overall: 80 },
  { city: "Houston",      name: "Texans",      abbreviation: "HOU", conference: "AFC", division: "South", primaryColor: "#03202F", secondaryColor: "#A71930", overall: 85 },
  { city: "Indianapolis", name: "Colts",       abbreviation: "IND", conference: "AFC", division: "South", primaryColor: "#002C5F", secondaryColor: "#A2AAAD", overall: 78 },
  { city: "Jacksonville", name: "Jaguars",     abbreviation: "JAX", conference: "AFC", division: "South", primaryColor: "#006778", secondaryColor: "#D7A22A", overall: 77 },
  { city: "Tennessee",    name: "Titans",      abbreviation: "TEN", conference: "AFC", division: "South", primaryColor: "#0C2340", secondaryColor: "#418FDE", overall: 74 },
  { city: "Denver",       name: "Broncos",     abbreviation: "DEN", conference: "AFC", division: "West",  primaryColor: "#FB4F14", secondaryColor: "#002244", overall: 76 },
  { city: "Kansas City",  name: "Chiefs",      abbreviation: "KC",  conference: "AFC", division: "West",  primaryColor: "#E31837", secondaryColor: "#FFB81C", overall: 93 },
  { city: "Las Vegas",    name: "Raiders",     abbreviation: "LV",  conference: "AFC", division: "West",  primaryColor: "#000000", secondaryColor: "#A5ACAF", overall: 74 },
  { city: "Los Angeles",  name: "Chargers",    abbreviation: "LAC", conference: "AFC", division: "West",  primaryColor: "#0080C6", secondaryColor: "#FFC20E", overall: 80 },
  { city: "Dallas",       name: "Cowboys",     abbreviation: "DAL", conference: "NFC", division: "East",  primaryColor: "#003594", secondaryColor: "#869397", overall: 84 },
  { city: "New York",     name: "Giants",      abbreviation: "NYG", conference: "NFC", division: "East",  primaryColor: "#0B2265", secondaryColor: "#A71930", overall: 72 },
  { city: "Philadelphia", name: "Eagles",      abbreviation: "PHI", conference: "NFC", division: "East",  primaryColor: "#004C54", secondaryColor: "#A5ACAF", overall: 87 },
  { city: "Washington",   name: "Commanders",  abbreviation: "WAS", conference: "NFC", division: "East",  primaryColor: "#5A1414", secondaryColor: "#FFB612", overall: 79 },
  { city: "Chicago",      name: "Bears",       abbreviation: "CHI", conference: "NFC", division: "North", primaryColor: "#0B162A", secondaryColor: "#C83803", overall: 78 },
  { city: "Detroit",      name: "Lions",       abbreviation: "DET", conference: "NFC", division: "North", primaryColor: "#0076B6", secondaryColor: "#B0B7BC", overall: 87 },
  { city: "Green Bay",    name: "Packers",     abbreviation: "GB",  conference: "NFC", division: "North", primaryColor: "#203731", secondaryColor: "#FFB612", overall: 85 },
  { city: "Minnesota",    name: "Vikings",     abbreviation: "MIN", conference: "NFC", division: "North", primaryColor: "#4F2683", secondaryColor: "#FFC62F", overall: 81 },
  { city: "Atlanta",      name: "Falcons",     abbreviation: "ATL", conference: "NFC", division: "South", primaryColor: "#A71930", secondaryColor: "#000000", overall: 79 },
  { city: "Carolina",     name: "Panthers",    abbreviation: "CAR", conference: "NFC", division: "South", primaryColor: "#0085CA", secondaryColor: "#101820", overall: 70 },
  { city: "New Orleans",  name: "Saints",      abbreviation: "NO",  conference: "NFC", division: "South", primaryColor: "#D3BC8D", secondaryColor: "#101820", overall: 76 },
  { city: "Tampa Bay",    name: "Buccaneers",  abbreviation: "TB",  conference: "NFC", division: "South", primaryColor: "#D50A0A", secondaryColor: "#FF7900", overall: 83 },
  { city: "Arizona",      name: "Cardinals",   abbreviation: "ARI", conference: "NFC", division: "West",  primaryColor: "#97233F", secondaryColor: "#000000", overall: 72 },
  { city: "Los Angeles",  name: "Rams",        abbreviation: "LAR", conference: "NFC", division: "West",  primaryColor: "#003594", secondaryColor: "#FFA300", overall: 81 },
  { city: "San Francisco",name: "49ers",       abbreviation: "SF",  conference: "NFC", division: "West",  primaryColor: "#AA0000", secondaryColor: "#B3995D", overall: 92 },
  { city: "Seattle",      name: "Seahawks",    abbreviation: "SEA", conference: "NFC", division: "West",  primaryColor: "#002244", secondaryColor: "#69BE28", overall: 79 },
];

// ─── Schedule Generation ──────────────────────────────────────────────────────

function generateSchedule(teams: NFLTeam[]): NFLGame[] {
  const games: NFLGame[] = [];
  const ids = teams.map(t => t.id);
  for (let week = 1; week <= 18; week++) {
    const shuffled = [...ids].sort(() => Math.random() - 0.5);
    for (let i = 0; i + 1 < shuffled.length; i += 2) {
      games.push({
        id: uid(), week,
        homeTeamId: shuffled[i], awayTeamId: shuffled[i + 1],
        homeScore: 0, awayScore: 0,
        status: "upcoming", plays: [], phase: "pregame",
        stats: { home: emptyGameStats(), away: emptyGameStats() },
      });
    }
  }
  return games;
}

// ─── Play Simulation Engine ───────────────────────────────────────────────────

const PHRASES = {
  runGain:       ["takes the handoff and grinds out","breaks through the line for","reads the block and picks up","rumbles ahead for","powers through contact for"],
  runLoss:       ["stuffed at the line of scrimmage for","met immediately in the backfield, losing","swarmed by the defense, loss of","goes nowhere, stopped for a loss of"],
  passComplete:  ["fires a strike to","threads the needle and connects with","drops a dime to","finds his man in stride —","delivers on target to"],
  passIncomplete:["sails wide of","can't connect with","overthrows","drops the pass from","breaks up the pass intended for"],
  sack:          ["is sacked for a loss of","is brought down behind the line for","pressure gets home and drops him for","goes down under the rush for"],
  touchdown:     ["TOUCHDOWN!","SIX POINTS!","HE'S IN THE END ZONE!","PAYDIRT!","TOUCHES DOWN AND SCORES!"],
  interception:  ["INTERCEPTED!","PICKS IT OFF!","STEPPING IN FRONT FOR THE INTERCEPTION!","TIPS IT AND HOLDS ON — TURNOVER!"],
  fumble:        ["FUMBLE! BALL ON THE GROUND!","STRIPS THE BALL — FUMBLE!","LOSES IT! FUMBLE RECOVERED!","BALL LOOSE — TURNOVER!"],
  fgGood:        ["IT'S GOOD!","SPLITS THE UPRIGHTS!","RIGHT DOWN THE MIDDLE — GOOD!","THREE POINTS!"],
  fgMiss:        ["NO GOOD — WIDE!","HOOKS IT LEFT — MISSED!","COMES UP SHORT!","OFF THE UPRIGHT — NO GOOD!"],
  punt:          ["gets off a solid punt","booms one deep","pins them inside the 20","gets great hang time on the kick"],
};

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function ordinal(n: number) { return ["1st","2nd","3rd","4th"][n-1] ?? "4th"; }

export function simulateFullGame(home: NFLTeam, away: NFLTeam): NFLGame {
  const plays: PlayByPlayEvent[] = [];
  const score = { home: 0, away: 0 };
  const gStats = { home: emptyGameStats(), away: emptyGameStats() };

  // Team power based on overall + randomness (~5-10% variance per game)
  const hPow = home.overall * (0.92 + Math.random() * 0.16);
  const aPow = away.overall * (0.92 + Math.random() * 0.16);

  // Scheme modifiers
  function offMod(t: NFLTeam) { return t.gamePlan === "aggressive" ? 1.07 : t.gamePlan === "conservative" ? 0.94 : 1.0; }
  function defMod(t: NFLTeam) { return t.gamePlan === "aggressive" ? 0.95 : t.gamePlan === "conservative" ? 1.06 : 1.0; }

  function getByPos(team: NFLTeam, pos: NFLPosition) {
    return team.roster
      .filter(p => p.position === pos)
      .sort((a,b) => a.depthOrder - b.depthOrder)[0] ?? team.roster[0];
  }

  function addPlay(poss: "home"|"away", type: PlayType, result: PlayResult, yards: number,
    desc: string, q: number, secLeft: number, down: number, ytg: number, yl: number,
    extra?: Partial<PlayByPlayEvent>) {
    plays.push({
      id: uid(), quarter: q,
      minute: Math.floor(secLeft / 60), second: secLeft % 60,
      down, yardsToGo: ytg, yardLine: yl, possession: poss,
      playType: type, result, yardsGained: yards,
      description: desc, score: { ...score },
      isScoring: result === "touchdown" || result === "fieldGoalGood",
      isTurnover: result === "interception" || result === "fumble",
      ...extra,
    });
  }

  interface DriveState {
    poss: "home"|"away"; yl: number; down: number; ytg: number;
    q: number; secs: number;
  }

  function simulateDrive(ds: DriveState): "touchdown"|"fieldGoal"|"punt"|"turnover"|"missedFG"|"safety" {
    const offTeam = ds.poss === "home" ? home : away;
    const defTeam = ds.poss === "home" ? away : home;
    const oStats  = ds.poss === "home" ? gStats.home : gStats.away;
    const dStats  = ds.poss === "home" ? gStats.away : gStats.home;

    const offPow = (ds.poss === "home" ? hPow : aPow) * offMod(offTeam);
    const defPow = (ds.poss === "home" ? aPow : hPow) * defMod(defTeam);
    const offAdv = offPow / (offPow + defPow); // 0=all defense, 1=all offense

    const qb = getByPos(offTeam, "QB");
    const rb = getByPos(offTeam, "RB");
    const wr = getByPos(offTeam, "WR");
    const wr2 = offTeam.roster.filter(p => p.position === "WR").sort((a,b) => a.depthOrder - b.depthOrder)[1] ?? wr;
    const te = getByPos(offTeam, "TE");
    const k  = getByPos(offTeam, "K");
    const p  = getByPos(offTeam, "P");
    const de = getByPos(defTeam, "DE");
    const lb = getByPos(defTeam, "LB");
    const cb = getByPos(defTeam, "CB");

    let playsInDrive = 0;

    while (ds.down <= 4 && ds.yl < 100 && ds.secs > 0) {
      playsInDrive++;
      if (playsInDrive > 25) break;

      const timeUsed = 18 + Math.floor(Math.random() * 22);

      // 4th down decision
      if (ds.down === 4) {
        const ydsTD = 100 - ds.yl;
        const fgDist = ydsTD + 17;
        const inFgRange = fgDist <= 55;
        const goForIt = offAdv > 0.58 && ds.ytg <= 2 && ds.yl >= 45;

        if (!inFgRange && !goForIt) {
          // Punt
          const pYds = Math.floor(38 + Math.random() * 22);
          addPlay(ds.poss,"punt","punt",pYds,
            `${p.name} ${pick(PHRASES.punt)} — ${pYds} yards, flipping field position.`,
            ds.q, ds.secs, ds.down, ds.ytg, ds.yl);
          ds.secs -= timeUsed;
          return "punt";
        }

        if (inFgRange && !goForIt) {
          // Field goal
          const acc = 0.62 + (k.specific / 99) * 0.32 - Math.max(0, (fgDist - 40)) * 0.013;
          const made = Math.random() < acc;
          if (made) {
            score[ds.poss] += 3;
            k.stats.fieldGoalsMade++;
            k.stats.fieldGoalsAttempted++;
            addPlay(ds.poss,"fieldGoal","fieldGoalGood",0,
              `${k.name} lines up from ${fgDist} yards... ${pick(PHRASES.fgGood)} ${score.home}-${score.away}`,
              ds.q, ds.secs, ds.down, ds.ytg, ds.yl, { isScoring: true });
            ds.secs -= timeUsed;
            return "fieldGoal";
          } else {
            k.stats.fieldGoalsAttempted++;
            addPlay(ds.poss,"fieldGoal","fieldGoalMiss",0,
              `${k.name} attempts from ${fgDist} yards... ${pick(PHRASES.fgMiss)} Turnover on downs.`,
              ds.q, ds.secs, ds.down, ds.ytg, ds.yl);
            ds.secs -= timeUsed;
            return "missedFG";
          }
        }
        if (!goForIt) return "punt";
      }

      // 3rd down tracking
      if (ds.down === 3) oStats.thirdDownAttempts++;

      // Pass vs run decision
      const passHeavy = offTeam.offenseScheme === "air-raid" || offTeam.offenseScheme === "spread";
      const runHeavy  = offTeam.offenseScheme === "run-heavy";
      const long = ds.ytg >= 8;
      const short = ds.ytg <= 3;
      let passProb = passHeavy ? 0.68 : runHeavy ? 0.38 : 0.52;
      if (long) passProb += 0.15;
      if (short) passProb -= 0.12;
      const isPass = Math.random() < passProb;

      if (isPass) {
        // Sack check
        const sackRate = (defTeam.defenseFormation === "3-4" ? 0.082 : 0.065) * (1.15 - offAdv);
        if (Math.random() < sackRate) {
          const sackYds = -(Math.floor(3 + Math.random() * 8));
          const tackler = Math.random() > 0.5 ? de.name : lb.name;
          dStats.sacks++;
          addPlay(ds.poss,"pass","sack",sackYds,
            `${qb.name} ${pick(PHRASES.sack)} ${Math.abs(sackYds)} yards by ${tackler}. Now ${ordinal(ds.down)} & ${ds.ytg - sackYds}.`,
            ds.q, ds.secs, ds.down, ds.ytg, ds.yl, { playerName: qb.name });
          ds.yl = Math.max(1, ds.yl + sackYds);
          ds.ytg -= sackYds;
          ds.down++;
          ds.secs -= timeUsed;
          continue;
        }

        // INT check — based on QB accuracy + game situation
        const intRate = 0.028 * (1.0 - offAdv * 0.6) * (qb.specific < 65 ? 1.5 : 1.0);
        if (Math.random() < intRate) {
          const catcher = Math.random() > 0.5 ? cb.name : lb.name;
          oStats.turnovers++;
          qb.stats.interceptions++;
          qb.stats.attempts++;
          addPlay(ds.poss,"pass","interception",0,
            `${qb.name} fires downfield and ${pick(PHRASES.interception)} ${catcher} makes the grab. TURNOVER.`,
            ds.q, ds.secs, ds.down, ds.ytg, ds.yl, { playerName: qb.name, isTurnover: true });
          ds.secs -= timeUsed;
          return "turnover";
        }

        // Completion rate: base 62%, modified by QB rating, off advantage, formation
        const compRate = Math.min(0.78, Math.max(0.44,
          0.58 + (qb.specific - 70) / 250 + (offAdv - 0.5) * 0.15
        ));
        const isComp = Math.random() < compRate;
        const targets = [wr, te, wr2, rb];
        const weights = [0.38, 0.22, 0.24, 0.16];
        let target = targets[0];
        const rng = Math.random();
        let cum = 0;
        for (let wi = 0; wi < weights.length; wi++) {
          cum += weights[wi];
          if (rng <= cum) { target = targets[wi]; break; }
        }

        qb.stats.attempts++;
        target.stats.targets++;

        if (isComp) {
          // Yards gained: air-raid skews longer, run-heavy shorter
          const meanYards = passHeavy ? 11 : 8;
          const yds = Math.max(1, Math.round(gaussianRandom(meanYards, 5)));
          const actual = Math.min(yds, 100 - ds.yl);

          qb.stats.completions++;
          qb.stats.passingYards += actual;
          target.stats.receptions++;
          target.stats.receivingYards += actual;
          oStats.passingYards += actual;

          ds.yl += actual;

          if (ds.yl >= 100) {
            // TOUCHDOWN
            score[ds.poss] += 6;
            qb.stats.passingTDs++;
            target.stats.receivingTDs++;
            addPlay(ds.poss,"pass","touchdown",actual,
              `${qb.name} ${pick(PHRASES.passComplete)} ${target.name} for ${actual} yards... ${pick(PHRASES.touchdown)} ${score.home}-${score.away}`,
              ds.q, ds.secs, ds.down, ds.ytg, ds.yl - actual, { playerName: qb.name, targetName: target.name, isScoring: true });
            // PAT
            score[ds.poss]++;
            plays.push({ ...plays[plays.length-1], id: uid(), playType: "extraPoint", result: "gain", yardsGained: 0, description: `Extra point is good. ${score.home}-${score.away}`, score: { ...score }, isScoring: false });
            ds.secs -= timeUsed;
            return "touchdown";
          }

          const gained = actual;
          const firstDown = gained >= ds.ytg;
          if (ds.down === 3 && firstDown) oStats.thirdDownConversions++;
          if (firstDown) oStats.firstDowns++;

          addPlay(ds.poss,"pass","gain",gained,
            `${qb.name} ${pick(PHRASES.passComplete)} ${target.name} — gain of ${gained}. ${firstDown ? "FIRST DOWN!" : `${ordinal(ds.down+1)} & ${ds.ytg - gained}.`}`,
            ds.q, ds.secs, ds.down, ds.ytg, ds.yl - gained, { playerName: qb.name, targetName: target.name });

          if (firstDown) { ds.down = 1; ds.ytg = 10; }
          else { ds.down++; ds.ytg -= gained; }

        } else {
          addPlay(ds.poss,"pass","incomplete",0,
            `${qb.name} ${pick(PHRASES.passIncomplete)} ${target.name}. Incomplete.`,
            ds.q, ds.secs, ds.down, ds.ytg, ds.yl, { playerName: qb.name, targetName: target.name });
          ds.down++;
        }
      } else {
        // Run play
        // Mean gain: ~4 yds for balanced offense, adjusted by off/def advantage
        const meanGain = 3.8 + (offAdv - 0.5) * 4 + (offTeam.offenseScheme === "run-heavy" ? 0.8 : 0);
        const yds = Math.round(gaussianRandom(meanGain, 3.5));
        const actual = Math.min(Math.max(yds, -3), 100 - ds.yl);

        // Fumble check
        if (Math.random() < 0.011 * (1.1 - offAdv)) {
          const tackler = lb.name;
          oStats.turnovers++;
          addPlay(ds.poss,"run","fumble",0,
            `${rb.name} takes the carry and ${pick(PHRASES.fumble)} ${tackler} recovers for the defense.`,
            ds.q, ds.secs, ds.down, ds.ytg, ds.yl, { playerName: rb.name, isTurnover: true });
          ds.secs -= timeUsed;
          return "turnover";
        }

        rb.stats.carries++;
        rb.stats.rushingYards += Math.max(0, actual);
        oStats.rushingYards += Math.max(0, actual);
        ds.yl += actual;

        if (ds.yl >= 100) {
          score[ds.poss] += 6;
          rb.stats.rushingTDs++;
          addPlay(ds.poss,"run","touchdown",actual,
            `${rb.name} ${pick(PHRASES.runGain)} ${Math.max(0,actual)} yards... ${pick(PHRASES.touchdown)} ${score.home}-${score.away}`,
            ds.q, ds.secs, ds.down, ds.ytg, ds.yl - actual, { playerName: rb.name, isScoring: true });
          score[ds.poss]++;
          plays.push({ ...plays[plays.length-1], id: uid(), playType: "extraPoint", result: "gain", yardsGained: 0, description: `Extra point is good. ${score.home}-${score.away}`, score: { ...score }, isScoring: false });
          ds.secs -= timeUsed;
          return "touchdown";
        }

        const firstDown = actual >= ds.ytg;
        if (ds.down === 3 && firstDown) oStats.thirdDownConversions++;
        if (firstDown) oStats.firstDowns++;

        if (actual < 0) {
          addPlay(ds.poss,"run","loss",actual,
            `${rb.name} ${pick(PHRASES.runLoss)} ${Math.abs(actual)} yard${Math.abs(actual)!==1?"s":""}.`,
            ds.q, ds.secs, ds.down, ds.ytg, ds.yl - actual, { playerName: rb.name });
          ds.down++; ds.ytg -= actual;
        } else {
          addPlay(ds.poss,"run","gain",actual,
            `${rb.name} ${pick(PHRASES.runGain)} ${actual} yard${actual!==1?"s":""}.${firstDown?" FIRST DOWN!":""}`,
            ds.q, ds.secs, ds.down, ds.ytg, ds.yl - actual, { playerName: rb.name });
          if (firstDown) { ds.down = 1; ds.ytg = 10; }
          else { ds.down++; ds.ytg -= actual; }
        }
      }

      ds.secs -= timeUsed;
    }
    return "punt";
  }

  // Main game loop
  let possession: "home"|"away" = Math.random() > 0.5 ? "home" : "away";

  for (let q = 1; q <= 4; q++) {
    let secsLeft = 900; // 15 min quarter
    const qLabels = ["","Q1","Q2","Q3","Q4"];

    plays.push({
      id: uid(), quarter: q, minute: 15, second: 0,
      down: 0, yardsToGo: 0, yardLine: 0, possession,
      playType: "kickoff", result: "gain", yardsGained: 0,
      description: q === 1
        ? `⚡ KICKOFF — ${home.city} ${home.name} vs ${away.city} ${away.name}! Week 1. The game is underway!`
        : q === 3 ? `Second half gets underway. ${score.home}-${score.away} at the break.`
        : `Start of ${qLabels[q]}. ${score.home}-${score.away}.`,
      score: { ...score },
    });

    while (secsLeft > 30) {
      const ds: DriveState = {
        poss: possession, yl: 25, down: 1, ytg: 10, q, secs: secsLeft,
      };
      simulateDrive(ds);
      secsLeft = ds.secs;
      possession = possession === "home" ? "away" : "home";
      if (secsLeft <= 0) break;
    }

    if (q === 2) {
      plays.push({
        id: uid(), quarter: 2, minute: 0, second: 0, down: 0, yardsToGo: 0, yardLine: 0,
        possession, playType: "punt", result: "punt", yardsGained: 0,
        description: `🏟 HALFTIME. ${home.name} ${score.home}, ${away.name} ${score.away}. Teams head to the locker room.`,
        score: { ...score },
      });
    }
  }

  // Overtime if tied
  if (score.home === score.away) {
    plays.push({
      id: uid(), quarter: 5, minute: 10, second: 0, down: 0, yardsToGo: 0, yardLine: 0,
      possession, playType: "kickoff", result: "gain", yardsGained: 0,
      description: `⚡ OVERTIME! NFL sudden death — first score wins. ${possession === "home" ? home.name : away.name} will receive.`,
      score: { ...score },
    });
    let otSecs = 600;
    for (let i = 0; i < 10; i++) {
      const ds: DriveState = { poss: possession, yl: 25, down: 1, ytg: 10, q: 5, secs: otSecs };
      const result = simulateDrive(ds);
      otSecs = ds.secs;
      if (result === "touchdown" || result === "fieldGoal") break;
      if (score.home !== score.away) break;
      possession = possession === "home" ? "away" : "home";
    }
    if (score.home === score.away) score.home++;
  }

  plays.push({
    id: uid(), quarter: 4, minute: 0, second: 0, down: 0, yardsToGo: 0, yardLine: 0,
    possession, playType: "punt", result: "punt", yardsGained: 0,
    description: `🏆 FINAL: ${home.city} ${home.name} ${score.home}, ${away.city} ${away.name} ${score.away}. ${score.home > score.away ? home.name : away.name} WIN${score.home === score.away ? "S — wait, it's a TIE!" : "!"}`,
    score: { ...score },
  });

  return {
    id: uid(), week: 0,
    homeTeamId: home.id, awayTeamId: away.id,
    homeScore: score.home, awayScore: score.away,
    status: "final", plays, phase: "final",
    stats: gStats,
  };
}

// ─── Season Init ──────────────────────────────────────────────────────────────

export function initSeason(playerTeamId?: string): Season {
  const teams: NFLTeam[] = NFL_TEAMS_CONFIG.map((cfg, i) => ({
    id: `team-${i}`,
    ...cfg,
    roster: generateRoster(cfg.overall),
    capSpace: Math.round(40 + Math.random() * 100),
    wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0,
    draftPicks: [
      { id: uid(), round: 1, pick: i+1, year: 2026, fromTeam: `team-${i}` },
      { id: uid(), round: 2, pick: i+1, year: 2026, fromTeam: `team-${i}` },
      { id: uid(), round: 3, pick: i+1, year: 2026, fromTeam: `team-${i}` },
    ],
    defenseFormation: "4-3",
    offenseScheme: "pro-set",
    gamePlan: "balanced",
    depthChart: {},
  }));

  return {
    year: 2026, currentWeek: 1, totalWeeks: 18,
    games: generateSchedule(teams),
    teams,
    playerTeamId: playerTeamId ?? teams[13].id, // KC Chiefs default
    draftBoard: generateDraftBoard(),
    freeAgents: generateFreeAgents(50),
    isPlayoffs: false,
  };
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface NFLContextType {
  season: Season | null;
  isLoading: boolean;
  isSyncing: boolean;
  syncError: string | null;
  getTeam: (id: string) => NFLTeam | undefined;
  getPlayerTeam: () => NFLTeam | undefined;
  getStandings: (conference?: Conference) => NFLTeam[];
  getWeekGames: (week: number) => NFLGame[];
  simulateGame: (gameId: string) => Promise<NFLGame>;
  simulateWeek: () => Promise<void>;
  signFreeAgent: (playerId: string) => Promise<void>;
  releasePlayer: (playerId: string) => Promise<void>;
  updateDepthOrder: (playerId: string, depth: number) => Promise<void>;
  updateGamePlan: (plan: GamePlan) => Promise<void>;
  updateFormation: (f: Formation) => Promise<void>;
  updateOffenseScheme: (s: OffenseScheme) => Promise<void>;
  resetSeason: () => Promise<void>;
}

const NFLContext = createContext<NFLContextType | null>(null);

export function NFLProvider({ children }: { children: React.ReactNode }) {
  const { user, membership } = useAuth();
  const [season, setSeason] = useState<Season | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const saveDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const realtimeSub = useRef<any>(null);

  // ── Load season ──────────────────────────────────────────────────────────────
  useEffect(() => {
    loadSeason();
    return () => {
      if (realtimeSub.current) realtimeSub.current.unsubscribe();
    };
  }, [membership?.franchiseId]);

  async function loadSeason() {
    setIsLoading(true);
    try {
      if (SUPABASE_ENABLED && membership?.franchiseId) {
        await loadFromSupabase(membership.franchiseId);
      } else {
        // Offline / no franchise: use local storage with graceful quota handling
        let raw: string | null = null;
        try { raw = await AsyncStorage.getItem("nfl_season_v7"); } catch { /* ignore read errors */ }
        if (raw) {
          setSeason(JSON.parse(raw));
        } else {
          const s = initSeason();
          setSeason(s);
          // Best-effort save — silently ignore quota errors (common on web)
          try { await AsyncStorage.setItem("nfl_season_v7", JSON.stringify(s)); } catch { /* quota exceeded on web — keep in memory */ }
        }
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function loadFromSupabase(franchiseId: string) {
    const { data, error } = await supabase
      .from("franchise_state")
      .select("state_json")
      .eq("franchise_id", franchiseId)
      .maybeSingle();

    if (data?.state_json) {
      setSeason(data.state_json as Season);
    } else {
      // First time — create initial state
      const s = initSeason(membership?.teamId);
      setSeason(s);
      await saveToSupabase(franchiseId, s);
    }

    // Subscribe to realtime changes
    if (realtimeSub.current) realtimeSub.current.unsubscribe();
    realtimeSub.current = supabase
      .channel(`franchise-state-${franchiseId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "franchise_state",
        filter: `franchise_id=eq.${franchiseId}`,
      }, (payload) => {
        // Only update if another user made the change
        if (payload.new?.updated_by !== user?.id) {
          setSeason(payload.new.state_json as Season);
        }
      })
      .subscribe();
  }

  async function saveToSupabase(franchiseId: string, s: Season) {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const { error } = await supabase
        .from("franchise_state")
        .upsert({
          franchise_id: franchiseId,
          state_json: s,
          updated_by: user?.id,
        }, { onConflict: "franchise_id" });
      if (error) setSyncError(error.message);
    } catch (e: any) {
      setSyncError(e.message);
    } finally {
      setIsSyncing(false);
    }
  }

  // Debounced save function
  const save = useCallback(async (s: Season) => {
    setSeason(s);
    if (saveDebounce.current) clearTimeout(saveDebounce.current);
    saveDebounce.current = setTimeout(async () => {
      if (SUPABASE_ENABLED && membership?.franchiseId) {
        await saveToSupabase(membership.franchiseId, s);
      } else {
        try { await AsyncStorage.setItem("nfl_season_v7", JSON.stringify(s)); } catch { /* quota exceeded on web */ }
      }
    }, 800);
  }, [membership?.franchiseId, user?.id]);

  // ── Queries ──────────────────────────────────────────────────────────────────

  const getTeam = useCallback((id: string) => season?.teams.find(t => t.id === id), [season]);
  const getPlayerTeam = useCallback(() => season?.teams.find(t => t.id === season.playerTeamId), [season]);

  const getStandings = useCallback((conference?: Conference): NFLTeam[] => {
    if (!season) return [];
    let teams = conference ? season.teams.filter(t => t.conference === conference) : [...season.teams];
    return teams.sort((a, b) => {
      const pA = a.wins / Math.max(1, a.wins + a.losses);
      const pB = b.wins / Math.max(1, b.wins + b.losses);
      return Math.abs(pB - pA) > 0.001 ? pB - pA : b.pointsFor - a.pointsFor;
    });
  }, [season]);

  const getWeekGames = useCallback((week: number) => season?.games.filter(g => g.week === week) ?? [], [season]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const simulateGame = useCallback(async (gameId: string): Promise<NFLGame> => {
    if (!season) throw new Error("no season");
    const idx = season.games.findIndex(g => g.id === gameId);
    if (idx === -1) throw new Error("game not found");
    const game = season.games[idx];
    const home = season.teams.find(t => t.id === game.homeTeamId)!;
    const away = season.teams.find(t => t.id === game.awayTeamId)!;

    const result = simulateFullGame(home, away);
    result.id = game.id; result.week = game.week;

    const hW = result.homeScore > result.awayScore;
    const tied = result.homeScore === result.awayScore;
    const updGames = [...season.games]; updGames[idx] = result;
    const updTeams = season.teams.map(t => {
      if (t.id === home.id) return { ...t, wins: t.wins+(hW?1:0), losses: t.losses+(!hW&&!tied?1:0), ties: t.ties+(tied?1:0), pointsFor: t.pointsFor+result.homeScore, pointsAgainst: t.pointsAgainst+result.awayScore };
      if (t.id === away.id) return { ...t, wins: t.wins+(!hW&&!tied?1:0), losses: t.losses+(hW?1:0), ties: t.ties+(tied?1:0), pointsFor: t.pointsFor+result.awayScore, pointsAgainst: t.pointsAgainst+result.homeScore };
      return t;
    });
    await save({ ...season, games: updGames, teams: updTeams });
    return result;
  }, [season, save]);

  const simulateWeek = useCallback(async () => {
    if (!season) return;
    let s = { ...season };
    const weekGames = s.games.filter(g => g.week === s.currentWeek && g.status === "upcoming");
    for (const game of weekGames) {
      const home = s.teams.find(t => t.id === game.homeTeamId)!;
      const away = s.teams.find(t => t.id === game.awayTeamId)!;
      const result = simulateFullGame(home, away);
      result.id = game.id; result.week = game.week;
      const hW = result.homeScore > result.awayScore;
      const tied = result.homeScore === result.awayScore;
      const gi = s.games.findIndex(g2 => g2.id === game.id);
      const updGames = [...s.games]; updGames[gi] = result;
      const updTeams = s.teams.map(t => {
        if (t.id === home.id) return { ...t, wins: t.wins+(hW?1:0), losses: t.losses+(!hW&&!tied?1:0), ties: t.ties+(tied?1:0), pointsFor: t.pointsFor+result.homeScore, pointsAgainst: t.pointsAgainst+result.awayScore };
        if (t.id === away.id) return { ...t, wins: t.wins+(!hW&&!tied?1:0), losses: t.losses+(hW?1:0), ties: t.ties+(tied?1:0), pointsFor: t.pointsFor+result.awayScore, pointsAgainst: t.pointsAgainst+result.homeScore };
        return t;
      });
      s = { ...s, games: updGames, teams: updTeams };
    }
    await save({ ...s, currentWeek: Math.min(s.currentWeek + 1, s.totalWeeks) });
  }, [season, save]);

  const signFreeAgent = useCallback(async (playerId: string) => {
    if (!season) return;
    const fa = season.freeAgents.find(p => p.id === playerId);
    if (!fa) return;
    const updTeams = season.teams.map(t => t.id === season.playerTeamId ? { ...t, roster: [...t.roster, { ...fa, status: "Backup" as ContractStatus }], capSpace: t.capSpace - fa.salary } : t);
    await save({ ...season, teams: updTeams, freeAgents: season.freeAgents.filter(p => p.id !== playerId) });
  }, [season, save]);

  const releasePlayer = useCallback(async (playerId: string) => {
    if (!season) return;
    const team = season.teams.find(t => t.id === season.playerTeamId)!;
    const player = team.roster.find(p => p.id === playerId);
    if (!player) return;
    const updTeams = season.teams.map(t => t.id === season.playerTeamId ? { ...t, roster: t.roster.filter(p => p.id !== playerId), capSpace: t.capSpace + player.salary } : t);
    await save({ ...season, teams: updTeams, freeAgents: [...season.freeAgents, { ...player, status: "Free Agent" }] });
  }, [season, save]);

  const updateDepthOrder = useCallback(async (playerId: string, depth: number) => {
    if (!season) return;
    const updTeams = season.teams.map(t => t.id === season.playerTeamId ? { ...t, roster: t.roster.map(p => p.id === playerId ? { ...p, depthOrder: depth } : p) } : t);
    await save({ ...season, teams: updTeams });
  }, [season, save]);

  const updateGamePlan = useCallback(async (plan: GamePlan) => {
    if (!season) return;
    const updTeams = season.teams.map(t => t.id === season.playerTeamId ? { ...t, gamePlan: plan } : t);
    await save({ ...season, teams: updTeams });
  }, [season, save]);

  const updateFormation = useCallback(async (f: Formation) => {
    if (!season) return;
    const updTeams = season.teams.map(t => t.id === season.playerTeamId ? { ...t, defenseFormation: f } : t);
    await save({ ...season, teams: updTeams });
  }, [season, save]);

  const updateOffenseScheme = useCallback(async (s: OffenseScheme) => {
    if (!season) return;
    const updTeams = season.teams.map(t => t.id === season.playerTeamId ? { ...t, offenseScheme: s } : t);
    await save({ ...season, teams: updTeams });
  }, [season, save]);

  const resetSeason = useCallback(async () => {
    const s = initSeason(membership?.teamId);
    if (SUPABASE_ENABLED && membership?.franchiseId) {
      await saveToSupabase(membership.franchiseId, s);
    } else {
      try { await AsyncStorage.setItem("nfl_season_v7", JSON.stringify(s)); } catch { /* quota exceeded */ }
    }
    setSeason(s);
  }, [membership]);

  return (
    <NFLContext.Provider value={{ season, isLoading, isSyncing, syncError, getTeam, getPlayerTeam, getStandings, getWeekGames, simulateGame, simulateWeek, signFreeAgent, releasePlayer, updateDepthOrder, updateGamePlan, updateFormation, updateOffenseScheme, resetSeason }}>
      {children}
    </NFLContext.Provider>
  );
}

export function useNFL() {
  const ctx = useContext(NFLContext);
  if (!ctx) throw new Error("useNFL must be used within NFLProvider");
  return ctx;
}
