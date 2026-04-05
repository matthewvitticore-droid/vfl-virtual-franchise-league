import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import type { NFLPosition, Player, PlayerSeasonStats } from "@/context/types";

// ─── Position color map ────────────────────────────────────────────────────────

const POS_COLOR: Record<NFLPosition, string> = {
  QB:"#E31837", RB:"#FB4F14", WR:"#FFC20E", TE:"#00B5E2",
  OL:"#8B949E", DE:"#3FB950", DT:"#26A69A", LB:"#1F6FEB",
  CB:"#6E40C9", S:"#9C27B0", K:"#FF7043", P:"#795548",
};

// ─── Stat cell ────────────────────────────────────────────────────────────────

function StatCell({
  label, value, accent, wide,
}: { label: string; value: string | number; accent?: string; wide?: boolean }) {
  const colors = useColors();
  return (
    <View style={[sc.cell, wide && { flex: 1.5 }]}>
      <Text style={[sc.val, accent ? { color: accent } : { color: colors.foreground }]}>
        {value}
      </Text>
      <Text style={[sc.lbl, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}
const sc = StyleSheet.create({
  cell: {
    flex: 1, alignItems: "center", paddingVertical: 10,
  },
  val: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  lbl: { fontSize: 9.5, fontFamily: "Inter_700Bold", letterSpacing: 0.8, marginTop: 2 },
});

// ─── Divider row of stat cells ────────────────────────────────────────────────

function StatRow({ cells }: { cells: { label: string; value: string | number; accent?: string; wide?: boolean }[] }) {
  const colors = useColors();
  return (
    <View style={[sr.row, { borderColor: colors.border }]}>
      {cells.map((c, i) => (
        <React.Fragment key={c.label}>
          {i > 0 && <View style={[sr.divider, { backgroundColor: colors.border }]} />}
          <StatCell {...c} />
        </React.Fragment>
      ))}
    </View>
  );
}
const sr = StyleSheet.create({
  row: { flexDirection: "row", borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  divider: { width: 1, marginVertical: 8 },
});

// ─── Section header ───────────────────────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  const colors = useColors();
  return (
    <Text style={[sl.text, { color: colors.mutedForeground }]}>{text}</Text>
  );
}
const sl = StyleSheet.create({
  text: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.2, marginBottom: 6, marginTop: 14 },
});

// ─── No stats placeholder ─────────────────────────────────────────────────────

function EmptyStats({ message }: { message: string }) {
  const colors = useColors();
  return (
    <View style={{ alignItems: "center", paddingVertical: 32 }}>
      <Feather name="bar-chart-2" size={32} color={colors.border} />
      <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 13, marginTop: 10 }}>
        {message}
      </Text>
    </View>
  );
}

// ─── Stats content by position ────────────────────────────────────────────────

