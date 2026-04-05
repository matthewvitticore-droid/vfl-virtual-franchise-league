import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useNFL } from "@/context/NFLContext";
import { PlayerStatsModal } from "@/components/PlayerStatsModal";
import type { Player, NFLPosition, PlayerSeasonStats } from "@/context/types";

// ─── Types ─────────────────────────────────────────────────────────────────────

type StatTab = "passing" | "rushing" | "receiving" | "defense" | "specTeams" | "records";
type SortDir  = "desc" | "asc";

interface PlayerWithTeam extends Player {
  teamAbbr: string; teamColor: string; teamSecondary: string; teamId: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const POS_COLOR: Record<NFLPosition, string> = {
  QB:"#E31837", RB:"#FB4F14", WR:"#FFC20E", TE:"#00B5E2",
  OL:"#8B949E", DE:"#3FB950", DT:"#26A69A", LB:"#1F6FEB",
  CB:"#6E40C9", S:"#9C27B0",  K:"#FF7043", P:"#795548",
};

function shortName(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length < 2) return name;
  return `${parts[0][0]}. ${parts.slice(1).join(" ")}`;
}

function fmtStat(v: number, decimals = 0): string {
  if (v === 0) return "—";
  return decimals > 0 ? v.toFixed(decimals) : v.toLocaleString();
}

function pct(n: number, d: number): string {
  return d === 0 ? "—" : `${((n / d) * 100).toFixed(1)}`;
}

function ovrColor(v: number) {
  if (v >= 90) return "#FFD700";
  if (v >= 80) return "#3FB950";
  if (v >= 70) return "#FFC107";
  return "#E31837";
}

// ─── Column config ─────────────────────────────────────────────────────────────

interface ColDef<K extends string = string> {
  key: K; header: string; width: number;
  get: (s: PlayerSeasonStats, p: PlayerWithTeam) => number;
  fmt: (s: PlayerSeasonStats, p: PlayerWithTeam) => string;
  accent?: boolean;
}

const PASSING_COLS: ColDef[] = [
  { key:"passingYards",    header:"YDS",   width:52, accent:true,
    get:(s)=>s.passingYards,    fmt:(s)=>fmtStat(s.passingYards) },
  { key:"cmpPct",          header:"CMP%",  width:52,
    get:(s)=>s.attempts>0?s.completions/s.attempts:0, fmt:(s)=>pct(s.completions,s.attempts) },
  { key:"passingTDs",      header:"TD",    width:40,
    get:(s)=>s.passingTDs,      fmt:(s)=>fmtStat(s.passingTDs) },
  { key:"interceptions",   header:"INT",   width:40,
    get:(s)=>-s.interceptions,  fmt:(s)=>fmtStat(s.interceptions) },
  { key:"qbRating",        header:"RTG",   width:48,
    get:(s)=>s.qbRating,        fmt:(s)=>s.qbRating>0?s.qbRating.toFixed(1):"—" },
  { key:"attempts",        header:"ATT",   width:44,
    get:(s)=>s.attempts,        fmt:(s)=>fmtStat(s.attempts) },
  { key:"completions",     header:"CMP",   width:44,
    get:(s)=>s.completions,     fmt:(s)=>fmtStat(s.completions) },
];

const RUSHING_COLS: ColDef[] = [
  { key:"rushingYards",    header:"YDS",   width:52, accent:true,
    get:(s)=>s.rushingYards,    fmt:(s)=>fmtStat(s.rushingYards) },
  { key:"carries",         header:"CAR",   width:44,
    get:(s)=>s.carries,         fmt:(s)=>fmtStat(s.carries) },
  { key:"ypc",             header:"YPC",   width:44,
    get:(s)=>s.carries>0?s.rushingYards/s.carries:0, fmt:(s)=>s.carries>0?(s.rushingYards/s.carries).toFixed(1):"—" },
  { key:"rushingTDs",      header:"TD",    width:40,
    get:(s)=>s.rushingTDs,      fmt:(s)=>fmtStat(s.rushingTDs) },
];

