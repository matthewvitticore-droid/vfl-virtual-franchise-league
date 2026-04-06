// ─── Core Enums & Primitives ──────────────────────────────────────────────────

export type Role = "GM" | "Coach" | "Scout";
export type Conference = "Ironclad" | "Gridiron";
export type Division = "North" | "South" | "East" | "West";
export type NFLPosition = "QB" | "RB" | "WR" | "TE" | "OL" | "DE" | "DT" | "LB" | "CB" | "S" | "K" | "P";
export type ContractStatus = "Starter" | "Backup" | "Practice Squad" | "Free Agent";
export type GamePlan = "aggressive" | "balanced" | "conservative";
export type Formation = "4-3" | "3-4" | "nickel" | "dime";
export type OffenseScheme = "spread" | "pro-set" | "run-heavy" | "air-raid";
export type PlayType = "run" | "pass" | "punt" | "fieldGoal" | "kickoff" | "extraPoint" | "spike" | "kneel";
export type PlayResult = "gain" | "loss" | "touchdown" | "interception" | "fumble" | "incomplete" | "sack" | "fieldGoalGood" | "fieldGoalMiss" | "punt" | "spike" | "kneel" | "safety";
export type GamePhase = "pregame" | "q1" | "q2" | "halftime" | "q3" | "q4" | "overtime" | "final";
export type SeasonPhase = "preseason" | "regular" | "playoffs" | "offseason" | "freeAgency" | "draft";
export type PlayoffRound = "wildCard" | "divisional" | "conference" | "vflBowl";

export interface PlayoffSeed {
  teamId: string;
  seed: number;
  conference: Conference;
  isDivisionWinner: boolean;
}
export type WeatherCondition = "Clear" | "Cloudy" | "Wind" | "Rain" | "Snow" | "Dome";
export type InjurySeverity = "DTD" | "IR" | "Season";
export type InjuryLocation = "Knee" | "Hamstring" | "Shoulder" | "Ankle" | "Concussion" | "Back" | "Foot" | "Elbow" | "Hip" | "Wrist" | "Ribs" | "Quad" | "Groin";
export type DevelopmentTrait = "X-Factor" | "Superstar" | "Star" | "Normal" | "Late Bloomer";
export type NewsCategory = "injury" | "trade" | "signing" | "draft" | "game" | "general" | "contract" | "milestone";
export type DriveResultType = "TD" | "FG" | "Punt" | "Turnover" | "Turnover on Downs" | "Half" | "End of Game" | "Safety";

// ─── Injuries ─────────────────────────────────────────────────────────────────

export interface PlayerInjury {
  location: InjuryLocation;
  severity: InjurySeverity;
  weeksRemaining: number;
  description: string;
}

// ─── Combine Measurables ──────────────────────────────────────────────────────

export interface CombineMeasurables {
  fortyYardDash: number;   // seconds e.g. 4.38
  tenYardSplit: number;    // seconds e.g. 1.52
  benchPress: number;      // reps at 225 lbs e.g. 24
  verticalJump: number;    // inches e.g. 38.5
  broadJump: number;       // inches e.g. 130
  shuttleRun: number;      // seconds (20-yd shuttle) e.g. 4.12
  threeCone: number;       // seconds e.g. 6.87
  height: number;          // total inches e.g. 74 = 6'2"
  weight: number;          // lbs e.g. 225
  armLength: number;       // inches e.g. 32.5
  handSize: number;        // inches e.g. 9.5
  didNotParticipate: boolean;
}

// ─── College Stats ────────────────────────────────────────────────────────────

export interface ProspectCollegeStats {
  gamesPlayed?: number;
  // Passing (QB)
  completionPct?: number;
  passingYards?: number;
  passingTDs?: number;
  interceptions?: number;
  // Rushing (RB, QB scrambler)
  rushingYards?: number;
  rushingTDs?: number;
  yardsPerCarry?: number;
  // Receiving (WR, TE, RB)
  receptions?: number;
  receivingYards?: number;
  receivingTDs?: number;
  yardsPerCatch?: number;
  // Defense (DE, DT, LB, CB, S)
  tackles?: number;
  sacks?: number;
  interceptionsDef?: number;
  passDeflections?: number;
  forcedFumbles?: number;
  // OL
  gamesStarted?: number;
}

// ─── Position-specific ratings ────────────────────────────────────────────────

