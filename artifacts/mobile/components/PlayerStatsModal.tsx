import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import {
  POS_RATING_KEYS, POS_RATING_LABELS,
  type NFLPosition, type Player, type PlayerSeasonStats,
} from "@/context/types";

// ─── Contrast utility (matches KitToggle logic) ───────────────────────────────
function hexLum(hex: string): number {
  const h = hex.replace("#", "").slice(0, 6).padEnd(6, "0");
  const [r, g, b] = [0, 2, 4].map(i => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
// Returns "#111111" for light backgrounds, "#ffffff" for dark
function onColor(hex: string): "#111111" | "#ffffff" {
  return hexLum(hex.slice(0, 7)) > 0.35 ? "#111111" : "#ffffff";
}

// Returns a version of `hex` that is legible on a dark modal background.
// White/near-white → muted grey. Very dark (navy, black) → boosted by +110.
function readableOnDark(hex: string): string {
  const lum = hexLum(hex.slice(0, 7));
  if (lum > 0.6) return "#9090A8";                        // white/light → grey
  if (lum > 0.04) return hex.slice(0, 7) + "BB";         // normal → 73% opacity
  const h = hex.replace("#", "").slice(0, 6).padEnd(6, "0");
  const [r, g, b] = [0, 2, 4].map(i =>
    Math.min(255, parseInt(h.slice(i, i + 2), 16) + 110)
  );
  const t = (n: number) => n.toString(16).padStart(2, "0");
  return `#${t(r)}${t(g)}${t(b)}BB`;                     // very dark → brightened
}

// ─── Position colors ───────────────────────────────────────────────────────────
const POS_COLOR: Record<NFLPosition, string> = {
  QB:"#E31837", RB:"#FB4F14", WR:"#FFC20E", TE:"#00B5E2",
  OL:"#8B949E", DE:"#3FB950", DT:"#26A69A", LB:"#1F6FEB",
  CB:"#6E40C9", S:"#9C27B0",  K:"#FF7043", P:"#795548",
};

const ROUND_COLORS: Record<string, string> = {
  "1":"#FFD700","2":"#FF6B35","3":"#3FB950","4":"#00B5E2",
  "5":"#8B949E","6":"#795548","7":"#525252",
};

const DEV_COLORS: Record<string, string> = {
  "X-Factor":"#FFD700", Superstar:"#FF6B35", Star:"#3FB950",
  Normal:"#8B949E", "Late Bloomer":"#00B5E2",
};
const DEV_ICONS: Record<string, string> = {
  "X-Factor":"zap", Superstar:"star", Star:"award",
  Normal:"user", "Late Bloomer":"trending-up",
};

function ovrColor(v: number) {
  if (v >= 90) return "#FFD700";
  if (v >= 80) return "#3FB950";
  if (v >= 70) return "#FFC107";
  return "#E31837";
}

// ─── Compact stat card (Topps-style) ──────────────────────────────────────────
function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  const colors = useColors();
  return (
    <View style={[card.box, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
      <Text style={[card.val, { color: accent ?? colors.foreground }]} numberOfLines={1}>{value}</Text>
      <Text style={[card.lbl, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}
const card = StyleSheet.create({
  box: { flex:1, alignItems:"center", justifyContent:"center",
         paddingVertical:8, paddingHorizontal:4,
         borderRadius:8, borderWidth:1, minWidth:0 },
  val: { fontSize:16, fontFamily:"Inter_700Bold", letterSpacing:-0.3 },
  lbl: { fontSize:8, fontFamily:"Inter_700Bold", letterSpacing:0.8, marginTop:2 },
});

function CardRow({ cells }: { cells: { label: string; value: string | number; accent?: string }[] }) {
  return (
    <View style={{ flexDirection:"row", gap:5, marginBottom:5 }}>
      {cells.map(c => <StatCard key={c.label} {...c} />)}
    </View>
  );
}

function SectionLabel({ text, accent }: { text: string; accent?: string }) {
  const colors = useColors();
  return (
    <View style={[sec.wrap, { borderLeftColor: accent ?? colors.mutedForeground }]}>
      <Text style={[sec.text, { color: colors.mutedForeground }]}>{text}</Text>
    </View>
  );
}
const sec = StyleSheet.create({
  wrap: { borderLeftWidth:2, paddingLeft:7, marginBottom:7, marginTop:12 },
  text: { fontSize:9, fontFamily:"Inter_700Bold", letterSpacing:1.2 },
});

function Empty({ message }: { message: string }) {
  const colors = useColors();
  return (
    <View style={{ alignItems:"center", paddingVertical:32, gap:10 }}>
      <Feather name="bar-chart-2" size={28} color={colors.border} />
      <Text style={{ color:colors.mutedForeground, fontSize:12, fontFamily:"Inter_500Medium",
        textAlign:"center", lineHeight:18 }}>{message}</Text>
    </View>
  );
}

// ─── Season stats grid ─────────────────────────────────────────────────────────
function SeasonStats({ pos, stats, accent, gp }: {
  pos: NFLPosition; stats: PlayerSeasonStats; accent: string; gp?: number;
}) {
  const colors = useColors();
  const hasAny = stats.passingYards + stats.rushingYards + stats.receivingYards +
    stats.tackles + stats.sacks + stats.fieldGoalsMade + stats.puntsAverage > 0;
  if (!hasAny) return <Empty message="No stats recorded this season yet." />;

  const pct  = (n: number, d: number) => d === 0 ? "—" : `${((n/d)*100).toFixed(1)}%`;
  const dec  = (n: number, p = 1)    => n.toFixed(p);
  const fmt  = (n: number)           => n === 0 ? "—" : n.toLocaleString();
  const green = "#3FB950"; const red = "#E31837";

  return (
    <View>
      {gp !== undefined && (
        <Text style={{ color:colors.mutedForeground, fontSize:9, fontFamily:"Inter_700Bold",
          letterSpacing:1, marginBottom:6 }}>{gp} GAMES PLAYED</Text>
      )}
      {pos === "QB" && <>
        <SectionLabel text="PASSING" accent={accent} />
        <CardRow cells={[
          { label:"ATT",  value:fmt(stats.attempts) },
          { label:"CMP",  value:fmt(stats.completions) },
          { label:"CMP%", value:stats.attempts>0 ? pct(stats.completions, stats.attempts) : "—", accent },
          { label:"YDS",  value:fmt(stats.passingYards), accent },
        ]} />
        <CardRow cells={[
          { label:"TD",  value:fmt(stats.passingTDs), accent:green },
          { label:"INT", value:fmt(stats.interceptions), accent:stats.interceptions>0 ? red : undefined },
          { label:"RTG", value:stats.qbRating>0 ? dec(stats.qbRating) : "—", accent },
          { label:"YPA", value:stats.attempts>0 ? dec(stats.passingYards/stats.attempts) : "—" },
        ]} />
        {stats.carries > 0 && <>
          <SectionLabel text="RUSHING" accent={accent} />
          <CardRow cells={[
            { label:"CAR", value:fmt(stats.carries) },
            { label:"YDS", value:fmt(stats.rushingYards), accent },
            { label:"TD",  value:fmt(stats.rushingTDs), accent:green },
            { label:"AVG", value:stats.carries>0 ? dec(stats.rushingYards/stats.carries) : "—" },
          ]} />
        </>}
      </>}
      {pos === "RB" && <>
        <SectionLabel text="RUSHING" accent={accent} />
        <CardRow cells={[
          { label:"CAR", value:fmt(stats.carries) },
          { label:"YDS", value:fmt(stats.rushingYards), accent },
          { label:"YPC", value:stats.carries>0 ? dec(stats.rushingYards/stats.carries) : "—", accent },
          { label:"TD",  value:fmt(stats.rushingTDs), accent:green },
        ]} />
        {stats.targets > 0 && <>
          <SectionLabel text="RECEIVING" accent={accent} />
          <CardRow cells={[
            { label:"TGT", value:fmt(stats.targets) },
            { label:"REC", value:fmt(stats.receptions) },
            { label:"YDS", value:fmt(stats.receivingYards), accent },
            { label:"TD",  value:fmt(stats.receivingTDs), accent:green },
          ]} />
        </>}
      </>}
      {(pos === "WR" || pos === "TE") && <>
        <SectionLabel text="RECEIVING" accent={accent} />
        <CardRow cells={[
          { label:"TGT",  value:fmt(stats.targets) },
          { label:"REC",  value:fmt(stats.receptions), accent },
          { label:"YDS",  value:fmt(stats.receivingYards), accent },
          { label:"YPR",  value:stats.receptions>0 ? dec(stats.receivingYards/stats.receptions) : "—" },
        ]} />
        <CardRow cells={[
          { label:"TD",   value:fmt(stats.receivingTDs), accent:green },
          { label:"CTH%", value:stats.targets>0 ? pct(stats.receptions, stats.targets) : "—" },
        ]} />
      </>}
      {["DE","DT","LB","CB","S"].includes(pos) && <>
        <SectionLabel text="DEFENSE" accent={accent} />
        <CardRow cells={[
          { label:"TCK",  value:fmt(stats.tackles), accent },
          { label:"SACK", value:stats.sacks>0 ? dec(stats.sacks) : "—", accent:stats.sacks>0 ? green : undefined },
          { label:"INT",  value:fmt(stats.defensiveINTs), accent:stats.defensiveINTs>0 ? "#FFC20E" : undefined },
          { label:"PD",   value:fmt(stats.passDeflections) },
        ]} />
        <CardRow cells={[{ label:"FF", value:fmt(stats.forcedFumbles) }]} />
      </>}
      {pos === "K" && <>
        <SectionLabel text="KICKING" accent={accent} />
        <CardRow cells={[
          { label:"FGM", value:fmt(stats.fieldGoalsMade), accent },
          { label:"FGA", value:fmt(stats.fieldGoalsAttempted) },
          { label:"FG%", value:stats.fieldGoalsAttempted>0 ? pct(stats.fieldGoalsMade, stats.fieldGoalsAttempted) : "—", accent },
        ]} />
      </>}
      {pos === "P" && <>
        <SectionLabel text="PUNTING" accent={accent} />
        <CardRow cells={[{ label:"P.AVG", value:stats.puntsAverage>0 ? dec(stats.puntsAverage) : "—", accent }]} />
      </>}
      {pos === "OL" && <Empty message="OL grades available in a future update." />}
    </View>
  );
}

// ─── Career stat sum helper ────────────────────────────────────────────────────
function sumCareerStats(seasons: PlayerSeasonStats[]): PlayerSeasonStats {
  const t = seasons.reduce<PlayerSeasonStats>((acc, s) => ({
    season: undefined,
    gamesPlayed:          acc.gamesPlayed          + s.gamesPlayed,
    passingYards:         acc.passingYards          + s.passingYards,
    passingTDs:           acc.passingTDs            + s.passingTDs,
    interceptions:        acc.interceptions          + s.interceptions,
    completions:          acc.completions            + s.completions,
    attempts:             acc.attempts               + s.attempts,
    qbRating:             0, // computed below
    rushingYards:         acc.rushingYards           + s.rushingYards,
    rushingTDs:           acc.rushingTDs             + s.rushingTDs,
    carries:              acc.carries                + s.carries,
    receivingYards:       acc.receivingYards         + s.receivingYards,
    receivingTDs:         acc.receivingTDs           + s.receivingTDs,
    receptions:           acc.receptions             + s.receptions,
    targets:              acc.targets                + s.targets,
    tackles:              acc.tackles                + s.tackles,
    sacks:                acc.sacks                  + s.sacks,
    forcedFumbles:        acc.forcedFumbles           + s.forcedFumbles,
    defensiveINTs:        acc.defensiveINTs           + s.defensiveINTs,
    passDeflections:      acc.passDeflections         + s.passDeflections,
    yardsPerCarry:        0,
    yardsPerCatch:        0,
    fieldGoalsMade:       acc.fieldGoalsMade          + s.fieldGoalsMade,
    fieldGoalsAttempted:  acc.fieldGoalsAttempted     + s.fieldGoalsAttempted,
    puntsAverage:         0,
  }), {
    gamesPlayed:0, passingYards:0, passingTDs:0, interceptions:0, completions:0, attempts:0,
    qbRating:0, rushingYards:0, rushingTDs:0, carries:0, receivingYards:0, receivingTDs:0,
    receptions:0, targets:0, tackles:0, sacks:0, forcedFumbles:0, defensiveINTs:0,
    passDeflections:0, yardsPerCarry:0, yardsPerCatch:0, fieldGoalsMade:0, fieldGoalsAttempted:0,
    puntsAverage:0,
  });
  // Weighted QB rating
  const totalAttempts = seasons.reduce((a, s) => a + s.attempts, 0);
  t.qbRating = totalAttempts > 0
    ? seasons.reduce((a, s) => a + s.qbRating * s.attempts, 0) / totalAttempts
    : 0;
  t.yardsPerCarry = t.carries > 0 ? t.rushingYards / t.carries : 0;
  t.yardsPerCatch = t.receptions > 0 ? t.receivingYards / t.receptions : 0;
  const puntSeasons = seasons.filter(s => s.puntsAverage > 0);
  t.puntsAverage = puntSeasons.length > 0
    ? puntSeasons.reduce((a, s) => a + s.puntsAverage, 0) / puntSeasons.length
    : 0;
  return t;
}

// Build the cells array for a single season stat line (shared by season rows + career totals)
function buildStatCells(pos: NFLPosition, s: PlayerSeasonStats): { label:string; value:string }[] {
  const dec = (n: number, p = 1) => n > 0 ? n.toFixed(p) : "—";
  const fmt = (n: number) => n > 0 ? n.toLocaleString() : "—";
  if (pos === "QB") return [
    { label:"YDS",  value: fmt(s.passingYards) },
    { label:"TD",   value: s.passingTDs > 0 ? String(s.passingTDs) : "—" },
    { label:"INT",  value: s.interceptions > 0 ? String(s.interceptions) : "—" },
    { label:"CMP%", value: s.attempts > 0 ? `${((s.completions/s.attempts)*100).toFixed(0)}%` : "—" },
    { label:"RTG",  value: s.qbRating > 0 ? s.qbRating.toFixed(1) : "—" },
  ];
  if (pos === "RB") return [
    { label:"CAR", value: s.carries > 0 ? String(s.carries) : "—" },
    { label:"YDS", value: fmt(s.rushingYards) },
    { label:"YPC", value: s.carries > 0 ? dec(s.rushingYards / s.carries) : "—" },
    { label:"TD",  value: s.rushingTDs > 0 ? String(s.rushingTDs) : "—" },
  ];
  if (pos === "WR" || pos === "TE") return [
    { label:"REC", value: s.receptions > 0 ? String(s.receptions) : "—" },
    { label:"YDS", value: fmt(s.receivingYards) },
    { label:"YPR", value: s.receptions > 0 ? dec(s.receivingYards / s.receptions) : "—" },
    { label:"TD",  value: s.receivingTDs > 0 ? String(s.receivingTDs) : "—" },
  ];
  if (pos === "K") return [
    { label:"FGM", value: s.fieldGoalsMade > 0 ? String(s.fieldGoalsMade) : "—" },
    { label:"FGA", value: s.fieldGoalsAttempted > 0 ? String(s.fieldGoalsAttempted) : "—" },
    { label:"FG%", value: s.fieldGoalsAttempted > 0 ? `${((s.fieldGoalsMade/s.fieldGoalsAttempted)*100).toFixed(0)}%` : "—" },
  ];
  if (pos === "P") return [
    { label:"AVG", value: dec(s.puntsAverage) },
  ];
  return [
    { label:"TCK",  value: s.tackles > 0 ? String(s.tackles) : "—" },
    { label:"SACK", value: s.sacks > 0 ? s.sacks.toFixed(1) : "—" },
    { label:"INT",  value: s.defensiveINTs > 0 ? String(s.defensiveINTs) : "—" },
    { label:"PD",   value: s.passDeflections > 0 ? String(s.passDeflections) : "—" },
  ];
}

// ─── Career history rows ───────────────────────────────────────────────────────
function CareerSection({ career, currentStats, pos, accent }: {
  career: PlayerSeasonStats[]; currentStats: PlayerSeasonStats;
  pos: NFLPosition; accent: string;
}) {
  const colors = useColors();
  if (career.length === 0) return <Empty message="No career history yet. Stats archive after each season." />;

  // All seasons including current (if it has any data)
  const hasCurrentData = currentStats.gamesPlayed > 0;
  const allSeasons = hasCurrentData ? [...career, currentStats] : career;
  const totals = sumCareerStats(allSeasons);

  return (
    <View style={{ gap:6 }}>
      {[...career].reverse().map((s, i) => (
        <View key={i} style={[cr.row, { backgroundColor:colors.card, borderColor:colors.border }]}>
          <View style={[cr.badge, { backgroundColor:accent+"20", borderColor:accent+"40" }]}>
            <Text style={[cr.yr, { color:accent }]}>{s.season ?? "—"}</Text>
            <Text style={[cr.gp, { color:colors.mutedForeground }]}>{s.gamesPlayed}G</Text>
          </View>
          <View style={cr.chips}>
            {buildStatCells(pos, s).map(c => (
              <View key={c.label} style={cr.chip}>
                <Text style={[cr.chipVal, { color:colors.foreground }]}>{c.value}</Text>
                <Text style={[cr.chipLbl, { color:colors.mutedForeground }]}>{c.label}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}

      {/* ── Topps-style career totals line ── */}
      <View style={[cr.divider, { borderColor: accent + "50" }]} />
      <View style={[cr.row, cr.totalsRow, { backgroundColor: accent + "14", borderColor: accent + "50" }]}>
        <View style={[cr.badge, { backgroundColor: accent + "35", borderColor: accent }]}>
          <Text style={[cr.yr, { color: accent, fontSize:10, letterSpacing:0.5 }]}>TOTL</Text>
          <Text style={[cr.gp, { color: accent + "BB" }]}>{totals.gamesPlayed}G</Text>
        </View>
        <View style={cr.chips}>
          {buildStatCells(pos, totals).map(c => (
            <View key={c.label} style={cr.chip}>
              <Text style={[cr.chipVal, { color: accent, fontSize:14 }]}>{c.value}</Text>
              <Text style={[cr.chipLbl, { color: accent + "99" }]}>{c.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
const cr = StyleSheet.create({
  row:       { flexDirection:"row", alignItems:"center", borderRadius:10, borderWidth:1, padding:10, gap:8 },
  totalsRow: { borderWidth:1.5 },
  divider:   { borderTopWidth:1.5, borderStyle:"dashed", marginVertical:4 },
  badge:     { width:42, alignItems:"center", paddingVertical:4, borderRadius:7, borderWidth:1 },
  yr:        { fontSize:12, fontFamily:"Inter_700Bold" },
  gp:        { fontSize:8,  fontFamily:"Inter_500Medium" },
  chips:     { flex:1, flexDirection:"row", justifyContent:"space-around" },
  chip:      { alignItems:"center" },
  chipVal:   { fontSize:13, fontFamily:"Inter_700Bold" },
  chipLbl:   { fontSize:8, fontFamily:"Inter_700Bold", letterSpacing:0.6, opacity:0.55, marginTop:1 },
});

// ─── Ratings tab ───────────────────────────────────────────────────────────────
function RatingsTab({ player, accent, secondary }: { player: Player; accent: string; secondary: string }) {
  const colors = useColors();
  const keys   = POS_RATING_KEYS[player.position];
  return (
    <View style={{ gap:0 }}>
      {/* Overall strip */}
      <View style={[rt.ovrStrip, { backgroundColor:accent+"18", borderColor:accent+"35" }]}>
        <Text style={[rt.ovrLabel, { color:colors.mutedForeground }]}>OVERALL</Text>
        <Text style={[rt.ovrVal, { color:accent }]}>{player.overall}</Text>
        <View style={{ flex:1 }}>
          <View style={[rt.barTrack, { backgroundColor:colors.border }]}>
            <View style={[rt.barFill, { width:`${player.overall}%` as any, backgroundColor:accent }]} />
          </View>
        </View>
      </View>
      {/* Athleticism */}
      <SectionLabel text="ATHLETICISM" accent={accent} />
      <View style={rt.grid}>
        {[{ label:"SPEED", value:player.speed },{ label:"STR", value:player.strength },{ label:"AWR", value:player.awareness }]
          .map(r => (
          <View key={r.label} style={[rt.athlBox, { backgroundColor:accent+"12", borderColor:accent+"30" }]}>
            <Text style={[rt.athlVal, { color:accent }]}>{r.value}</Text>
            <Text style={[rt.athlLbl, { color:colors.mutedForeground }]}>{r.label}</Text>
          </View>
        ))}
      </View>
      {/* Position ratings */}
      <SectionLabel text="POSITION RATINGS" accent={accent} />
      <View style={{ gap:7 }}>
        {keys.map(key => {
          const val   = player.posRatings[key] ?? 0;
          const label = POS_RATING_LABELS[key];
          const valClr = val >= 85 ? secondary : "#CBD5E1";
          return (
            <View key={key} style={rt.ratingRow}>
              <Text style={[rt.rLabel, { color:colors.mutedForeground }]}>{label}</Text>
              <View style={[rt.track, { backgroundColor:colors.border }]}>
                <View style={[rt.fill, { width:`${val}%` as any, backgroundColor:accent }]} />
              </View>
              <Text style={[rt.rVal, { color:valClr }]}>{val}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
const rt = StyleSheet.create({
  ovrStrip: { flexDirection:"row", alignItems:"center", gap:10, padding:12,
              borderRadius:10, borderWidth:1, marginBottom:4 },
  ovrLabel: { fontSize:9, fontFamily:"Inter_700Bold", letterSpacing:1, width:50 },
  ovrVal:   { fontSize:22, fontFamily:"Inter_700Bold", width:36, textAlign:"center" },
  barTrack: { height:6, borderRadius:3, overflow:"hidden" },
  barFill:  { height:6, borderRadius:3 },
  grid:     { flexDirection:"row", gap:6, marginBottom:4 },
  athlBox:  { flex:1, alignItems:"center", paddingVertical:10, borderRadius:8, borderWidth:1 },
  athlVal:  { fontSize:20, fontFamily:"Inter_700Bold" },
  athlLbl:  { fontSize:8, fontFamily:"Inter_700Bold", letterSpacing:0.8, marginTop:2 },
  ratingRow:{ flexDirection:"row", alignItems:"center", gap:8 },
  rLabel:   { width:34, fontSize:10, fontFamily:"Inter_700Bold", letterSpacing:0.3 },
  track:    { flex:1, height:8, borderRadius:4, overflow:"hidden" },
  fill:     { height:8, borderRadius:4 },
  rVal:     { width:28, fontSize:13, fontFamily:"Inter_700Bold", textAlign:"right" },
});

// ─── Main Modal ───────────────────────────────────────────────────────────────

type ModalTab = "season" | "career" | "ratings";

interface Props {
  player: Player | null;
  visible: boolean;
  onClose: () => void;
  teamPrimaryColor?: string;
  teamSecondaryColor?: string;
  gamesPlayedThisSeason?: number;
}

export function PlayerStatsModal({ player, visible, onClose, teamPrimaryColor, teamSecondaryColor, gamesPlayedThisSeason }: Props) {
  const colors  = useColors();
  const [tab, setTab] = useState<ModalTab>("season");

  if (!player) return null;

  const pc        = POS_COLOR[player.position];
  // accent / secondary are kept for hero gradient and other accents
  const accent    = teamPrimaryColor   ?? pc;
  const secondary = teamSecondaryColor ?? accent;
  const career    = player.careerStats ?? [];

  // ── Kit-mapped tab colors — exact mirror of KitToggle (HOME/AWAY/ALT) ────────
  const primary   = teamPrimaryColor  ?? pc;
  const secondary2 = teamSecondaryColor ?? pc;

  // Active bg per tab — matches HOME/AWAY/ALT active bg exactly
  const TAB_ACTIVE_BG: Record<ModalTab, string> = {
    season:  primary,     // HOME  → team primary
    career:  "#FFFFFF",   // AWAY  → white
    ratings: secondary2,  // ALT   → team secondary
  };
  // Active text — "#111111" for white bg (away), "#fff" for everything else
  const TAB_ACTIVE_TXT: Record<ModalTab, string> = {
    season:  "#ffffff",
    career:  "#111111",
    ratings: onColor(secondary2), // handles light secondaries
  };
  // Inactive bg + text — ALL tabs identical, same as kit toggle inactive
  const inactiveBg  = primary + "22";
  const inactiveBd  = primary + "55";
  const inactiveTxt = primary;

  const devColor  = DEV_COLORS[player.developmentTrait] ?? "#8B949E";
  const devIcon   = (DEV_ICONS[player.developmentTrait]  ?? "user") as any;
  const roundStr  = player.draftRound ? String(player.draftRound) : null;
  const roundColor= roundStr ? (ROUND_COLORS[roundStr] ?? "#525252") : null;
  const oc        = ovrColor(player.overall);

  const TABS: { key: ModalTab; label: string; icon: any }[] = [
    { key:"season",  label:"Season",  icon:"trending-up" },
    { key:"career",  label:`Career (${career.length}yr)`, icon:"clock" },
    { key:"ratings", label:"Ratings", icon:"sliders" },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex:1, justifyContent:"flex-end", backgroundColor:"rgba(0,0,0,0.75)" }}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={[modal.sheet, { backgroundColor:colors.background }]}>
          {/* Drag handle */}
          <View style={[modal.handle, { backgroundColor:colors.border }]} />

          {/* Close button */}
          <TouchableOpacity onPress={onClose} style={modal.closeBtn}>
            <Feather name="x" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:60 }}>

            {/* ── HERO HEADER — team-color themed ── */}
            <View style={[modal.hero, { backgroundColor: accent + "20" }]}>
              <LinearGradient
                colors={[accent+"50", accent+"18", "transparent"]}
                locations={[0, 0.5, 1]}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />

              {/* Top row: draft pill + position badge + OVR badge */}
              <View style={modal.heroTop}>
                <View style={modal.heroTopLeft}>
                  {roundColor && (
                    <View style={[modal.gradePill, { backgroundColor:roundColor+"25", borderColor:roundColor+"60" }]}>
                      <Text style={[modal.gradeText, { color:roundColor }]}>
                        Rd {player.draftRound}
                      </Text>
                    </View>
                  )}
                  {!roundColor && player.yearsExperience === 0 && (
                    <View style={[modal.gradePill, { backgroundColor:"#FF6B35"+"25", borderColor:"#FF6B35"+"60" }]}>
                      <Text style={[modal.gradeText, { color:"#FF6B35" }]}>ROOKIE</Text>
                    </View>
                  )}
                  <View style={[modal.posBadge, { backgroundColor:pc+"22", borderColor:pc+"50" }]}>
                    <Text style={[modal.posText, { color:pc }]}>{player.position}</Text>
                  </View>
                </View>
                {/* OVR big badge */}
                <View style={[modal.ovrBig, { borderColor:oc+"70", backgroundColor:oc+"18" }]}>
                  <Text style={[modal.ovrNum, { color:oc }]}>{player.overall}</Text>
                  <Text style={[modal.ovrLbl, { color:oc+"AA" }]}>OVR</Text>
                </View>
              </View>

              {/* Name */}
              <Text style={[modal.heroName, { color:colors.foreground }]}>{player.name}</Text>
              <Text style={[modal.heroSub, { color:colors.mutedForeground }]}>
                {[player.college, `${player.yearsExperience}yr exp`].filter(Boolean).join(" · ")}
              </Text>

              {/* Dev trait + POT */}
              <View style={modal.devRow}>
                <View style={[modal.devChip, { backgroundColor:devColor+"20", borderColor:devColor+"50" }]}>
                  <Feather name={devIcon} size={11} color={devColor} />
                  <Text style={[modal.devText, { color:devColor }]}>{player.developmentTrait}</Text>
                </View>
                <View style={[modal.potChip, { backgroundColor:colors.secondary }]}>
                  <Text style={[modal.potLabel, { color:colors.mutedForeground }]}>POT </Text>
                  <Text style={[modal.potVal, { color:ovrColor(player.potential) }]}>{player.potential}</Text>
                </View>
              </View>

              {/* Draft bio */}
              {!!player.draftYear && (
                <Text style={[modal.draftBio, { color:colors.mutedForeground }]}>
                  Drafted {player.draftYear} · Round {player.draftRound} · Pick #{player.draftPick}
                  {player.draftTeamId ? "" : ""}
                </Text>
              )}
            </View>

            {/* ── Tab bar — HOME/AWAY/ALT kit pattern: Season/Career/Ratings ── */}
            <View style={[modal.tabBar, { backgroundColor: colors.secondary, borderColor: inactiveBd }]}>
              {TABS.map(t => {
                const isActive = tab === t.key;
                const bg  = isActive ? TAB_ACTIVE_BG[t.key]  : inactiveBg;
                const bd  = isActive ? TAB_ACTIVE_BG[t.key]  : inactiveBd;
                const txt = isActive ? TAB_ACTIVE_TXT[t.key] : inactiveTxt;
                return (
                  <TouchableOpacity key={t.key} onPress={() => setTab(t.key)}
                    activeOpacity={0.75}
                    style={[modal.tabBtn, { backgroundColor: bg, borderWidth: 1, borderColor: bd }]}>
                    <Feather name={t.icon} size={10} color={txt} />
                    <Text style={[modal.tabLabel, {
                      color: txt,
                      fontFamily: isActive ? "Inter_700Bold" : "Inter_500Medium",
                    }]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ── Tab content ── */}
            <View style={{ padding:14, paddingTop:6 }}>
              {tab === "season" && (
                <SeasonStats pos={player.position} stats={player.stats}
                  accent={accent} gp={gamesPlayedThisSeason} />
              )}
              {tab === "career" && (
                <CareerSection career={career} currentStats={player.stats} pos={player.position} accent={accent} />
              )}
              {tab === "ratings" && (
                <RatingsTab player={player} accent={accent} secondary={secondary} />
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const modal = StyleSheet.create({
  sheet: {
    borderTopLeftRadius:22, borderTopRightRadius:22,
    maxHeight:"92%", minHeight:"60%", overflow:"hidden",
  },
  handle:   { width:38, height:4, borderRadius:2, alignSelf:"center", marginTop:10, marginBottom:0 },
  closeBtn: { position:"absolute", top:14, right:14, zIndex:10, padding:6 },

  // Hero
  hero:     { paddingHorizontal:16, paddingTop:12, paddingBottom:16, overflow:"hidden" },
  heroTop:  { flexDirection:"row", alignItems:"center", justifyContent:"space-between", marginBottom:10 },
  heroTopLeft: { flexDirection:"row", alignItems:"center", gap:6, flex:1 },

  gradePill: { paddingHorizontal:10, paddingVertical:4, borderRadius:8,
               borderWidth:1, alignSelf:"flex-start" },
  gradeText: { fontSize:11, fontFamily:"Inter_700Bold" },

  posBadge: { paddingHorizontal:9, paddingVertical:3, borderRadius:7, borderWidth:1 },
  posText:  { fontSize:12, fontFamily:"Inter_700Bold" },

  ovrBig:   { flexDirection:"row", alignItems:"baseline", gap:3,
               paddingHorizontal:10, paddingVertical:6,
               borderRadius:10, borderWidth:1.5 },
  ovrNum:   { fontSize:26, fontFamily:"Inter_700Bold", lineHeight:30 },
  ovrLbl:   { fontSize:10, fontFamily:"Inter_700Bold", letterSpacing:0.5 },

  heroName: { fontSize:28, fontFamily:"Inter_700Bold", letterSpacing:-0.5, marginBottom:2 },
  heroSub:  { fontSize:12, fontFamily:"Inter_400Regular", marginBottom:10 },

  devRow:   { flexDirection:"row", alignItems:"center", gap:8, flexWrap:"wrap" },
  devChip:  { flexDirection:"row", alignItems:"center", gap:5,
               paddingHorizontal:9, paddingVertical:4,
               borderRadius:8, borderWidth:1 },
  devText:  { fontSize:11, fontFamily:"Inter_600SemiBold" },
  potChip:  { flexDirection:"row", alignItems:"baseline", gap:1,
               paddingHorizontal:8, paddingVertical:4, borderRadius:8 },
  potLabel: { fontSize:10, fontFamily:"Inter_500Medium" },
  potVal:   { fontSize:14, fontFamily:"Inter_700Bold" },

  draftBio: { fontSize:10, fontFamily:"Inter_500Medium", marginTop:8, opacity:0.7 },

  // Tabs
  tabBar:   { flexDirection:"row", marginHorizontal:14, marginTop:10, marginBottom:0,
               borderRadius:10, borderWidth:1, padding:3, gap:3 },
  tabBtn:   { flex:1, flexDirection:"row", alignItems:"center", justifyContent:"center",
               gap:4, paddingVertical:7, borderRadius:8 },
  tabLabel: { fontSize:11, fontFamily:"Inter_600SemiBold" },
});
