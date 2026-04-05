import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type Position = "GK" | "DEF" | "MID" | "FWD";

export interface Player {
  id: string;
  name: string;
  position: Position;
  rating: number;
  age: number;
  pace: number;
  shooting: number;
  passing: number;
  defending: number;
  energy: number;
  goals: number;
  assists: number;
  appearances: number;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  color: string;
  rating: number;
  players: Player[];
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export type MatchStatus = "upcoming" | "completed" | "simulating";

export interface MatchEvent {
  minute: number;
  type: "goal" | "yellow_card" | "red_card" | "substitution" | "chance";
  team: "home" | "away";
  playerName: string;
  description: string;
}

export interface Match {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  status: MatchStatus;
  week: number;
  events: MatchEvent[];
}

export interface Season {
  currentWeek: number;
  totalWeeks: number;
  matches: Match[];
  teams: Team[];
  playerTeamId: string;
}

const POSITIONS: Position[] = ["GK", "DEF", "MID", "FWD"];
const FIRST_NAMES = [
  "Luca", "Marcus", "Diego", "James", "Kai", "Rafael", "Oliver", "Ethan",
  "Noah", "Seb", "Adrian", "Tomas", "Nikolas", "Fabian", "Leon", "Marco",
  "Bruno", "Erik", "Jordan", "Xavier",
];
const LAST_NAMES = [
  "Silva", "Torres", "Muller", "Kane", "Havertz", "Fernandez", "Smith", "Johnson",
  "Diaz", "Metz", "Schulz", "Becker", "Rossi", "Moreno", "Costa", "Oliveira",
  "Santos", "Lima", "Pereira", "Alves",
];

const TEAM_CONFIGS = [
  { name: "City United", shortName: "CIT", color: "#1f6feb", rating: 88 },
  { name: "Red Devils", shortName: "RED", color: "#f85149", rating: 85 },
  { name: "Royal FC", shortName: "ROY", color: "#6e40c9", rating: 82 },
  { name: "Golden Eagles", shortName: "GLD", color: "#e3b341", rating: 80 },
  { name: "Iron Lions", shortName: "IRN", color: "#8b949e", rating: 78 },
  { name: "Coastal Bay", shortName: "CBY", color: "#26a69a", rating: 76 },
  { name: "Northern Stars", shortName: "NST", color: "#039be5", rating: 74 },
  { name: "Phoenix Athletic", shortName: "PHX", color: "#ff7043", rating: 72 },
];

function randomName() {
  return `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`;
}

function randomStat(base: number, variance: number = 10) {
  return Math.min(99, Math.max(40, Math.round(base + (Math.random() - 0.5) * variance * 2)));
}

function generatePlayers(teamRating: number): Player[] {
  const players: Player[] = [];
  const positionCounts: Record<Position, number> = { GK: 2, DEF: 6, MID: 6, FWD: 4 };

  for (const pos of POSITIONS) {
    for (let i = 0; i < positionCounts[pos]; i++) {
      const baseRating = teamRating + (Math.random() - 0.5) * 20;
      players.push({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: randomName(),
        position: pos,
        rating: randomStat(baseRating, 5),
        age: Math.floor(18 + Math.random() * 15),
        pace: pos === "FWD" ? randomStat(baseRating + 5) : pos === "DEF" ? randomStat(baseRating - 5) : randomStat(baseRating),
        shooting: pos === "FWD" ? randomStat(baseRating + 8) : pos === "GK" ? randomStat(baseRating - 30) : randomStat(baseRating - 5),
        passing: pos === "MID" ? randomStat(baseRating + 5) : randomStat(baseRating),
        defending: pos === "DEF" || pos === "GK" ? randomStat(baseRating + 8) : randomStat(baseRating - 10),
        energy: 100,
        goals: 0,
        assists: 0,
        appearances: 0,
      });
    }
  }
  return players;
}

function generateFixtures(teams: Team[]): Match[] {
  const matches: Match[] = [];
  const ids = teams.map(t => t.id);
  let week = 1;

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      matches.push({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        homeTeamId: ids[i],
        awayTeamId: ids[j],
        homeScore: 0,
        awayScore: 0,
        status: "upcoming",
        week,
        events: [],
      });
      matches.push({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        homeTeamId: ids[j],
        awayTeamId: ids[i],
        homeScore: 0,
        awayScore: 0,
        status: "upcoming",
        week: week + ids.length - 1,
        events: [],
      });
      week = (week % (ids.length - 1)) + 1;
    }
  }

  return matches.sort((a, b) => a.week - b.week);
}

