import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { OverallBadge } from "@/components/OverallBadge";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { GamePlan, Formation, NFLPosition, OffenseScheme, Player, useNFL } from "@/context/NFLContext";

const ALL_POSITIONS: NFLPosition[] = ["QB","RB","WR","TE","OL","DE","DT","LB","CB","S","K","P"];

const POS_COLOR: Record<NFLPosition, string> = {
  QB:"#E31837", RB:"#FB4F14", WR:"#FFC20E", TE:"#00B5E2",
  OL:"#8B949E", DE:"#3FB950", DT:"#26A69A", LB:"#1F6FEB",
  CB:"#6E40C9", S:"#9C27B0", K:"#FF7043", P:"#795548",
};

const GAME_PLANS: { value: GamePlan; label: string; desc: string }[] = [
  { value:"aggressive",   label:"Aggressive",   desc:"More deep shots, aggressive blitzes. Higher variance." },
  { value:"balanced",     label:"Balanced",     desc:"Standard mix of run and pass. Reliable coverage." },
  { value:"conservative", label:"Conservative", desc:"Ball control, short passes, prevent defense." },
];
const FORMATIONS: { value: Formation; label: string; desc: string }[] = [
  { value:"4-3",    label:"4-3",    desc:"Four DL, three LBs. Excellent run-stopper base." },
  { value:"3-4",    label:"3-4",    desc:"Three DL, four LBs. Versatile pass rush packages." },
  { value:"nickel", label:"Nickel", desc:"Five DBs. Extra coverage vs spread formations." },
  { value:"dime",   label:"Dime",   desc:"Six DBs. Maximum pass defense, vulnerable to runs." },
];
const SCHEMES: { value: OffenseScheme; label: string; desc: string }[] = [
  { value:"pro-set",  label:"Pro Set",   desc:"Classic two-back set. Balanced run and pass game." },
  { value:"spread",   label:"Spread",    desc:"Multiple WRs, horizontal stretch. Mobile QB friendly." },
  { value:"air-raid", label:"Air Raid",  desc:"Pass-first, no-huddle tempo. Built to score fast." },
  { value:"run-heavy",label:"Run Heavy", desc:"Ground and pound. Control clock, wear down defenses." },
];

type Tab = "roster" | "freeAgency" | "gamePlan" | "depth";