function StatsContent({ pos, stats, accent, gp }: {
  pos: NFLPosition;
  stats: PlayerSeasonStats;
  accent: string;
  gp?: number;
}) {
  const colors = useColors();
  const hasAny = stats.passingYards + stats.rushingYards + stats.receivingYards +
    stats.tackles + stats.sacks + stats.fieldGoalsMade + stats.puntsAverage > 0;

  if (!hasAny) return <EmptyStats message="No stats recorded yet this season." />;

  const pct = (n: number, d: number) =>
    d === 0 ? "—" : `${((n / d) * 100).toFixed(1)}%`;
  const dec = (n: number, places = 1) => n.toFixed(places);
  const fmt = (n: number) => n === 0 ? "—" : n.toString();

  if (pos === "QB") {
    const compPct = pct(stats.completions, stats.attempts);
    return (
      <View>
        {gp !== undefined && <Text style={[sl.text, { color: colors.mutedForeground }]}>{gp} GAMES PLAYED</Text>}
        <SectionLabel text="PASSING" />
        <StatRow cells={[
          { label: "ATT",  value: fmt(stats.attempts) },
          { label: "CMP",  value: fmt(stats.completions) },
          { label: "CMP%", value: stats.attempts > 0 ? compPct : "—", accent },
        ]} />
        <StatRow cells={[
          { label: "YDS",  value: fmt(stats.passingYards), accent },
          { label: "TD",   value: fmt(stats.passingTDs), accent: "#3FB950" },
          { label: "INT",  value: fmt(stats.interceptions), accent: stats.interceptions > 0 ? "#E31837" : undefined },
        ]} />
        <StatRow cells={[
          { label: "RTG",  value: stats.qbRating > 0 ? dec(stats.qbRating) : "—", accent },
          { label: "YPA",  value: stats.attempts > 0 ? dec(stats.passingYards / stats.attempts) : "—" },
          { label: "TD%",  value: stats.attempts > 0 ? pct(stats.passingTDs, stats.attempts) : "—" },
        ]} />
        {stats.carries > 0 && (
          <>
            <SectionLabel text="RUSHING" />
            <StatRow cells={[
              { label: "CAR",  value: fmt(stats.carries) },
              { label: "YDS",  value: fmt(stats.rushingYards), accent },
              { label: "TD",   value: fmt(stats.rushingTDs), accent: "#3FB950" },
            ]} />
          </>
        )}
      </View>
    );
  }

  if (pos === "RB") {
    const ypc = stats.carries > 0 ? dec(stats.rushingYards / stats.carries) : "—";
    const ypcR = stats.receptions > 0 ? dec(stats.receivingYards / stats.receptions) : "—";
    return (
      <View>
        {gp !== undefined && <Text style={[sl.text, { color: colors.mutedForeground }]}>{gp} GAMES PLAYED</Text>}
        <SectionLabel text="RUSHING" />
        <StatRow cells={[
          { label: "CAR",  value: fmt(stats.carries) },
          { label: "YDS",  value: fmt(stats.rushingYards), accent },
          { label: "YPC",  value: ypc },
        ]} />
        <StatRow cells={[
          { label: "TD",   value: fmt(stats.rushingTDs), accent: "#3FB950" },
          { label: "FMBL", value: "—" },
          { label: "LNG",  value: "—" },
        ]} />
        {stats.targets > 0 && (
          <>
            <SectionLabel text="RECEIVING" />
            <StatRow cells={[
              { label: "TGT",  value: fmt(stats.targets) },
              { label: "REC",  value: fmt(stats.receptions) },
              { label: "YDS",  value: fmt(stats.receivingYards), accent },
            ]} />
            <StatRow cells={[
              { label: "YPR",  value: ypcR },
              { label: "TD",   value: fmt(stats.receivingTDs), accent: "#3FB950" },
              { label: "YAC",  value: "—" },
            ]} />
          </>
        )}
      </View>
    );
  }

  if (pos === "WR" || pos === "TE") {
    const ypr = stats.receptions > 0 ? dec(stats.receivingYards / stats.receptions) : "—";
    const catchPct = pct(stats.receptions, stats.targets);
    return (
      <View>
        {gp !== undefined && <Text style={[sl.text, { color: colors.mutedForeground }]}>{gp} GAMES PLAYED</Text>}
        <SectionLabel text="RECEIVING" />
        <StatRow cells={[
          { label: "TGT",  value: fmt(stats.targets) },
          { label: "REC",  value: fmt(stats.receptions), accent },
          { label: "CTH%", value: stats.targets > 0 ? catchPct : "—" },
        ]} />
        <StatRow cells={[
          { label: "YDS",  value: fmt(stats.receivingYards), accent },
          { label: "YPR",  value: ypr },
          { label: "TD",   value: fmt(stats.receivingTDs), accent: "#3FB950" },
        ]} />
      </View>
    );
  }

  if (pos === "OL") {
    return <EmptyStats message="OL grades coming in a future update." />;
  }

  if (pos === "K") {
    const fgPct = pct(stats.fieldGoalsMade, stats.fieldGoalsAttempted);
    return (
      <View>
        {gp !== undefined && <Text style={[sl.text, { color: colors.mutedForeground }]}>{gp} GAMES PLAYED</Text>}
        <SectionLabel text="KICKING" />
        <StatRow cells={[
          { label: "FGM",  value: fmt(stats.fieldGoalsMade), accent },
          { label: "FGA",  value: fmt(stats.fieldGoalsAttempted) },
          { label: "FG%",  value: stats.fieldGoalsAttempted > 0 ? fgPct : "—", accent },
        ]} />
      </View>
    );
  }

  if (pos === "P") {
    return (
      <View>
        {gp !== undefined && <Text style={[sl.text, { color: colors.mutedForeground }]}>{gp} GAMES PLAYED</Text>}
        <SectionLabel text="PUNTING" />
        <StatRow cells={[
          { label: "AVG",  value: stats.puntsAverage > 0 ? dec(stats.puntsAverage) : "—", accent, wide: true },
          { label: "NET",  value: "—", wide: true },
        ]} />
      </View>
    );
  }

  // Defensive positions: DE, DT, LB, CB, S
  return (
    <View>
      {gp !== undefined && <Text style={[sl.text, { color: colors.mutedForeground }]}>{gp} GAMES PLAYED</Text>}
      <SectionLabel text="DEFENSE" />
      <StatRow cells={[
        { label: "TCK",  value: fmt(stats.tackles), accent },
        { label: "SACK", value: stats.sacks > 0 ? dec(stats.sacks) : "—", accent: stats.sacks > 0 ? "#3FB950" : undefined },
        { label: "INT",  value: fmt(stats.defensiveINTs), accent: stats.defensiveINTs > 0 ? "#FFC20E" : undefined },
      ]} />
      <StatRow cells={[
        { label: "PD",   value: fmt(stats.passDeflections) },
        { label: "FF",   value: fmt(stats.forcedFumbles) },
        { label: "TFL",  value: "—" },
      ]} />
    </View>
  );
}