export interface PosRatings {
  // QB
  throwPower: number;
  throwAccShort: number;
  throwAccMid: number;
  throwAccDeep: number;
  throwOnRun: number;
  // RB/WR/TE — receiving/ball-carrying
  agility: number;
  acceleration: number;
  ballCarrierVision: number;
  breakTackle: number;
  carryRating: number;  // ball security when running (RB/QB/WR)
  catching: number;
  routeRunning: number;
  catchInTraffic: number;
  release: number;
  // OL
  passBlock: number;
  runBlock: number;
  // DL / LB
  powerMoves: number;
  finesseMoves: number;
  blockShedding: number;
  tackle: number;
  pursuit: number;
  // Coverage (CB/S/LB)
  manCoverage: number;
  zoneCoverage: number;
  press: number;
  // General
  mobility: number;
  kickPower: number;
  kickAccuracy: number;
}

// Which ratings to display per position (ordered)
export const POS_RATING_KEYS: Record<NFLPosition, (keyof PosRatings)[]> = {
  QB:  ["throwPower","throwAccShort","throwAccMid","throwAccDeep","mobility","carryRating"],
  RB:  ["acceleration","agility","ballCarrierVision","breakTackle","catching","carryRating"],
  WR:  ["acceleration","catching","routeRunning","catchInTraffic","release","carryRating"],
  TE:  ["catching","catchInTraffic","runBlock","release","routeRunning","blockShedding"],
  OL:  ["passBlock","runBlock","blockShedding","tackle","powerMoves","agility"],
  DE:  ["powerMoves","finesseMoves","blockShedding","tackle","pursuit","agility"],
  DT:  ["powerMoves","blockShedding","tackle","pursuit","finesseMoves","agility"],
  LB:  ["tackle","pursuit","manCoverage","zoneCoverage","powerMoves","blockShedding"],
  CB:  ["manCoverage","zoneCoverage","press","catching","acceleration","agility"],
  S:   ["zoneCoverage","manCoverage","tackle","pursuit","press","catching"],
  K:   ["kickPower","kickAccuracy","agility","acceleration","tackle","pursuit"],
  P:   ["kickPower","kickAccuracy","agility","acceleration","tackle","pursuit"],
};

export const POS_RATING_LABELS: Record<keyof PosRatings, string> = {
  throwPower: "THP", throwAccShort: "TAS", throwAccMid: "TAM", throwAccDeep: "TAD",
  throwOnRun: "TOR", agility: "AGI", acceleration: "ACC", ballCarrierVision: "BCV",
  breakTackle: "BTK", carryRating: "CAR", catching: "CTH", routeRunning: "RTE",
  catchInTraffic: "CIT", release: "REL", passBlock: "PBK", runBlock: "RBK",
  powerMoves: "PMV", finesseMoves: "FMV", blockShedding: "BSH", tackle: "TAK",
  pursuit: "PUR", manCoverage: "MCV", zoneCoverage: "ZCV", press: "PRE",
  mobility: "MOB", kickPower: "KPW", kickAccuracy: "KAC",
};

// ─── Player face / ethnicity ──────────────────────────────────────────────────

// 0=Black 1=White 2=Hispanic 3=Polynesian 4=Mixed
export type EthnicityCode = 0 | 1 | 2 | 3 | 4;
// 0–3 face variant for visual variety
export type FaceVariant = 0 | 1 | 2 | 3;

// ─── Player ───────────────────────────────────────────────────────────────────

export interface PlayerSeasonStats {
  season?: number;
  gamesPlayed: number;
  passingYards: number; passingTDs: number; interceptions: number;
  completions: number; attempts: number; qbRating: number;
  rushingYards: number; rushingTDs: number; carries: number;
  receivingYards: number; receivingTDs: number; receptions: number; targets: number;
  tackles: number; sacks: number; forcedFumbles: number; defensiveINTs: number;
  passDeflections: number; yardsPerCarry: number; yardsPerCatch: number;
  fieldGoalsMade: number; fieldGoalsAttempted: number; puntsAverage: number;
}

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
  posRatings: PosRatings;
  ethnicityCode: EthnicityCode;
  faceVariant: FaceVariant;
  yearsExperience: number;
  contractYears: number;
  salary: number;
  signingBonus: number;
  guaranteedMoney: number;
  deadCap: number;
  status: ContractStatus;
  depthOrder: number;
  stats: PlayerSeasonStats;
  careerStats: PlayerSeasonStats[];
  injury?: PlayerInjury;
  fatigue: number;
  morale: number;
  faInterestLevel: number;
  developmentTrait: DevelopmentTrait;
  college?: string;
  jerseyNumber?: number;
  draftYear?: number;
  draftRound?: number;
  draftPick?: number;
  draftTeamId?: string;
}

// ─── Draft Prospect ───────────────────────────────────────────────────────────

