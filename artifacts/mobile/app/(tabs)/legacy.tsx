import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useState } from "react";
import {
  Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useTeamTheme } from "@/hooks/useTeamTheme";
import { useNFL } from "@/context/NFLContext";
import type { NFLPosition, Player, PlayerSeasonStats } from "@/context/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const POS_COLOR: Record<NFLPosition, string> = {
  QB:"#E31837", RB:"#FB4F14", WR:"#FFC20E", TE:"#00B5E2",
  OL:"#8B949E", DE:"#3FB950", DT:"#26A69A", LB:"#1F6FEB",
  CB:"#6E40C9", S:"#9C27B0",  K:"#FF7043", P:"#795548",
};

function hexLum(hex: string): number {
  const h = hex.replace("#","").slice(0,6).padEnd(6,"0");
  const [r,g,b] = [0,2,4].map(i => {
    const v = parseInt(h.slice(i,i+2),16)/255;
    return v<=0.04045 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4);
  });
  return 0.2126*r + 0.7152*g + 0.0722*b;
}
function onColor(hex: string): string {
  return hexLum(hex.slice(0,7)) > 0.35 ? "#111111" : "#ffffff";
}

function sumCareer(player: Player): PlayerSeasonStats {
  const all = [...(player.careerStats ?? []), player.stats];
  return all.reduce<PlayerSeasonStats>((acc, s) => ({
    season:undefined, gamesPlayed: acc.gamesPlayed+s.gamesPlayed,
    passingYards: acc.passingYards+s.passingYards, passingTDs: acc.passingTDs+s.passingTDs,
    interceptions: acc.interceptions+s.interceptions, completions: acc.completions+s.completions,
    attempts: acc.attempts+s.attempts, qbRating:0,
    rushingYards: acc.rushingYards+s.rushingYards, rushingTDs: acc.rushingTDs+s.rushingTDs,
    carries: acc.carries+s.carries,
    receivingYards: acc.receivingYards+s.receivingYards, receivingTDs: acc.receivingTDs+s.receivingTDs,
    receptions: acc.receptions+s.receptions, targets: acc.targets+s.targets,
    tackles: acc.tackles+s.tackles, sacks: acc.sacks+s.sacks,
    forcedFumbles: acc.forcedFumbles+s.forcedFumbles, defensiveINTs: acc.defensiveINTs+s.defensiveINTs,
    passDeflections: acc.passDeflections+s.passDeflections,
    yardsPerCarry:0, yardsPerCatch:0,
    fieldGoalsMade: acc.fieldGoalsMade+s.fieldGoalsMade,
    fieldGoalsAttempted: acc.fieldGoalsAttempted+s.fieldGoalsAttempted, puntsAverage:0,
  }), {
    gamesPlayed:0,passingYards:0,passingTDs:0,interceptions:0,completions:0,attempts:0,
    qbRating:0,rushingYards:0,rushingTDs:0,carries:0,receivingYards:0,receivingTDs:0,
    receptions:0,targets:0,tackles:0,sacks:0,forcedFumbles:0,defensiveINTs:0,
    passDeflections:0,yardsPerCarry:0,yardsPerCatch:0,fieldGoalsMade:0,fieldGoalsAttempted:0,
    puntsAverage:0,
  });
}

function keyStatForPos(pos: NFLPosition, tot: PlayerSeasonStats): { label:string; value:string } {
  if (pos==="QB")  return { label:"YDS", value: tot.passingYards>0 ? tot.passingYards.toLocaleString() : "—" };
  if (pos==="RB")  return { label:"YDS", value: tot.rushingYards>0  ? tot.rushingYards.toLocaleString()  : "—" };
  if (["WR","TE"].includes(pos)) return { label:"YDS", value: tot.receivingYards>0 ? tot.receivingYards.toLocaleString() : "—" };
  if (["DE","DT","LB","CB","S"].includes(pos)) return { label:"TCK", value: tot.tackles>0 ? String(tot.tackles) : "—" };
  if (pos==="K")   return { label:"FGM", value: tot.fieldGoalsMade>0 ? String(tot.fieldGoalsMade) : "—" };
  return { label:"OVR", value: String(0) };
}

