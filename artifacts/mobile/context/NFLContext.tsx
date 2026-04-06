import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { simulateFullGame, mergePlayerStats } from "./SimEngine";
import { generateDraftClass, initDraftState, simulateAIPick } from "./DraftEngine";
import type {
  Season, NFLTeam, Player, DraftProspect, DraftPick, NFLGame, NewsItem,
  TradeOffer, NFLContextValue, NFLPosition, ContractStatus, GamePlan, Formation,
  OffenseScheme, Conference, Division, PlayerSeasonStats, DevelopmentTrait,
  DraftState, CompletedDraftPick, TeamCustomization, PosRatings, CombineMeasurables,
  EthnicityCode, FaceVariant, PlayoffSeed, PlayoffRound,
} from "./types";

export type { Season, NFLTeam, Player, DraftProspect, DraftPick, NFLGame, NewsItem,
  TradeOffer, NFLContextValue, NFLPosition, ContractStatus, GamePlan, Formation,
  OffenseScheme, Conference, Division, PlayerSeasonStats, DevelopmentTrait,
  TeamCustomization, UniformSet, TeamLogo, JerseyStyle, NumberFont, PantStripeStyle,
  HelmetLogoPlacement, LogoType, AnimalMascot, ShieldStyle, LogoFontStyle,
  PosRatings, EthnicityCode, FaceVariant, PlayoffSeed, PlayoffRound } from "./types";
export { POS_RATING_KEYS, POS_RATING_LABELS } from "./types";

const CACHE_KEY   = "vfl_season_v1";
const CUSTOM_KEY  = "vfl_customization_v1";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 11); }
function irng(min: number, max: number) { return Math.round(min + Math.random() * (max - min)); }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function gaussian(mean: number, std: number, min = 45, max = 99): number {
  const u1 = Math.random(), u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.round(clamp(mean + z * std, min, max));
}

// ─── Name Pool ────────────────────────────────────────────────────────────────