export interface DraftProspect {
  id: string;
  name: string;
  position: NFLPosition;
  college: string;
  overallGrade: number;         // 1–100 pre-draft grade
  potential: number;
  projectedRound: number;       // 1–7
  projectedPick: number;        // within round
  grade: "1st" | "2nd" | "3rd" | "4th" | "5th" | "6th" | "7th" | "UDFA";
  archetype: string;
  developmentTrait: DevelopmentTrait;
  combine: CombineMeasurables;
  collegeStats: ProspectCollegeStats;
  accolades: string[];          // e.g. ["Heisman Winner","All-American","Biletnikoff Award"]
  strengths: string[];
  weaknesses: string[];
  isPickedUp: boolean;
  pickedByTeamId?: string;
  pickedAtRound?: number;
  pickedAtPick?: number;
  scoutingUnlocked: boolean;
}

// ─── Draft State ──────────────────────────────────────────────────────────────

export interface CompletedDraftPick {
  round: number;
  pickInRound: number;
  overallPick: number;
  teamId: string;
  prospectId: string;
  prospectName: string;
  prospectPosition: NFLPosition;
  prospectCollege: string;
  prospectGrade: number;
}

export interface DraftState {
  currentRound: number;
  currentPickInRound: number;
  overallPick: number;
  currentTeamId: string;
  isUserTurn: boolean;
  isComplete: boolean;
  draftOrder: string[];           // team IDs for picks 1–32
  completedPicks: CompletedDraftPick[];
}

// ─── Draft Pick (tradeable asset) ─────────────────────────────────────────────

export interface DraftPick {
  id: string;
  round: number;
  pick: number;     // projected pick within round
  year: number;
  fromTeam: string; // original team
  ownedByTeamId: string;
}

// ─── Trade System ─────────────────────────────────────────────────────────────

export interface TradeOffer {
  id: string;
  fromTeamId: string;
  toTeamId: string;
  offeringPlayerIds: string[];
  offeringPickIds: string[];
  receivingPlayerIds: string[];
  receivingPickIds: string[];
  status: "pending" | "accepted" | "rejected";
  aiValue: number;      // positive = fair/good for user
  expiresWeek: number;
}

// ─── News Feed ────────────────────────────────────────────────────────────────

export interface NewsItem {
  id: string;
  headline: string;
  body: string;
  category: NewsCategory;
  teamId?: string;
  timestamp: number;
  week: number;
}

// ─── Weather ─────────────────────────────────────────────────────────────────

export interface GameWeather {
  condition: WeatherCondition;
  temperature: number;
  windSpeed: number;
  windDirection: string;
}

// ─── Drive Chart ──────────────────────────────────────────────────────────────

export interface DriveEntry {
  id: string;
  teamId: string;
  quarter: number;
  startTime: string;
  startYardLine: number;
  plays: number;
  yards: number;
  result: DriveResultType;
}

// ─── Game Types ───────────────────────────────────────────────────────────────

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
  description: string;
  score: { home: number; away: number };
  isScoring?: boolean;
  isTurnover?: boolean;
  isInjury?: boolean;
  injuredPlayerName?: string;
  momentum: number; // -10 to 10 (positive = home team momentum)
  driveId: string;
}

export interface TeamGameStats {
  passingYards: number;
  rushingYards: number;
  totalYards: number;
  turnovers: number;
  thirdDownConversions: number;
  thirdDownAttempts: number;
  sacks: number;
  firstDowns: number;
  timeOfPossession: number; // seconds
  penalties: number;
  penaltyYards: number;
  redZoneAttempts: number;
  redZoneTDs: number;
}

export interface NFLGame {
  id: string;
  week: number;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  status: "upcoming" | "simulating" | "final";
  gameDayUniform?: "home" | "away" | "alternate";
  plays: PlayByPlayEvent[];
  drives: DriveEntry[];
  phase: GamePhase;
  stats: { home: TeamGameStats; away: TeamGameStats };
  playerStats?: Record<string, PlayerSeasonStats>;
  weather: GameWeather;
  location: string;
  isPlayoffGame?: boolean;
  playoffRound?: PlayoffRound;
  playoffConference?: Conference;
  playoffSeedHome?: number;
  playoffSeedAway?: number;
}

// ─── Team ─────────────────────────────────────────────────────────────────────

export interface NFLTeam {
  id: string;
  city: string;
  name: string;
  abbreviation: string;
  conference: Conference;
  division: Division;
  primaryColor: string;
  secondaryColor: string;
  stadium: string;
  overall: number;
  roster: Player[];
  capSpace: number;
  totalCap: number;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  draftPicks: DraftPick[];
  defenseFormation: Formation;
  offenseScheme: OffenseScheme;
  gamePlan: GamePlan;
  depthChart: Partial<Record<NFLPosition, string[]>>;
}

// ─── Season ───────────────────────────────────────────────────────────────────