function tdStatForPos(pos: NFLPosition, tot: PlayerSeasonStats): string {
  if (pos==="QB")  return `${tot.passingTDs} TD`;
  if (pos==="RB")  return `${tot.rushingTDs} TD`;
  if (["WR","TE"].includes(pos)) return `${tot.receivingTDs} TD`;
  if (["DE","DT","LB"].includes(pos)) return `${tot.sacks.toFixed(1)} SCK`;
  if (["CB","S"].includes(pos)) return `${tot.defensiveINTs} INT`;
  return "";
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ icon, title, sub, accent }: {
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string; sub?: string; accent: string;
}) {
  const colors = useColors();
  return (
    <View style={[sh.wrap, { borderLeftColor: accent }]}>
      <View style={sh.row}>
        <Feather name={icon} size={16} color={accent} />
        <Text style={[sh.title, { color: colors.foreground }]}>{title}</Text>
      </View>
      {sub && <Text style={[sh.sub, { color: colors.mutedForeground }]}>{sub}</Text>}
    </View>
  );
}
const sh = StyleSheet.create({
  wrap:  { borderLeftWidth:3, paddingLeft:12, marginBottom:14, marginTop:6 },
  row:   { flexDirection:"row", alignItems:"center", gap:8 },
  title: { fontFamily:"Inter_700Bold", fontSize:17, letterSpacing:0.2 },
  sub:   { fontFamily:"Inter_400Regular", fontSize:12, marginTop:3 },
});

// ── Championship Banner ───────────────────────────────────────────────────────
function ChampionshipBanner({ bowl, isPlayerTeam }: {
  bowl: { year:number; winnerTeamCity:string; winnerTeamName:string; winnerTeamColor:string;
          loserTeamCity:string; loserTeamName:string; winnerScore:number; loserScore:number;
          mvpPlayerName:string; mvpPosition:string };
  isPlayerTeam: boolean;
}) {
  const colors = useColors();
  const tc     = bowl.winnerTeamColor;
  const txtClr = onColor(tc);

  return (
    <View style={[bn.card, { borderColor: tc + "80" }]}>
      {/* Color fill */}
      <LinearGradient
        colors={[tc, tc + "CC", tc + "55"]}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Ribbon top accent */}
      <View style={[bn.ribbon, { backgroundColor: tc }]} />

      <View style={bn.content}>
        {/* Year + Trophy */}
        <View style={bn.yearRow}>
          <Text style={[bn.year, { color: txtClr }]}>{bowl.year}</Text>
          <Text style={bn.trophy}>🏆</Text>
          {isPlayerTeam && (
            <View style={[bn.myPill, { backgroundColor: "#FFD700" }]}>
              <Text style={bn.myText}>YOUR TITLE</Text>
            </View>
          )}
        </View>

        {/* Team name */}
        <Text style={[bn.teamCity, { color: txtClr + "BB" }]}>{bowl.winnerTeamCity.toUpperCase()}</Text>
        <Text style={[bn.teamName, { color: txtClr }]}>{bowl.winnerTeamName.toUpperCase()}</Text>
        <Text style={[bn.champ, { color: txtClr + "99" }]}>VFL BOWL CHAMPIONS</Text>

        {/* Score */}
        <View style={[bn.scoreRow, { borderTopColor: txtClr + "30" }]}>
          <Text style={[bn.score, { color: txtClr }]}>
            {bowl.winnerScore} – {bowl.loserScore}
          </Text>
          <Text style={[bn.vsText, { color: txtClr + "99" }]}>
            def. {bowl.loserTeamCity} {bowl.loserTeamName}
          </Text>
        </View>

        {/* MVP */}
        <View style={[bn.mvpRow, { backgroundColor: "rgba(0,0,0,0.25)" }]}>
          <Text style={[bn.mvpLabel, { color: txtClr + "80" }]}>MVP</Text>
          <View style={[bn.posBadge, { backgroundColor: POS_COLOR[bowl.mvpPosition as NFLPosition] ?? "#555" }]}>
            <Text style={bn.posText}>{bowl.mvpPosition}</Text>
          </View>
          <Text style={[bn.mvpName, { color: txtClr }]}>{bowl.mvpPlayerName}</Text>
        </View>
      </View>
    </View>
  );
}
const bn = StyleSheet.create({
  card:      { borderRadius:16, borderWidth:1, overflow:"hidden", marginBottom:14 },
  ribbon:    { height:4, width:"100%" },
  content:   { padding:20 },
  yearRow:   { flexDirection:"row", alignItems:"center", gap:10, marginBottom:6 },
  year:      { fontFamily:"Inter_700Bold", fontSize:42, lineHeight:48, letterSpacing:-1 },
  trophy:    { fontSize:32 },
  myPill:    { paddingHorizontal:8, paddingVertical:3, borderRadius:8 },
  myText:    { fontFamily:"Inter_700Bold", fontSize:9, color:"#111", letterSpacing:0.8 },
  teamCity:  { fontFamily:"Inter_600SemiBold", fontSize:11, letterSpacing:2.5 },
  teamName:  { fontFamily:"Inter_700Bold", fontSize:24, letterSpacing:0.3, marginTop:-2 },
  champ:     { fontFamily:"Inter_700Bold", fontSize:9, letterSpacing:2, marginTop:2 },
  scoreRow:  { flexDirection:"row", alignItems:"center", gap:10, marginTop:14, paddingTop:12, borderTopWidth:1 },
  score:     { fontFamily:"Inter_700Bold", fontSize:22 },
  vsText:    { fontFamily:"Inter_400Regular", fontSize:12, flex:1 },
  mvpRow:    { flexDirection:"row", alignItems:"center", gap:8, marginTop:10,
               borderRadius:8, paddingHorizontal:10, paddingVertical:8 },
  mvpLabel:  { fontFamily:"Inter_700Bold", fontSize:9, letterSpacing:1.2 },
  posBadge:  { paddingHorizontal:5, paddingVertical:2, borderRadius:5 },
  posText:   { fontFamily:"Inter_700Bold", fontSize:8, color:"#fff" },
  mvpName:   { fontFamily:"Inter_600SemiBold", fontSize:14, flex:1 },
});

