import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import React, { useMemo, useState } from "react";
import {
  Alert, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import {
  GamePlan, Formation, NFLPosition, OffenseScheme, Player, useNFL,
} from "@/context/NFLContext";
import { PlayerCard } from "@/components/PlayerCard";

const ALL_POS: NFLPosition[] = ["QB","RB","WR","TE","OL","DE","DT","LB","CB","S","K","P"];
const POS_COLOR: Record<NFLPosition, string> = {
  QB:"#E31837", RB:"#FB4F14", WR:"#FFC20E", TE:"#00B5E2", OL:"#8B949E",
  DE:"#3FB950", DT:"#26A69A", LB:"#1F6FEB", CB:"#6E40C9", S:"#9C27B0",
  K:"#FF7043", P:"#795548",
};
const DEV_ICONS: Record<string, any> = {
  "X-Factor": "zap", "Superstar": "star", "Star": "award", "Normal": "user", "Late Bloomer": "trending-up",
};
const DEV_COLORS: Record<string, string> = {
  "X-Factor": "#FFD700", "Superstar": "#FF6B35", "Star": "#3FB950", "Normal": "#8B949E", "Late Bloomer": "#00B5E2",
};

type MainTab = "depth" | "roster" | "gamePlan" | "freeAgency";

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
  { value:"pro-set",   label:"Pro Set",   desc:"Classic two-back set. Balanced run and pass game." },
  { value:"spread",    label:"Spread",    desc:"Multiple WRs, horizontal stretch. Mobile QB friendly." },
  { value:"air-raid",  label:"Air Raid",  desc:"Pass-first, no-huddle tempo. Built to score fast." },
  { value:"run-heavy", label:"Run Heavy", desc:"Ground and pound. Control clock, wear down defenses." },
];

