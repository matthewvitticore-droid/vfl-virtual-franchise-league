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
import { RoleToggle } from "@/components/RoleToggle";
import { useColors } from "@/hooks/useColors";
import { GamePlan, Formation, NFLPosition, OffenseScheme, Player, useNFL } from "@/context/NFLContext";

const OFFENSE_POSITIONS: NFLPosition[] = ["QB", "RB", "WR", "TE", "OL"];
const DEFENSE_POSITIONS: NFLPosition[] = ["DE", "DT", "LB", "CB", "S"];
const SPECIAL_POSITIONS: NFLPosition[] = ["K", "P"];
const ALL_POSITIONS: NFLPosition[] = [...OFFENSE_POSITIONS, ...DEFENSE_POSITIONS, ...SPECIAL_POSITIONS];

const POSITION_COLORS: Record<NFLPosition, string> = {
  QB: "#E31837", RB: "#FB4F14", WR: "#FFC20E", TE: "#00B5E2",
  OL: "#8B949E", DE: "#3FB950", DT: "#26A69A", LB: "#1F6FEB",
  CB: "#6E40C9", S: "#9C27B0", K: "#FF7043", P: "#795548",
};

const GAME_PLANS: { value: GamePlan; label: string; desc: string }[] = [
  { value: "aggressive", label: "Aggressive", desc: "Higher risk, higher reward. More deep shots, blitzes." },
  { value: "balanced", label: "Balanced", desc: "Mix of run and pass. Standard defensive shell." },
  { value: "conservative", label: "Conservative", desc: "Ball control, protect the lead. Prevent coverage." },
];

const FORMATIONS: { value: Formation; label: string; desc: string }[] = [
  { value: "4-3", label: "4-3", desc: "Four down linemen, three linebackers. Run-stop base." },
  { value: "3-4", label: "3-4", desc: "Three down linemen, four linebackers. Versatile pass rush." },
  { value: "nickel", label: "Nickel", desc: "Extra DB replaces a LB. Effective vs pass-heavy offenses." },
  { value: "dime", label: "Dime", desc: "Six DBs. Maximum pass coverage." },
];

const SCHEMES: { value: OffenseScheme; label: string; desc: string }[] = [
  { value: "pro-set", label: "Pro Set", desc: "Classic balanced attack with FB. Strong running game." },
  { value: "spread", label: "Spread", desc: "Multiple WR sets, stretches defense horizontally." },
  { value: "air-raid", label: "Air Raid", desc: "Pass-first, no-huddle. Built to score fast." },
  { value: "run-heavy", label: "Run Heavy", desc: "Ground and pound. Wear down the defense." },
];

type Tab = "roster" | "freeAgency" | "gamePlan" | "depth";