const RECEIVING_COLS: ColDef[] = [
  { key:"receivingYards",  header:"YDS",   width:52, accent:true,
    get:(s)=>s.receivingYards,  fmt:(s)=>fmtStat(s.receivingYards) },
  { key:"receptions",      header:"REC",   width:44,
    get:(s)=>s.receptions,      fmt:(s)=>fmtStat(s.receptions) },
  { key:"targets",         header:"TGT",   width:44,
    get:(s)=>s.targets,         fmt:(s)=>fmtStat(s.targets) },
  { key:"ypr",             header:"YPR",   width:44,
    get:(s)=>s.receptions>0?s.receivingYards/s.receptions:0, fmt:(s)=>s.receptions>0?(s.receivingYards/s.receptions).toFixed(1):"—" },
  { key:"receivingTDs",    header:"TD",    width:40,
    get:(s)=>s.receivingTDs,    fmt:(s)=>fmtStat(s.receivingTDs) },
];

const DEFENSE_COLS: ColDef[] = [
  { key:"tackles",         header:"TCK",   width:48, accent:true,
    get:(s)=>s.tackles,         fmt:(s)=>fmtStat(s.tackles) },
  { key:"sacks",           header:"SACK",  width:48,
    get:(s)=>s.sacks,           fmt:(s)=>s.sacks>0?s.sacks.toFixed(1):"—" },
  { key:"defensiveINTs",   header:"INT",   width:40,
    get:(s)=>s.defensiveINTs,   fmt:(s)=>fmtStat(s.defensiveINTs) },
  { key:"passDeflections", header:"PD",    width:40,
    get:(s)=>s.passDeflections, fmt:(s)=>fmtStat(s.passDeflections) },
  { key:"forcedFumbles",   header:"FF",    width:40,
    get:(s)=>s.forcedFumbles,   fmt:(s)=>fmtStat(s.forcedFumbles) },
];

const SPECTEAMS_COLS: ColDef[] = [
  { key:"fieldGoalsMade",    header:"FGM",  width:44, accent:true,
    get:(s)=>s.fieldGoalsMade,      fmt:(s)=>fmtStat(s.fieldGoalsMade) },
  { key:"fieldGoalsAttempted",header:"FGA", width:44,
    get:(s)=>s.fieldGoalsAttempted, fmt:(s)=>fmtStat(s.fieldGoalsAttempted) },
  { key:"fgPct",              header:"FG%", width:48,
    get:(s)=>s.fieldGoalsAttempted>0?s.fieldGoalsMade/s.fieldGoalsAttempted:0,
    fmt:(s)=>s.fieldGoalsAttempted>0?pct(s.fieldGoalsMade,s.fieldGoalsAttempted)+"%":"—" },
  { key:"puntsAverage",       header:"P.AVG",width:52,
    get:(s)=>s.puntsAverage,        fmt:(s)=>s.puntsAverage>0?s.puntsAverage.toFixed(1):"—" },
];

// ─── Sub-components ────────────────────────────────────────────────────────────

function EmptyMsg({ message }: { message: string }) {
  const colors = useColors();
  return (
    <View style={{ alignItems:"center", paddingVertical:48, gap:10 }}>
      <Feather name="bar-chart-2" size={36} color={colors.border} />
      <Text style={{ color:colors.mutedForeground, fontFamily:"Inter_600SemiBold", fontSize:14 }}>{message}</Text>
    </View>
  );
}