export interface Season {
  year: number;
  currentWeek: number;
  totalWeeks: number;
  phase: SeasonPhase;
  games: NFLGame[];
  teams: NFLTeam[];
  playerTeamId: string;
  draftProspects: DraftProspect[];
  draftState: DraftState;
  freeAgents: Player[];
  isPlayoffs: boolean;
  news: NewsItem[];
  tradeOffers: TradeOffer[];
  coGMMode?: boolean;
  byeWeeks?: Record<string, number>;
  playoffSeeds?: PlayoffSeed[];
  playoffRound?: PlayoffRound;
  vflBowlWinnerId?: string;
}

// ─── Uniform & Customization ──────────────────────────────────────────────────

export type JerseyStyle         = "traditional" | "modern" | "retro" | "sleek";
export type NumberFont          = "block" | "serif" | "collegiate" | "futuristic" | "slab";
export type PantStripeStyle     = "none" | "single" | "double" | "triple" | "lightning";
export type HelmetLogoPlacement = "both" | "left" | "none";
export type LogoType            = "shield" | "animal" | "lettermark" | "helmet";
export type AnimalMascot        = "eagle" | "wolf" | "bear" | "bull" | "hawk" | "fox" | "raven" | "stallion" | "lion" | "tiger";
export type ShieldStyle         = 1 | 2 | 3 | 4;
export type LogoFontStyle       = "block" | "serif" | "script" | "stencil";

export interface UniformSet {
  helmetColor: string;
  helmetFacemaskColor?: string;
  helmetChinstrapColor?: string;
  helmetLogoColor?: string;
  helmetLogoPlacement: HelmetLogoPlacement;
  jerseyStyle: JerseyStyle;
  jerseyColor: string;
  jerseyAccentColor: string;
  numberFont: NumberFont;
  numberColor: string;
  numberOutlineColor: string;
  pantColor: string;
  pantStripeStyle: PantStripeStyle;
  pantStripeColor: string;
  sockColor: string;
  sockAccentColor: string;
}

export interface TeamLogo {
  type: LogoType;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  mascot?: AnimalMascot;
  mascotVariant?: number;
  letter?: string;
  fontStyle?: LogoFontStyle;
  shieldStyle?: ShieldStyle;
}

export interface TeamCustomization {
  teamId: string;
  city: string;
  name: string;
  abbreviation: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logo: TeamLogo;
  uniforms: {
    home: UniformSet;
    away: UniformSet;
    alternate: UniformSet;
  };
  featuredUniformSet?: "home" | "away" | "alternate";
}

// ─── Context Value ────────────────────────────────────────────────────────────

export interface NFLContextValue {
  season: Season | null;
  isLoading: boolean;
  isSyncing: boolean;
  syncError: string | null;
  // Queries
  getTeam: (teamId: string) => NFLTeam | undefined;
  getPlayerTeam: () => NFLTeam | undefined;
  getStandings: (conference?: Conference) => NFLTeam[];
  getWeekGames: (week: number) => NFLGame[];
  // Roster
  signFreeAgent: (playerId: string, contractYears: number, salary: number) => Promise<void>;
  releasePlayer: (playerId: string) => Promise<void>;
  restructureContract: (playerId: string) => Promise<void>;
  updateDepthOrder: (position: NFLPosition, orderedIds: string[]) => Promise<void>;
  // Game plan
  updateGamePlan: (plan: GamePlan) => Promise<void>;
  updateFormation: (formation: Formation) => Promise<void>;
  updateOffenseScheme: (scheme: OffenseScheme) => Promise<void>;
  // Simulation
  simulateGame: (gameId: string) => Promise<void>;
  simulateWeek: () => Promise<void>;
  simulateSeason: () => Promise<void>;
  // Draft
  userDraftPick: (prospectId: string) => Promise<void>;
  simulateDraftPick: () => Promise<void>;
  simPicksUntilUserTurn: () => Promise<void>;
  unlockScouting: (prospectId: string) => Promise<void>;
  // Trades
  proposeTrade: (offer: Omit<TradeOffer, "id" | "status" | "aiValue" | "expiresWeek">) => Promise<void>;
  respondToTrade: (offerId: string, accept: boolean) => Promise<void>;
  // Offseason
  advancePhase: () => Promise<void>;
  addNews: (item: Omit<NewsItem, "id" | "timestamp">) => void;
  resetSeason: () => Promise<void>;
  // Customization
  teamCustomization: TeamCustomization | null;
  saveCustomization: (data: TeamCustomization) => Promise<void>;
  setGameDayUniform: (gameId: string, uniform: "home" | "away" | "alternate") => Promise<void>;
  // Co-GM mode
  toggleCoGMMode: () => Promise<void>;
}