export default function RosterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { membership } = useAuth();
  const { season, getPlayerTeam, signFreeAgent, releasePlayer, restructureContract, updateDepthOrder, updateGamePlan, updateFormation, updateOffenseScheme } = useNFL();

  const role = membership?.role ?? "GM";
  const isGM    = role === "GM";
  const isCoach = role === "Coach";
  const team = getPlayerTeam();
  const teamColor = team?.primaryColor ?? "#013369";
  const [tab, setTab] = useState<MainTab>(isCoach ? "gamePlan" : "depth");
  const [posFilter, setPosFilter] = useState<NFLPosition | "ALL">("ALL");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const roster = useMemo(() => {
    if (!team) return [];
    const sorted = [...team.roster].sort((a, b) => {
      if (a.position < b.position) return -1;
      if (a.position > b.position) return 1;
      return a.depthOrder - b.depthOrder || b.overall - a.overall;
    });
    return posFilter === "ALL" ? sorted : sorted.filter(p => p.position === posFilter);
  }, [team, posFilter]);

  const capUsed = team?.roster.reduce((s, p) => s + p.salary, 0).toFixed(1) ?? "0";
  const capLeft = ((team?.totalCap ?? 255) - parseFloat(capUsed)).toFixed(1);
  const deadCap = team?.roster.reduce((s, p) => s + (p.deadCap ?? 0), 0).toFixed(1) ?? "0";

  const TABS: { key: MainTab; label: string; icon: any; allowed: boolean }[] = [
    { key:"depth",     label:"Depth Chart", icon:"align-left",   allowed: true },
    { key:"roster",    label:"Players",     icon:"users",         allowed: true },
    { key:"gamePlan",  label:"Game Plan",   icon:"sliders",       allowed: isGM || isCoach },
    { key:"freeAgency",label:"Free Agents", icon:"user-plus",     allowed: isGM },
  ];

  function handleRelease(p: Player) {
    Alert.alert(
      `Release ${p.name}?`,
      `Dead cap hit: $${p.deadCap?.toFixed(1) ?? "0"}M. This action cannot be undone.`,
      [{ text: "Cancel" }, { text: "Release", style: "destructive", onPress: () => releasePlayer(p.id) }],
    );
  }
  function handleRestructure(p: Player) {
    const saved = (p.salary * 0.21).toFixed(1);
    Alert.alert(
      `Restructure ${p.name}?`,
      `Convert 30% of salary ($${(p.salary * 0.3).toFixed(1)}M) to signing bonus. Saves ~$${saved}M this year. Dead cap increases.`,
      [{ text: "Cancel" }, { text: "Restructure", onPress: () => restructureContract(p.id) }],
    );
  }

  async function handleExportCSV() {
    if (!team) return;
    const header = "Name,Position,Overall,Age,Exp,Salary,Dev\n";
    const rows = [...team.roster]
      .sort((a, b) => b.overall - a.overall)
      .map(p => `${p.name},${p.position},${p.overall},${p.age},${p.experience},${p.salary.toFixed(1)},${p.development}`)
      .join("\n");
    const csv = header + rows;
    if (Platform.OS === "web") {
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${team.city}_${team.name}_roster.csv`;
      a.click();
      URL.revokeObjectURL(url);
      Alert.alert("Exported!", "Roster CSV downloaded.");
    } else {
      await Clipboard.setStringAsync(csv);
      Alert.alert("Copied!", "Roster CSV copied to clipboard. Paste into any spreadsheet app.");
    }
  }

  if (!team) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[st.header, { paddingTop: topPad + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={st.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={[st.headerTitle, { color: colors.foreground }]}>{team.city} {team.name}</Text>
            <Text style={[st.headerSub, { color: colors.mutedForeground }]}>
              Cap: ${capUsed}M used · ${capLeft}M avail · ${deadCap}M dead
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <TouchableOpacity onPress={handleExportCSV} style={[st.exportBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Feather name="download" size={13} color={colors.mutedForeground} />
              <Text style={[st.exportBtnText, { color: colors.mutedForeground }]}>Export</Text>
            </TouchableOpacity>
            <View style={[st.roleBadge, { backgroundColor: teamColor + "25", borderColor: teamColor }]}>
              <Text style={[st.roleText, { color: teamColor }]}>{role}</Text>
            </View>
          </View>
        </View>
        {/* Tab bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.tabScroll} contentContainerStyle={{ gap: 6, paddingHorizontal: 16, paddingBottom: 10 }}>
          {TABS.filter(t => t.allowed).map(t => (
            <TouchableOpacity key={t.key} onPress={() => setTab(t.key)}
              style={[st.tabBtn, { backgroundColor: tab === t.key ? teamColor : colors.secondary, borderColor: tab === t.key ? teamColor : colors.border }]}>
              <Feather name={t.icon} size={12} color={tab === t.key ? "#fff" : colors.mutedForeground} />
              <Text style={[st.tabLabel, { color: tab === t.key ? "#fff" : colors.mutedForeground }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* ── Depth Chart ── */}
        {tab === "depth" && (
          <View>
            {ALL_POS.map(pos => {
              const byPos = team.roster.filter(p => p.position === pos).sort((a,b) => a.depthOrder - b.depthOrder);
              if (byPos.length === 0) return null;
              const pc = POS_COLOR[pos];
              return (
                <View key={pos} style={{ marginBottom: 2 }}>
                  <View style={[st.posHeader, { backgroundColor: pc + "15", borderLeftColor: pc }]}>
                    <Text style={[st.posLabel, { color: pc }]}>{pos}</Text>
                    <Text style={[st.posCount, { color: colors.mutedForeground }]}>{byPos.length} players</Text>
                  </View>
                  {byPos.map((p, idx) => (
                    <TouchableOpacity key={p.id} onPress={() => setSelectedPlayer(p)} activeOpacity={0.75}
                      style={[st.depthRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                      <View style={[st.depthNum, { backgroundColor: idx === 0 ? pc + "25" : colors.secondary }]}>
                        <Text style={[st.depthNumText, { color: idx === 0 ? pc : colors.mutedForeground }]}>{idx + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={st.depthNameRow}>
                          <Text style={[st.depthName, { color: colors.foreground }]}>{p.name}</Text>
                          {p.developmentTrait !== "Normal" && (
                            <View style={[st.devTag, { backgroundColor: DEV_COLORS[p.developmentTrait] + "25" }]}>
                              <Feather name={DEV_ICONS[p.developmentTrait]} size={10} color={DEV_COLORS[p.developmentTrait]} />
                              <Text style={[st.devText, { color: DEV_COLORS[p.developmentTrait] }]}>{p.developmentTrait}</Text>
                            </View>
                          )}
                          {p.injury && (
                            <View style={[st.injTag, { backgroundColor: colors.danger + "25" }]}>
                              <Feather name="alert-circle" size={10} color={colors.danger} />
                              <Text style={[st.injText, { color: colors.danger }]}>{p.injury.severity} · {p.injury.location}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[st.depthMeta, { color: colors.mutedForeground }]}>Age {p.age} · {p.yearsExperience}yr exp · ${p.salary}M/yr · {p.contractYears}yr left</Text>
                      </View>
                      <OvrBadge value={p.overall} color={pc} />
                      <Feather name="chevron-right" size={14} color={colors.mutedForeground} style={{ opacity: 0.5 }} />
                    </TouchableOpacity>
                  ))}
                </View>
              );
            })}
          </View>
        )}

        {/* ── Players ── */}
        {tab === "roster" && (
          <View>
            {/* Position filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, padding: 12 }}>
              {(["ALL", ...ALL_POS] as (NFLPosition | "ALL")[]).map(p => (
                <TouchableOpacity key={p} onPress={() => setPosFilter(p)}
                  style={[st.posChip, { backgroundColor: posFilter === p ? (p === "ALL" ? teamColor : POS_COLOR[p as NFLPosition]) : colors.secondary, borderColor: posFilter === p ? (p === "ALL" ? teamColor : POS_COLOR[p as NFLPosition]) : colors.border }]}>
                  <Text style={[st.posChipText, { color: posFilter === p ? "#fff" : colors.mutedForeground }]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {roster.map(p => (
              <TouchableOpacity key={p.id} onPress={() => setExpanded(expanded === p.id ? null : p.id)}
                activeOpacity={0.88}>
                <PlayerCard
                  player={p}
                  teamPrimaryColor={teamColor}
                  teamSecondaryColor={team?.secondaryColor}
                  expanded={expanded === p.id}
                  showInjury
                />
                {expanded === p.id && (
                  <View style={[st.expandedActions, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    {/* Contract details */}
                    <View style={[st.contractBlock, { backgroundColor: colors.secondary }]}>
                      <ContractRow label="Signing Bonus" value={`$${p.signingBonus?.toFixed(1)}M`} />
                      <ContractRow label="Guaranteed" value={`$${p.guaranteedMoney?.toFixed(1)}M`} />
                      <ContractRow label="Dead Cap" value={`$${p.deadCap?.toFixed(1)}M`} color={colors.danger} />
                      <ContractRow label="Years Remaining" value={`${p.contractYears}`} />
                    </View>
                    {isGM && (
                      <View style={st.actionRow}>
                        {p.contractYears >= 2 && (
                          <TouchableOpacity onPress={() => handleRestructure(p)}
                            style={[st.actionBtn, { backgroundColor: colors.nflBlue + "20", borderColor: colors.nflBlue + "50" }]}>
                            <Feather name="refresh-cw" size={12} color={colors.nflBlue} />
                            <Text style={[st.actionBtnText, { color: colors.nflBlue }]}>Restructure</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={() => handleRelease(p)}
                          style={[st.actionBtn, { backgroundColor: colors.danger + "15", borderColor: colors.danger + "40" }]}>
                          <Feather name="x-circle" size={12} color={colors.danger} />
                          <Text style={[st.actionBtnText, { color: colors.danger }]}>Release</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Game Plan ── */}
        {tab === "gamePlan" && (
          <View style={{ padding: 16, gap: 16 }}>
            <PlanSection title="Game Plan" desc="Overall offensive and defensive strategy" options={GAME_PLANS} value={team.gamePlan} onSelect={(v) => updateGamePlan(v as GamePlan)} colors={colors} teamColor={teamColor} />
            <PlanSection title="Defense Formation" desc="Base defensive alignment" options={FORMATIONS} value={team.defenseFormation} onSelect={(v) => updateFormation(v as Formation)} colors={colors} teamColor={teamColor} />
            <PlanSection title="Offense Scheme" desc="How your offense attacks the defense" options={SCHEMES} value={team.offenseScheme} onSelect={(v) => updateOffenseScheme(v as OffenseScheme)} colors={colors} teamColor={teamColor} />
          </View>
        )}

        {/* ── Free Agency (from roster) ── */}
        {tab === "freeAgency" && (
          <View style={{ padding: 16, gap: 12 }}>
            <Text style={[st.faNote, { color: colors.mutedForeground }]}>
              Tap a player to negotiate a contract. Interest level shows how much they want to join your team.
            </Text>
            {(season?.freeAgents ?? []).sort((a, b) => b.overall - a.overall).slice(0, 30).map(p => (
              <TouchableOpacity key={p.id} onPress={() => setExpanded(expanded === p.id ? null : p.id)}
                activeOpacity={0.88}>
                <PlayerCard
                  player={p}
                  teamPrimaryColor={teamColor}
                  teamSecondaryColor={team?.secondaryColor}
                  expanded={expanded === p.id}
                  showInjury={false}
                />
                {expanded === p.id && (
                  <View style={[st.expandedActions, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <InterestBar level={p.faInterestLevel} teamColor={teamColor} />
                    {isGM && (
                      <View style={st.signBtnRow}>
                        {[1, 2, 3].map(yrs => (
                          <TouchableOpacity key={yrs} onPress={() => {
                            const sal = parseFloat((p.salary * (1 + (yrs - 1) * 0.03)).toFixed(1));
                            Alert.alert(`Sign ${p.name}?`, `${yrs}-year deal at $${sal}M/yr (${p.faInterestLevel >= 4 ? "likely to accept" : p.faInterestLevel >= 3 ? "may accept" : "low interest"})`, [
                              { text: "Cancel" },
                              { text: "Offer Contract", onPress: () => signFreeAgent(p.id, yrs, sal) },
                            ]);
                          }}
                          style={[st.signBtn, { backgroundColor: teamColor + "20", borderColor: teamColor + "60" }]}>
                            <Text style={[st.signBtnText, { color: teamColor }]}>{yrs}yr · ${(p.salary * (1 + (yrs-1)*0.03)).toFixed(1)}M</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── Player Detail Modal ── */}
      <Modal visible={!!selectedPlayer} animationType="slide" transparent onRequestClose={() => setSelectedPlayer(null)}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.72)" }}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setSelectedPlayer(null)} />
          <View style={{ backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "90%", paddingTop: 12 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 6 }} />
            <TouchableOpacity onPress={() => setSelectedPlayer(null)} style={{ position: "absolute", right: 16, top: 14, zIndex: 10 }}>
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
            {selectedPlayer && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
                <PlayerCard
                  player={selectedPlayer}
                  teamPrimaryColor={teamColor}
                  teamSecondaryColor={team?.secondaryColor}
                  expanded
                  showInjury
                />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function OvrBadge({ value, color }: { value: number; color: string }) {
  const colors = useColors();
  return (
    <View style={[ovrSt.badge, { backgroundColor: color + "22", borderColor: color + "55" }]}>
      <Text style={[ovrSt.text, { color }]}>{value}</Text>
    </View>
  );
}
const ovrSt = StyleSheet.create({
  badge: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  text:  { fontSize: 15, fontFamily: "Inter_700Bold" },
});

function RatingBar({ label, value, color }: { label: string; value: number; color: string }) {
  const colors = useColors();
  return (
    <View style={{ flex: 1, gap: 3 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground }}>{label}</Text>
        <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color }}>{value}</Text>
      </View>
      <View style={{ height: 4, backgroundColor: colors.secondary, borderRadius: 2 }}>
        <View style={{ height: "100%", width: `${value}%`, backgroundColor: color, borderRadius: 2 }} />
      </View>
    </View>
  );
}

function InterestBar({ level, teamColor }: { level: number; teamColor: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }}>
      {[1,2,3,4,5].map(i => (
        <View key={i} style={{ width: 12, height: 4, borderRadius: 2, backgroundColor: i <= level ? teamColor : "#ffffff20" }} />
      ))}
      <Text style={{ fontSize: 10, fontFamily: "Inter_500Medium", color: "#8B949E", marginLeft: 2 }}>
        {level >= 5 ? "Very Interested" : level >= 4 ? "Interested" : level >= 3 ? "Open to Offers" : level >= 2 ? "Low Interest" : "Not Interested"}
      </Text>
    </View>
  );
}

function ContractRow({ label, value, color }: { label: string; value: string; color?: string }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
      <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>{label}</Text>
      <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: color ?? colors.foreground }}>{value}</Text>
    </View>
  );
}

function PlanSection({ title, desc, options, value, onSelect, colors, teamColor }: {
  title: string; desc: string; options: { value: string; label: string; desc: string }[];
  value: string; onSelect: (v: string) => void; colors: any; teamColor: string;
}) {
  return (
    <View>
      <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 2 }}>{title}</Text>
      <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginBottom: 10 }}>{desc}</Text>
      {options.map(opt => (
        <TouchableOpacity key={opt.value} onPress={() => onSelect(opt.value)}
          style={[{ borderRadius: 12, padding: 12, borderWidth: 1.5, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 10 },
            { backgroundColor: value === opt.value ? teamColor + "18" : colors.card, borderColor: value === opt.value ? teamColor : colors.border }]}>
          <View style={[{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
            { borderColor: value === opt.value ? teamColor : colors.border }]}>
            {value === opt.value && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: teamColor }} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: value === opt.value ? teamColor : colors.foreground }}>{opt.label}</Text>
            <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>{opt.desc}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  header:         { paddingHorizontal: 16, borderBottomWidth: 1 },
  headerTop:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  headerTitle:    { fontSize: 18, fontFamily: "Inter_700Bold" },
  headerSub:      { fontSize: 11, fontFamily: "Inter_400Regular" },
  roleBadge:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  exportBtn:      { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  exportBtnText:  { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  roleText:       { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  tabScroll:      {},
  tabBtn:         { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  tabLabel:       { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  posHeader:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 7, borderLeftWidth: 3 },
  posLabel:       { fontSize: 13, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  posCount:       { fontSize: 11, fontFamily: "Inter_400Regular" },
  depthRow:       { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  depthNum:       { width: 26, height: 26, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  depthNumText:   { fontSize: 13, fontFamily: "Inter_700Bold" },
  depthNameRow:   { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  depthName:      { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  depthMeta:      { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  devTag:         { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5 },
  devText:        { fontSize: 9, fontFamily: "Inter_600SemiBold" },
  injTag:         { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5 },
  injText:        { fontSize: 9, fontFamily: "Inter_600SemiBold" },
  posChip:        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  posChipText:    { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  playerCard:     { borderBottomWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
  playerRow:      { flexDirection: "row", alignItems: "center", gap: 10 },
  posCircle:      { width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  posCircleText:  { fontSize: 11, fontFamily: "Inter_700Bold" },
  playerNameRow:  { flexDirection: "row", alignItems: "center", gap: 6 },
  playerName:     { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  playerMeta:     { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  playerExpanded: { borderTopWidth: 1, marginTop: 10, paddingTop: 10, gap: 10 },
  ratingsRow:     { flexDirection: "row", gap: 10 },
  contractBlock:  { borderRadius: 10, padding: 10, gap: 2 },
  injBlock:       { flexDirection: "row", alignItems: "center", gap: 6, padding: 8, borderRadius: 8, borderWidth: 1 },
  injBlockText:   { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
  actionRow:      { flexDirection: "row", gap: 8 },
  actionBtn:      { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  actionBtnText:  { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  signBtnRow:     { flexDirection: "row", gap: 8 },
  signBtn:        { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  signBtnText:    { fontSize: 12, fontFamily: "Inter_700Bold" },
  faNote:         { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  expandedActions: { borderWidth: 1, borderTopWidth: 0, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, padding: 14, gap: 10 },
});