// ── Cornerstone Player Card ───────────────────────────────────────────────────
function CornerStoneCard({ player, accent }: { player: Player; accent: string }) {
  const colors  = useColors();
  const pc      = POS_COLOR[player.position];
  const tot     = useMemo(() => sumCareer(player), [player]);
  const keyStat = keyStatForPos(player.position, tot);
  const tdStat  = tdStatForPos(player.position, tot);
  const seasons = (player.careerStats?.length ?? 0) + 1;

  return (
    <View style={[cs.card, { backgroundColor:colors.card, borderColor:accent+"35" }]}>
      <LinearGradient
        colors={[accent+"22", "transparent"]}
        style={StyleSheet.absoluteFill}
      />
      {/* Top row */}
      <View style={cs.topRow}>
        <View style={[cs.posBadge, { backgroundColor:pc+"20", borderColor:pc+"55" }]}>
          <Text style={[cs.posText, { color:pc }]}>{player.position}</Text>
        </View>
        <View style={[cs.ovrBadge, { backgroundColor:accent }]}>
          <Text style={[cs.ovrVal, { color: onColor(accent) }]}>{player.overall}</Text>
          <Text style={[cs.ovrLbl, { color: onColor(accent)+"99" }]}>OVR</Text>
        </View>
      </View>
      {/* Name */}
      <Text style={[cs.name, { color:colors.foreground }]} numberOfLines={1}>{player.name}</Text>
      <Text style={[cs.meta, { color:colors.mutedForeground }]}>
        {player.yearsExperience}yr exp · {seasons} season{seasons!==1?"s":""}
      </Text>
      {/* Dev trait */}
      {player.developmentTrait !== "Normal" && (
        <View style={[cs.devTag, { backgroundColor:accent+"20", borderColor:accent+"45" }]}>
          <Text style={[cs.devText, { color:accent }]}>{player.developmentTrait}</Text>
        </View>
      )}
      {/* Career key stat */}
      <View style={[cs.statRow, { borderTopColor:accent+"25" }]}>
        <View style={cs.stat}>
          <Text style={[cs.statVal, { color:accent }]}>{keyStat.value}</Text>
          <Text style={[cs.statLbl, { color:colors.mutedForeground }]}>
            CAREER {keyStat.label}
          </Text>
        </View>
        {tdStat ? (
          <View style={cs.stat}>
            <Text style={[cs.statVal, { color:colors.foreground }]}>{tdStat}</Text>
            <Text style={[cs.statLbl, { color:colors.mutedForeground }]}>CAREER</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
const cs = StyleSheet.create({
  card:     { borderRadius:14, borderWidth:1, padding:14, overflow:"hidden", flex:1 },
  topRow:   { flexDirection:"row", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 },
  posBadge: { paddingHorizontal:6, paddingVertical:3, borderRadius:6, borderWidth:1 },
  posText:  { fontFamily:"Inter_700Bold", fontSize:9, letterSpacing:0.5 },
  ovrBadge: { paddingHorizontal:8, paddingVertical:4, borderRadius:8, alignItems:"center" },
  ovrVal:   { fontFamily:"Inter_700Bold", fontSize:18 },
  ovrLbl:   { fontFamily:"Inter_700Bold", fontSize:7, letterSpacing:1 },
  name:     { fontFamily:"Inter_700Bold", fontSize:15, letterSpacing:-0.2 },
  meta:     { fontFamily:"Inter_400Regular", fontSize:10, marginTop:2 },
  devTag:   { alignSelf:"flex-start", marginTop:6, paddingHorizontal:7, paddingVertical:2,
              borderRadius:6, borderWidth:1 },
  devText:  { fontFamily:"Inter_600SemiBold", fontSize:9 },
  statRow:  { flexDirection:"row", justifyContent:"space-around", marginTop:12,
              paddingTop:10, borderTopWidth:1, gap:8 },
  stat:     { alignItems:"center" },
  statVal:  { fontFamily:"Inter_700Bold", fontSize:16 },
  statLbl:  { fontFamily:"Inter_700Bold", fontSize:8, letterSpacing:0.8, marginTop:1, opacity:0.65 },
});

// ── Draft Hero Timeline Card ──────────────────────────────────────────────────
function DraftHeroCard({ player, accent, playerTeamId }: { player: Player; accent: string; playerTeamId: string }) {
  const colors  = useColors();
  const pc      = POS_COLOR[player.position];
  const tot     = useMemo(() => sumCareer(player), [player]);
  const keyStat = keyStatForPos(player.position, tot);
  const seasons = (player.careerStats?.length ?? 0) + 1;

  const roundLabel = player.draftRound
    ? player.draftRound === 1 ? "1st Round Pick" : player.draftRound === 2 ? "2nd Round Pick" : `Rd ${player.draftRound}`
    : "Undrafted";
  const roundColor = player.draftRound === 1 ? "#FFD700" : player.draftRound === 2 ? "#C0C0C0" : "#CD7F32";

  return (
    <View style={[dh.card, { backgroundColor:colors.card, borderColor:accent+"30" }]}>
      <LinearGradient colors={[accent+"18","transparent"]} style={StyleSheet.absoluteFill} />
      <View style={dh.header}>
        <View style={[dh.roundBadge, { borderColor:roundColor }]}>
          <Text style={[dh.roundText, { color:roundColor }]}>{roundLabel}</Text>
          {player.draftYear && <Text style={[dh.roundYear, { color:colors.mutedForeground }]}>
            {player.draftYear} Draft
          </Text>}
        </View>
        <View style={[dh.posBadge, { backgroundColor:pc+"20", borderColor:pc+"55" }]}>
          <Text style={[dh.posText, { color:pc }]}>{player.position}</Text>
        </View>
        <View style={[dh.ovrBadge, { backgroundColor:accent+"25" }]}>
          <Text style={[dh.ovrVal, { color:accent }]}>{player.overall}</Text>
        </View>
      </View>
      <Text style={[dh.name, { color:colors.foreground }]} numberOfLines={1}>{player.name}</Text>
      <Text style={[dh.college, { color:colors.mutedForeground }]}>
        {player.college ?? "Unknown"} · {player.yearsExperience}yr exp
      </Text>
      <View style={[dh.bottom, { borderTopColor:accent+"20" }]}>
        <Text style={[dh.statVal, { color:accent }]}>{keyStat.value}</Text>
        <Text style={[dh.statLbl, { color:colors.mutedForeground }]}>CAREER {keyStat.label}</Text>
        <Text style={[dh.seasons, { color:colors.mutedForeground }]}>{seasons}  season{seasons!==1?"s":""}</Text>
      </View>
      {/* Dev trait journey */}
      {player.developmentTrait !== "Normal" && (
        <View style={[dh.traitTag, { backgroundColor:accent+"20" }]}>
          <Feather name="trending-up" size={10} color={accent} />
          <Text style={[dh.traitText, { color:accent }]}>
            {player.draftRound === 1 ? "Elite Prospect" : "Sleeper Pick"} → {player.developmentTrait}
          </Text>
        </View>
      )}
    </View>
  );
}
const dh = StyleSheet.create({
  card:       { borderRadius:14, borderWidth:1, padding:14, overflow:"hidden", marginBottom:10 },
  header:     { flexDirection:"row", alignItems:"center", gap:8, marginBottom:8 },
  roundBadge: { flex:1, borderRadius:8, borderWidth:1, paddingHorizontal:10, paddingVertical:5 },
  roundText:  { fontFamily:"Inter_700Bold", fontSize:11 },
  roundYear:  { fontFamily:"Inter_400Regular", fontSize:9 },
  posBadge:   { paddingHorizontal:7, paddingVertical:4, borderRadius:6, borderWidth:1 },
  posText:    { fontFamily:"Inter_700Bold", fontSize:9, letterSpacing:0.4 },
  ovrBadge:   { paddingHorizontal:10, paddingVertical:4, borderRadius:8 },
  ovrVal:     { fontFamily:"Inter_700Bold", fontSize:20 },
  name:       { fontFamily:"Inter_700Bold", fontSize:16, letterSpacing:-0.2 },
  college:    { fontFamily:"Inter_400Regular", fontSize:11, marginTop:2 },
  bottom:     { flexDirection:"row", alignItems:"center", gap:8, marginTop:10, paddingTop:10, borderTopWidth:1 },
  statVal:    { fontFamily:"Inter_700Bold", fontSize:18 },
  statLbl:    { fontFamily:"Inter_700Bold", fontSize:9, letterSpacing:0.8, opacity:0.65 },
  seasons:    { fontFamily:"Inter_400Regular", fontSize:11, marginLeft:"auto" as any },
  traitTag:   { flexDirection:"row", alignItems:"center", gap:5, marginTop:8,
                paddingHorizontal:8, paddingVertical:4, borderRadius:6, alignSelf:"flex-start" },
  traitText:  { fontFamily:"Inter_600SemiBold", fontSize:10 },
});

// ── Franchise Record Row ──────────────────────────────────────────────────────
function FranRecordRow({ rank, player, label, value, accent }: {
  rank: number; player: Player; label: string; value: string; accent: string;
}) {
  const colors = useColors();
  const pc     = POS_COLOR[player.position];
  const medals = ["🥇","🥈","🥉"];
  const medalC = ["#FFD700","#C0C0C0","#CD7F32"];
  return (
    <View style={[fr.row, {
      backgroundColor: rank%2===0 ? colors.card : colors.background,
      borderBottomColor: colors.secondary,
    }]}>
      <Text style={[fr.rank, { color: rank<=3 ? medalC[rank-1] : colors.mutedForeground,
        fontFamily: rank<=3 ? "Inter_700Bold" : "Inter_400Regular" }]}>
        {rank<=3 ? medals[rank-1] : rank}
      </Text>
      <View style={[fr.posBadge, { backgroundColor:pc+"20", borderColor:pc+"55" }]}>
        <Text style={[fr.posText, { color:pc }]}>{player.position}</Text>
      </View>
      <Text style={[fr.name, { color:colors.foreground }]} numberOfLines={1}>{player.name}</Text>
      <View style={fr.statCell}>
        <Text style={[fr.statVal, { color:accent }]}>{value}</Text>
        <Text style={[fr.statLbl, { color:colors.mutedForeground }]}>{label}</Text>
      </View>
    </View>
  );
}
const fr = StyleSheet.create({
  row:      { flexDirection:"row", alignItems:"center", paddingHorizontal:14,
              paddingVertical:10, borderBottomWidth:0.5, gap:8 },
  rank:     { width:24, fontSize:13, textAlign:"center" },
  posBadge: { paddingHorizontal:5, paddingVertical:2, borderRadius:5, borderWidth:1 },
  posText:  { fontFamily:"Inter_700Bold", fontSize:8, letterSpacing:0.4 },
  name:     { flex:1, fontFamily:"Inter_600SemiBold", fontSize:14, letterSpacing:-0.2 },
  statCell: { alignItems:"flex-end", minWidth:60 },
  statVal:  { fontFamily:"Inter_700Bold", fontSize:15 },
  statLbl:  { fontFamily:"Inter_700Bold", fontSize:8, letterSpacing:0.8, opacity:0.65 },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────

type RecordCat = "passing" | "rushing" | "receiving" | "defense";

export default function LegacyScreen() {
  const colors = useColors();
  const theme  = useTeamTheme();
  const { season } = useNFL();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 0 : insets.top;
  const [recordCat, setRecordCat] = useState<RecordCat>("passing");

  const tc  = theme.primary;
  const tc2 = theme.secondary;

  const playerTeam = useMemo(() =>
    season?.teams.find(t => t.id === season.playerTeamId), [season]);

  const history = season?.history ?? { vflBowls: [], hofEntries: [] };
  const myBowls = history.vflBowls.filter(b => b.winnerTeamId === season?.playerTeamId);

  // Check current season championship
  const currentChampion = season?.vflBowlWinnerId === season?.playerTeamId;

  // Cornerstone players — current roster, high experience + good rating
  const cornerstones = useMemo(() => {
    if (!playerTeam) return [];
    return playerTeam.roster
      .filter(p => p.yearsExperience >= 3 && p.overall >= 77)
      .sort((a,b) => (b.overall * 0.6 + b.yearsExperience * 2) - (a.overall * 0.6 + a.yearsExperience * 2))
      .slice(0, 8);
  }, [playerTeam]);

  // Draft heroes — players drafted by user's team
  const draftHeroes = useMemo(() => {
    if (!playerTeam) return [];
    return playerTeam.roster
      .filter(p => p.draftTeamId === season?.playerTeamId && (p.draftRound ?? 8) <= 4 && p.overall >= 74)
      .sort((a,b) => b.overall - a.overall)
      .slice(0, 6);
  }, [playerTeam, season]);

  // Franchise records — all-time leaders from current roster
  const franRecords = useMemo(() => {
    if (!playerTeam) return { passing:[], rushing:[], receiving:[], defense:[] };
    const withTotals = playerTeam.roster.map(p => ({ p, tot: sumCareer(p) }));

    const top = (
      filter: (p:Player)=>boolean,
      get: (s:PlayerSeasonStats)=>number,
      label: string,
      fmt: (v:number)=>string,
    ) => withTotals
      .filter(x => filter(x.p))
      .map(x => ({ player:x.p, val:get(x.tot), label, value:fmt(get(x.tot)) }))
      .filter(x => x.val > 0)
      .sort((a,b) => b.val-a.val)
      .slice(0,5);

    return {
      passing:   top(p=>p.position==="QB", s=>s.passingYards,   "PASS YDS", v=>v.toLocaleString()),
      rushing:   top(p=>["RB","QB"].includes(p.position), s=>s.rushingYards, "RUSH YDS", v=>v.toLocaleString()),
      receiving: top(p=>["WR","TE","RB"].includes(p.position), s=>s.receivingYards, "REC YDS", v=>v.toLocaleString()),
      defense:   top(p=>["DE","DT","LB","CB","S"].includes(p.position), s=>s.tackles, "TACKLES", v=>String(v)),
    };
  }, [playerTeam]);

  const teamCity = playerTeam?.city ?? "Your";
  const teamName = playerTeam?.name ?? "Team";

  return (
    <View style={[lg.root, { backgroundColor:colors.background }]}>

      {/* ── Hero Header ─────────────────────────────────────────────────────── */}
      <View style={[lg.hero, { paddingTop: topPad + (Platform.OS === "web" ? 16 : 20) }]}>
        <LinearGradient
          colors={[tc+"60", tc+"28", "transparent"]}
          locations={[0, 0.6, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={lg.heroContent}>
          <View style={{ flexDirection:"row", alignItems:"center", gap:10, marginBottom:6 }}>
            <Text style={[lg.cityText, { color:onColor(tc)==="#111111" ? tc+"DD" : "#ffffffCC" }]}>
              {teamCity.toUpperCase()}
            </Text>
            {myBowls.length > 0 && (
              <View style={[lg.ringCount, { backgroundColor:"#FFD700" }]}>
                <Text style={lg.ringText}>{"🏆".repeat(Math.min(myBowls.length,4))} {myBowls.length}</Text>
              </View>
            )}
          </View>
          <Text style={[lg.nameText, { color:colors.foreground }]}>{teamName}</Text>
          <Text style={[lg.subtitle, { color:colors.mutedForeground }]}>FRANCHISE LEGACY</Text>
          <View style={[lg.divider, { backgroundColor:tc+"80" }]} />
          <Text style={[lg.tagline, { color:colors.mutedForeground }]}>
            {myBowls.length === 0
              ? "The trophy room awaits — your legacy starts here."
              : myBowls.length === 1
              ? "Champions once. The journey to dynasty begins."
              : `${myBowls.length}× VFL Bowl champions. A dynasty is born.`}
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom:120, gap:0 }}>

        {/* ── Championship Banners ──────────────────────────────────────────── */}
        <View style={lg.section}>
          <SectionHeader icon="award" title="Championship Banners"
            sub={myBowls.length > 0 ? `${myBowls.length} VFL Bowl title${myBowls.length!==1?"s":""}` : undefined}
            accent={tc} />

          {myBowls.length === 0 && !currentChampion ? (
            <View style={[lg.emptyState, { borderColor:tc+"30" }]}>
              <LinearGradient colors={[tc+"12","transparent"]} style={StyleSheet.absoluteFill} />
              <Text style={lg.emptyIcon}>🏟️</Text>
              <Text style={[lg.emptyTitle, { color:colors.foreground }]}>No banners raised yet</Text>
              <Text style={[lg.emptyBody, { color:colors.mutedForeground }]}>
                Win the VFL Bowl to hang your first banner in the rafters.
              </Text>
            </View>
          ) : (
            <>
              {/* Current season banner (before rollover) */}
              {currentChampion && (
                <ChampionshipBanner
                  bowl={{
                    year: season!.year,
                    winnerTeamCity: playerTeam?.city ?? "",
                    winnerTeamName: playerTeam?.name ?? "",
                    winnerTeamColor: tc,
                    loserTeamCity: "Opponent", loserTeamName: "",
                    winnerScore: 0, loserScore: 0,
                    mvpPlayerName: "Season MVP", mvpPosition: "QB",
                  }}
                  isPlayerTeam
                />
              )}
              {/* Historic banners — newest first */}
              {[...myBowls].reverse().map((bowl, i) => (
                <ChampionshipBanner key={i} bowl={bowl} isPlayerTeam />
              ))}
            </>
          )}

          {/* Show all other team's baner count */}
          {history.vflBowls.filter(b => b.winnerTeamId !== season?.playerTeamId).length > 0 && (
            <View style={[lg.otherChamps, { backgroundColor:colors.secondary, borderColor:colors.border }]}>
              <Feather name="info" size={12} color={colors.mutedForeground} />
              <Text style={[lg.otherChampsText, { color:colors.mutedForeground }]}>
                {history.vflBowls.filter(b=>b.winnerTeamId!==season?.playerTeamId).length} other franchise championship{history.vflBowls.filter(b=>b.winnerTeamId!==season?.playerTeamId).length!==1?"s":""} recorded
              </Text>
            </View>
          )}
        </View>

        {/* ── Cornerstone Players ───────────────────────────────────────────── */}
        <View style={lg.section}>
          <SectionHeader icon="star" title="Cornerstone Players"
            sub="Franchise-defining talent on your current roster"
            accent={tc} />
          {cornerstones.length === 0 ? (
            <View style={[lg.emptyState, { borderColor:tc+"30" }]}>
              <LinearGradient colors={[tc+"12","transparent"]} style={StyleSheet.absoluteFill} />
              <Text style={lg.emptyIcon}>🌱</Text>
              <Text style={[lg.emptyTitle, { color:colors.foreground }]}>Still Building</Text>
              <Text style={[lg.emptyBody, { color:colors.mutedForeground }]}>
                Players with 3+ years experience and 77+ OVR become cornerstones automatically.
              </Text>
            </View>
          ) : (
            <View style={lg.grid}>
              {cornerstones.map(p => (
                <CornerStoneCard key={p.id} player={p} accent={tc} />
              ))}
            </View>
          )}
        </View>

        {/* ── Draft to Legend ───────────────────────────────────────────────── */}
        <View style={lg.section}>
          <SectionHeader icon="trending-up" title="Draft to Legend"
            sub="Your homegrown stars drafted and developed"
            accent={tc} />
          {draftHeroes.length === 0 ? (
            <View style={[lg.emptyState, { borderColor:tc+"30" }]}>
              <LinearGradient colors={[tc+"12","transparent"]} style={StyleSheet.absoluteFill} />
              <Text style={lg.emptyIcon}>📋</Text>
              <Text style={[lg.emptyTitle, { color:colors.foreground }]}>No draft legends yet</Text>
              <Text style={[lg.emptyBody, { color:colors.mutedForeground }]}>
                Players you drafted who reach 74+ OVR appear here as they develop.
              </Text>
            </View>
          ) : (
            <View>
              {draftHeroes.map(p => (
                <DraftHeroCard key={p.id} player={p} accent={tc} playerTeamId={season?.playerTeamId ?? ""} />
              ))}
            </View>
          )}
        </View>

        {/* ── Franchise All-Time Records ────────────────────────────────────── */}
        <View style={lg.section}>
          <SectionHeader icon="bar-chart-2" title="Franchise Records"
            sub="All-time career leaders in your franchise"
            accent={tc} />

          {/* Category tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap:8, paddingBottom:12 }}>
            {(["passing","rushing","receiving","defense"] as RecordCat[]).map(cat => {
              const active = cat === recordCat;
              return (
                <TouchableOpacity key={cat}
                  onPress={() => setRecordCat(cat)}
                  style={[lg.catPill, {
                    backgroundColor: active ? tc : tc+"18",
                    borderColor:     active ? tc : tc+"35",
                  }]}>
                  <Text style={[lg.catLabel, { color: active ? "#fff" : "rgba(255,255,255,0.55)" }]}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Column header */}
          <View style={[lg.recHeader, { backgroundColor:tc+"25", borderBottomColor:tc+"50" }]}>
            <Text style={[lg.recHdrRank, { color:tc }]}>#</Text>
            <Text style={[lg.recHdrPos,  { color:tc }]}>POS</Text>
            <Text style={[lg.recHdrName, { color:tc }]}>PLAYER</Text>
            <Text style={[lg.recHdrVal,  { color:tc }]}>
              {recordCat==="passing" ? "PASS YDS" : recordCat==="rushing" ? "RUSH YDS" :
               recordCat==="receiving" ? "REC YDS" : "TACKLES"}
            </Text>
          </View>

          {franRecords[recordCat].length === 0 ? (
            <View style={{ paddingVertical:24, alignItems:"center" }}>
              <Text style={{ color:colors.mutedForeground, fontFamily:"Inter_400Regular", fontSize:13 }}>
                No stats recorded yet — simulate some games!
              </Text>
            </View>
          ) : franRecords[recordCat].map((r, i) => (
            <FranRecordRow key={r.player.id} rank={i+1}
              player={r.player} label={r.label} value={r.value} accent={tc} />
          ))}
        </View>

        {/* ── Hall of Fame Gallery ──────────────────────────────────────────── */}
        <View style={lg.section}>
          <SectionHeader icon="shield" title="Hall of Fame Gallery"
            sub="Franchise legends retired in glory"
            accent="#FFD700" />

          {history.hofEntries.length === 0 ? (
            <View style={[lg.emptyState, { borderColor:"#FFD700"+"40" }]}>
              <LinearGradient colors={["#FFD700"+"18","transparent"]} style={StyleSheet.absoluteFill} />
              <Text style={lg.emptyIcon}>🏅</Text>
              <Text style={[lg.emptyTitle, { color:colors.foreground }]}>No inductees yet</Text>
              <Text style={[lg.emptyBody, { color:colors.mutedForeground }]}>
                Hall of Fame voting and jersey retirement coming soon.{"\n"}
                Great players build toward immortality here.
              </Text>
            </View>
          ) : (
            history.hofEntries.map((entry, i) => (
              <View key={i} style={[lg.hofCard, { backgroundColor:colors.card, borderColor:"#FFD70080" }]}>
                <LinearGradient colors={["#FFD70018","transparent"]} style={StyleSheet.absoluteFill} />
                <View style={[lg.hofBadge, { backgroundColor:"#FFD700" }]}>
                  <Text style={lg.hofBadgeText}>HOF</Text>
                </View>
                <Text style={[lg.hofName, { color:colors.foreground }]}>{entry.playerName}</Text>
                <Text style={[lg.hofPos,  { color:colors.mutedForeground }]}>
                  {entry.position} · {entry.seasons} seasons · Inducted {entry.inductionYear}
                </Text>
                {entry.retiredNumber && (
                  <View style={[lg.retiredNum, { borderColor:"#FFD700" }]}>
                    <Text style={[lg.retiredNumText, { color:"#FFD700" }]}>#{entry.retiredNumber}</Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>

      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const lg = StyleSheet.create({
  root:      { flex:1 },
  hero:      { paddingBottom:24, overflow:"hidden" },
  heroContent: { paddingHorizontal:20 },
  cityText:  { fontFamily:"Inter_700Bold", fontSize:11, letterSpacing:3 },
  nameText:  { fontFamily:"Inter_700Bold", fontSize:32, letterSpacing:-0.5 },
  subtitle:  { fontFamily:"Inter_700Bold", fontSize:10, letterSpacing:3, marginTop:2 },
  divider:   { height:2, borderRadius:1, marginVertical:10, width:48 },
  tagline:   { fontFamily:"Inter_400Regular", fontSize:13, lineHeight:18 },
  ringCount: { paddingHorizontal:10, paddingVertical:4, borderRadius:10 },
  ringText:  { fontFamily:"Inter_700Bold", fontSize:12, color:"#111" },
  section:   { paddingHorizontal:16, paddingTop:20 },
  grid:      { flexDirection:"row", flexWrap:"wrap", gap:10 },
  emptyState:{ borderRadius:14, borderWidth:1, overflow:"hidden",
               alignItems:"center", padding:28, gap:8, marginBottom:4 },
  emptyIcon: { fontSize:36 },
  emptyTitle:{ fontFamily:"Inter_700Bold", fontSize:15 },
  emptyBody: { fontFamily:"Inter_400Regular", fontSize:13, textAlign:"center", lineHeight:18 },
  otherChamps: { flexDirection:"row", alignItems:"center", gap:6, borderRadius:8,
                 borderWidth:1, padding:10, marginTop:6 },
  otherChampsText: { fontFamily:"Inter_400Regular", fontSize:12 },
  catPill:   { paddingHorizontal:14, paddingVertical:7, borderRadius:20, borderWidth:1 },
  catLabel:  { fontFamily:"Inter_600SemiBold", fontSize:12 },
  recHeader: { flexDirection:"row", alignItems:"center", paddingHorizontal:14,
               paddingVertical:7, borderBottomWidth:1.5 },
  recHdrRank:{ width:24, fontFamily:"Inter_700Bold", fontSize:9, textAlign:"center" },
  recHdrPos: { width:36, fontFamily:"Inter_700Bold", fontSize:9 },
  recHdrName:{ flex:1, fontFamily:"Inter_700Bold", fontSize:9 },
  recHdrVal: { width:80, fontFamily:"Inter_700Bold", fontSize:9, textAlign:"right" },
  hofCard:   { borderRadius:14, borderWidth:1.5, padding:16, overflow:"hidden",
               marginBottom:10, flexDirection:"row", alignItems:"center", gap:12 },
  hofBadge:  { paddingHorizontal:10, paddingVertical:6, borderRadius:8 },
  hofBadgeText: { fontFamily:"Inter_700Bold", fontSize:12, color:"#111" },
  hofName:   { fontFamily:"Inter_700Bold", fontSize:16, flex:1 },
  hofPos:    { fontFamily:"Inter_400Regular", fontSize:11 },
  retiredNum:{ borderRadius:8, borderWidth:2, paddingHorizontal:8, paddingVertical:4 },
  retiredNumText: { fontFamily:"Inter_700Bold", fontSize:18 },
});