function initializeSeason(): Season {
  const teams: Team[] = TEAM_CONFIGS.map((cfg, i) => ({
    id: `team-${i}`,
    name: cfg.name,
    shortName: cfg.shortName,
    color: cfg.color,
    rating: cfg.rating,
    players: generatePlayers(cfg.rating),
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  }));

  const matches = generateFixtures(teams);
  const totalWeeks = Math.max(...matches.map(m => m.week));

  return {
    currentWeek: 1,
    totalWeeks,
    matches,
    teams,
    playerTeamId: teams[0].id,
  };
}

interface GameContextType {
  season: Season | null;
  isLoading: boolean;
  simulateMatch: (matchId: string) => Promise<Match>;
  simulateWeek: () => Promise<void>;
  getTeam: (id: string) => Team | undefined;
  getPlayerTeam: () => Team | undefined;
  getLeagueTable: () => Team[];
  getMatchesForWeek: (week: number) => Match[];
  resetSeason: () => void;
}

const GameContext = createContext<GameContextType | null>(null);

function simulateMatchLogic(home: Team, away: Team, week: number): { match: Partial<Match>; homeUpdate: Partial<Team>; awayUpdate: Partial<Team> } {
  const homePower = home.rating + (Math.random() - 0.3) * 20;
  const awayPower = away.rating + (Math.random() - 0.3) * 20;
  const totalPower = homePower + awayPower;

  const expectedGoals = (homePower / totalPower) * 5;
  const expectedGoalsAway = (awayPower / totalPower) * 4;

  const homeScore = Math.max(0, Math.round(expectedGoals * (0.5 + Math.random() * 0.8)));
  const awayScore = Math.max(0, Math.round(expectedGoalsAway * (0.5 + Math.random() * 0.8)));

  const events: MatchEvent[] = [];
  const COMMENTARY_TEMPLATES = {
    goal: ["Clinical finish!", "Back of the net!", "Stunning strike!", "Tap-in from close range!", "Header from the corner!"],
    chance: ["Close! Shot over the bar.", "Brilliant save!", "Off the post!", "Just wide!"],
    yellow_card: ["Reckless challenge.", "Poor tackle earns a booking.", "Time wasting, yellow card."],
  };

  const forwardsH = home.players.filter(p => p.position === "FWD");
  const forwardsA = away.players.filter(p => p.position === "FWD");

  for (let g = 0; g < homeScore; g++) {
    const minute = Math.floor(Math.random() * 90) + 1;
    const player = forwardsH[Math.floor(Math.random() * forwardsH.length)] || home.players[0];
    events.push({
      minute,
      type: "goal",
      team: "home",
      playerName: player.name,
      description: COMMENTARY_TEMPLATES.goal[Math.floor(Math.random() * COMMENTARY_TEMPLATES.goal.length)],
    });
  }
  for (let g = 0; g < awayScore; g++) {
    const minute = Math.floor(Math.random() * 90) + 1;
    const player = forwardsA[Math.floor(Math.random() * forwardsA.length)] || away.players[0];
    events.push({
      minute,
      type: "goal",
      team: "away",
      playerName: player.name,
      description: COMMENTARY_TEMPLATES.goal[Math.floor(Math.random() * COMMENTARY_TEMPLATES.goal.length)],
    });
  }

  const chancesCount = Math.floor(Math.random() * 4) + 2;
  for (let c = 0; c < chancesCount; c++) {
    const minute = Math.floor(Math.random() * 90) + 1;
    const isHome = Math.random() > 0.5;
    const allPlayers = isHome ? home.players : away.players;
    const player = allPlayers[Math.floor(Math.random() * allPlayers.length)];
    events.push({
      minute,
      type: "chance",
      team: isHome ? "home" : "away",
      playerName: player.name,
      description: COMMENTARY_TEMPLATES.chance[Math.floor(Math.random() * COMMENTARY_TEMPLATES.chance.length)],
    });
  }

  events.sort((a, b) => a.minute - b.minute);

  const homeWon = homeScore > awayScore;
  const draw = homeScore === awayScore;

  return {
    match: { homeScore, awayScore, status: "completed", events },
    homeUpdate: {
      goalsFor: home.goalsFor + homeScore,
      goalsAgainst: home.goalsAgainst + awayScore,
      wins: home.wins + (homeWon ? 1 : 0),
      draws: home.draws + (draw ? 1 : 0),
      losses: home.losses + (!homeWon && !draw ? 1 : 0),
      points: home.points + (homeWon ? 3 : draw ? 1 : 0),
    },
    awayUpdate: {
      goalsFor: away.goalsFor + awayScore,
      goalsAgainst: away.goalsAgainst + homeScore,
      wins: away.wins + (!homeWon && !draw ? 1 : 0),
      draws: away.draws + (draw ? 1 : 0),
      losses: away.losses + (homeWon ? 1 : 0),
      points: away.points + (!homeWon && !draw ? 3 : draw ? 1 : 0),
    },
  };
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [season, setSeason] = useState<Season | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSeason();
  }, []);

  const loadSeason = async () => {
    try {
      const stored = await AsyncStorage.getItem("footballsim_season");
      if (stored) {
        setSeason(JSON.parse(stored));
      } else {
        const newSeason = initializeSeason();
        setSeason(newSeason);
        await AsyncStorage.setItem("footballsim_season", JSON.stringify(newSeason));
      }
    } catch {
      const newSeason = initializeSeason();
      setSeason(newSeason);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSeason = async (updatedSeason: Season) => {
    setSeason(updatedSeason);
    await AsyncStorage.setItem("footballsim_season", JSON.stringify(updatedSeason));
  };

  const getTeam = useCallback((id: string) => {
    return season?.teams.find(t => t.id === id);
  }, [season]);

  const getPlayerTeam = useCallback(() => {
    return season?.teams.find(t => t.id === season.playerTeamId);
  }, [season]);

  const getLeagueTable = useCallback((): Team[] => {
    if (!season) return [];
    return [...season.teams].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const gdA = a.goalsFor - a.goalsAgainst;
      const gdB = b.goalsFor - b.goalsAgainst;
      if (gdB !== gdA) return gdB - gdA;
      return b.goalsFor - a.goalsFor;
    });
  }, [season]);

  const getMatchesForWeek = useCallback((week: number): Match[] => {
    return season?.matches.filter(m => m.week === week) ?? [];
  }, [season]);

  const simulateMatch = useCallback(async (matchId: string): Promise<Match> => {
    if (!season) throw new Error("No season");

    const matchIdx = season.matches.findIndex(m => m.id === matchId);
    if (matchIdx === -1) throw new Error("Match not found");

    const match = season.matches[matchIdx];
    const home = season.teams.find(t => t.id === match.homeTeamId)!;
    const away = season.teams.find(t => t.id === match.awayTeamId)!;

    const { match: matchUpdates, homeUpdate, awayUpdate } = simulateMatchLogic(home, away, match.week);

    const updatedMatches = [...season.matches];
    updatedMatches[matchIdx] = { ...match, ...matchUpdates } as Match;

    const updatedTeams = season.teams.map(t => {
      if (t.id === home.id) return { ...t, ...homeUpdate };
      if (t.id === away.id) return { ...t, ...awayUpdate };
      return t;
    });

    const updatedSeason = { ...season, matches: updatedMatches, teams: updatedTeams };
    await saveSeason(updatedSeason);

    return updatedMatches[matchIdx];
  }, [season]);

  const simulateWeek = useCallback(async () => {
    if (!season) return;

    const weekMatches = season.matches.filter(m => m.week === season.currentWeek && m.status === "upcoming");
    let updatedSeason = { ...season };

    for (const match of weekMatches) {
      const matchIdx = updatedSeason.matches.findIndex(m => m.id === match.id);
      const home = updatedSeason.teams.find(t => t.id === match.homeTeamId)!;
      const away = updatedSeason.teams.find(t => t.id === match.awayTeamId)!;

      const { match: matchUpdates, homeUpdate, awayUpdate } = simulateMatchLogic(home, away, match.week);

      const updatedMatches = [...updatedSeason.matches];
      updatedMatches[matchIdx] = { ...match, ...matchUpdates } as Match;

      const updatedTeams = updatedSeason.teams.map(t => {
        if (t.id === home.id) return { ...t, ...homeUpdate };
        if (t.id === away.id) return { ...t, ...awayUpdate };
        return t;
      });

      updatedSeason = { ...updatedSeason, matches: updatedMatches, teams: updatedTeams };
    }

    const nextWeek = Math.min(updatedSeason.currentWeek + 1, updatedSeason.totalWeeks);
    await saveSeason({ ...updatedSeason, currentWeek: nextWeek });
  }, [season]);

  const resetSeason = useCallback(async () => {
    const newSeason = initializeSeason();
    await AsyncStorage.setItem("footballsim_season", JSON.stringify(newSeason));
    setSeason(newSeason);
  }, []);

  return (
    <GameContext.Provider value={{
      season,
      isLoading,
      simulateMatch,
      simulateWeek,
      getTeam,
      getPlayerTeam,
      getLeagueTable,
      getMatchesForWeek,
      resetSeason,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