export default function RosterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getPlayerTeam, season, activeRole, signFreeAgent, releasePlayer, updateDepthOrder, updateGamePlan, updateFormation, updateOffenseScheme } = useNFL();
  const team = getPlayerTeam();
  const [tab, setTab] = useState<Tab>(activeRole === "Coach" ? "gamePlan" : "roster");
  const [posFilter, setPosFilter] = useState<NFLPosition | "ALL">("ALL");
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const gmTabs: { key: Tab; label: string }[] = [
    { key: "roster", label: "Roster" },
    { key: "freeAgency", label: "Free Agents" },
  ];
  const coachTabs: { key: Tab; label: string }[] = [
    { key: "gamePlan", label: "Game Plan" },
    { key: "depth", label: "Depth Chart" },
  ];
  const tabs = activeRole === "GM" ? gmTabs : coachTabs;

  React.useEffect(() => {
    setTab(activeRole === "GM" ? "roster" : "gamePlan");
  }, [activeRole]);

  const filteredPlayers = useMemo(() => {
    if (!team) return [];
    const list = posFilter === "ALL" ? team.roster : team.roster.filter(p => p.position === posFilter);
    return [...list].sort((a, b) => b.overall - a.overall);
  }, [team, posFilter]);

  const depthByPos = useMemo(() => {
    if (!team) return {} as Record<NFLPosition, Player[]>;
    const result: Partial<Record<NFLPosition, Player[]>> = {};
    for (const pos of ALL_POSITIONS) {
      result[pos] = team.roster
        .filter(p => p.position === pos)
        .sort((a, b) => a.depthOrder - b.depthOrder);
    }
    return result as Record<NFLPosition, Player[]>;
  }, [team]);

  if (!team) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <RoleToggle />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }} contentContainerStyle={{ gap: 8 }}>
          {tabs.map(t => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTab(t.key)}
              style={[styles.tabBtn, { backgroundColor: tab === t.key ? (activeRole === "GM" ? colors.nflBlue : colors.nflRed) : colors.card }]}
            >
              <Text style={[styles.tabText, { color: tab === t.key ? "#fff" : colors.mutedForeground }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ROSTER TAB */}
      {tab === "roster" && (
        <>
          <View style={styles.capRow}>
            <Feather name="dollar-sign" size={13} color={colors.nflGold} />
            <Text style={[styles.capText, { color: colors.nflGold }]}>
              Cap Space: ${team.capSpace}M | Used: ${team.roster.reduce((s, p) => s + p.salary, 0).toFixed(1)}M
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.posFilter}>
            {(["ALL", ...ALL_POSITIONS] as (NFLPosition | "ALL")[]).map(pos => (
              <TouchableOpacity
                key={pos}
                onPress={() => setPosFilter(pos)}
                style={[styles.posBtn, { backgroundColor: pos === posFilter ? (pos === "ALL" ? colors.nflBlue : POSITION_COLORS[pos as NFLPosition]) : colors.card }]}
              >
                <Text style={[styles.posBtnText, { color: pos === posFilter ? "#fff" : colors.mutedForeground }]}>{pos}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <ScrollView contentContainerStyle={{ padding: 14, gap: 8, paddingBottom: Platform.OS === "web" ? 120 : 110 }}>
            {filteredPlayers.map(p => (
              <TouchableOpacity
                key={p.id}
                onPress={() => setSelectedPlayer(selectedPlayer?.id === p.id ? null : p)}
                style={[styles.playerRow, { backgroundColor: colors.card, borderColor: selectedPlayer?.id === p.id ? POSITION_COLORS[p.position] : colors.border }]}
              >
                <View style={[styles.posBadge, { backgroundColor: POSITION_COLORS[p.position] + "25" }]}>
                  <Text style={[styles.posBadgeText, { color: POSITION_COLORS[p.position] }]}>{p.position}</Text>
                </View>
                <View style={styles.playerInfo}>
                  <Text style={[styles.playerName, { color: colors.foreground }]}>{p.name}</Text>
                  <Text style={[styles.playerMeta, { color: colors.mutedForeground }]}>Age {p.age} · {p.yearsExperience}yr · ${p.salary}M</Text>
                </View>
                <OverallBadge overall={p.overall} size="sm" />
                <Feather name={selectedPlayer?.id === p.id ? "chevron-up" : "chevron-down"} size={15} color={colors.mutedForeground} />

                {selectedPlayer?.id === p.id && (
                  <View style={[styles.expandedRow, { borderTopColor: colors.border }]}>
                    <MiniStat label="SPD" value={p.speed} />
                    <MiniStat label="STR" value={p.strength} />
                    <MiniStat label="AWR" value={p.awareness} />
                    <MiniStat label="KEY" value={p.specific} />
                    <View style={styles.releaseBtn}>
                      <TouchableOpacity
                        onPress={() => { Alert.alert("Release Player", `Release ${p.name}?`, [{ text: "Cancel" }, { text: "Release", style: "destructive", onPress: () => releasePlayer(p.id) }]); }}
                        style={[styles.releaseBtnInner, { borderColor: colors.danger }]}
                      >
                        <Text style={[styles.releaseBtnText, { color: colors.danger }]}>Release</Text>
                      </TouchableOpacity>
                    </View>
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
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Available Free Agents</Text>
          {season?.freeAgents.map(p => (
            <View key={p.id} style={[styles.playerRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.posBadge, { backgroundColor: POSITION_COLORS[p.position] + "25" }]}>
                <Text style={[styles.posBadgeText, { color: POSITION_COLORS[p.position] }]}>{p.position}</Text>
              </View>
              <View style={styles.playerInfo}>
                <Text style={[styles.playerName, { color: colors.foreground }]}>{p.name}</Text>
                <Text style={[styles.playerMeta, { color: colors.mutedForeground }]}>Age {p.age} · ${p.salary}M/yr</Text>
              </View>
              <OverallBadge overall={p.overall} size="sm" />
              <TouchableOpacity
                onPress={() => { Alert.alert("Sign Player", `Sign ${p.name} for $${p.salary}M?`, [{ text: "Cancel" }, { text: "Sign", onPress: () => signFreeAgent(p.id) }]); }}
                style={[styles.signBtn, { backgroundColor: colors.success + "20", borderColor: colors.success }]}
              >
                <Text style={[styles.signBtnText, { color: colors.success }]}>Sign</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* GAME PLAN TAB */}
      {tab === "gamePlan" && (
        <ScrollView contentContainerStyle={{ padding: 14, gap: 16, paddingBottom: Platform.OS === "web" ? 120 : 110 }}>
          <SchemePicker
            title="Game Plan"
            options={GAME_PLANS}
            selected={team.gamePlan}
            color={colors.nflRed}
            onSelect={(v) => updateGamePlan(v as GamePlan)}
          />
          <SchemePicker
            title="Defensive Formation"
            options={FORMATIONS}
            selected={team.defenseFormation}
            color={colors.nflBlue}
            onSelect={(v) => updateFormation(v as Formation)}
          />
          <SchemePicker
            title="Offensive Scheme"
            options={SCHEMES}
            selected={team.offenseScheme}
            color={colors.success}
            onSelect={(v) => updateOffenseScheme(v as OffenseScheme)}
          />
        </ScrollView>
      )}

      {/* DEPTH CHART TAB */}
      {tab === "depth" && (
        <ScrollView contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: Platform.OS === "web" ? 120 : 110 }}>
          {ALL_POSITIONS.map(pos => {
            const players = depthByPos[pos] ?? [];
            if (players.length === 0) return null;
            return (
              <View key={pos} style={[styles.depthGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.depthPosHeader, { backgroundColor: POSITION_COLORS[pos] + "25" }]}>
                  <Text style={[styles.depthPosLabel, { color: POSITION_COLORS[pos] }]}>{pos}</Text>
                </View>
                {players.slice(0, 3).map((p, idx) => (
                  <View key={p.id} style={[styles.depthRow, { borderTopColor: colors.border }]}>
                    <View style={[styles.depthNum, { backgroundColor: idx === 0 ? POSITION_COLORS[pos] + "30" : colors.secondary }]}>
                      <Text style={[styles.depthNumText, { color: idx === 0 ? POSITION_COLORS[pos] : colors.mutedForeground }]}>
                        {idx === 0 ? "1st" : idx === 1 ? "2nd" : "3rd"}
                      </Text>
                    </View>
                    <Text style={[styles.depthName, { color: colors.foreground }]}>{p.name}</Text>
                    <OverallBadge overall={p.overall} size="sm" />
                    {idx > 0 && (
                      <TouchableOpacity onPress={() => updateDepthOrder(p.id, 1)} style={[styles.startBtn, { borderColor: POSITION_COLORS[pos] }]}>
                        <Text style={[styles.startBtnText, { color: POSITION_COLORS[pos] }]}>Start</Text>
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
  const color = value >= 85 ? colors.success : value >= 70 ? colors.warning : colors.mutedForeground;
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color }}>{value}</Text>
      <Text style={{ fontSize: 9, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>{label}</Text>
    </View>
  );
}

function SchemePicker({ title, options, selected, color, onSelect }: { title: string; options: { value: string; label: string; desc: string }[]; selected: string; color: string; onSelect: (v: string) => void }) {
  const colors = useColors();
  return (
    <View>
      <Text style={[styles.sectionLabel, { color: colors.foreground, marginBottom: 8, fontSize: 15, fontFamily: "Inter_700Bold" }]}>{title}</Text>
      {options.map(opt => (
        <TouchableOpacity
          key={opt.value}
          onPress={() => onSelect(opt.value)}
          style={[styles.schemeOption, { backgroundColor: selected === opt.value ? color + "20" : colors.card, borderColor: selected === opt.value ? color : colors.border }]}
        >
          <View style={styles.schemeLeft}>
            {selected === opt.value && <Feather name="check-circle" size={15} color={color} style={{ marginRight: 8 }} />}
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
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  tabBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 },
  tabText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  capRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 8 },
  capText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  posFilter: { gap: 6, paddingHorizontal: 16, paddingBottom: 8 },
  posBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  posBtnText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  playerRow: { borderRadius: 12, padding: 12, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  posBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  posBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  playerInfo: { flex: 1 },
  playerName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  playerMeta: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  expandedRow: { width: "100%", flexDirection: "row", alignItems: "center", paddingTop: 10, marginTop: 8, borderTopWidth: 1 },
  releaseBtn: { flex: 1, alignItems: "flex-end" },
  releaseBtnInner: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  releaseBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  sectionLabel: { fontSize: 12, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  signBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  signBtnText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  depthGroup: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  depthPosHeader: { paddingHorizontal: 14, paddingVertical: 8 },
  depthPosLabel: { fontSize: 13, fontFamily: "Inter_700Bold" },
  depthRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1 },
  depthNum: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  depthNumText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  depthName: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  startBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  startBtnText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  schemeOption: { borderRadius: 10, borderWidth: 1.5, padding: 12, marginBottom: 8 },
  schemeLeft: { flexDirection: "row", alignItems: "center" },
  schemeLabel: { fontSize: 14, fontFamily: "Inter_700Bold" },
  schemeDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
});