// ─── Career season row ────────────────────────────────────────────────────────

function CareerSeasonRow({ s, pos, accent }: { s: PlayerSeasonStats; pos: NFLPosition; accent: string }) {
  const colors = useColors();
  const yr = s.season ?? "—";

  let cols: { label: string; value: string }[] = [];
  if (pos === "QB") {
    const cmp = s.attempts > 0 ? `${((s.completions / s.attempts) * 100).toFixed(0)}%` : "—";
    cols = [
      { label: "YDS",  value: s.passingYards.toString() },
      { label: "TD",   value: s.passingTDs.toString() },
      { label: "INT",  value: s.interceptions.toString() },
      { label: "CMP%", value: cmp },
      { label: "RTG",  value: s.qbRating > 0 ? s.qbRating.toFixed(0) : "—" },
    ];
  } else if (pos === "RB") {
    const ypc = s.carries > 0 ? (s.rushingYards / s.carries).toFixed(1) : "—";
    cols = [
      { label: "CAR",  value: s.carries.toString() },
      { label: "YDS",  value: s.rushingYards.toString() },
      { label: "YPC",  value: ypc },
      { label: "TD",   value: s.rushingTDs.toString() },
    ];
  } else if (pos === "WR" || pos === "TE") {
    const ypr = s.receptions > 0 ? (s.receivingYards / s.receptions).toFixed(1) : "—";
    cols = [
      { label: "REC",  value: s.receptions.toString() },
      { label: "YDS",  value: s.receivingYards.toString() },
      { label: "YPR",  value: ypr },
      { label: "TD",   value: s.receivingTDs.toString() },
    ];
  } else if (pos === "K") {
    const fgp = s.fieldGoalsAttempted > 0
      ? `${((s.fieldGoalsMade / s.fieldGoalsAttempted) * 100).toFixed(0)}%` : "—";
    cols = [
      { label: "FGM",  value: s.fieldGoalsMade.toString() },
      { label: "FGA",  value: s.fieldGoalsAttempted.toString() },
      { label: "FG%",  value: fgp },
    ];
  } else if (pos === "P") {
    cols = [
      { label: "AVG", value: s.puntsAverage > 0 ? s.puntsAverage.toFixed(1) : "—" },
    ];
  } else {
    cols = [
      { label: "TCK",  value: s.tackles.toString() },
      { label: "SACK", value: s.sacks.toFixed(1) },
      { label: "INT",  value: s.defensiveINTs.toString() },
      { label: "PD",   value: s.passDeflections.toString() },
    ];
  }

  return (
    <View style={[csr.row, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <View style={[csr.yearBadge, { backgroundColor: accent + "20", borderColor: accent + "40" }]}>
        <Text style={[csr.yearText, { color: accent }]}>{yr}</Text>
        <Text style={[csr.gpText, { color: colors.mutedForeground }]}>{s.gamesPlayed}G</Text>
      </View>
      <View style={csr.cols}>
        {cols.map(c => (
          <View key={c.label} style={csr.col}>
            <Text style={[csr.val, { color: colors.foreground }]}>{c.value}</Text>
            <Text style={[csr.lbl, { color: colors.mutedForeground }]}>{c.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
const csr = StyleSheet.create({
  row: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 10, borderWidth: 1, marginBottom: 6, padding: 10, gap: 10,
  },
  yearBadge: {
    width: 44, alignItems: "center", paddingVertical: 4,
    borderRadius: 7, borderWidth: 1,
  },
  yearText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  gpText:   { fontSize: 9,  fontFamily: "Inter_500Medium" },
  cols:     { flex: 1, flexDirection: "row", justifyContent: "space-around" },
  col:      { alignItems: "center" },
  val:      { fontSize: 14, fontFamily: "Inter_700Bold" },
  lbl:      { fontSize: 8.5, fontFamily: "Inter_700Bold", letterSpacing: 0.6, opacity: 0.55 },
});

// ─── Main Modal ───────────────────────────────────────────────────────────────

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
  const [tab, setTab] = useState<"season" | "career">("season");

  if (!player) return null;

  const accent   = teamPrimaryColor ?? POS_COLOR[player.position];
  const posColor = POS_COLOR[player.position];
  const career   = [...player.careerStats].reverse();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.75)" }}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={[
          modal.sheet,
          { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 },
        ]}>
          {/* Drag handle */}
          <View style={[modal.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <LinearGradient
            colors={[posColor + "30", "transparent"]}
            style={modal.headerGrad}
            pointerEvents="none"
          />
          <View style={modal.header}>
            <View>
              <Text style={[modal.name, { color: colors.foreground }]}>{player.name}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={[modal.posBadge, { backgroundColor: posColor + "25", borderColor: posColor + "60" }]}>
                  <Text style={[modal.posText, { color: posColor }]}>{player.position}</Text>
                </View>
                <Text style={[modal.meta, { color: colors.mutedForeground }]}>
                  {player.age}yo · {player.yearsExperience}yr exp · {player.overall} OVR
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={modal.closeBtn}>
              <Feather name="x" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Tab toggle */}
          <View style={[modal.tabs, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            {(["season", "career"] as const).map(t => (
              <TouchableOpacity
                key={t}
                onPress={() => setTab(t)}
                style={[modal.tabBtn, tab === t && { backgroundColor: accent }]}
              >
                <Feather
                  name={t === "season" ? "trending-up" : "clock"}
                  size={12}
                  color={tab === t ? "#fff" : colors.mutedForeground}
                />
                <Text style={[modal.tabLabel, { color: tab === t ? "#fff" : colors.mutedForeground }]}>
                  {t === "season" ? "This Season" : `Career (${career.length} yr)`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 16, paddingTop: 8 }}
          >
            {tab === "season" ? (
              <StatsContent
                pos={player.position}
                stats={player.stats}
                accent={accent}
                gp={gamesPlayedThisSeason}
              />
            ) : (
              <View>
                {career.length === 0 ? (
                  <EmptyStats message="No career history yet. Stats archive after each season." />
                ) : (
                  <>
                    {career.map((s, i) => (
                      <CareerSeasonRow key={i} s={s} pos={player.position} accent={accent} />
                    ))}
                  </>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Modal styles ─────────────────────────────────────────────────────────────

const modal = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    maxHeight: "88%", minHeight: "55%",
    overflow: "hidden",
  },
  handle: {
    width: 38, height: 4, borderRadius: 2,
    alignSelf: "center", marginTop: 10, marginBottom: 4,
  },
  headerGrad: {
    position: "absolute", top: 0, left: 0, right: 0, height: 80,
  },
  header: {
    flexDirection: "row", alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12,
  },
  name: {
    fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3,
  },
  posBadge: {
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 5, borderWidth: 1,
  },
  posText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  meta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  closeBtn: {
    padding: 6, marginTop: 2,
  },
  tabs: {
    flexDirection: "row", marginHorizontal: 16, marginBottom: 4,
    borderRadius: 10, borderWidth: 1, padding: 3, gap: 3,
  },
  tabBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, paddingVertical: 8, borderRadius: 8,
  },
  tabLabel: {
    fontSize: 12, fontFamily: "Inter_600SemiBold",
  },
});