export default function RosterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { membership } = useAuth();
  const { getPlayerTeam, season, signFreeAgent, releasePlayer, updateDepthOrder, updateGamePlan, updateFormation, updateOffenseScheme } = useNFL();

  const role = membership?.role ?? "GM";
  const isGM    = role === "GM";
  const isCoach = role === "Coach";
  const isScout = role === "Scout";

  const team = getPlayerTeam();
  const [tab, setTab] = useState<Tab>(isCoach ? "gamePlan" : "roster");
  const [posFilter, setPosFilter] = useState<NFLPosition | "ALL">("ALL");
  const [expanded, setExpanded] = useState<string | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const gmTabs    = [{ key: "roster" as Tab, label: "Roster" }, { key: "freeAgency" as Tab, label: "Free Agents" }];
  const coachTabs = [{ key: "gamePlan" as Tab, label: "Game Plan" }, { key: "depth" as Tab, label: "Depth Chart" }];
  const scoutTabs = [{ key: "roster" as Tab, label: "Roster" }, { key: "depth" as Tab, label: "Depth Chart" }];
  const allTabs   = isGM ? gmTabs : isCoach ? coachTabs : scoutTabs;

  const filteredRoster = useMemo(() => {
    if (!team) return [];
    const list = posFilter === "ALL" ? team.roster : team.roster.filter(p => p.position === posFilter);
    return [...list].sort((a, b) => b.overall - a.overall);
  }, [team, posFilter]);

  const depthByPos = useMemo(() => {
    if (!team) return {} as Record<NFLPosition, Player[]>;
    const r: Partial<Record<NFLPosition, Player[]>> = {};
    for (const pos of ALL_POSITIONS) {
      r[pos] = team.roster.filter(p => p.position === pos).sort((a,b) => a.depthOrder - b.depthOrder);
    }
    return r as Record<NFLPosition, Player[]>;
  }, [team]);

  const canEdit = !isScout;

  const roleColor = isGM ? colors.nflBlue : isCoach ? colors.nflRed : colors.nflGold;

  if (!team) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View style={styles.headerTop}>
          <View style={[styles.roleBadge, { backgroundColor: roleColor + "25", borderColor: roleColor }]}>
            <Text style={[styles.roleBadgeText, { color: roleColor }]}>
              {isGM ? "General Manager" : isCoach ? "Head Coach" : "Scout"}
            </Text>
          </View>
          {isScout && (
            <View style={[styles.readOnlyBadge, { backgroundColor: colors.secondary }]}>
              <Feather name="eye" size={11} color={colors.mutedForeground} />
              <Text style={[styles.readOnlyText, { color: colors.mutedForeground }]}>View Only</Text>
            </View>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }} contentContainerStyle={{ gap: 8 }}>
          {allTabs.map(t => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTab(t.key)}
              style={[styles.tabBtn, { backgroundColor: tab === t.key ? roleColor : colors.card }]}
            >
              <Text style={[styles.tabText, { color: tab === t.key ? "#fff" : colors.mutedForeground }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ROSTER TAB */}
      {(tab === "roster") && (
        <>
          {isGM && (
            <View style={styles.capRow}>
              <Feather name="dollar-sign" size={13} color={colors.nflGold} />
              <Text style={[styles.capText, { color: colors.nflGold }]}>
                Cap: ${team.capSpace}M available · ${team.roster.reduce((s,p)=>s+p.salary,0).toFixed(1)}M used
              </Text>
            </View>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.posFilter}>
            {(["ALL", ...ALL_POSITIONS] as (NFLPosition|"ALL")[]).map(pos => (
              <TouchableOpacity
                key={pos}
                onPress={() => setPosFilter(pos)}
                style={[styles.posBtn, { backgroundColor: pos === posFilter ? (pos === "ALL" ? colors.nflBlue : POS_COLOR[pos as NFLPosition]) : colors.card }]}
              >
                <Text style={[styles.posBtnText, { color: pos === posFilter ? "#fff" : colors.mutedForeground }]}>{pos}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <ScrollView contentContainerStyle={{ padding: 14, gap: 8, paddingBottom: Platform.OS === "web" ? 120 : 110 }}>
            {filteredRoster.map(p => (
              <TouchableOpacity
                key={p.id}
                onPress={() => setExpanded(expanded === p.id ? null : p.id)}
                style={[styles.playerRow, { backgroundColor: colors.card, borderColor: expanded === p.id ? POS_COLOR[p.position] : colors.border }]}
              >
                <View style={[styles.posBadge, { backgroundColor: POS_COLOR[p.position] + "25" }]}>
                  <Text style={[styles.posBadgeText, { color: POS_COLOR[p.position] }]}>{p.position}</Text>
                </View>
                <View style={styles.playerInfo}>
                  <Text style={[styles.playerName, { color: colors.foreground }]}>{p.name}</Text>
                  <Text style={[styles.playerMeta, { color: colors.mutedForeground }]}>
                    Age {p.age} · {p.yearsExperience}yr exp · ${p.salary}M/{p.contractYears}yr
                  </Text>
                </View>
                <OverallBadge overall={p.overall} size="sm" />
                <Feather name={expanded === p.id ? "chevron-up" : "chevron-down"} size={15} color={colors.mutedForeground} />

                {expanded === p.id && (
                  <View style={[styles.expandedSection, { borderTopColor: colors.border }]}>
                    <MiniStat label="SPD" value={p.speed} />
                    <MiniStat label="STR" value={p.strength} />
                    <MiniStat label="AWR" value={p.awareness} />
                    <MiniStat label="KEY" value={p.specific} />
                    <MiniStat label="POT" value={p.potential} />
                    {isGM && (
                      <TouchableOpacity
                        onPress={() => Alert.alert("Release Player", `Release ${p.name} ($${p.salary}M saved)?`, [{ text: "Cancel" }, { text: "Release", style: "destructive", onPress: () => releasePlayer(p.id) }])}
                        style={[styles.releaseBtn, { borderColor: colors.danger }]}
                      >
                        <Text style={[styles.releaseBtnText, { color: colors.danger }]}>Release</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      {/* FREE AGENCY TAB */}
      {tab === "freeAgency" && (
        <ScrollView contentContainerStyle={{ padding: 14, gap: 8, paddingBottom: Platform.OS === "web" ? 120 : 110 }}>
          <Text style={[styles.sectionHdr, { color: colors.mutedForeground }]}>Available Free Agents · {season?.freeAgents.length ?? 0} players</Text>
          {season?.freeAgents.sort((a,b) => b.overall - a.overall).map(p => (
            <View key={p.id} style={[styles.playerRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.posBadge, { backgroundColor: POS_COLOR[p.position] + "25" }]}>
                <Text style={[styles.posBadgeText, { color: POS_COLOR[p.position] }]}>{p.position}</Text>
              </View>
              <View style={styles.playerInfo}>
                <Text style={[styles.playerName, { color: colors.foreground }]}>{p.name}</Text>
                <Text style={[styles.playerMeta, { color: colors.mutedForeground }]}>
                  Age {p.age} · ${p.salary}M/yr · {p.contractYears}yr ask
                </Text>
              </View>
              <OverallBadge overall={p.overall} size="sm" />
              {isGM ? (
                <TouchableOpacity
                  onPress={() => Alert.alert("Sign Player", `Sign ${p.name} for $${p.salary}M/yr?`, [{ text: "Cancel" }, { text: "Sign", onPress: () => signFreeAgent(p.id) }])}
                  style={[styles.signBtn, { backgroundColor: colors.success + "20", borderColor: colors.success }]}
                >
                  <Text style={[styles.signBtnText, { color: colors.success }]}>Sign</Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.viewOnlyTag, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.viewOnlyText, { color: colors.mutedForeground }]}>View</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* GAME PLAN TAB */}
      {tab === "gamePlan" && (
        <ScrollView contentContainerStyle={{ padding: 14, gap: 18, paddingBottom: Platform.OS === "web" ? 120 : 110 }}>
          {isScout && (
            <View style={[styles.viewOnlyBanner, { backgroundColor: colors.nflGold + "15", borderColor: colors.nflGold + "40" }]}>
              <Feather name="eye" size={14} color={colors.nflGold} />
              <Text style={[styles.viewOnlyBannerText, { color: colors.nflGold }]}>Coach controls game plan settings</Text>
            </View>
          )}
          <SchemePicker title="Game Plan" options={GAME_PLANS} selected={team.gamePlan} color={colors.nflRed}
            onSelect={canEdit ? (v) => updateGamePlan(v as GamePlan) : undefined} />
          <SchemePicker title="Defensive Formation" options={FORMATIONS} selected={team.defenseFormation} color={colors.nflBlue}
            onSelect={canEdit ? (v) => updateFormation(v as Formation) : undefined} />
          <SchemePicker title="Offensive Scheme" options={SCHEMES} selected={team.offenseScheme} color={colors.success}
            onSelect={canEdit ? (v) => updateOffenseScheme(v as OffenseScheme) : undefined} />
        </ScrollView>
      )}

      {/* DEPTH CHART TAB */}
      {tab === "depth" && (
        <ScrollView contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: Platform.OS === "web" ? 120 : 110 }}>
          {ALL_POSITIONS.map(pos => {
            const players = depthByPos[pos] ?? [];
            if (!players.length) return null;
            return (
              <View key={pos} style={[styles.depthGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.depthHeader, { backgroundColor: POS_COLOR[pos] + "25" }]}>
                  <Text style={[styles.depthPosLabel, { color: POS_COLOR[pos] }]}>{pos}</Text>
                </View>
                {players.slice(0, 3).map((p, idx) => (
                  <View key={p.id} style={[styles.depthRow, { borderTopColor: colors.border }]}>
                    <View style={[styles.depthNum, { backgroundColor: idx === 0 ? POS_COLOR[pos] + "30" : colors.secondary }]}>
                      <Text style={[styles.depthNumText, { color: idx === 0 ? POS_COLOR[pos] : colors.mutedForeground }]}>
                        {["ST","2ND","3RD"][idx]}
                      </Text>
                    </View>
                    <Text style={[styles.depthName, { color: colors.foreground }]}>{p.name}</Text>
                    <OverallBadge overall={p.overall} size="sm" />
                    {isCoach && idx > 0 && (
                      <TouchableOpacity onPress={() => updateDepthOrder(p.id, 1)} style={[styles.startBtn, { borderColor: POS_COLOR[pos] }]}>
                        <Text style={[styles.startBtnText, { color: POS_COLOR[pos] }]}>Start</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  const colors = useColors();
  const color = value >= 85 ? colors.success : value >= 72 ? colors.warning : colors.mutedForeground;
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color }}>{value}</Text>
      <Text style={{ fontSize: 9, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>{label}</Text>
    </View>
  );
}

function SchemePicker({ title, options, selected, color, onSelect }:
  { title: string; options: { value: string; label: string; desc: string }[]; selected: string; color: string; onSelect?: (v: string) => void }) {
  const colors = useColors();
  return (
    <View>
      <Text style={[styles.sectionHdr, { color: colors.foreground, marginBottom: 10, fontSize: 15, fontFamily: "Inter_700Bold" }]}>{title}</Text>
      {options.map(opt => (
        <TouchableOpacity
          key={opt.value}
          onPress={() => onSelect?.(opt.value)}
          disabled={!onSelect}
          style={[styles.schemeOption, { backgroundColor: selected === opt.value ? color + "20" : colors.card, borderColor: selected === opt.value ? color : colors.border, opacity: onSelect ? 1 : 0.7 }]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {selected === opt.value && <Feather name="check-circle" size={15} color={color} />}
            <View>
              <Text style={[styles.schemeLabel, { color: selected === opt.value ? color : colors.foreground }]}>{opt.label}</Text>
              <Text style={[styles.schemeDesc, { color: colors.mutedForeground }]}>{opt.desc}</Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  header:       { paddingHorizontal: 16, paddingBottom: 8 },
  headerTop:    { flexDirection: "row", alignItems: "center", gap: 8 },
  roleBadge:    { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1.5 },
  roleBadgeText:{ fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  readOnlyBadge:{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  readOnlyText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  tabBtn:       { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 },
  tabText:      { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  capRow:       { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 8 },
  capText:      { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  posFilter:    { gap: 6, paddingHorizontal: 16, paddingBottom: 8 },
  posBtn:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  posBtnText:   { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  playerRow:    { borderRadius: 12, padding: 12, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  posBadge:     { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  posBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  playerInfo:   { flex: 1 },
  playerName:   { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  playerMeta:   { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  expandedSection:{ width: "100%", flexDirection: "row", alignItems: "center", paddingTop: 10, marginTop: 8, borderTopWidth: 1 },
  releaseBtn:   { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, borderWidth: 1, marginLeft: "auto" },
  releaseBtnText:{ fontSize: 12, fontFamily: "Inter_600SemiBold" },
  sectionHdr:   { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  signBtn:      { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  signBtnText:  { fontSize: 12, fontFamily: "Inter_700Bold" },
  viewOnlyTag:  { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  viewOnlyText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  viewOnlyBanner:{ flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  viewOnlyBannerText:{ fontSize: 13, fontFamily: "Inter_600SemiBold" },
  depthGroup:   { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  depthHeader:  { paddingHorizontal: 14, paddingVertical: 8 },
  depthPosLabel:{ fontSize: 13, fontFamily: "Inter_700Bold" },
  depthRow:     { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1 },
  depthNum:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  depthNumText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  depthName:    { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  startBtn:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  startBtnText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  schemeOption: { borderRadius: 10, borderWidth: 1.5, padding: 12, marginBottom: 8 },
  schemeLabel:  { fontSize: 14, fontFamily: "Inter_700Bold" },
  schemeDesc:   { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
});