const FIRST_NAMES = [
  "Darius","Malik","Quinton","Terrell","Javion","DeShawn","Kendrick","Marquise","Tyrese","Lamont",
  "Cortez","Devonte","Jamarion","Kelvin","Rasheed","Deontae","Jermaine","Levonte","Dwayne","Kareem",
  "Trevon","Jaquavious","Elroy","Darnell","Marshawn","Jakeem","Devante","Alejandro","Carlos","Diego",
  "Eduardo","Fernando","Gabriel","Hector","Ivan","Jorge","Luis","Marco","Mateo","Miguel",
  "Nicolas","Oscar","Pablo","Rafael","Ricardo","Roberto","Santiago","Sebastian","Sergio","Victor",
  "Tyler","Brandon","Nathan","Derek","Blake","Tanner","Logan","Hunter","Austin","Colton",
  "Chase","Garrett","Parker","Drew","Cole","Cameron","Preston","Trevor","Brennan","Shane",
  "Dylan","Evan","Nolan","Griffin","Reid","Connor","Quinn","Liam","Owen","Finn","Declan",
  "Karim","Amara","Ibrahim","Moussa","Oumar","Samba","Gideon","Solomon","Ezekiel","Nathaniel",
  "Jeremiah","Thaddeus","Cornelius","Reginald","Floyd","Otis","Roscoe","Virgil","Alvin","Sherman",
  "Cyrus","Theron","Alaric","Leif","Soren","Henrik","Lars","Bjorn","Luca","Giovanni","Dante","Angelo",
];
const LAST_NAMES = [
  "Washington","Jefferson","Robinson","Williams","Johnson","Davis","Harris","Thompson","Jackson","Thomas",
  "Walker","Lewis","Clark","Young","Allen","Scott","Green","Baker","Adams","Nelson","Carter",
  "Gonzalez","Rodriguez","Martinez","Garcia","Hernandez","Lopez","Flores","Torres","Ramirez","Cruz",
  "Reyes","Morales","Ortiz","Gutierrez","Chavez","Ramos","Ruiz","Medina","Castillo","Vargas",
  "Morrison","Patterson","Chambers","Hawkins","Ferguson","Gardner","Montgomery","Bishop","Harrison",
  "Gallagher","Donovan","Fitzgerald","Callahan","Sullivan","Connelly","Brennan","Sheridan",
  "Kowalski","Novak","Petrov","Volkov","Leblanc","Bouchard","Tremblay",
  "Mercer","Sloane","Briggs","Holt","Drake","Steele","Cross","Stone","Fox","Chase",
  "Vega","Montoya","Delgado","Fuentes","Santana","Romero","Campos","Acosta","Herrera","Ibarra",
  "Okafor","Mensah","Asante","Boateng","Owusu","Adjei","Darko","Diallo","Traore","Keita",
  "Sterling","Whitfield","Redmond","Blackwood","Merriweather","Prescott","Pemberton","Ravenswood",
  "Grimes","Sykes","Booker","Bonner","Bridges","Cannon","Clements","Farrow","Combs",
];
function rn() { return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`; }

// ─── Rating & Salary Generators ───────────────────────────────────────────────

function genRating(teamBase: number, isStarter: boolean, isElite: boolean): number {
  if (isElite) return gaussian(teamBase + 4, 3, 88, 99);
  if (isStarter) return gaussian(teamBase, 7, 73, 95);
  return gaussian(teamBase - 13, 6, 62, 79);
}

function genSalary(overall: number, pos: NFLPosition): number {
  const maxByPos: Record<NFLPosition, number> = {
    QB:40, WR:20, DE:22, CB:18, LB:16, RB:12, TE:18, OL:17, DT:15, S:13, K:6, P:4,
  };
  const min = 0.9;
  const max = maxByPos[pos] ?? 15;
  const t = Math.max(0, Math.min(1, (overall - 48) / 50));
  const base = min + Math.pow(t, 4) * (max - min);
  const noise = (Math.random() - 0.5) * max * 0.12;
  return Math.round(Math.max(min, Math.min(max, base + noise)) * 10) / 10;
}

function genDevTrait(overall: number, age: number): DevelopmentTrait {
  if (overall >= 95) return Math.random() < 0.6 ? "X-Factor" : "Superstar";
  if (overall >= 90) return Math.random() < 0.5 ? "Superstar" : "Star";
  if (overall >= 80) return Math.random() < 0.35 ? "Star" : "Normal";
  if (age <= 23) return Math.random() < 0.25 ? "Late Bloomer" : "Normal";
  return "Normal";
}

function emptyStats(season?: number): PlayerSeasonStats {
  return {
    season, gamesPlayed:0, passingYards:0, passingTDs:0, interceptions:0, completions:0, attempts:0, qbRating:0,
    rushingYards:0, rushingTDs:0, carries:0, receivingYards:0, receivingTDs:0, receptions:0, targets:0,
    tackles:0, sacks:0, forcedFumbles:0, defensiveINTs:0, passDeflections:0,
    yardsPerCarry:0, yardsPerCatch:0,
    fieldGoalsMade:0, fieldGoalsAttempted:0, puntsAverage:0,
  };
}

// ─── Career stats seeder ──────────────────────────────────────────────────────

function genCareerStats(pos: NFLPosition, overall: number, yearsExp: number): PlayerSeasonStats[] {
  if (yearsExp === 0) return [];
  const q = overall / 100;
  return Array.from({ length: Math.min(yearsExp, 10) }, (_, yr) => {
    const seasonYear = 2024 - yearsExp + yr + 1;
    const gp = irng(8, 17);
    const peakFactor = Math.max(0.55, 1 - Math.abs(yr - yearsExp * 0.45) * 0.07);
    const qp = clamp(q * peakFactor, 0.3, 1.0);
    const s = emptyStats(seasonYear);
    s.gamesPlayed = gp;
    if (pos === "QB") {
      s.attempts = Math.round(gp * irng(28, 36));
      s.completions = Math.round(s.attempts * (0.56 + qp * 0.14));
      s.passingYards = Math.round(s.completions * (6.5 + qp * 2.8));
      s.passingTDs = Math.round(gp * (1.1 + qp * 1.9));
      s.interceptions = Math.max(0, Math.round(gp * (0.5 + (1 - qp) * 0.8)));
      s.rushingYards = Math.round(gp * irng(5, 40));
      s.rushingTDs = Math.round(qp * 4);
      s.qbRating = Math.round(65 + qp * 37);
    } else if (pos === "RB") {
      s.carries = Math.round(gp * (7 + qp * 12));
      s.rushingYards = Math.round(s.carries * (3.3 + qp * 2.2));
      s.yardsPerCarry = Math.round((s.rushingYards / Math.max(1, s.carries)) * 10) / 10;
      s.rushingTDs = Math.round(gp * (0.3 + qp * 0.8));
      s.receptions = Math.round(gp * (1.5 + qp * 2.5));
      s.receivingYards = Math.round(s.receptions * (6 + qp * 4));
      s.receivingTDs = Math.round(qp * 4);
    } else if (pos === "WR") {
      s.targets = Math.round(gp * (4 + qp * 6));
      s.receptions = Math.round(s.targets * (0.56 + qp * 0.2));
      s.receivingYards = Math.round(s.receptions * (9 + qp * 7));
      s.receivingTDs = Math.round(gp * (0.25 + qp * 0.65));
      s.yardsPerCatch = Math.round((s.receivingYards / Math.max(1, s.receptions)) * 10) / 10;
    } else if (pos === "TE") {
      s.targets = Math.round(gp * (3 + qp * 4));
      s.receptions = Math.round(s.targets * (0.58 + qp * 0.2));
      s.receivingYards = Math.round(s.receptions * (7 + qp * 5));
      s.receivingTDs = Math.round(gp * (0.15 + qp * 0.6));
      s.yardsPerCatch = Math.round((s.receivingYards / Math.max(1, s.receptions)) * 10) / 10;
    } else if (pos === "DE") {
      s.sacks = Math.round(gp * (0.35 + qp * 0.7) * 10) / 10;
      s.tackles = Math.round(gp * (1.5 + qp * 2));
      s.forcedFumbles = Math.round(gp * 0.15 * qp);
      s.passDeflections = Math.round(gp * 0.2 * qp);
    } else if (pos === "DT") {
      s.sacks = Math.round(gp * (0.2 + qp * 0.5) * 10) / 10;
      s.tackles = Math.round(gp * (1.8 + qp * 2.2));
      s.forcedFumbles = Math.round(gp * 0.1 * qp);
    } else if (pos === "LB") {
      s.tackles = Math.round(gp * (3.5 + qp * 4));
      s.sacks = Math.round(gp * (0.1 + qp * 0.55) * 10) / 10;
      s.defensiveINTs = Math.round(qp * 3);
      s.forcedFumbles = Math.round(gp * 0.1 * qp);
      s.passDeflections = Math.round(gp * 0.35 * qp);
    } else if (pos === "CB") {
      s.tackles = Math.round(gp * (2 + qp * 2.5));
      s.defensiveINTs = Math.round(qp * 5);
      s.passDeflections = Math.round(gp * (0.5 + qp * 0.9));
      s.forcedFumbles = Math.round(gp * 0.08 * qp);
    } else if (pos === "S") {
      s.tackles = Math.round(gp * (2.5 + qp * 3));
      s.defensiveINTs = Math.round(qp * 4);
      s.passDeflections = Math.round(gp * (0.3 + qp * 0.7));
      s.forcedFumbles = Math.round(gp * 0.07 * qp);
    } else if (pos === "K") {
      s.fieldGoalsMade = Math.round(gp * (1.2 + qp * 0.8));
      s.fieldGoalsAttempted = Math.round(s.fieldGoalsMade / (0.7 + qp * 0.2));
    } else if (pos === "P") {
      s.puntsAverage = Math.round((40 + qp * 8) * 10) / 10;
    }
    return s;
  });
}

// ─── Combine → athleticism helper (same formulas as draft board) ───────────────

function combineToAthletics(c: CombineMeasurables, grade: number) {
  const cl = (v: number) => Math.max(40, Math.min(99, Math.round(v)));
  if (c.didNotParticipate) {
    const base = clamp(grade - 5, 45, 90);
    return { spd: base, str: base, agi: cl(grade - 6), acc: cl(grade - 6), exp: cl(grade - 6) };
  }
  const spd = cl(99 - (c.fortyYardDash - 4.3) * 65);
  const str = cl(c.benchPress * 1.6 + 22);
  const sRtg = cl(99 - (c.shuttleRun - 4.0) * 58);
  const cRtg = cl(99 - (c.threeCone - 6.5) * 18);
  const agi = cl((sRtg + cRtg) / 2);
  const acc = cRtg;
  const vRtg = cl(40 + (c.verticalJump - 22) * 3.278);
  const bRtg = cl(40 + (c.broadJump - 90) * 1.967);
  const exp = cl((vRtg + bRtg) / 2);
  return { spd, str, agi, acc, exp };
}

// Blend combine athleticism into posRatings for a drafted rookie
function genPosRatingsFromProspect(
  pos: NFLPosition, overall: number,
  spd: number, str: number, agi: number, acc: number,
): PosRatings {
  const base = genPosRatings(pos, overall, false, false);
  // Skill blend: combine gets 55% weight (technique matters too)
  const ab = (combine: number, technique: number, w = 0.55) =>
    Math.round(clamp(combine * w + technique * (1 - w), 45, 99));
  // Athletic blend: combine is ground truth for pure measurables — 85% weight
  const ath = (combine: number, technique: number) =>
    Math.round(clamp(combine * 0.85 + technique * 0.15, 45, 99));
  return {
    ...base,
    // Universal athletic overrides — combine dominates for measurables
    agility:      ath(agi, base.agility),
    acceleration: ath(acc, base.acceleration),
    // Position-specific athletic blends
    mobility: ["QB","WR","RB","CB","S"].includes(pos) ? ab(spd, base.mobility, 0.4) : base.mobility,
    manCoverage:  pos === "CB" ? ab(spd, base.manCoverage, 0.5) : base.manCoverage,
    zoneCoverage: ["CB","S"].includes(pos) ? ab(agi, base.zoneCoverage, 0.4) : base.zoneCoverage,
    press:        pos === "CB" ? ab(spd, base.press, 0.45) : base.press,
    powerMoves:   ["OL","DE","DT"].includes(pos) ? ab(str, base.powerMoves, 0.45) : base.powerMoves,
    finesseMoves: ["DE","DT"].includes(pos) ? ab(agi, base.finesseMoves, 0.4) : base.finesseMoves,
    blockShedding:["DE","DT"].includes(pos) ? ab(str, base.blockShedding, 0.4) : base.blockShedding,
    breakTackle:  pos === "RB" ? ab(str, base.breakTackle, 0.4) : base.breakTackle,
  };
}

// ─── Position-specific rating generator ───────────────────────────────────────

function genPosRatings(pos: NFLPosition, overall: number, isStarter: boolean, isElite: boolean): PosRatings {
  const g = (base: number, boost = 0) => clamp(gaussian(base + boost, 5), 45, 99);
  const hi = overall + 2;
  const lo = overall - 8;
  const mid = overall - 2;
  return {
    throwPower:      pos === "QB"                        ? g(hi)  : g(lo - 8),
    throwAccShort:   pos === "QB"                        ? g(hi)  : g(lo - 8),
    throwAccMid:     pos === "QB"                        ? g(mid) : g(lo - 12),
    throwAccDeep:    pos === "QB"                        ? g(lo)  : g(lo - 15),
    throwOnRun:      pos === "QB"                        ? g(lo)  : g(lo - 10),
    mobility:        pos === "QB"                        ? g(lo)  : ["WR","CB","RB","S"].includes(pos) ? g(mid) : g(lo - 5),
    agility:         ["WR","CB","RB","S"].includes(pos)  ? g(hi)  : ["QB","TE","LB"].includes(pos) ? g(mid) : g(lo),
    acceleration:    ["WR","CB","RB"].includes(pos)      ? g(hi)  : ["QB","S","DE"].includes(pos)  ? g(mid) : g(lo),
    ballCarrierVision: pos === "RB"                      ? g(hi)  : g(lo - 5),
    breakTackle:     pos === "RB"                        ? g(hi)  : pos === "FB" ? g(mid) : g(lo - 5),
    carryRating:     pos === "RB"                        ? g(hi)  : pos === "QB" ? g(lo)  : pos === "WR" ? g(lo) : g(lo - 15),
    catching:        ["WR","TE"].includes(pos)           ? g(hi)  : pos === "RB" ? g(mid) : g(lo - 10),
    routeRunning:    ["WR","TE"].includes(pos)           ? g(hi)  : pos === "RB" ? g(lo)  : g(lo - 10),
    catchInTraffic:  ["WR","TE"].includes(pos)           ? g(mid) : g(lo - 8),
    release:         ["WR","TE"].includes(pos)           ? g(hi)  : g(lo - 8),
    passBlock:       pos === "OL"                        ? g(hi)  : ["TE"].includes(pos) ? g(lo) : g(lo - 8),
    runBlock:        ["OL","TE"].includes(pos)           ? g(hi)  : g(lo - 8),
    powerMoves:      ["DE","DT","LB","OL"].includes(pos) ? g(hi)  : g(lo - 8),
    finesseMoves:    ["DE","DT"].includes(pos)           ? g(hi)  : ["LB"].includes(pos) ? g(mid) : g(lo - 8),
    blockShedding:   ["DE","DT","LB"].includes(pos)      ? g(hi)  : ["OL"].includes(pos) ? g(lo) : g(lo - 8),
    tackle:          ["LB","S","CB","DE","DT"].includes(pos) ? g(hi) : ["OL"].includes(pos) ? g(lo) : g(lo - 5),
    pursuit:         ["DE","DT","LB","CB","S"].includes(pos) ? g(hi) : g(lo - 5),
    manCoverage:     ["CB"].includes(pos)                ? g(hi)  : ["S","LB"].includes(pos) ? g(mid) : g(lo - 10),
    zoneCoverage:    ["S","CB"].includes(pos)            ? g(hi)  : ["LB"].includes(pos) ? g(mid) : g(lo - 10),
    press:           pos === "CB"                        ? g(hi)  : pos === "S" ? g(mid) : g(lo - 8),
    kickPower:       ["K","P"].includes(pos)             ? g(hi)  : g(lo - 15),
    kickAccuracy:    ["K","P"].includes(pos)             ? g(hi)  : g(lo - 15),
  };
}

// ─── Ethnicity code generator ─────────────────────────────────────────────────
// Distribution: ~55% Black, 27% White, 12% Hispanic, 4% Polynesian, 2% Mixed
function genEthnicity(): EthnicityCode {
  const r = Math.random();
  if (r < 0.55) return 0;
  if (r < 0.82) return 1;
  if (r < 0.94) return 2;
  if (r < 0.98) return 3;
  return 4;
}

const COLLEGES = [
  "Alabama","Ohio State","Georgia","Clemson","LSU","Oklahoma","Michigan","Notre Dame","Penn State","Texas",
  "Oregon","USC","Florida","Florida State","Auburn","Tennessee","Ole Miss","Arkansas","Nebraska","Iowa",
  "Wisconsin","Michigan State","TCU","Baylor","Texas Tech","Kansas State","Iowa State","Utah","Washington",
  "Miami","Pittsburgh","Virginia Tech","NC State","Louisville","Duke","Syracuse","Fresno State","Boise State",
  "BYU","SMU","Memphis","Appalachian State","Coastal Carolina","Liberty","UCLA","Stanford","Cincinnati","UCF",
];

const JERSEY_RANGES: Record<NFLPosition, [number, number]> = {
  QB: [1,  17], RB: [20, 49], WR: [10, 49], TE: [80, 89],
  OL: [50, 79], DE: [90, 99], DT: [90, 99], LB: [40, 59],
  CB: [20, 39], S:  [20, 39], K:  [1,  17], P:  [1,  17],
};

function genJerseyNumber(pos: NFLPosition, seed: number): number {
  const [lo, hi] = JERSEY_RANGES[pos];
  return lo + (seed % (hi - lo + 1));
}

// ─── Roster Template ──────────────────────────────────────────────────────────

interface PositionSlot { pos: NFLPosition; depth: number; isElite?: boolean }
const ROSTER_TEMPLATE: PositionSlot[] = [
  // QB
  { pos:"QB", depth:1 }, { pos:"QB", depth:2 }, { pos:"QB", depth:3 },
  // RB
  { pos:"RB", depth:1 }, { pos:"RB", depth:1 }, { pos:"RB", depth:2 }, { pos:"RB", depth:2 },
  // WR
  { pos:"WR", depth:1, isElite:true }, { pos:"WR", depth:1 }, { pos:"WR", depth:1 },
  { pos:"WR", depth:2 }, { pos:"WR", depth:2 }, { pos:"WR", depth:3 },
  // TE
  { pos:"TE", depth:1 }, { pos:"TE", depth:2 }, { pos:"TE", depth:3 },
  // OL
  { pos:"OL", depth:1 }, { pos:"OL", depth:1 }, { pos:"OL", depth:1 }, { pos:"OL", depth:1 }, { pos:"OL", depth:1 },
  { pos:"OL", depth:2 }, { pos:"OL", depth:2 }, { pos:"OL", depth:2 },
  // DE
  { pos:"DE", depth:1, isElite:false }, { pos:"DE", depth:1 }, { pos:"DE", depth:2 }, { pos:"DE", depth:2 },
  // DT
  { pos:"DT", depth:1 }, { pos:"DT", depth:1 }, { pos:"DT", depth:2 }, { pos:"DT", depth:2 },
  // LB
  { pos:"LB", depth:1, isElite:false }, { pos:"LB", depth:1 }, { pos:"LB", depth:1 },
  { pos:"LB", depth:2 }, { pos:"LB", depth:2 },
  // CB
  { pos:"CB", depth:1, isElite:false }, { pos:"CB", depth:1 }, { pos:"CB", depth:1 },
  { pos:"CB", depth:2 }, { pos:"CB", depth:2 },
  // S
  { pos:"S", depth:1 }, { pos:"S", depth:1 }, { pos:"S", depth:2 }, { pos:"S", depth:2 },
  // ST
  { pos:"K", depth:1 }, { pos:"P", depth:1 },
];

function generateRoster(teamOverall: number): Player[] {
  const usedOveralls = new Set<number>();
  return ROSTER_TEMPLATE.map((slot) => {
    const isStarter = slot.depth === 1;
    const isElite = slot.isElite === true && Math.random() < 0.15;
    let overall: number;
    if (isElite) {
      overall = gaussian(teamOverall + 4, 3, 88, 99);
    } else if (slot.depth === 1) {
      overall = gaussian(teamOverall, 7, 73, 95);
    } else if (slot.depth === 2) {
      overall = gaussian(teamOverall - 13, 6, 62, 78);
    } else {
      overall = gaussian(teamOverall - 23, 5, 52, 65);
    }
    while (usedOveralls.has(overall)) overall = clamp(overall + (Math.random() < 0.5 ? 1 : -1), 45, 99);
    usedOveralls.add(overall);
    const pos = slot.pos;
    const exp = isStarter ? irng(2, 12) : irng(0, 6);
    const age = 21 + exp + irng(0, 4);
    const salary = genSalary(overall, pos);
    const sigBonus = Math.round(salary * rng2(0.1, 0.4) * 10) / 10;
    const guaranteed = Math.round(salary * rng2(0.3, 0.7) * 10) / 10;
    const seed = irng(0, 99);
    return {
      id: uid(),
      name: rn(),
      position: pos,
      age,
      overall,
      potential: Math.min(99, overall + irng(0, age < 26 ? 12 : 5)),
      speed: (() => {
        if (["WR","CB"].includes(pos))           return gaussian(teamOverall + 5, 5, 80, 99);
        if (["RB","S"].includes(pos))            return gaussian(teamOverall + 2, 5, 74, 96);
        if (["DE","LB","QB","TE"].includes(pos)) return gaussian(teamOverall - 3, 5, 65, 88);
        if (["OL"].includes(pos))                return gaussian(58, 7, 45, 71);
        if (["DT"].includes(pos))                return gaussian(60, 6, 48, 72);
        return gaussian(teamOverall - 5, 5, 58, 80);
      })(),
      strength: genRating(teamOverall + (["OL","DE","DT"].includes(pos) ? 3 : -2), isStarter, false),
      awareness: genRating(teamOverall + (["QB","S","LB"].includes(pos) ? 3 : -2), isStarter, false),
      specific: genRating(teamOverall + 2, isStarter, isElite),
      posRatings: genPosRatings(pos, overall, isStarter, isElite),
      ethnicityCode: genEthnicity(),
      faceVariant: irng(0, 3) as 0|1|2|3,
      yearsExperience: exp,
      contractYears: irng(1, 4),
      salary,
      signingBonus: sigBonus,
      guaranteedMoney: guaranteed,
      deadCap: sigBonus * 0.5,
      status: isStarter ? "Starter" : slot.depth === 3 ? "Practice Squad" : "Backup",
      depthOrder: slot.depth,
      stats: emptyStats(2025),
      careerStats: [],
      fatigue: 0,
      morale: irng(60, 95),
      faInterestLevel: irng(1, 5),
      developmentTrait: genDevTrait(overall, age),
      college: pick(COLLEGES),
      jerseyNumber: genJerseyNumber(pos, seed),
    };
  });
}

function rng2(min: number, max: number) { return min + Math.random() * (max - min); }

function generateFreeAgents(count = 60): Player[] {
  const positions: NFLPosition[] = ["QB","RB","WR","TE","OL","DE","DT","LB","CB","S","K","P"];
  return Array.from({ length: count }, () => {
    const pos = pick(positions);
    const overall = gaussian(67, 8, 50, 84);
    const exp = irng(1, 10);
    const salary = genSalary(overall, pos);
    const interest = irng(1, 5);
    const age = 22 + exp + irng(0, 4);
    return {
      id: uid(),
      name: rn(),
      position: pos,
      age,
      overall,
      potential: Math.min(99, overall + irng(0, 8)),
      speed: gaussian(overall, 8),
      strength: gaussian(overall, 8),
      awareness: gaussian(overall, 8),
      specific: gaussian(overall + 2, 5),
      posRatings: genPosRatings(pos, overall, false, false),
      ethnicityCode: genEthnicity(),
      faceVariant: irng(0, 3) as 0|1|2|3,
      yearsExperience: exp,
      contractYears: irng(1, 2),
      salary,
      signingBonus: Math.round(salary * 0.15 * 10) / 10,
      guaranteedMoney: Math.round(salary * 0.4 * 10) / 10,
      deadCap: 0,
      status: "Free Agent" as ContractStatus,
      depthOrder: 3,
      stats: emptyStats(),
      careerStats: [],
      fatigue: 0,
      morale: irng(50, 85),
      faInterestLevel: interest,
      developmentTrait: genDevTrait(overall, age),
      college: pick(COLLEGES),
      jerseyNumber: genJerseyNumber(pos, irng(0, 99)),
    };
  });
}

// ─── All 32 VFL Teams ─────────────────────────────────────────────────────────

interface TeamTemplate {
  city: string; name: string; abbreviation: string;
  conference: Conference; division: Division;
  primaryColor: string; secondaryColor: string;
  stadium: string; overall: number;
}

const NFL_TEAMS: TeamTemplate[] = [
  // Ironclad Conference — East
  { city:"Hartford",     name:"Sentinels",    abbreviation:"HRT", conference:"Ironclad", division:"East",  primaryColor:"#1B3462", secondaryColor:"#9CA3AF", stadium:"Granite Peak Arena",    overall:89 },
  { city:"Providence",   name:"Storm",        abbreviation:"PVS", conference:"Ironclad", division:"East",  primaryColor:"#7F1D1D", secondaryColor:"#374151", stadium:"Bay View Stadium",       overall:82 },
  { city:"Burlington",   name:"Frost",        abbreviation:"BLF", conference:"Ironclad", division:"East",  primaryColor:"#1E3A8A", secondaryColor:"#BFDBFE", stadium:"Lakeside Field",         overall:77 },
  { city:"Albany",       name:"Forge",        abbreviation:"ALF", conference:"Ironclad", division:"East",  primaryColor:"#1C2833", secondaryColor:"#D97706", stadium:"Irongate Arena",         overall:78 },
  // Ironclad Conference — North
  { city:"Syracuse",     name:"Stallions",    abbreviation:"SYS", conference:"Ironclad", division:"North", primaryColor:"#4527A0", secondaryColor:"#FFC107", stadium:"Pinnacle Dome",          overall:88 },
  { city:"Pittsburgh",   name:"Ironmen",      abbreviation:"PMN", conference:"Ironclad", division:"North", primaryColor:"#374151", secondaryColor:"#FFC107", stadium:"Steel City Arena",       overall:84 },
  { city:"Columbus",     name:"Knights",      abbreviation:"CKN", conference:"Ironclad", division:"North", primaryColor:"#7F1D1D", secondaryColor:"#9CA3AF", stadium:"Cavalry Field",          overall:79 },
  { city:"Cleveland",    name:"Foundry",      abbreviation:"CLD", conference:"Ironclad", division:"North", primaryColor:"#92400E", secondaryColor:"#6B7280", stadium:"Foundry Stadium",        overall:82 },
  // Ironclad Conference — South
  { city:"Nashville",    name:"Desperados",   abbreviation:"NVD", conference:"Ironclad", division:"South", primaryColor:"#111827", secondaryColor:"#D97706", stadium:"Opry Coliseum",          overall:80 },
  { city:"Memphis",      name:"Blaze",        abbreviation:"MBZ", conference:"Ironclad", division:"South", primaryColor:"#C2410C", secondaryColor:"#1F2937", stadium:"Riverside Arena",        overall:78 },
  { city:"Birmingham",   name:"Bolt",         abbreviation:"BBT", conference:"Ironclad", division:"South", primaryColor:"#6B21A8", secondaryColor:"#6B7280", stadium:"Bolt Field",             overall:76 },
  { city:"Chattanooga",  name:"Thunder",      abbreviation:"CTR", conference:"Ironclad", division:"South", primaryColor:"#065F46", secondaryColor:"#B45309", stadium:"Thunder Gorge Arena",    overall:77 },
  // Ironclad Conference — West
  { city:"Denver",       name:"Peaks",        abbreviation:"DVP", conference:"Ironclad", division:"West",  primaryColor:"#3730A3", secondaryColor:"#FBBF24", stadium:"Summit Field",           overall:79 },
  { city:"Reno",         name:"Royals",       abbreviation:"RNR", conference:"Ironclad", division:"West",  primaryColor:"#1E40AF", secondaryColor:"#D4AF37", stadium:"Crown Coliseum",         overall:91 },
  { city:"Salt Lake",    name:"Blizzard",     abbreviation:"SLB", conference:"Ironclad", division:"West",  primaryColor:"#1E3A8A", secondaryColor:"#E0F2FE", stadium:"Blizzard Basin",         overall:78 },
  { city:"Sacramento",   name:"Miners",       abbreviation:"SMN", conference:"Ironclad", division:"West",  primaryColor:"#D97706", secondaryColor:"#111827", stadium:"Gold Rush Field",        overall:81 },
  // Gridiron Conference — East
  { city:"Raleigh",      name:"Thunderhawks", abbreviation:"RTH", conference:"Gridiron", division:"East",  primaryColor:"#6B1B3C", secondaryColor:"#374151", stadium:"Thunderhawk Arena",      overall:86 },
  { city:"Richmond",     name:"Cavalry",      abbreviation:"RCV", conference:"Gridiron", division:"East",  primaryColor:"#1E3A8A", secondaryColor:"#991B1B", stadium:"Colonial Field",         overall:76 },
  { city:"Annapolis",    name:"Corsairs",     abbreviation:"ACS", conference:"Gridiron", division:"East",  primaryColor:"#0C2340", secondaryColor:"#C41230", stadium:"Chesapeake Arena",       overall:87 },
  { city:"Charlotte",    name:"Vipers",       abbreviation:"CHV", conference:"Gridiron", division:"East",  primaryColor:"#4B1994", secondaryColor:"#65A30D", stadium:"Viper Pit Dome",         overall:78 },
  // Gridiron Conference — North
  { city:"Rockford",     name:"Blaze",        abbreviation:"RBZ", conference:"Gridiron", division:"North", primaryColor:"#C2410C", secondaryColor:"#111827", stadium:"Blaze Arena",            overall:75 },
  { city:"Milwaukee",    name:"Wolves",       abbreviation:"MWW", conference:"Gridiron", division:"North", primaryColor:"#14532D", secondaryColor:"#9CA3AF", stadium:"Lakefront Field",        overall:83 },
  { city:"Madison",      name:"Ice",          abbreviation:"MDI", conference:"Gridiron", division:"North", primaryColor:"#1E40AF", secondaryColor:"#E0F2FE", stadium:"Ice Bowl Stadium",       overall:84 },
  { city:"Grand Rapids", name:"Fury",         abbreviation:"GRF", conference:"Gridiron", division:"North", primaryColor:"#4E0B2A", secondaryColor:"#FBBF24", stadium:"Fury Field",             overall:82 },
  // Gridiron Conference — South
  { city:"Savannah",     name:"Marshmen",     abbreviation:"SVT", conference:"Gridiron", division:"South", primaryColor:"#0F4C35", secondaryColor:"#FBBF24", stadium:"Marsh Meadows Arena",    overall:78 },
  { city:"Baton Rouge",  name:"Bayou",        abbreviation:"BRB", conference:"Gridiron", division:"South", primaryColor:"#4B1994", secondaryColor:"#FBBF24", stadium:"Bayou Bowl",             overall:80 },
  { city:"Tampa",        name:"Surge",        abbreviation:"TSG", conference:"Gridiron", division:"South", primaryColor:"#991B1B", secondaryColor:"#6B7280", stadium:"Surge Stadium",          overall:81 },
  { city:"Orlando",      name:"Storm",        abbreviation:"ORS", conference:"Gridiron", division:"South", primaryColor:"#0C2340", secondaryColor:"#0369A1", stadium:"Storm Dome",             overall:74 },
  // Gridiron Conference — West
  { city:"Portland",     name:"Lumberjacks",  abbreviation:"PLJ", conference:"Gridiron", division:"West",  primaryColor:"#14532D", secondaryColor:"#991B1B", stadium:"Timber Field",           overall:74 },
  { city:"Seattle",      name:"Cascade",      abbreviation:"SCS", conference:"Gridiron", division:"West",  primaryColor:"#1E3A8A", secondaryColor:"#166534", stadium:"Cascade Arena",          overall:83 },
  { city:"San Francisco",name:"Fog",          abbreviation:"SFF", conference:"Gridiron", division:"West",  primaryColor:"#B45309", secondaryColor:"#7F1D1D", stadium:"Bay Shore Stadium",      overall:89 },
  { city:"Los Angeles",  name:"Surf",         abbreviation:"LAS", conference:"Gridiron", division:"West",  primaryColor:"#0E7490", secondaryColor:"#EA580C", stadium:"Surf Stadium",           overall:80 },
];

// ─── Schedule Generation ──────────────────────────────────────────────────────

function makeBlankGameStats() {
  return { passingYards:0,rushingYards:0,totalYards:0,turnovers:0,thirdDownConversions:0,thirdDownAttempts:0,sacks:0,firstDowns:0,timeOfPossession:0,penalties:0,penaltyYards:0,redZoneAttempts:0,redZoneTDs:0 };
}

function makeGame(week: number, home: NFLTeam, away: NFLTeam, overrides: Partial<NFLGame> = {}): NFLGame {
  const conditions: NFLGame["weather"]["condition"][] = ["Clear","Clear","Cloudy","Wind","Rain","Snow","Dome"];
  const temp = irng(28, 82);
  return {
    id: uid(),
    week,
    homeTeamId: home.id,
    awayTeamId: away.id,
    homeScore: 0, awayScore: 0,
    status: "upcoming",
    plays: [], drives: [],
    phase: "pregame",
    stats: { home: makeBlankGameStats(), away: makeBlankGameStats() },
    weather: { condition: conditions[irng(0, conditions.length - 1)], temperature: temp, windSpeed: irng(0, 20), windDirection: "N" },
    location: home.stadium,
    ...overrides,
  };
}

function generateSchedule(teams: NFLTeam[]): { games: NFLGame[]; byeWeeks: Record<string, number> } {
  // Assign each team 1 bye week in weeks 6-13 (4 teams per week × 8 weeks = 32)
  const shuffled = [...teams].sort(() => Math.random() - 0.5);
  const byeWeeks: Record<string, number> = {};
  shuffled.forEach((t, i) => { byeWeeks[t.id] = 6 + Math.floor(i / 4); });

  const games: NFLGame[] = [];
  for (let week = 1; week <= 18; week++) {
    const available = [...teams.filter(t => byeWeeks[t.id] !== week)].sort(() => Math.random() - 0.5);
    for (let i = 0; i < available.length - 1; i += 2) {
      games.push(makeGame(week, available[i], available[i + 1]));
    }
  }
  return { games, byeWeeks };
}

// ─── Playoff helpers ──────────────────────────────────────────────────────────

function computePlayoffSeeds(teams: NFLTeam[], conference: Conference): PlayoffSeed[] {
  const confTeams = teams.filter(t => t.conference === conference);
  const divisions: ("North"|"South"|"East"|"West")[] = ["North","South","East","West"];
  const byRecord = (a: NFLTeam, b: NFLTeam) => {
    const aPct = a.wins / Math.max(1, a.wins + a.losses);
    const bPct = b.wins / Math.max(1, b.wins + b.losses);
    return bPct - aPct || b.pointsFor - a.pointsFor;
  };
  // Division winners
  const divWinners = divisions.map(div =>
    [...confTeams.filter(t => t.division === div)].sort(byRecord)[0]
  ).filter(Boolean) as NFLTeam[];
  divWinners.sort(byRecord);

  // Wild cards
  const divWinnerIds = new Set(divWinners.map(t => t.id));
  const wildcards = confTeams.filter(t => !divWinnerIds.has(t.id)).sort(byRecord).slice(0, 3);

  const result: PlayoffSeed[] = [];
  [...divWinners, ...wildcards].forEach((t, i) => {
    result.push({ teamId: t.id, seed: i + 1, conference, isDivisionWinner: i < 4 });
  });
  return result;
}

function makePlayoffGame(week: number, homeSeed: PlayoffSeed, awaySeed: PlayoffSeed, teams: NFLTeam[], round: PlayoffRound): NFLGame {
  const homeTeam = teams.find(t => t.id === homeSeed.teamId)!;
  const awayTeam = teams.find(t => t.id === awaySeed.teamId)!;
  return makeGame(week, homeTeam, awayTeam, {
    isPlayoffGame: true,
    playoffRound: round,
    playoffConference: homeSeed.conference,
    playoffSeedHome: homeSeed.seed,
    playoffSeedAway: awaySeed.seed,
  });
}

function beginPlayoffs(s: Season): Season {
  const ironcladSeeds = computePlayoffSeeds(s.teams, "Ironclad");
  const gridironSeeds = computePlayoffSeeds(s.teams, "Gridiron");
  const allSeeds = [...ironcladSeeds, ...gridironSeeds];

  // Wild Card: seeds 2v7, 3v6, 4v5 (seed 1 gets bye)
  const wcWeek = s.totalWeeks + 1;
  const wcGames: NFLGame[] = [];
  for (const seeds of [ironcladSeeds, gridironSeeds]) {
    const matchups: [number, number][] = [[2,7],[3,6],[4,5]];
    for (const [hSeed, aSeed] of matchups) {
      const home = seeds.find(s => s.seed === hSeed);
      const away = seeds.find(s => s.seed === aSeed);
      if (home && away) wcGames.push(makePlayoffGame(wcWeek, home, away, s.teams, "wildCard"));
    }
  }

  const news: NewsItem = {
    id: uid(), timestamp: Date.now(),
    headline: "🏆 VFL PLAYOFFS BEGIN! Wild Card Weekend",
    body: `The ${s.year} VFL Playoffs are underway! Top seeds Ironclad & Gridiron receive first-round byes. Six Wild Card matchups this weekend.`,
    category: "general", week: wcWeek,
  };

  return {
    ...s,
    isPlayoffs: true,
    phase: "playoffs",
    playoffSeeds: allSeeds,
    playoffRound: "wildCard",
    totalWeeks: s.totalWeeks + 4, // add 4 playoff weeks
    games: [...s.games, ...wcGames],
    news: [news, ...s.news].slice(0, 50),
  };
}

function getWinner(game: NFLGame): string {
  return game.homeScore >= game.awayScore ? game.homeTeamId : game.awayTeamId;
}

function advancePlayoffRound(s: Season): Season {
  const { playoffRound, playoffSeeds, teams } = s;
  if (!playoffSeeds) return s;

  const seedByTeamId = new Map(playoffSeeds.map(ps => [ps.teamId, ps]));
  const seedByNum = (conf: Conference, n: number) => playoffSeeds.find(ps => ps.conference === conf && ps.seed === n)!;

  const wcGames = s.games.filter(g => g.isPlayoffGame && g.playoffRound === "wildCard" && g.status === "final");
  const divGames = s.games.filter(g => g.isPlayoffGame && g.playoffRound === "divisional" && g.status === "final");
  const confGames = s.games.filter(g => g.isPlayoffGame && g.playoffRound === "conference" && g.status === "final");

  let nextRound: PlayoffRound;
  let newGames: NFLGame[] = [];
  const nextWeek = s.currentWeek;
  let newsText = "";

  if (playoffRound === "wildCard" && wcGames.length === 6) {
    nextRound = "divisional";
    // Winners from WC: 
    // Each conference: winners of 2v7, 3v6, 4v5 + seed 1 bye = 4 teams
    for (const conf of ["Ironclad", "Gridiron"] as Conference[]) {
      const confWCGames = wcGames.filter(g => g.playoffConference === conf);
      const wcWinners = confWCGames.map(g => ({
        teamId: getWinner(g),
        seed: seedByTeamId.get(getWinner(g))?.seed ?? 9,
        conference: conf as Conference,
        isDivisionWinner: false,
      })).sort((a, b) => a.seed - b.seed);
      // Seed 1 (bye) + 3 WC winners, sorted by seed
      const seed1 = seedByNum(conf, 1);
      const fourTeams = [seed1, ...wcWinners].sort((a, b) => a.seed - b.seed);
      // Divisional: 1 vs lowest, 2nd vs 3rd
      if (fourTeams.length === 4) {
        newGames.push(makePlayoffGame(nextWeek, fourTeams[0], fourTeams[3], teams, "divisional"));
        newGames.push(makePlayoffGame(nextWeek, fourTeams[1], fourTeams[2], teams, "divisional"));
      }
    }
    newsText = "Divisional Round: The top seeds enter the bracket!";
  } else if (playoffRound === "divisional" && divGames.length === 4) {
    nextRound = "conference";
    for (const conf of ["Ironclad", "Gridiron"] as Conference[]) {
      const confDivGames = divGames.filter(g => g.playoffConference === conf);
      const divWinners = confDivGames.map(g => ({
        teamId: getWinner(g),
        seed: seedByTeamId.get(getWinner(g))?.seed ?? 9,
        conference: conf as Conference,
        isDivisionWinner: false,
      })).sort((a, b) => a.seed - b.seed);
      if (divWinners.length === 2) {
        newGames.push(makePlayoffGame(nextWeek, divWinners[0], divWinners[1], teams, "conference"));
      }
    }
    newsText = "Conference Championships: Final step before the VFL Bowl!";
  } else if (playoffRound === "conference" && confGames.length === 2) {
    nextRound = "vflBowl";
    const confWinnerIds = confGames.map(g => getWinner(g));
    const [tc1, tc2] = confWinnerIds;
    const t1Seed = playoffSeeds.find(ps => ps.teamId === tc1);
    const t2Seed = playoffSeeds.find(ps => ps.teamId === tc2);
    const homeId = (t1Seed?.seed ?? 1) <= (t2Seed?.seed ?? 2) ? tc1 : tc2;
    const awayId = homeId === tc1 ? tc2 : tc1;
    const homeTeamObj = teams.find(t => t.id === homeId)!;
    const awayTeamObj = teams.find(t => t.id === awayId)!;
    newGames.push(makeGame(nextWeek, homeTeamObj, awayTeamObj, {
      isPlayoffGame: true, playoffRound: "vflBowl",
    }));
    newsText = "🏆 VFL BOWL! The championship is set!";
  } else {
    return s;
  }

  const news: NewsItem = {
    id: uid(), timestamp: Date.now(),
    headline: newsText,
    body: `${newGames.length} game${newGames.length !== 1 ? "s" : ""} scheduled for the next playoff round.`,
    category: "general", week: nextWeek,
  };

  return {
    ...s,
    playoffRound: nextRound,
    games: [...s.games, ...newGames],
    news: [news, ...s.news].slice(0, 50),
  };
}

function endPlayoffs(s: Season, vflBowlGame: NFLGame): Season {
  const winnerId = getWinner(vflBowlGame);
  const winnerTeam = s.teams.find(t => t.id === winnerId);
  const news: NewsItem = {
    id: uid(), timestamp: Date.now(),
    headline: `🏆 ${winnerTeam?.city} ${winnerTeam?.name} WIN THE VFL BOWL!`,
    body: `${winnerTeam?.city} ${winnerTeam?.name} defeat their opponent ${vflBowlGame.homeScore}–${vflBowlGame.awayScore} to claim the VFL Championship!`,
    category: "general", week: s.currentWeek,
  };
  return {
    ...s,
    vflBowlWinnerId: winnerId,
    phase: "offseason",
    news: [news, ...s.news].slice(0, 50),
  };
}

function generateDraftPicks(teamId: string): DraftPick[] {
  return [1,2,3,4,5,6,7].map(round => ({
    id: uid(),
    round,
    pick: irng(1, 32),
    year: 2025,
    fromTeam: teamId,
    ownedByTeamId: teamId,
  }));
}

// ─── initSeason ───────────────────────────────────────────────────────────────

function initSeason(playerTeamId?: string): Season {
  const teams: NFLTeam[] = NFL_TEAMS.map((t, i) => {
    const id = `team-${i}`;
    return {
      id,
      city: t.city, name: t.name, abbreviation: t.abbreviation,
      conference: t.conference, division: t.division,
      primaryColor: t.primaryColor, secondaryColor: t.secondaryColor,
      stadium: t.stadium,
      overall: t.overall,
      roster: generateRoster(t.overall),
      capSpace: irng(40, 100),
      totalCap: 255,
      wins: 0, losses: 0, ties: 0,
      pointsFor: 0, pointsAgainst: 0,
      draftPicks: generateDraftPicks(id),
      defenseFormation: pick(["4-3","3-4","nickel","dime"] as Formation[]),
      offenseScheme: pick(["spread","pro-set","run-heavy","air-raid"] as OffenseScheme[]),
      gamePlan: "balanced" as GamePlan,
      depthChart: {},
    };
  });

  const finalPlayerTeamId = playerTeamId ?? teams[13].id; // Reno Royals default
  const { games, byeWeeks } = generateSchedule(teams);
  const draftProspects = generateDraftClass(2025, 252);
  const teamIds = teams.map(t => t.id);
  const draftState = initDraftState(teamIds, finalPlayerTeamId);

  return {
    year: 2025,
    currentWeek: 1,
    totalWeeks: 18,
    phase: "regular",
    games,
    byeWeeks,
    teams,
    playerTeamId: finalPlayerTeamId,
    draftProspects,
    draftState,
    freeAgents: generateFreeAgents(60),
    isPlayoffs: false,
    news: [{
      id: uid(),
      headline: "VFL 2025 Season Kicks Off!",
      body: "All 32 teams launch their quest for the Virtual Cup. Who will claim the championship?",
      category: "general",
      timestamp: Date.now(),
      week: 1,
    }],
    tradeOffers: [],
  };
}

// ─── Context ──────────────────────────────────────────────────────────────────

const NFLContext = createContext<NFLContextValue | null>(null);
export function useNFL() {
  const ctx = useContext(NFLContext);
  if (!ctx) throw new Error("useNFL must be used inside NFLProvider");
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function NFLProvider({ children }: { children: React.ReactNode }) {
  const { user, membership } = useAuth();
  const [season, setSeason] = useState<Season | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [teamCustomization, setTeamCustomization] = useState<TeamCustomization | null>(null);
  const saveDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const realtimeSub = useRef<any>(null);

  // ── Load on mount ──────────────────────────────────────────────────────────

  useEffect(() => { loadSeason(); loadCustomization(); }, [membership?.franchiseId]);

  // ── Realtime sync subscription ─────────────────────────────────────────────

  useEffect(() => {
    if (!SUPABASE_ENABLED || !membership?.franchiseId) return;
    realtimeSub.current = supabase
      .channel(`franchise:${membership.franchiseId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "franchise_state", filter: `franchise_id=eq.${membership.franchiseId}` }, (payload: any) => {
        const remoteState = payload.new?.state_json as Season | undefined;
        if (remoteState && remoteState.year) {
          setSeason(remoteState);
          setSyncError(null);
        }
      })
      .subscribe();
    return () => { if (realtimeSub.current) realtimeSub.current.unsubscribe(); };
  }, [membership?.franchiseId]);

  // ── Customization storage ──────────────────────────────────────────────────

  async function loadCustomization() {
    try {
      const raw = await AsyncStorage.getItem(CUSTOM_KEY);
      if (raw) setTeamCustomization(JSON.parse(raw));
    } catch {}
  }

  const saveCustomization = useCallback(async (data: TeamCustomization) => {
    try {
      await AsyncStorage.setItem(CUSTOM_KEY, JSON.stringify(data));
      setTeamCustomization(data);
      // Reflect name/color changes back into the season's team object
      setSeason(s => {
        if (!s) return s;
        return {
          ...s,
          teams: s.teams.map(t =>
            t.id === data.teamId
              ? { ...t, city: data.city, name: data.name, abbreviation: data.abbreviation, primaryColor: data.primaryColor, secondaryColor: data.secondaryColor }
              : t
          ),
        };
      });
    } catch (e) { console.warn("saveCustomization error", e); }
  }, []);

  const setGameDayUniform = useCallback(async (gameId: string, uniform: "home" | "away" | "alternate") => {
    setSeason(s => {
      if (!s) return s;
      const updated = { ...s, games: s.games.map(g => g.id === gameId ? { ...g, gameDayUniform: uniform } : g) };
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  // ── Storage ────────────────────────────────────────────────────────────────

  async function loadSeason() {
    setIsLoading(true);
    try {
      if (SUPABASE_ENABLED && membership?.franchiseId) {
        await loadFromSupabase(membership.franchiseId);
      } else {
        let raw: string | null = null;
        try { raw = await AsyncStorage.getItem(CACHE_KEY); } catch {}
        if (raw) {
          setSeason(JSON.parse(raw));
        } else {
          const s = initSeason();
          setSeason(s);
          try { await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(s)); } catch {}
        }
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function loadFromSupabase(franchiseId: string) {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase
        .from("franchise_state")
        .select("state_json")
        .eq("franchise_id", franchiseId)
        .single();
      if (error || !data) {
        const s = initSeason(membership?.teamId);
        setSeason(s);
        await saveToSupabase(franchiseId, s);
      } else {
        setSeason(data.state_json as Season);
      }
      setSyncError(null);
    } catch (e: any) {
      setSyncError(e.message);
    } finally {
      setIsSyncing(false);
    }
  }

  async function saveToSupabase(franchiseId: string, s: Season) {
    setIsSyncing(true);
    try {
      await supabase.from("franchise_state").upsert({
        franchise_id: franchiseId,
        state_json: s,
        updated_by: user?.id,
      }, { onConflict: "franchise_id" });
      setSyncError(null);
    } catch (e: any) {
      setSyncError(e.message);
    } finally {
      setIsSyncing(false);
    }
  }

  const save = useCallback(async (s: Season) => {
    setSeason(s);
    if (saveDebounce.current) clearTimeout(saveDebounce.current);
    saveDebounce.current = setTimeout(async () => {
      if (SUPABASE_ENABLED && membership?.franchiseId) {
        await saveToSupabase(membership.franchiseId, s);
      } else {
        try { await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(s)); } catch {}
      }
    }, 600);
  }, [membership?.franchiseId, user?.id]);

  // ── Queries ────────────────────────────────────────────────────────────────

  const getTeam = useCallback((teamId: string) => season?.teams.find(t => t.id === teamId), [season]);
  const getPlayerTeam = useCallback(() => season?.teams.find(t => t.id === season.playerTeamId), [season]);

  const getStandings = useCallback((conference?: string) => {
    if (!season) return [];
    const teams = conference ? season.teams.filter(t => t.conference === conference) : season.teams;
    return [...teams].sort((a, b) => {
      const awPct = a.wins / Math.max(1, a.wins + a.losses);
      const bwPct = b.wins / Math.max(1, b.wins + b.losses);
      return bwPct - awPct || b.pointsFor - a.pointsFor;
    });
  }, [season]);

  const getWeekGames = useCallback((week: number) =>
    (season?.games ?? []).filter(g => g.week === week), [season]);

  // ── Simulation ─────────────────────────────────────────────────────────────

  const simulateGame = useCallback(async (gameId: string) => {
    if (!season) return;
    const gameIdx = season.games.findIndex(g => g.id === gameId);
    if (gameIdx === -1) return;
    const game = season.games[gameIdx];
    const homeTeam = season.teams.find(t => t.id === game.homeTeamId)!;
    const awayTeam = season.teams.find(t => t.id === game.awayTeamId)!;

    const result = simulateFullGame(homeTeam, awayTeam, game.week);

    // Update teams
    const newTeams = season.teams.map(t => {
      if (t.id === homeTeam.id) {
        const won = result.homeScore > result.awayScore;
        const tied = result.homeScore === result.awayScore;
        return { ...t, wins: t.wins + (won ? 1 : 0), losses: t.losses + (!won && !tied ? 1 : 0), ties: t.ties + (tied ? 1 : 0), pointsFor: t.pointsFor + result.homeScore, pointsAgainst: t.pointsAgainst + result.awayScore };
      }
      if (t.id === awayTeam.id) {
        const won = result.awayScore > result.homeScore;
        const tied = result.homeScore === result.awayScore;
        return { ...t, wins: t.wins + (won ? 1 : 0), losses: t.losses + (!won && !tied ? 1 : 0), ties: t.ties + (tied ? 1 : 0), pointsFor: t.pointsFor + result.awayScore, pointsAgainst: t.pointsAgainst + result.homeScore };
      }
      return t;
    });

    const newGames = season.games.map((g, i) => i === gameIdx ? { ...g, ...result, id: g.id, week: g.week } : g);
    const newsItem: Omit<NewsItem,"id"|"timestamp"> = {
      headline: result.homeScore > result.awayScore
        ? `${homeTeam.city} defeats ${awayTeam.city} ${result.homeScore}-${result.awayScore}`
        : `${awayTeam.city} upsets ${homeTeam.city} ${result.awayScore}-${result.homeScore}`,
      body: `Final score: ${homeTeam.abbreviation} ${result.homeScore}, ${awayTeam.abbreviation} ${result.awayScore}. ${result.stats.home.totalYards} vs ${result.stats.away.totalYards} total yards.`,
      category: "game",
      teamId: season.playerTeamId,
      week: game.week,
    };

    const newS = { ...season, teams: newTeams, games: newGames, news: [addNewsItem(newsItem), ...season.news].slice(0, 50) };
    await save(newS);
  }, [season, save]);

  const simulateWeek = useCallback(async () => {
    if (!season) return;
    let current = { ...season, teams: [...season.teams], games: [...season.games] };
    const weekGames = current.games.filter(g => g.week === current.currentWeek && g.status === "upcoming");

    for (const game of weekGames) {
      const homeTeam = current.teams.find(t => t.id === game.homeTeamId)!;
      const awayTeam = current.teams.find(t => t.id === game.awayTeamId)!;
      const result = simulateFullGame(homeTeam, awayTeam, game.week);

      // Playoff games don't count toward regular season W/L
      if (!game.isPlayoffGame) {
        current.teams = current.teams.map(t => {
          if (t.id === homeTeam.id) {
            const won = result.homeScore > result.awayScore;
            const tied = result.homeScore === result.awayScore;
            return { ...t, wins: t.wins + (won?1:0), losses: t.losses + (!won&&!tied?1:0), ties: t.ties + (tied?1:0), pointsFor: t.pointsFor + result.homeScore, pointsAgainst: t.pointsAgainst + result.awayScore };
          }
          if (t.id === awayTeam.id) {
            const won = result.awayScore > result.homeScore;
            const tied = result.homeScore === result.awayScore;
            return { ...t, wins: t.wins + (won?1:0), losses: t.losses + (!won&&!tied?1:0), ties: t.ties + (tied?1:0), pointsFor: t.pointsFor + result.awayScore, pointsAgainst: t.pointsAgainst + result.homeScore };
          }
          return t;
        });
      }
      current.games = current.games.map(g => g.id === game.id ? { ...g, ...result, id: g.id, week: g.week } : g);

      // Merge per-player game stats into each team's roster season totals
      if (result.playerStats) {
        const ps = result.playerStats;
        current.teams = current.teams.map(t => {
          if (t.id !== homeTeam.id && t.id !== awayTeam.id) return t;
          return {
            ...t,
            roster: t.roster.map(p => {
              const gameLine = ps[p.id];
              if (!gameLine) return p;
              return { ...p, stats: mergePlayerStats(p.stats, gameLine) };
            }),
          };
        });
      }
    }

    const nextWeek = current.currentWeek + 1;
    current = { ...current, currentWeek: nextWeek };

    // After regular season week 18: start playoffs
    if (!current.isPlayoffs && current.currentWeek > 18) {
      current = beginPlayoffs(current) as typeof current;
      await save(current);
      return;
    }

    // After each playoff week: advance bracket or end season
    if (current.isPlayoffs && weekGames.some(g => g.isPlayoffGame)) {
      const vflBowl = current.games.filter(g => g.isPlayoffGame && g.playoffRound === "vflBowl");
      if (vflBowl.length > 0 && vflBowl.every(g => g.status === "final")) {
        current = endPlayoffs(current, vflBowl[0]) as typeof current;
      } else {
        current = advancePlayoffRound(current) as typeof current;
      }
    }

    await save(current);
  }, [season, save]);

  const simulateSeason = useCallback(async () => {
    if (!season) return;
    let current = { ...season, teams: season.teams.map(t => ({ ...t, roster: [...t.roster] })), games: [...season.games] };
    let maxIter = 40;
    while (!current.vflBowlWinnerId && maxIter-- > 0) {
      const weekGames = current.games.filter(g => g.week === current.currentWeek && g.status === "upcoming");
      if (weekGames.length === 0) break;
      for (const game of weekGames) {
        const homeTeam = current.teams.find(t => t.id === game.homeTeamId)!;
        const awayTeam = current.teams.find(t => t.id === game.awayTeamId)!;
        if (!homeTeam || !awayTeam) continue;
        const result = simulateFullGame(homeTeam, awayTeam, game.week);
        if (!game.isPlayoffGame) {
          current.teams = current.teams.map(t => {
            if (t.id === homeTeam.id) {
              const won = result.homeScore > result.awayScore;
              const tied = result.homeScore === result.awayScore;
              return { ...t, wins: t.wins + (won?1:0), losses: t.losses + (!won&&!tied?1:0), ties: t.ties + (tied?1:0), pointsFor: t.pointsFor + result.homeScore, pointsAgainst: t.pointsAgainst + result.awayScore };
            }
            if (t.id === awayTeam.id) {
              const won = result.awayScore > result.homeScore;
              const tied = result.homeScore === result.awayScore;
              return { ...t, wins: t.wins + (won?1:0), losses: t.losses + (!won&&!tied?1:0), ties: t.ties + (tied?1:0), pointsFor: t.pointsFor + result.awayScore, pointsAgainst: t.pointsAgainst + result.homeScore };
            }
            return t;
          });
        }
        current.games = current.games.map(g => g.id === game.id ? { ...g, ...result, id: g.id, week: g.week } : g);
        if (result.playerStats) {
          const ps = result.playerStats;
          current.teams = current.teams.map(t => {
            if (t.id !== homeTeam.id && t.id !== awayTeam.id) return t;
            return { ...t, roster: t.roster.map(p => { const gl = ps[p.id]; return gl ? { ...p, stats: mergePlayerStats(p.stats, gl) } : p; }) };
          });
        }
      }
      const nextWeek = current.currentWeek + 1;
      current = { ...current, currentWeek: nextWeek };
      if (!current.isPlayoffs && current.currentWeek > 18) {
        current = beginPlayoffs(current) as typeof current;
        continue;
      }
      if (current.isPlayoffs && weekGames.some(g => g.isPlayoffGame)) {
        const vflBowl = current.games.filter(g => g.isPlayoffGame && g.playoffRound === "vflBowl");
        if (vflBowl.length > 0 && vflBowl.every(g => g.status === "final")) {
          current = endPlayoffs(current, vflBowl[0]) as typeof current;
          break;
        } else {
          current = advancePlayoffRound(current) as typeof current;
        }
      }
    }
    await save(current);
  }, [season, save]);

  // ── Roster Actions ─────────────────────────────────────────────────────────

  const signFreeAgent = useCallback(async (playerId: string, contractYears: number, salary: number) => {
    if (!season) return;
    const fa = season.freeAgents.find(p => p.id === playerId);
    if (!fa) return;
    const playerTeam = getPlayerTeam();
    if (!playerTeam) return;
    const totalCapUsed = playerTeam.roster.reduce((s, p) => s + p.salary, 0);
    if (totalCapUsed + salary > playerTeam.totalCap) return; // over cap
    const signingBonus = Math.round(salary * 0.2 * 10) / 10;
    const signedPlayer: Player = { ...fa, status: "Backup", depthOrder: 2, contractYears, salary, signingBonus, guaranteedMoney: Math.round(salary * 0.5 * 10) / 10, deadCap: signingBonus * 0.5 };
    const newsItem: Omit<NewsItem,"id"|"timestamp"> = {
      headline: `${playerTeam.abbreviation} sign FA ${fa.name} to ${contractYears}-yr deal`,
      body: `${fa.name} (${fa.position}, ${fa.overall} OVR) signs with ${playerTeam.city} for $${salary}M/yr over ${contractYears} year${contractYears>1?"s":""}.`,
      category: "signing", teamId: playerTeam.id, week: season.currentWeek,
    };
    const newTeams = season.teams.map(t => t.id === season.playerTeamId
      ? { ...t, roster: [...t.roster, signedPlayer], capSpace: t.capSpace - salary }
      : t);
    const newFAs = season.freeAgents.filter(p => p.id !== playerId);
    await save({ ...season, teams: newTeams, freeAgents: newFAs, news: [addNewsItem(newsItem), ...season.news].slice(0, 50) });
  }, [season, save, getPlayerTeam]);

  const releasePlayer = useCallback(async (playerId: string) => {
    if (!season) return;
    const playerTeam = getPlayerTeam();
    if (!playerTeam) return;
    const player = playerTeam.roster.find(p => p.id === playerId);
    if (!player) return;
    const deadCap = player.deadCap || 0;
    const releasedPlayer: Player = { ...player, status: "Free Agent", depthOrder: 3, contractYears: 0, salary: genSalary(player.overall, player.position) };
    const newsItem: Omit<NewsItem,"id"|"timestamp"> = {
      headline: `${playerTeam.abbreviation} release ${player.name}`,
      body: `${player.name} (${player.position}, ${player.overall} OVR) cut. Dead cap hit: $${deadCap.toFixed(1)}M.`,
      category: "contract", teamId: playerTeam.id, week: season.currentWeek,
    };
    const newTeams = season.teams.map(t => t.id === season.playerTeamId
      ? { ...t, roster: t.roster.filter(p => p.id !== playerId), capSpace: t.capSpace + player.salary - deadCap }
      : t);
    const newFAs = [...season.freeAgents, releasedPlayer];
    await save({ ...season, teams: newTeams, freeAgents: newFAs, news: [addNewsItem(newsItem), ...season.news].slice(0, 50) });
  }, [season, save, getPlayerTeam]);

  const restructureContract = useCallback(async (playerId: string) => {
    if (!season) return;
    const playerTeam = getPlayerTeam();
    if (!playerTeam) return;
    const player = playerTeam.roster.find(p => p.id === playerId);
    if (!player || player.contractYears < 2) return;
    // Convert 30% of salary to signing bonus (spread over remaining years)
    const converted = Math.round(player.salary * 0.30 * 10) / 10;
    const newSalary = Math.round((player.salary - converted) * 10) / 10;
    const newDeadCap = Math.round((player.deadCap + converted) * 10) / 10;
    const savedCap = Math.round(converted * 0.7 * 10) / 10;
    const restructured: Player = { ...player, salary: newSalary, deadCap: newDeadCap, signingBonus: player.signingBonus + converted };
    const newsItem: Omit<NewsItem,"id"|"timestamp"> = {
      headline: `${player.name} restructures contract, ${playerTeam.abbreviation} save $${savedCap}M`,
      body: `${player.name} takes pay cut to help ${playerTeam.city} create cap space. Dead cap increases by $${converted.toFixed(1)}M.`,
      category: "contract", teamId: playerTeam.id, week: season.currentWeek,
    };
    const newTeams = season.teams.map(t => t.id === season.playerTeamId
      ? { ...t, roster: t.roster.map(p => p.id === playerId ? restructured : p), capSpace: t.capSpace + savedCap }
      : t);
    await save({ ...season, teams: newTeams, news: [addNewsItem(newsItem), ...season.news].slice(0, 50) });
  }, [season, save, getPlayerTeam]);

  const updateDepthOrder = useCallback(async (position: NFLPosition, orderedIds: string[]) => {
    if (!season) return;
    const newTeams = season.teams.map(t => {
      if (t.id !== season.playerTeamId) return t;
      const newRoster = t.roster.map(p => {
        if (p.position !== position) return p;
        const idx = orderedIds.indexOf(p.id);
        return idx === -1 ? p : { ...p, depthOrder: idx + 1 };
      });
      return { ...t, roster: newRoster };
    });
    await save({ ...season, teams: newTeams });
  }, [season, save]);

  const updateGamePlan = useCallback(async (plan: GamePlan) => {
    if (!season) return;
    const newTeams = season.teams.map(t => t.id === season.playerTeamId ? { ...t, gamePlan: plan } : t);
    await save({ ...season, teams: newTeams });
  }, [season, save]);

  const updateFormation = useCallback(async (formation: Formation) => {
    if (!season) return;
    const newTeams = season.teams.map(t => t.id === season.playerTeamId ? { ...t, defenseFormation: formation } : t);
    await save({ ...season, teams: newTeams });
  }, [season, save]);

  const updateOffenseScheme = useCallback(async (scheme: OffenseScheme) => {
    if (!season) return;
    const newTeams = season.teams.map(t => t.id === season.playerTeamId ? { ...t, offenseScheme: scheme } : t);
    await save({ ...season, teams: newTeams });
  }, [season, save]);

  // ── Draft ──────────────────────────────────────────────────────────────────

  const unlockScouting = useCallback(async (prospectId: string) => {
    if (!season) return;
    const newProspects = season.draftProspects.map(p => p.id === prospectId ? { ...p, scoutingUnlocked: true } : p);
    await save({ ...season, draftProspects: newProspects });
  }, [season, save]);

  const userDraftPick = useCallback(async (prospectId: string) => {
    if (!season) return;
    const { draftState, draftProspects, teams } = season;
    if (!draftState.isUserTurn || draftState.isComplete) return;
    const prospect = draftProspects.find(p => p.id === prospectId);
    if (!prospect || prospect.isPickedUp) return;
    const playerTeam = getPlayerTeam()!;

    const completedPick: CompletedDraftPick = {
      round: draftState.currentRound,
      pickInRound: draftState.currentPickInRound,
      overallPick: draftState.overallPick,
      teamId: season.playerTeamId,
      prospectId,
      prospectName: prospect.name,
      prospectPosition: prospect.position,
      prospectCollege: prospect.college,
      prospectGrade: prospect.overallGrade,
    };

    // Convert prospect to player — preserve combine athleticism
    const grade = prospect.overallGrade;
    // OVR: rookies arrive slightly below their ceiling (grade * 0.92 ≈ first-year starter level)
    const rookieOvr = clamp(Math.round(grade * 0.92 - 2 + irng(-3, 3)), 58, 94);
    const { spd, str, agi, acc } = combineToAthletics(prospect.combine, grade);
    const newPlayer: Player = {
      id: uid(),
      name: prospect.name,
      position: prospect.position,
      age: 21 + irng(0, 2),
      overall: rookieOvr,
      potential: prospect.potential,
      speed: spd,                                           // ← from 40-yard dash
      strength: str,                                        // ← from bench press
      awareness: Math.round(gaussian(grade - 12, 5, 45, 82)),  // rookies lower awareness
      specific: Math.round(gaussian(grade - 4, 4, 50, 90)),
      posRatings: genPosRatingsFromProspect(prospect.position, rookieOvr, spd, str, agi, acc),
      ethnicityCode: genEthnicity(),
      faceVariant: irng(0, 3) as 0|1|2|3,
      yearsExperience: 0,
      contractYears: 4,
      salary: draftState.currentRound === 1 ? rng2(2.5, 8) : rng2(0.9, 3),
      signingBonus: draftState.currentRound === 1 ? rng2(1.5, 5) : rng2(0.3, 1.5),
      guaranteedMoney: draftState.currentRound === 1 ? rng2(3, 10) : rng2(0.5, 2.5),
      deadCap: 0,
      status: "Backup",
      depthOrder: 3,
      stats: emptyStats(),
      careerStats: [],
      fatigue: 0,
      morale: 90,
      faInterestLevel: 5,
      developmentTrait: genDevTrait(rookieOvr, 21),
      college: prospect.college,
      jerseyNumber: genJerseyNumber(prospect.position, irng(0, 99)),
      draftYear: season.year,
      draftRound: draftState.currentRound,
      draftPick: draftState.overallPick,
      draftTeamId: season.playerTeamId,
    };

    const newsItem: Omit<NewsItem,"id"|"timestamp"> = {
      headline: `${playerTeam.abbreviation} select ${prospect.name} with pick #${draftState.overallPick}`,
      body: `${prospect.name} (${prospect.position}, ${prospect.college}) — Round ${draftState.currentRound}, Pick ${draftState.currentPickInRound}. Pre-draft grade: ${prospect.overallGrade}.`,
      category: "draft", teamId: season.playerTeamId, week: season.currentWeek,
    };

    const newTeams = teams.map(t => t.id === season.playerTeamId ? { ...t, roster: [...t.roster, newPlayer] } : t);
    const newProspects = draftProspects.map(p => p.id === prospectId ? { ...p, isPickedUp: true, pickedByTeamId: season.playerTeamId, pickedAtRound: draftState.currentRound, pickedAtPick: draftState.overallPick } : p);
    const newDraftState = advanceDraftState(draftState, completedPick, teams);

    await save({ ...season, teams: newTeams, draftProspects: newProspects, draftState: newDraftState, news: [addNewsItem(newsItem), ...season.news].slice(0, 50) });
  }, [season, save, getPlayerTeam]);

  const simulateDraftPick = useCallback(async () => {
    if (!season) return;
    const { draftState, draftProspects, teams } = season;
    if (draftState.isUserTurn || draftState.isComplete) return;
    const available = draftProspects.filter(p => !p.isPickedUp);
    const prospect = simulateAIPick(draftState.currentTeamId, available, draftState.currentRound);
    if (!prospect) return;

    const completedPick: CompletedDraftPick = {
      round: draftState.currentRound,
      pickInRound: draftState.currentPickInRound,
      overallPick: draftState.overallPick,
      teamId: draftState.currentTeamId,
      prospectId: prospect.id,
      prospectName: prospect.name,
      prospectPosition: prospect.position,
      prospectCollege: prospect.college,
      prospectGrade: prospect.overallGrade,
    };

    const newProspects = draftProspects.map(p => p.id === prospect.id ? { ...p, isPickedUp: true, pickedByTeamId: draftState.currentTeamId, pickedAtRound: draftState.currentRound, pickedAtPick: draftState.overallPick } : p);
    const newDraftState = advanceDraftState(draftState, completedPick, teams);
    await save({ ...season, draftProspects: newProspects, draftState: newDraftState });
  }, [season, save]);

  const simPicksUntilUserTurn = useCallback(async () => {
    if (!season) return;
    const { teams } = season;
    let state = season.draftState;
    let prospects = season.draftProspects;
    if (state.isComplete || state.isUserTurn) return;

    let iterations = 0;
    while (!state.isUserTurn && !state.isComplete && iterations < 300) {
      iterations++;
      const available = prospects.filter(p => !p.isPickedUp);
      const prospect = simulateAIPick(state.currentTeamId, available, state.currentRound);
      if (!prospect) break;

      const completedPick: CompletedDraftPick = {
        round: state.currentRound,
        pickInRound: state.currentPickInRound,
        overallPick: state.overallPick,
        teamId: state.currentTeamId,
        prospectId: prospect.id,
        prospectName: prospect.name,
        prospectPosition: prospect.position,
        prospectCollege: prospect.college,
        prospectGrade: prospect.overallGrade,
      };

      prospects = prospects.map(p =>
        p.id === prospect.id
          ? { ...p, isPickedUp: true, pickedByTeamId: state.currentTeamId, pickedAtRound: state.currentRound, pickedAtPick: state.overallPick }
          : p
      );
      state = advanceDraftState(state, completedPick, teams);
    }

    await save({ ...season, draftProspects: prospects, draftState: state });
  }, [season, save]);

  function advanceDraftState(state: DraftState, completedPick: CompletedDraftPick, teams: NFLTeam[]): DraftState {
    const nextOverall = state.overallPick + 1;
    const nextPickInRound = state.currentPickInRound + 1;
    const totalRounds = 7;
    const picksPerRound = state.draftOrder.length;

    let nextRound = state.currentRound;
    let nextPickInRoundFinal = nextPickInRound;

    if (nextPickInRound > picksPerRound) {
      nextRound++;
      nextPickInRoundFinal = 1;
    }

    const isComplete = nextRound > totalRounds;
    const nextTeamId = isComplete ? state.draftOrder[0] : state.draftOrder[(nextPickInRoundFinal - 1) % picksPerRound];

    return {
      ...state,
      currentRound: nextRound,
      currentPickInRound: nextPickInRoundFinal,
      overallPick: nextOverall,
      currentTeamId: nextTeamId,
      isUserTurn: !isComplete && nextTeamId === teams.find(t => t.id === season?.playerTeamId)?.id,
      isComplete,
      completedPicks: [...state.completedPicks, completedPick],
    };
  }

  // ── Trades ─────────────────────────────────────────────────────────────────

  const proposeTrade = useCallback(async (offer: Omit<TradeOffer,"id"|"status"|"aiValue"|"expiresWeek">): Promise<{ aiDecision: "accepted"|"rejected"|"considering"; aiValue: number }> => {
    if (!season) return { aiDecision: "rejected", aiValue: 0 };

    const aiValue   = evaluateTradeValue(offer, season);
    const offerId   = uid();

    // AI decision — aiValue is from USER perspective:
    //   positive = good for user = bad for AI → AI more likely to reject
    //   negative = bad for user = good for AI → AI more likely to accept
    const aiPov = -aiValue; // positive means AI benefits, negative = user benefits
    const r = Math.random();
    let aiDecision: "accepted" | "rejected" | "considering";
    // aiPov > 0  → AI wins the trade   (accept eagerly)
    // aiPov 0..-15 → roughly even / user ≤15 pts up (usually accept)
    // aiPov -15..-35 → user clearly winning (lean reject / considering)
    // aiPov < -35 → user big winner (almost always reject)
    if      (aiPov > 50)   aiDecision = r < 0.95 ? "accepted"    : "considering";
    else if (aiPov > 15)   aiDecision = r < 0.82 ? "accepted"    : (r < 0.92 ? "considering" : "rejected");
    else if (aiPov > -15)  aiDecision = r < 0.65 ? "accepted"    : (r < 0.82 ? "considering" : "rejected");
    else if (aiPov > -35)  aiDecision = r < 0.18 ? "considering" : "rejected";
    else                   aiDecision = r < 0.04 ? "considering" : "rejected";

    const newOffer: TradeOffer = {
      ...offer, id: offerId,
      status:      aiDecision === "considering" ? "pending"  : aiDecision,
      aiValue,
      expiresWeek: season.currentWeek + 2,
    };

    if (aiDecision === "accepted") {
      // Execute trade immediately
      let newTeams = [...season.teams];
      const fromIdx = newTeams.findIndex(t => t.id === offer.fromTeamId);
      const toIdx   = newTeams.findIndex(t => t.id === offer.toTeamId);
      if (fromIdx !== -1 && toIdx !== -1) {
        const fromPlayers = newTeams[fromIdx].roster.filter(p => offer.offeringPlayerIds.includes(p.id));
        const toPlayers   = newTeams[toIdx].roster.filter(p => offer.receivingPlayerIds.includes(p.id));
        newTeams[fromIdx] = { ...newTeams[fromIdx], roster: [...newTeams[fromIdx].roster.filter(p => !offer.offeringPlayerIds.includes(p.id)), ...toPlayers] };
        newTeams[toIdx]   = { ...newTeams[toIdx],   roster: [...newTeams[toIdx].roster.filter(p => !offer.receivingPlayerIds.includes(p.id)), ...fromPlayers] };
        if (offer.offeringPickIds.length > 0 || offer.receivingPickIds.length > 0) {
          newTeams = newTeams.map(t => ({
            ...t,
            draftPicks: t.draftPicks.map(pk => {
              if (offer.offeringPickIds.includes(pk.id))   return { ...pk, ownedByTeamId: offer.toTeamId };
              if (offer.receivingPickIds.includes(pk.id))  return { ...pk, ownedByTeamId: offer.fromTeamId };
              return pk;
            }),
          }));
        }
        const fromAbb = newTeams[fromIdx].abbreviation;
        const toAbb   = newTeams[toIdx].abbreviation;
        const newsItem: Omit<NewsItem,"id"|"timestamp"> = {
          headline: `TRADE: ${fromAbb} and ${toAbb} complete a deal`,
          body: `${fromAbb} sends ${fromPlayers.map(p=>p.name).join(", ")||"picks"} to ${toAbb} for ${toPlayers.map(p=>p.name).join(", ")||"picks"}.`,
          category: "trade", teamId: season.playerTeamId, week: season.currentWeek,
        };
        await save({ ...season, teams: newTeams, tradeOffers: [...season.tradeOffers, newOffer], news: [addNewsItem(newsItem), ...season.news].slice(0, 50) });
      } else {
        await save({ ...season, tradeOffers: [...season.tradeOffers, newOffer] });
      }
    } else {
      await save({ ...season, tradeOffers: [...season.tradeOffers, newOffer] });
    }

    return { aiDecision, aiValue };
  }, [season, save]);

  const respondToTrade = useCallback(async (offerId: string, accept: boolean) => {
    if (!season) return;
    const offer = season.tradeOffers.find(o => o.id === offerId);
    if (!offer) return;

    if (!accept) {
      const newOffers = season.tradeOffers.map(o => o.id === offerId ? { ...o, status: "rejected" as const } : o);
      await save({ ...season, tradeOffers: newOffers });
      return;
    }

    // Execute trade
    let newTeams = [...season.teams];
    const fromTeamIdx = newTeams.findIndex(t => t.id === offer.fromTeamId);
    const toTeamIdx = newTeams.findIndex(t => t.id === offer.toTeamId);
    if (fromTeamIdx === -1 || toTeamIdx === -1) return;

    // Move players
    const fromOffPlayers = newTeams[fromTeamIdx].roster.filter(p => offer.offeringPlayerIds.includes(p.id));
    const toOffPlayers = newTeams[toTeamIdx].roster.filter(p => offer.receivingPlayerIds.includes(p.id));
    newTeams[fromTeamIdx] = { ...newTeams[fromTeamIdx], roster: [...newTeams[fromTeamIdx].roster.filter(p => !offer.offeringPlayerIds.includes(p.id)), ...toOffPlayers] };
    newTeams[toTeamIdx] = { ...newTeams[toTeamIdx], roster: [...newTeams[toTeamIdx].roster.filter(p => !offer.receivingPlayerIds.includes(p.id)), ...fromOffPlayers] };

    // Move draft picks — transfer ownership between teams
    if (offer.offeringPickIds.length > 0 || offer.receivingPickIds.length > 0) {
      newTeams = newTeams.map(t => ({
        ...t,
        draftPicks: t.draftPicks.map(pk => {
          if (offer.offeringPickIds.includes(pk.id)) return { ...pk, ownedByTeamId: offer.toTeamId };
          if (offer.receivingPickIds.includes(pk.id)) return { ...pk, ownedByTeamId: offer.fromTeamId };
          return pk;
        }),
      }));
    }

    const fromTeamName = newTeams[fromTeamIdx].abbreviation;
    const toTeamName = newTeams[toTeamIdx].abbreviation;
    const newsItem: Omit<NewsItem,"id"|"timestamp"> = {
      headline: `TRADE: ${fromTeamName} and ${toTeamName} swap players`,
      body: `${fromTeamName} sends ${fromOffPlayers.map(p=>p.name).join(", ")||"picks"} to ${toTeamName} for ${toOffPlayers.map(p=>p.name).join(", ")||"picks"}.`,
      category: "trade", teamId: season.playerTeamId, week: season.currentWeek,
    };

    const newOffers = season.tradeOffers.map(o => o.id === offerId ? { ...o, status: "accepted" as const } : o);
    await save({ ...season, teams: newTeams, tradeOffers: newOffers, news: [addNewsItem(newsItem), ...season.news].slice(0, 50) });
  }, [season, save]);

  function evaluateTradeValue(offer: Omit<TradeOffer,"id"|"status"|"aiValue"|"expiresWeek">, s: Season): number {
    if (!s) return 0;
    const PICK_ROUND_VALUES: Record<number, number> = { 1:150, 2:100, 3:70, 4:50, 5:35, 6:25, 7:15 };
    const allPlayers = s.teams.flatMap(t => t.roster);
    const allPicks   = s.teams.flatMap(t => t.draftPicks);
    const scoreSet = (playerIds: string[], pickIds: string[]) =>
      playerIds.reduce((sum, id) => {
        const p = allPlayers.find(pl => pl.id === id);
        return sum + (p ? p.overall * 1.2 + p.potential * 0.5 : 0);
      }, 0) +
      pickIds.reduce((sum, id) => {
        const pk = allPicks.find(p => p.id === id);
        return sum + (pk ? (PICK_ROUND_VALUES[pk.round] ?? 15) : 0);
      }, 0);
    return Math.round(scoreSet(offer.receivingPlayerIds, offer.receivingPickIds) - scoreSet(offer.offeringPlayerIds, offer.offeringPickIds));
  }

  // ── Offseason ──────────────────────────────────────────────────────────────

  const advancePhase = useCallback(async () => {
    if (!season) return;
    const phases: Season["phase"][] = ["regular","playoffs","offseason","freeAgency","draft","preseason","regular"];
    const currentIdx = phases.indexOf(season.phase);
    const next = phases[currentIdx + 1] ?? "regular";

    // When starting a new regular season from preseason
    if (next === "regular" && season.phase === "preseason") {
      const archiveYear = season.year;
      const newTeams = season.teams.map(t => ({
        ...t,
        wins: 0, losses: 0, ties: 0,
        pointsFor: 0, pointsAgainst: 0,
        // Archive this season's stats into each player's careerStats, then reset
        roster: t.roster.map(p => ({
          ...p,
          careerStats: [...p.careerStats, { ...p.stats, season: archiveYear }],
          stats: emptyStats(archiveYear + 1),
        })),
      }));
      const { games: newGames, byeWeeks: newBye } = generateSchedule(newTeams);
      const newDraftProspects = generateDraftClass(season.year + 1, 252);
      const newDraftState = initDraftState(newTeams.map(t => t.id), season.playerTeamId);
      const nextYearSeason: Season = {
        ...season,
        year: season.year + 1,
        phase: "regular",
        currentWeek: 1,
        totalWeeks: 18,
        teams: newTeams,
        games: newGames,
        byeWeeks: newBye,
        isPlayoffs: false,
        playoffSeeds: undefined,
        playoffRound: undefined,
        vflBowlWinnerId: undefined,
        draftProspects: newDraftProspects,
        draftState: newDraftState,
        freeAgents: generateFreeAgents(60),
        news: [{
          id: uid(), timestamp: Date.now(),
          headline: `VFL ${season.year + 1} Season Kicks Off!`,
          body: "A new year, new hopes. All 32 teams chase the VFL Bowl.",
          category: "general", week: 1,
        }],
      };
      await save(nextYearSeason);
      return;
    }

    await save({ ...season, phase: next });
  }, [season, save]);

  // ── News ───────────────────────────────────────────────────────────────────

  function addNewsItem(item: Omit<NewsItem,"id"|"timestamp">): NewsItem {
    return { ...item, id: uid(), timestamp: Date.now() };
  }

  const addNews = useCallback((item: Omit<NewsItem,"id"|"timestamp">) => {
    if (!season) return;
    const newItem = addNewsItem(item);
    setSeason(s => s ? { ...s, news: [newItem, ...s.news].slice(0, 50) } : s);
  }, [season]);

  // ── Reset ──────────────────────────────────────────────────────────────────

  const resetSeason = useCallback(async () => {
    const s = initSeason(membership?.teamId);
    if (SUPABASE_ENABLED && membership?.franchiseId) {
      await saveToSupabase(membership.franchiseId, s);
    } else {
      try { await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(s)); } catch {}
    }
    setSeason(s);
  }, [membership]);

  const toggleCoGMMode = useCallback(async () => {
    setSeason(s => {
      if (!s) return s;
      const updated = { ...s, coGMMode: !s.coGMMode };
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  return (
    <NFLContext.Provider value={{
      season, isLoading, isSyncing, syncError,
      getTeam, getPlayerTeam, getStandings, getWeekGames,
      signFreeAgent, releasePlayer, restructureContract, updateDepthOrder,
      updateGamePlan, updateFormation, updateOffenseScheme,
      simulateGame, simulateWeek, simulateSeason,
      userDraftPick, simulateDraftPick, simPicksUntilUserTurn, unlockScouting,
      proposeTrade, respondToTrade,
      advancePhase, addNews, resetSeason,
      teamCustomization, saveCustomization, setGameDayUniform,
      toggleCoGMMode,
    }}>
      {children}
    </NFLContext.Provider>
  );
}
