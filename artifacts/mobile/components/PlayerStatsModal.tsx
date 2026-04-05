import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import {
  POS_RATING_KEYS, POS_RATING_LABELS,
  type NFLPosition, type Player, type PlayerSeasonStats,
} from "@/context/types";

// ─── Position colors ───────────────────────────────────────────────────────────
const POS_COLOR: Record<NFLPosition, string> = {
  QB:"#E31837", RB:"#FB4F14", WR:"#FFC20E", TE:"#00B5E2",
  OL:"#8B949E", DE:"#3FB950", DT:"#26A69A", LB:"#1F6FEB",
  CB:"#6E40C9", S:"#9C27B0",  K:"#FF7043", P:"#795548",
};

// ─── Rating color ──────────────────────────────────────────────────────────────
function ratingColor(v: number) {
  if (v >= 90) return "#FFD700";
  if (v >= 80) return "#3FB950";
  if (v >= 70) return "#F0F0F0";
  return "#E31837";
}

// ─── Compact stat card (Topps-style) ──────────────────────────────────────────
function StatCard({
  label, value, accent,
}: { label: string; value: string | number; accent?: string }) {
  const colors = useColors();
  return (
    <View style={[card.box, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
      <Text style={[card.val, { color: accent ?? colors.foreground }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[card.lbl, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}
const card = StyleSheet.create({
  box: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingVertical: 8, paddingHorizontal: 4,
    borderRadius: 8, borderWidth: 1, minWidth: 0,
  },
  val: { fontSize: 16, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  lbl: { fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 0.8, marginTop: 2 },
});

// ─── Card row (4 per row by default) ──────────────────────────────────────────
function CardRow({ cells }: { cells: { label: string; value: string | number; accent?: string }[] }) {
  return (
    <View style={{ flexDirection: "row", gap: 5, marginBottom: 5 }}>
      {cells.map(c => <StatCard key={c.label} {...c} />)}
    </View>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionLabel({ text, accent }: { text: string; accent?: string }) {
  const colors = useColors();
  return (
    <View style={[sec.wrap, { borderLeftColor: accent ?? colors.mutedForeground }]}>
      <Text style={[sec.text, { color: colors.mutedForeground }]}>{text}</Text>
    </View>
  );
}
const sec = StyleSheet.create({
  wrap: { borderLeftWidth: 2, paddingLeft: 7, marginBottom: 7, marginTop: 12 },
  text: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1.2 },
});

// ─── Empty placeholder ────────────────────────────────────────────────────────
function Empty({ message }: { message: string }) {
  const colors = useColors();
  return (
    <View style={{ alignItems: "center", paddingVertical: 32, gap: 10 }}>
      <Feather name="bar-chart-2" size={28} color={colors.border} />
      <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_500Medium",
        textAlign: "center", lineHeight: 18 }}>
        {message}
      </Text>
    </View>
  );
}

// ─── Season stats grid by position ────────────────────────────────────────────
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
  const green = "#3FB950";
  const red   = "#E31837";

  return (
    <View>
      {gp !== undefined && (
        <Text style={{ color: colors.mutedForeground, fontSize: 9, fontFamily: "Inter_700Bold",
          letterSpacing: 1, marginBottom: 6 }}>
          {gp} GAMES PLAYED
        </Text>
      )}

      {/* QB */}
      {pos === "QB" && <>
        <SectionLabel text="PASSING" accent={accent} />
        <CardRow cells={[
          { label:"ATT",  value: fmt(stats.attempts) },
          { label:"CMP",  value: fmt(stats.completions) },
          { label:"CMP%", value: stats.attempts>0 ? pct(stats.completions, stats.attempts) : "—", accent },
          { label:"YDS",  value: fmt(stats.passingYards), accent },
        ]} />
        <CardRow cells={[
          { label:"TD",   value: fmt(stats.passingTDs), accent: green },
          { label:"INT",  value: fmt(stats.interceptions), accent: stats.interceptions>0 ? red : undefined },
          { label:"RTG",  value: stats.qbRating>0 ? dec(stats.qbRating) : "—", accent },
          { label:"YPA",  value: stats.attempts>0 ? dec(stats.passingYards/stats.attempts) : "—" },
        ]} />
        {stats.carries > 0 && <>
          <SectionLabel text="RUSHING" accent={accent} />
          <CardRow cells={[
            { label:"CAR", value: fmt(stats.carries) },
            { label:"YDS", value: fmt(stats.rushingYards), accent },
            { label:"TD",  value: fmt(stats.rushingTDs), accent: green },
            { label:"AVG", value: stats.carries>0 ? dec(stats.rushingYards/stats.carries) : "—" },
          ]} />
        </>}
      </>}

      {/* RB */}
      {pos === "RB" && <>
        <SectionLabel text="RUSHING" accent={accent} />
        <CardRow cells={[
          { label:"CAR", value: fmt(stats.carries) },
          { label:"YDS", value: fmt(stats.rushingYards), accent },
          { label:"YPC", value: stats.carries>0 ? dec(stats.rushingYards/stats.carries) : "—", accent },
          { label:"TD",  value: fmt(stats.rushingTDs), accent: green },
        ]} />
        {stats.targets > 0 && <>
          <SectionLabel text="RECEIVING" accent={accent} />
          <CardRow cells={[
            { label:"TGT", value: fmt(stats.targets) },
            { label:"REC", value: fmt(stats.receptions) },
            { label:"YDS", value: fmt(stats.receivingYards), accent },
            { label:"TD",  value: fmt(stats.receivingTDs), accent: green },
          ]} />
        </>}
      </>}

      {/* WR / TE */}
      {(pos === "WR" || pos === "TE") && <>
        <SectionLabel text="RECEIVING" accent={accent} />
        <CardRow cells={[
          { label:"TGT",  value: fmt(stats.targets) },
          { label:"REC",  value: fmt(stats.receptions), accent },
          { label:"YDS",  value: fmt(stats.receivingYards), accent },
          { label:"YPR",  value: stats.receptions>0 ? dec(stats.receivingYards/stats.receptions) : "—" },
        ]} />
        <CardRow cells={[
          { label:"TD",   value: fmt(stats.receivingTDs), accent: green },
          { label:"CTH%", value: stats.targets>0 ? pct(stats.receptions, stats.targets) : "—" },
        ]} />
      </>}

      {/* Defense */}
      {["DE","DT","LB","CB","S"].includes(pos) && <>
        <SectionLabel text="DEFENSE" accent={accent} />
        <CardRow cells={[
          { label:"TCK",  value: fmt(stats.tackles), accent },
          { label:"SACK", value: stats.sacks>0 ? dec(stats.sacks) : "—", accent: stats.sacks>0 ? green : undefined },
          { label:"INT",  value: fmt(stats.defensiveINTs), accent: stats.defensiveINTs>0 ? "#FFC20E" : undefined },
          { label:"PD",   value: fmt(stats.passDeflections) },
        ]} />
        <CardRow cells={[
          { label:"FF",   value: fmt(stats.forcedFumbles) },
        ]} />
      </>}

      {/* K */}
      {pos === "K" && <>
        <SectionLabel text="KICKING" accent={accent} />
        <CardRow cells={[
          { label:"FGM", value: fmt(stats.fieldGoalsMade), accent },
          { label:"FGA", value: fmt(stats.fieldGoalsAttempted) },
          { label:"FG%", value: stats.fieldGoalsAttempted>0 ? pct(stats.fieldGoalsMade, stats.fieldGoalsAttempted) : "—", accent },
        ]} />
      </>}

      {/* P */}
      {pos === "P" && <>
        <SectionLabel text="PUNTING" accent={accent} />
        <CardRow cells={[
          { label:"P.AVG", value: stats.puntsAverage>0 ? dec(stats.puntsAverage) : "—", accent },
        ]} />
      </>}

      {pos === "OL" && <Empty message="OL grades available in a future update." />}
    </View>
  );
}

// ─── Career history rows ───────────────────────────────────────────────────────
function CareerSection({ career, pos, accent }: {
  career: PlayerSeasonStats[]; pos: NFLPosition; accent: string;
}) {
  const colors = useColors();
  if (career.length === 0) return <Empty message="No career history yet. Stats archive after each season." />;

  return (
    <View style={{ gap: 6 }}>
      {[...career].reverse().map((s, i) => {
        const yr = s.season ?? "—";
        let cells: { label: string; value: string }[] = [];
        const dec = (n: number, p = 1) => n > 0 ? n.toFixed(p) : "—";
        const fmt = (n: number) => n > 0 ? n.toString() : "—";

        if (pos === "QB") {
          cells = [
            { label:"YDS",  value: s.passingYards > 0 ? s.passingYards.toLocaleString() : "—" },
            { label:"TD",   value: fmt(s.passingTDs) },
            { label:"INT",  value: fmt(s.interceptions) },
            { label:"CMP%", value: s.attempts>0 ? `${((s.completions/s.attempts)*100).toFixed(0)}%` : "—" },
            { label:"RTG",  value: s.qbRating>0 ? s.qbRating.toFixed(1) : "—" },
          ];
        } else if (pos === "RB") {
          cells = [
            { label:"CAR", value: fmt(s.carries) },
            { label:"YDS", value: s.rushingYards>0 ? s.rushingYards.toLocaleString() : "—" },
            { label:"YPC", value: s.carries>0 ? dec(s.rushingYards/s.carries) : "—" },
            { label:"TD",  value: fmt(s.rushingTDs) },
          ];
        } else if (pos === "WR" || pos === "TE") {
          cells = [
            { label:"REC", value: fmt(s.receptions) },
            { label:"YDS", value: s.receivingYards>0 ? s.receivingYards.toLocaleString() : "—" },
            { label:"YPR", value: s.receptions>0 ? dec(s.receivingYards/s.receptions) : "—" },
            { label:"TD",  value: fmt(s.receivingTDs) },
          ];
        } else if (pos === "K") {
          cells = [
            { label:"FGM", value: fmt(s.fieldGoalsMade) },
            { label:"FGA", value: fmt(s.fieldGoalsAttempted) },
            { label:"FG%", value: s.fieldGoalsAttempted>0 ? `${((s.fieldGoalsMade/s.fieldGoalsAttempted)*100).toFixed(0)}%` : "—" },
          ];
        } else if (pos === "P") {
          cells = [{ label:"AVG", value: dec(s.puntsAverage) }];
        } else {
          cells = [
            { label:"TCK",  value: fmt(s.tackles) },
            { label:"SACK", value: s.sacks>0 ? s.sacks.toFixed(1) : "—" },
            { label:"INT",  value: fmt(s.defensiveINTs) },
            { label:"PD",   value: fmt(s.passDeflections) },
          ];
        }

        return (
          <View key={i} style={[cr.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Year badge */}
            <View style={[cr.badge, { backgroundColor: accent+"20", borderColor: accent+"40" }]}>
              <Text style={[cr.yr, { color: accent }]}>{yr}</Text>
              <Text style={[cr.gp, { color: colors.mutedForeground }]}>{s.gamesPlayed}G</Text>
            </View>
            {/* Stat chips */}
            <View style={cr.chips}>
              {cells.map(c => (
                <View key={c.label} style={cr.chip}>
                  <Text style={[cr.chipVal, { color: colors.foreground }]}>{c.value}</Text>
                  <Text style={[cr.chipLbl, { color: colors.mutedForeground }]}>{c.label}</Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}
const cr = StyleSheet.create({
  row:     { flexDirection:"row", alignItems:"center", borderRadius:10, borderWidth:1,
             padding:10, gap:8 },
  badge:   { width:42, alignItems:"center", paddingVertical:4, borderRadius:7, borderWidth:1 },
  yr:      { fontSize:12, fontFamily:"Inter_700Bold" },
  gp:      { fontSize:8,  fontFamily:"Inter_500Medium" },
  chips:   { flex:1, flexDirection:"row", justifyContent:"space-around" },
  chip:    { alignItems:"center" },
  chipVal: { fontSize:13, fontFamily:"Inter_700Bold" },
  chipLbl: { fontSize:8, fontFamily:"Inter_700Bold", letterSpacing:0.6, opacity:0.55, marginTop:1 },
});

// ─── Ratings tab ───────────────────────────────────────────────────────────────
function RatingsTab({ player, accent }: { player: Player; accent: string }) {
  const colors = useColors();
  const keys   = POS_RATING_KEYS[player.position];

  // General ratings
  const generals: { label: string; value: number }[] = [
    { label: "OVERALL", value: player.overall },
    { label: "SPEED",   value: player.speed },
    { label: "STR",     value: player.strength },
    { label: "AWR",     value: player.awareness },
  ];

  return (
    <View style={{ gap: 0 }}>
      {/* Overall strip */}
      <View style={[rt.ovrStrip, { backgroundColor: accent+"18", borderColor: accent+"35" }]}>
        <Text style={[rt.ovrLabel, { color: colors.mutedForeground }]}>OVERALL</Text>
        <Text style={[rt.ovrVal, { color: ratingColor(player.overall) }]}>{player.overall}</Text>
        <View style={{ flex: 1 }}>
          <View style={[rt.barTrack, { backgroundColor: colors.border }]}>
            <View style={[rt.barFill, { width: `${player.overall}%` as any, backgroundColor: ratingColor(player.overall) }]} />
          </View>
        </View>
      </View>

      {/* General athleticism */}
      <SectionLabel text="ATHLETICISM" accent={accent} />
      <View style={rt.grid}>
        {[
          { label:"SPEED",   value: player.speed },
          { label:"STR",     value: player.strength },
          { label:"AWR",     value: player.awareness },
        ].map(r => (
          <View key={r.label} style={[rt.athlBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Text style={[rt.athlVal, { color: ratingColor(r.value) }]}>{r.value}</Text>
            <Text style={[rt.athlLbl, { color: colors.mutedForeground }]}>{r.label}</Text>
          </View>
        ))}
      </View>

      {/* Position-specific ratings */}
      <SectionLabel text="POSITION RATINGS" accent={accent} />
      <View style={{ gap: 7 }}>
        {keys.map(key => {
          const val   = player.posRatings[key] ?? 0;
          const label = POS_RATING_LABELS[key];
          const clr   = ratingColor(val);
          return (
            <View key={key} style={rt.ratingRow}>
              {/* Label */}
              <Text style={[rt.rLabel, { color: colors.mutedForeground }]}>{label}</Text>
              {/* Bar */}
              <View style={[rt.track, { backgroundColor: colors.border }]}>
                <View style={[rt.fill, { width: `${val}%` as any, backgroundColor: clr }]} />
              </View>
              {/* Value */}
              <Text style={[rt.rVal, { color: clr }]}>{val}</Text>
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
  gamesPlayedThisSeason?: number;
}

export function PlayerStatsModal({ player, visible, onClose, teamPrimaryColor, gamesPlayedThisSeason }: Props) {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const [tab, setTab] = useState<ModalTab>("season");

  if (!player) return null;

  const accent   = teamPrimaryColor ?? POS_COLOR[player.position];
  const posColor = POS_COLOR[player.position];
  const career   = player.careerStats ?? [];

  const TABS: { key: ModalTab; label: string; icon: any }[] = [
    { key:"season",  label:"Season",  icon:"trending-up" },
    { key:"career",  label:`Career (${career.length}yr)`, icon:"clock" },
    { key:"ratings", label:"Ratings", icon:"sliders" },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex:1, justifyContent:"flex-end", backgroundColor:"rgba(0,0,0,0.75)" }}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={[modal.sheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
          {/* Drag handle */}
          <View style={[modal.handle, { backgroundColor: colors.border }]} />

          {/* Gradient bg */}
          <LinearGradient colors={[posColor+"30","transparent"]} style={modal.grad} pointerEvents="none" />

          {/* Header */}
          <View style={modal.header}>
            <View style={{ flex:1 }}>
              <View style={{ flexDirection:"row", alignItems:"center", gap:7, marginBottom:4 }}>
                <Text style={[modal.name, { color: colors.foreground }]}>{player.name}</Text>
                {player.yearsExperience === 0 && (
                  <View style={modal.rookieBadge}>
                    <Text style={modal.rookieTxt}>R</Text>
                  </View>
                )}
              </View>
              <View style={{ flexDirection:"row", alignItems:"center", gap:6 }}>
                <View style={[modal.posBadge, { backgroundColor: posColor+"25", borderColor: posColor+"60" }]}>
                  <Text style={[modal.posText, { color: posColor }]}>{player.position}</Text>
                </View>
                <Text style={[modal.meta, { color: colors.mutedForeground }]}>
                  {player.age}yo · {player.yearsExperience}yr exp · {player.overall} OVR
                </Text>
              </View>
              {!!player.draftYear && (
                <Text style={[modal.draftBio, { color: colors.mutedForeground }]}>
                  Drafted {player.draftYear} · Round {player.draftRound} · Pick #{player.draftPick}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={modal.closeBtn}>
              <Feather name="x" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Three-tab toggle */}
          <View style={[modal.tabBar, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            {TABS.map(t => (
              <TouchableOpacity key={t.key} onPress={() => setTab(t.key)}
                style={[modal.tabBtn, tab===t.key && { backgroundColor: accent }]}>
                <Feather name={t.icon} size={10} color={tab===t.key ? "#fff" : colors.mutedForeground} />
                <Text style={[modal.tabLabel, { color: tab===t.key ? "#fff" : colors.mutedForeground }]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Content */}
          <ScrollView showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding:14, paddingTop:6 }}>
            {tab === "season" && (
              <SeasonStats pos={player.position} stats={player.stats}
                accent={accent} gp={gamesPlayedThisSeason} />
            )}
            {tab === "career" && (
              <CareerSection career={career} pos={player.position} accent={accent} />
            )}
            {tab === "ratings" && (
              <RatingsTab player={player} accent={accent} />
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Modal shell styles ────────────────────────────────────────────────────────
const modal = StyleSheet.create({
  sheet: {
    borderTopLeftRadius:22, borderTopRightRadius:22,
    maxHeight:"88%", minHeight:"60%", overflow:"hidden",
  },
  handle:   { width:38, height:4, borderRadius:2, alignSelf:"center", marginTop:10, marginBottom:4 },
  grad:     { position:"absolute", top:0, left:0, right:0, height:80 },
  header:   { flexDirection:"row", alignItems:"flex-start", justifyContent:"space-between",
              paddingHorizontal:16, paddingTop:6, paddingBottom:10 },
  name:     { fontSize:20, fontFamily:"Inter_700Bold", letterSpacing:-0.3 },
  posBadge: { paddingHorizontal:7, paddingVertical:2, borderRadius:5, borderWidth:1 },
  posText:  { fontSize:10, fontFamily:"Inter_700Bold" },
  meta:     { fontSize:11, fontFamily:"Inter_400Regular" },
  rookieBadge: { backgroundColor:"#FF6B35", paddingHorizontal:6, paddingVertical:2, borderRadius:5, alignSelf:"flex-start" },
  rookieTxt:   { fontSize:9, fontFamily:"Inter_700Bold", color:"#fff", letterSpacing:0.5 },
  draftBio:    { fontSize:10, fontFamily:"Inter_500Medium", marginTop:4, opacity:0.7 },
  closeBtn: { padding:6, marginTop:2 },
  tabBar:   { flexDirection:"row", marginHorizontal:14, marginBottom:6,
              borderRadius:10, borderWidth:1, padding:3, gap:3 },
  tabBtn:   { flex:1, flexDirection:"row", alignItems:"center", justifyContent:"center",
              gap:4, paddingVertical:7, borderRadius:8 },
  tabLabel: { fontSize:11, fontFamily:"Inter_600SemiBold" },
});