// ── TableHeader ── matches RecordList colRow: # | PLAYER | TEAM | PRIMARY | CTX1 | CTX2
function TableHeader({
  primaryCol, ctxCols, allCols, sortKey, sortDir, onSort, accentColor,
}: {
  primaryCol: ColDef; ctxCols: ColDef[]; allCols: ColDef[];
  sortKey: string; sortDir: SortDir; onSort:(k:string)=>void; accentColor:string;
}) {
  const colors = useColors();
  // All sortable columns shown in a sub-row picker below the main header
  return (
    <View style={{ backgroundColor: colors.card, borderBottomWidth:1, borderBottomColor:colors.border }}>
      {/* Main header row — identical widths to StatRow */}
      <View style={th.row}>
        <Text style={[th.rank,   { color: colors.mutedForeground }]}>#</Text>
        <Text style={[th.player, { color: colors.mutedForeground }]}>PLAYER</Text>
        <Text style={[th.team,   { color: colors.mutedForeground }]}>TEAM</Text>
        {/* Primary col — accent + chevron */}
        <TouchableOpacity onPress={() => onSort(primaryCol.key)}
          style={[th.primary, { width: COL_W.primary }]} activeOpacity={0.7}>
          <Text style={[th.primaryText, { color: accentColor }]}>{primaryCol.header}</Text>
          <Feather name={sortDir==="desc"?"chevron-down":"chevron-up"} size={9} color={accentColor} />
        </TouchableOpacity>
        {ctxCols.map(c => (
          <Text key={c.key} style={[th.ctx, { width: COL_W.ctx, color: colors.mutedForeground }]}>{c.header}</Text>
        ))}
      </View>
      {/* Sort picker sub-row — all available columns as small chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap:5, paddingHorizontal:12, paddingVertical:7 }}>
        {allCols.map(c => {
          const active = c.key === sortKey;
          return (
            <TouchableOpacity key={c.key} onPress={() => onSort(c.key)}
              style={[th.chip, { backgroundColor: active ? accentColor+"22" : "transparent",
                borderColor: active ? accentColor : colors.border }]}>
              <Text style={[th.chipText, { color: active ? accentColor : colors.mutedForeground }]}>
                {c.header}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// Fixed column widths — shared between header and rows
const COL_W = { primary: 62, ctx: 46 };

const th = StyleSheet.create({
  row:        { flexDirection:"row", alignItems:"center", paddingHorizontal:12, paddingVertical:8, gap:6 },
  rank:       { width:22, fontSize:9, fontFamily:"Inter_700Bold", textAlign:"center", color:"#fff" },
  player:     { flex:1,  fontSize:9, fontFamily:"Inter_700Bold", letterSpacing:0.3 },
  team:       { width:36, fontSize:9, fontFamily:"Inter_700Bold", letterSpacing:0.3 },
  primary:    { flexDirection:"row", alignItems:"center", justifyContent:"flex-end", gap:2 },
  primaryText:{ fontSize:9, fontFamily:"Inter_700Bold", letterSpacing:0.3 },
  ctx:        { fontSize:9, fontFamily:"Inter_700Bold", letterSpacing:0.3, textAlign:"right" },
  chip:       { paddingHorizontal:8, paddingVertical:4, borderRadius:6, borderWidth:1 },
  chipText:   { fontSize:9, fontFamily:"Inter_600SemiBold" },
});

// ── StatRow ── identical structure to RecordRow: rank | [POS] Name | TEAM | BIG | sm | sm
function StatRow({
  rank, player, primaryCol, ctxCols, accentColor, onPress,
}: {
  rank:number; player:PlayerWithTeam;
  primaryCol:ColDef; ctxCols:ColDef[];
  accentColor:string; onPress:()=>void;
}) {
  const colors  = useColors();
  const pc      = POS_COLOR[player.position];
  const medals  = ["🥇","🥈","🥉"];
  const medalClr = ["#FFD700","#C0C0C0","#CD7F32"];
  const isOdd   = rank % 2 === 0;

  const primaryVal = primaryCol.fmt(player.stats, player);
  const ctxVals    = ctxCols.map(c => c.fmt(player.stats, player));

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}
      style={[sr.row, { backgroundColor: isOdd ? colors.card : colors.background,
        borderBottomColor: colors.border }]}>

      {/* Rank medal — identical to RecordRow */}
      <Text style={[sr.rank, { color: rank<=3 ? medalClr[rank-1] : colors.mutedForeground,
        fontFamily: rank<=3 ? "Inter_700Bold" : "Inter_400Regular" }]}>
        {rank <= 3 ? medals[rank-1] : rank}
      </Text>

      {/* [POS badge] Player Name — same as RecordRow [pos] player */}
      <View style={sr.playerCell}>
        <View style={[sr.badge, { backgroundColor: pc+"22", borderColor: pc+"55" }]}>
          <Text style={[sr.badgeText, { color: pc }]}>{player.position}</Text>
        </View>
        <Text style={[sr.name, { color: colors.foreground }]} numberOfLines={1}>
          {shortName(player.name)}
        </Text>
      </View>

      {/* Team — same as RecordRow team */}
      <Text style={[sr.team, { color: colors.mutedForeground }]}>{player.teamAbbr}</Text>

      {/* Primary stat — same as RecordRow val: large, bold, accent */}
      <Text style={[sr.primary, { color: accentColor, width: COL_W.primary }]}>
        {primaryVal}
      </Text>

      {/* Context stats — small, muted */}
      {ctxVals.map((v, i) => (
        <Text key={i} style={[sr.ctx, { color: v==="—" ? colors.border : colors.mutedForeground,
          width: COL_W.ctx }]}>
          {v}
        </Text>
      ))}
    </TouchableOpacity>
  );
}
const sr = StyleSheet.create({
  row:        { flexDirection:"row", alignItems:"center", paddingHorizontal:12,
                paddingVertical:11, borderBottomWidth:0.5, gap:6 },
  rank:       { width:22, fontSize:12, textAlign:"center" },
  playerCell: { flex:1, flexDirection:"row", alignItems:"center", gap:5, minWidth:0 },
  badge:      { paddingHorizontal:5, paddingVertical:3, borderRadius:5, borderWidth:1, flexShrink:0 },
  badgeText:  { fontSize:8, fontFamily:"Inter_700Bold", letterSpacing:0.5 },
  name:       { flex:1, fontSize:13, fontFamily:"Inter_600SemiBold", letterSpacing:-0.2 },
  team:       { width:36, fontSize:11, fontFamily:"Inter_500Medium" },
  primary:    { fontSize:15, fontFamily:"Inter_700Bold", textAlign:"right" },
  ctx:        { fontSize:12, fontFamily:"Inter_500Medium", textAlign:"right" },
});

// Team filter pill row
function TeamFilter({
  teams, selected, onSelect, accentColor,
}: {
  teams:{id:string;abbr:string;color:string}[];
  selected:string|null;
  onSelect:(id:string|null)=>void;
  accentColor:string;
}) {
  const colors = useColors();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}
      style={{ flexGrow:0, borderBottomWidth:1, borderBottomColor:colors.border }}
      contentContainerStyle={{ gap:6, paddingHorizontal:12, paddingVertical:8 }}>
      <TouchableOpacity onPress={() => onSelect(null)}
        style={[tf.pill, { backgroundColor: !selected ? accentColor : colors.secondary, borderColor: !selected ? accentColor : colors.border }]}>
        <Text style={[tf.text, { color: !selected ? "#fff" : colors.mutedForeground }]}>All Teams</Text>
      </TouchableOpacity>
      {teams.map(t => (
        <TouchableOpacity key={t.id} onPress={() => onSelect(selected === t.id ? null : t.id)}
          style={[tf.pill, { backgroundColor: selected===t.id ? t.color+"30" : colors.secondary, borderColor: selected===t.id ? t.color : colors.border }]}>
          <Text style={[tf.text, { color: selected===t.id ? t.color : colors.mutedForeground }]}>{t.abbr}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
const tf = StyleSheet.create({
  pill: { paddingHorizontal:10, paddingVertical:5, borderRadius:8, borderWidth:1 },
  text: { fontSize:11, fontFamily:"Inter_600SemiBold" },
});

// ─── Records section ─────────────────────────────────────────────────────────

type RecordGroup = "pass" | "rush" | "rec" | "def";

interface RecordEntry { rank:number; value:string; rawVal:number; playerName:string; team:string; season?:number; pos:NFLPosition; }
interface RecordCategory { title:string; entries:RecordEntry[]; }

function RecordList({ cats, accentColor }: { cats:RecordCategory[]; accentColor:string }) {
  const colors = useColors();
  return (
    <View style={{ paddingBottom:20 }}>
      {cats.map(cat => (
        <View key={cat.title} style={{ marginBottom:8 }}>
          {/* Category header */}
          <View style={[rc.catHeader, { backgroundColor: accentColor+"20", borderLeftColor: accentColor }]}>
            <Feather name="award" size={11} color={accentColor} />
            <Text style={[rc.catTitle, { color: accentColor }]}>{cat.title}</Text>
          </View>
          {/* Column labels */}
          <View style={[rc.colRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <Text style={[rc.colRank,   { color: colors.mutedForeground }]}>#</Text>
            <Text style={[rc.colPlayer, { color: colors.mutedForeground }]}>PLAYER</Text>
            <Text style={[rc.colTeam,   { color: colors.mutedForeground }]}>TEAM</Text>
            <Text style={[rc.colSeason, { color: colors.mutedForeground }]}>YR</Text>
            <Text style={[rc.colVal,    { color: colors.mutedForeground }]}>VALUE</Text>
          </View>
          {cat.entries.length === 0 ? (
            <View style={{ paddingVertical:12, alignItems:"center" }}>
              <Text style={{ color:colors.mutedForeground, fontSize:12, fontFamily:"Inter_400Regular" }}>No data yet</Text>
            </View>
          ) : cat.entries.map((e, i) => {
            const pc = POS_COLOR[e.pos];
            const medals = ["🥇","🥈","🥉"];
            return (
              <View key={i} style={[rc.row, {
                backgroundColor: i % 2 === 0 ? colors.card : colors.background,
                borderBottomColor: colors.border,
              }]}>
                <Text style={[rc.rank, { color: i<3 ? ["#FFD700","#C0C0C0","#CD7F32"][i] : colors.mutedForeground }]}>
                  {i < 3 ? medals[i] : e.rank}
                </Text>
                <View style={[rc.posBadge, { backgroundColor: pc+"22", borderColor: pc+"55" }]}>
                  <Text style={[rc.posText, { color: pc }]}>{e.pos}</Text>
                </View>
                <Text style={[rc.player, { color: colors.foreground }]} numberOfLines={1}>{shortName(e.playerName)}</Text>
                <Text style={[rc.team,   { color: colors.mutedForeground }]}>{e.team}</Text>
                <Text style={[rc.season, { color: colors.mutedForeground }]}>{e.season ?? "—"}</Text>
                <Text style={[rc.val,    { color: accentColor }]}>{e.value}</Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}
const rc = StyleSheet.create({
  catHeader: { flexDirection:"row", alignItems:"center", gap:6, paddingHorizontal:12, paddingVertical:8,
               borderLeftWidth:3, marginTop:12 },
  catTitle:  { fontSize:11, fontFamily:"Inter_700Bold", letterSpacing:0.8, flex:1 },
  colRow:    { flexDirection:"row", alignItems:"center", paddingHorizontal:12, paddingVertical:5,
               borderBottomWidth:1 },
  colRank:   { width:28, fontSize:8.5, fontFamily:"Inter_700Bold" },
  colPlayer: { flex:1, fontSize:8.5, fontFamily:"Inter_700Bold" },
  colTeam:   { width:40, fontSize:8.5, fontFamily:"Inter_700Bold" },
  colSeason: { width:36, fontSize:8.5, fontFamily:"Inter_700Bold", textAlign:"right" },
  colVal:    { width:60, fontSize:8.5, fontFamily:"Inter_700Bold", textAlign:"right" },
  row:       { flexDirection:"row", alignItems:"center", paddingHorizontal:12, paddingVertical:8,
               borderBottomWidth:0.5, gap:6 },
  rank:      { width:22, fontSize:12, textAlign:"center" },
  posBadge:  { paddingHorizontal:5, paddingVertical:2, borderRadius:5, borderWidth:1 },
  posText:   { fontSize:8, fontFamily:"Inter_700Bold" },
  player:    { flex:1, fontSize:13, fontFamily:"Inter_600SemiBold", letterSpacing:-0.2 },
  team:      { width:34, fontSize:11, fontFamily:"Inter_500Medium" },
  season:    { width:36, fontSize:11, fontFamily:"Inter_500Medium", textAlign:"right" },
  val:       { width:60, fontSize:14, fontFamily:"Inter_700Bold", textAlign:"right" },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function StatsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { season } = useNFL();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [tab,        setTab]        = useState<StatTab>("passing");
  const [teamFilter, setTeamFilter] = useState<string | null>(null);
  const [sortKey,    setSortKey]    = useState<Record<StatTab, string>>({
    passing:"passingYards", rushing:"rushingYards", receiving:"receivingYards",
    defense:"tackles", specTeams:"fieldGoalsMade", records:"pass",
  });
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [recordGroup, setRecordGroup] = useState<RecordGroup>("pass");
  const [modalPlayer, setModalPlayer] = useState<PlayerWithTeam | null>(null);

  // Build full player list with team metadata
  const allPlayers = useMemo<PlayerWithTeam[]>(() => {
    if (!season) return [];
    return season.teams.flatMap(t =>
      t.roster.map(p => ({
        ...p,
        teamAbbr: t.abbreviation, teamColor: t.primaryColor,
        teamSecondary: t.secondaryColor, teamId: t.id,
      }))
    );
  }, [season]);

  const teamList = useMemo(() =>
    (season?.teams ?? []).map(t => ({ id:t.id, abbr:t.abbreviation, color:t.primaryColor }))
      .sort((a,b) => a.abbr.localeCompare(b.abbr)),
    [season]
  );

  const gamesPlayed = season?.games.filter(g => g.status === "final").length ?? 0;
  const teamColor   = season?.teams.find(t => t.id === season.playerTeamId)?.primaryColor ?? colors.nflBlue;

  // Filtered + sorted helpers
  function buildList(
    cols: ColDef[],
    filter: (p: PlayerWithTeam) => boolean,
    activeKey: string,
  ): PlayerWithTeam[] {
    const key = activeKey;
    const col = cols.find(c => c.key === key) ?? cols[0];
    let players = allPlayers.filter(filter);
    if (teamFilter) players = players.filter(p => p.teamId === teamFilter);
    return [...players]
      .filter(p => cols.some(c => c.get(p.stats, p) !== 0))
      .sort((a, b) => {
        const av = col.get(a.stats, a);
        const bv = col.get(b.stats, b);
        return sortDir === "desc" ? bv - av : av - bv;
      })
      .slice(0, 50);
  }

  const passSortKey = sortKey.passing;
  const rushSortKey = sortKey.rushing;
  const recSortKey  = sortKey.receiving;
  const defSortKey  = sortKey.defense;
  const stSortKey   = sortKey.specTeams;

  const passing   = useMemo(() => buildList(PASSING_COLS,   p => p.position==="QB", passSortKey),   [allPlayers, teamFilter, passSortKey, sortDir]);
  const rushing   = useMemo(() => buildList(RUSHING_COLS,   p => ["RB","QB","WR"].includes(p.position) && p.stats.carries>0, rushSortKey), [allPlayers, teamFilter, rushSortKey, sortDir]);
  const receiving = useMemo(() => buildList(RECEIVING_COLS, p => ["WR","TE","RB"].includes(p.position) && p.stats.targets>0, recSortKey),  [allPlayers, teamFilter, recSortKey, sortDir]);
  const defense   = useMemo(() => buildList(DEFENSE_COLS,   p => ["DE","DT","LB","CB","S"].includes(p.position), defSortKey), [allPlayers, teamFilter, defSortKey, sortDir]);
  const specTeams = useMemo(() => buildList(SPECTEAMS_COLS, p => ["K","P"].includes(p.position), stSortKey), [allPlayers, teamFilter, stSortKey, sortDir]);

  function handleSort(tabKey: StatTab, key: string) {
    setSortKey(prev => {
      const cur = prev[tabKey];
      if (cur === key) {
        setSortDir(d => d === "desc" ? "asc" : "desc");
        return prev;
      }
      setSortDir("desc");
      return { ...prev, [tabKey]: key };
    });
  }

  // ── Records ────────────────────────────────────────────────────────────────

  const recordCats = useMemo((): Record<RecordGroup, RecordCategory[]> => {
    type RawEntry = RecordEntry;
    function top25(
      filter: (p:PlayerWithTeam)=>boolean,
      get: (s:PlayerSeasonStats)=>number,
      fmt: (v:number)=>string,
      pos?: NFLPosition,
    ): RecordEntry[] {
      const entries: { val:number; name:string; team:string; season?:number; pos:NFLPosition }[] = [];
      for (const p of allPlayers) {
        if (!filter(p)) continue;
        // Current season
        const cv = get(p.stats);
        if (cv > 0) entries.push({ val:cv, name:p.name, team:p.teamAbbr, season:p.stats.season, pos:p.position });
        // Career seasons
        for (const cs of p.careerStats) {
          const v = get(cs);
          if (v > 0) entries.push({ val:v, name:p.name, team:p.teamAbbr, season:cs.season, pos:p.position });
        }
      }
      return entries
        .sort((a,b) => b.val - a.val)
        .slice(0, 25)
        .map((e,i) => ({ rank:i+1, value:fmt(e.val), rawVal:e.val, playerName:e.name, team:e.team, season:e.season, pos:e.pos }));
    }

    return {
      pass: [
        { title:"Passing Yards — Single Season",   entries: top25(p=>p.position==="QB", s=>s.passingYards,  v=>v.toLocaleString()) },
        { title:"Passing TDs — Single Season",     entries: top25(p=>p.position==="QB", s=>s.passingTDs,    v=>String(v)) },
        { title:"QB Rating — Single Season",       entries: top25(p=>p.position==="QB", s=>s.qbRating,      v=>v.toFixed(1)) },
        { title:"Completions — Single Season",     entries: top25(p=>p.position==="QB", s=>s.completions,   v=>String(v)) },
        { title:"Interceptions Thrown — Season",   entries: top25(p=>p.position==="QB", s=>s.interceptions, v=>String(v)) },
      ],
      rush: [
        { title:"Rushing Yards — Single Season",   entries: top25(p=>["RB","QB"].includes(p.position), s=>s.rushingYards,  v=>v.toLocaleString()) },
        { title:"Rushing TDs — Single Season",     entries: top25(p=>["RB","QB"].includes(p.position), s=>s.rushingTDs,    v=>String(v)) },
        { title:"Rushing Attempts — Season",       entries: top25(p=>["RB","QB"].includes(p.position), s=>s.carries,       v=>String(v)) },
        { title:"Yards Per Carry — Season (20+ carries)", entries: top25(p=>p.position==="RB"&&p.stats.carries>=20, s=>s.carries>0?s.rushingYards/s.carries:0, v=>v.toFixed(2)) },
      ],
      rec: [
        { title:"Receiving Yards — Single Season", entries: top25(p=>["WR","TE","RB"].includes(p.position), s=>s.receivingYards,  v=>v.toLocaleString()) },
        { title:"Receptions — Single Season",      entries: top25(p=>["WR","TE","RB"].includes(p.position), s=>s.receptions,      v=>String(v)) },
        { title:"Receiving TDs — Single Season",   entries: top25(p=>["WR","TE","RB"].includes(p.position), s=>s.receivingTDs,    v=>String(v)) },
        { title:"Yards Per Reception — Season (20+ rec)", entries: top25(p=>["WR","TE"].includes(p.position)&&p.stats.receptions>=20, s=>s.receptions>0?s.receivingYards/s.receptions:0, v=>v.toFixed(2)) },
      ],
      def: [
        { title:"Tackles — Single Season",         entries: top25(p=>["LB","CB","S","DE","DT"].includes(p.position), s=>s.tackles,         v=>String(v)) },
        { title:"Sacks — Single Season",           entries: top25(p=>["DE","DT","LB"].includes(p.position),          s=>s.sacks,           v=>v.toFixed(1)) },
        { title:"Interceptions — Single Season",   entries: top25(p=>["CB","S","LB"].includes(p.position),           s=>s.defensiveINTs,   v=>String(v)) },
        { title:"Pass Deflections — Season",       entries: top25(p=>["CB","S"].includes(p.position),                s=>s.passDeflections, v=>String(v)) },
        { title:"Forced Fumbles — Season",         entries: top25(p=>["DE","LB","CB","S"].includes(p.position),      s=>s.forcedFumbles,   v=>String(v)) },
      ],
    };
  }, [allPlayers]);

  // ── Tab config ─────────────────────────────────────────────────────────────

  const TABS: { key:StatTab; label:string; icon:any }[] = [
    { key:"passing",   label:"Passing",   icon:"send"    },
    { key:"rushing",   label:"Rushing",   icon:"zap"     },
    { key:"receiving", label:"Receiving", icon:"target"  },
    { key:"defense",   label:"Defense",   icon:"shield"  },
    { key:"specTeams", label:"Spec Teams",icon:"star"    },
    { key:"records",   label:"Records",   icon:"award"   },
  ];

  const RECORD_GROUPS: { key:RecordGroup; label:string }[] = [
    { key:"pass", label:"Passing" },
    { key:"rush", label:"Rushing" },
    { key:"rec",  label:"Receiving" },
    { key:"def",  label:"Defense" },
  ];

  const currentCols: ColDef[] = tab==="passing" ? PASSING_COLS : tab==="rushing" ? RUSHING_COLS :
    tab==="receiving" ? RECEIVING_COLS : tab==="defense" ? DEFENSE_COLS : SPECTEAMS_COLS;
  const currentList = tab==="passing" ? passing : tab==="rushing" ? rushing :
    tab==="receiving" ? receiving : tab==="defense" ? defense : specTeams;
  const currentSortKey = sortKey[tab];

  // Context (secondary) columns per tab — always show these 2 regardless of sort
  const CTX_KEYS: Record<StatTab, string[]> = {
    passing:   ["cmpPct",     "passingTDs"],
    rushing:   ["ypc",        "rushingTDs"],
    receiving: ["receptions", "receivingTDs"],
    defense:   ["sacks",      "defensiveINTs"],
    specTeams: ["fgPct",      "puntsAverage"],
    records:   [],
  };
  // Primary = the sorted col; ctx = the 2 fixed context cols (de-dupe if primary overlaps)
  const primaryCol: ColDef = currentCols.find(c => c.key === currentSortKey) ?? currentCols[0];
  const ctxKeys = CTX_KEYS[tab].filter(k => k !== primaryCol.key).slice(0, 2);
  // If sorting by a ctx col already, show the other context + the first "extra" col
  const ctxCols: ColDef[] = ctxKeys.map(k => currentCols.find(c => c.key === k)).filter((c): c is ColDef => !!c);

  return (
    <View style={{ flex:1, backgroundColor:colors.background }}>

      {/* ── Header ── */}
      <View style={[hd.wrap, { paddingTop:topPad+8, backgroundColor:colors.card, borderBottomColor:colors.border }]}>
        <View style={hd.top}>
          <View>
            <Text style={[hd.title, { color:colors.foreground }]}>League Stats</Text>
            <Text style={[hd.sub,   { color:colors.mutedForeground }]}>
              {season ? `${season.year} Season · ${gamesPlayed} game${gamesPlayed!==1?"s":""} played` : "No season data"}
            </Text>
          </View>
          <View style={[hd.badge, { backgroundColor:teamColor+"22", borderColor:teamColor+"55" }]}>
            <Feather name="bar-chart-2" size={15} color={teamColor} />
          </View>
        </View>
        {/* Category tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap:6, paddingHorizontal:12, paddingBottom:10 }}>
          {TABS.map(t => (
            <TouchableOpacity key={t.key} onPress={() => setTab(t.key)}
              style={[hd.tabBtn, { backgroundColor:tab===t.key?teamColor:colors.secondary, borderColor:tab===t.key?teamColor:colors.border }]}>
              <Feather name={t.icon} size={11} color={tab===t.key?"#fff":colors.mutedForeground} />
              <Text style={[hd.tabLabel, { color:tab===t.key?"#fff":colors.mutedForeground }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Team filter (not for records) ── */}
      {tab !== "records" && (
        <TeamFilter teams={teamList} selected={teamFilter} onSelect={setTeamFilter} accentColor={teamColor} />
      )}

      {/* ── Body ── */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:100 }}
        stickyHeaderIndices={tab !== "records" ? [0] : []}>

        {tab !== "records" ? (
          <>
            {/* Sticky sortable header */}
            <TableHeader
              primaryCol={primaryCol}
              ctxCols={ctxCols}
              allCols={currentCols}
              sortKey={currentSortKey}
              sortDir={sortDir}
              onSort={k => handleSort(tab, k)}
              accentColor={teamColor}
            />
            {/* Rows */}
            {currentList.length === 0
              ? <EmptyMsg message={gamesPlayed===0 ? "Simulate games to populate stats" : teamFilter ? "No stats for this team yet" : "No stats yet"} />
              : currentList.map((p,i) => (
                <StatRow
                  key={p.id} rank={i+1} player={p}
                  primaryCol={primaryCol}
                  ctxCols={ctxCols}
                  accentColor={teamColor}
                  onPress={() => setModalPlayer(p)}
                />
              ))
            }
          </>
        ) : (
          /* Records */
          <View>
            {/* Record group sub-tabs */}
            <View style={[rec.tabBar, { backgroundColor:colors.card, borderBottomColor:colors.border }]}>
              {RECORD_GROUPS.map(g => (
                <TouchableOpacity key={g.key} onPress={() => setRecordGroup(g.key)}
                  style={[rec.groupBtn, { borderBottomColor: recordGroup===g.key ? teamColor : "transparent" }]}>
                  <Text style={[rec.groupLabel, { color: recordGroup===g.key ? teamColor : colors.mutedForeground }]}>
                    {g.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {gamesPlayed === 0 ? (
              <EmptyMsg message="Start simming games to build VFL history" />
            ) : (
              <RecordList cats={recordCats[recordGroup]} accentColor={teamColor} />
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Player Stats Modal ── */}
      <PlayerStatsModal
        player={modalPlayer}
        visible={!!modalPlayer}
        onClose={() => setModalPlayer(null)}
        teamPrimaryColor={modalPlayer?.teamColor}
        gamesPlayedThisSeason={gamesPlayed}
      />
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const hd = StyleSheet.create({
  wrap:     { paddingHorizontal:0, borderBottomWidth:1 },
  top:      { flexDirection:"row", alignItems:"center", justifyContent:"space-between",
              paddingHorizontal:16, marginBottom:10 },
  title:    { fontSize:20, fontFamily:"Inter_700Bold" },
  sub:      { fontSize:11, fontFamily:"Inter_400Regular", marginTop:1 },
  badge:    { width:34, height:34, borderRadius:10, alignItems:"center", justifyContent:"center", borderWidth:1 },
  tabBtn:   { flexDirection:"row", alignItems:"center", gap:5, paddingHorizontal:12, paddingVertical:7,
              borderRadius:8, borderWidth:1 },
  tabLabel: { fontSize:12, fontFamily:"Inter_600SemiBold" },
});

const rec = StyleSheet.create({
  tabBar:    { flexDirection:"row", borderBottomWidth:1 },
  groupBtn:  { flex:1, alignItems:"center", paddingVertical:11, borderBottomWidth:2.5 },
  groupLabel:{ fontSize:13, fontFamily:"Inter_600SemiBold" },
});
