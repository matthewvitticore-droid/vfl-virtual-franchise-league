import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useState } from "react";
import {
  Alert, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { exportRosterXLSX } from "@/utils/exportRoster";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useTeamTheme } from "@/hooks/useTeamTheme";
import { useAuth } from "@/context/AuthContext";
import {
  GamePlan, Formation, NFLPosition, OffenseScheme, Player, useNFL,
} from "@/context/NFLContext";
import { PlayerStatsModal } from "@/components/PlayerStatsModal";

const ALL_POS: NFLPosition[] = ["QB","RB","WR","TE","OL","DE","DT","LB","CB","S","K","P"];
const POS_COLOR: Record<NFLPosition, string> = {
  QB:"#E31837", RB:"#FB4F14", WR:"#FFC20E", TE:"#00B5E2", OL:"#8B949E",
  DE:"#3FB950", DT:"#26A69A", LB:"#1F6FEB", CB:"#6E40C9", S:"#9C27B0",
  K:"#FF7043", P:"#795548",
};
const DEV_COLORS: Record<string, string> = {
  "X-Factor": "#FFD700", "Superstar": "#FF6B35", "Star": "#3FB950", "Normal": "#8B949E", "Late Bloomer": "#00B5E2",
};

function hexLuminance(hex: string): number {
  const h = hex.replace("#", "");
  const r = parseInt(h.substr(0,2), 16);
  const g = parseInt(h.substr(2,2), 16);
  const b = parseInt(h.substr(4,2), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
function pickAccent(primary: string, secondary: string): string {
  return hexLuminance(primary) >= 0.18 ? primary : secondary;
}

type MainTab = "depth" | "roster" | "gamePlan";
type RosterSortKey = "overall" | "age" | "speed" | "acceleration" | "agility" | "yearsExperience" | "salary";

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
  const colors    = useColors();
  const insets    = useSafeAreaInsets();
  const { membership } = useAuth();
  const { season, teamCustomization, getPlayerTeam, releasePlayer, restructureContract, updateDepthOrder, updateGamePlan, updateFormation, updateOffenseScheme } = useNFL();

  const role    = membership?.role ?? "GM";
  const isGM    = role === "GM";
  const isCoach = role === "Coach";
  const team    = getPlayerTeam();
  const theme   = useTeamTheme();
  const teamColor     = theme.primary;
  const teamSecondary = theme.secondary;

  const [tab,           setTab]           = useState<MainTab>(isCoach ? "gamePlan" : "depth");
  const [posFilter,     setPosFilter]     = useState<NFLPosition | "ALL">("ALL");
  const [viewTeamId,    setViewTeamId]    = useState<string>("");
  const [rosterSortKey, setRosterSortKey] = useState<RosterSortKey>("overall");
  const [rosterSortAsc, setRosterSortAsc] = useState(false);
  const [statsPlayer,    setStatsPlayer]    = useState<Player | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [expanded,       setExpanded]       = useState<string | null>(null);
  const [teamPickerOpen, setTeamPickerOpen] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const gamesPlayed = season?.games.filter(g => g.status === "final").length ?? 0;

  const viewTeam = useMemo(() =>
    season?.teams.find(t => t.id === (viewTeamId || team?.id)) ?? team,
    [season, viewTeamId, team]
  );
  const isViewingOwnTeam = !viewTeamId || viewTeamId === team?.id;
  // Always use brand primary (never kit jersey color) so the modal tabs get the
  // correct team color regardless of which uniform kit is active on the home screen.
  const viewColor = isViewingOwnTeam
    ? theme.primary
    : pickAccent(viewTeam?.primaryColor ?? teamColor, viewTeam?.secondaryColor ?? teamSecondary);
  const viewSecondary = isViewingOwnTeam
    ? theme.secondary
    : viewTeam?.secondaryColor ?? teamSecondary;

  const pageColor = tab === "roster" ? viewColor : teamColor;

  const sortedRoster = useMemo(() => {
    if (!viewTeam) return [];
    const LOW_BETTER: RosterSortKey[] = ["age", "salary", "yearsExperience"];
    const list = posFilter === "ALL"
      ? [...viewTeam.roster]
      : viewTeam.roster.filter(p => p.position === posFilter);
    return list.sort((a, b) => {
      const getVal = (p: Player): number => {
        switch (rosterSortKey) {
          case "overall":        return p.overall;
          case "age":            return p.age;
          case "speed":          return p.speed;
          case "acceleration":   return (p.positionRatings as any)?.acceleration ?? 50;
          case "agility":        return (p.positionRatings as any)?.agility ?? 50;
          case "yearsExperience":return p.yearsExperience;
          case "salary":         return p.salary;
          default:               return p.overall;
        }
      };
      const invert = LOW_BETTER.includes(rosterSortKey);
      const diff = getVal(a) - getVal(b);
      return (rosterSortAsc !== invert) ? diff : -diff;
    });
  }, [viewTeam, posFilter, rosterSortKey, rosterSortAsc]);

  const handleRosterSort = (key: RosterSortKey) => {
    if (rosterSortKey === key) setRosterSortAsc(a => !a);
    else { setRosterSortKey(key); setRosterSortAsc(false); }
  };

  const capUsed = team?.roster.reduce((s, p) => s + p.salary, 0).toFixed(1) ?? "0";
  const capLeft = ((team?.totalCap ?? 255) - parseFloat(capUsed)).toFixed(1);
  const deadCap = team?.roster.reduce((s, p) => s + (p.deadCap ?? 0), 0).toFixed(1) ?? "0";

  const TABS: { key: MainTab; label: string; icon: any; allowed: boolean }[] = [
    { key:"depth",    label:"Depth Chart", icon:"align-left", allowed: true },
    { key:"roster",   label:"Players",     icon:"users",      allowed: true },
    { key:"gamePlan", label:"Game Plan",   icon:"sliders",    allowed: isGM || isCoach },
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
    const year = season?.year ?? new Date().getFullYear();
    await exportRosterXLSX(team, year);
  }

  if (!team) return null;

  const headerTeam = tab === "roster" ? viewTeam : team;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>

      {/* Team-color ambient wash — follows viewColor when on Players tab */}
      <LinearGradient
        colors={[pageColor + "40", pageColor + "18", pageColor + "06", "transparent"]}
        locations={[0, 0.25, 0.55, 1]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 420, zIndex: 0 }}
        pointerEvents="none"
      />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={[st.header, { paddingTop: topPad + 8, backgroundColor: "transparent", borderBottomColor: pageColor + "40" }]}>
        <View style={st.headerTop}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={[st.headerTitle, { color: colors.foreground }]}>
                {headerTeam?.city} {headerTeam?.name}
              </Text>
              {tab === "roster" && !isViewingOwnTeam && (
                <View style={[st.scoutingBadge, { backgroundColor: viewColor + "25", borderColor: viewColor + "60" }]}>
                  <Text style={[st.scoutingText, { color: viewColor }]}>SCOUTING</Text>
                </View>
              )}
            </View>
            {isViewingOwnTeam || tab !== "roster"
              ? <Text style={[st.headerSub, { color: colors.mutedForeground }]}>
                  Cap: ${capUsed}M used · ${capLeft}M avail · ${deadCap}M dead
                </Text>
              : <Text style={[st.headerSub, { color: colors.mutedForeground }]}>
                  {viewTeam?.roster.length ?? 0} players · {viewTeam?.conference} · {viewTeam?.division}
                </Text>
            }
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {isViewingOwnTeam && (
              <TouchableOpacity onPress={handleExportCSV} style={[st.exportBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Feather name="download" size={13} color={colors.mutedForeground} />
                <Text style={[st.exportBtnText, { color: colors.mutedForeground }]}>Export</Text>
              </TouchableOpacity>
            )}
            <View style={[st.roleBadge, { backgroundColor: teamColor + "25", borderColor: teamColor }]}>
              <Text style={[st.roleText, { color: teamColor }]}>{role}</Text>
            </View>
          </View>
        </View>

        {/* Tab bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.tabScroll}
          contentContainerStyle={{ gap: 6, paddingHorizontal: 16, paddingBottom: 10 }}>
          {TABS.filter(t => t.allowed).map(t => (
            <TouchableOpacity key={t.key} onPress={() => setTab(t.key)}
              style={[st.tabBtn, {
                backgroundColor: tab === t.key ? teamColor : colors.secondary,
                borderColor: tab === t.key ? teamColor : colors.border,
              }]}>
              <Feather name={t.icon} size={12} color={tab === t.key ? "#fff" : colors.mutedForeground} />
              <Text style={[st.tabLabel, { color: tab === t.key ? "#fff" : colors.mutedForeground }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* ── Depth Chart ─────────────────────────────────────────────────── */}
        {tab === "depth" && (
          <View>
            {ALL_POS.map(pos => {
              const byPos = team.roster
                .filter(p => p.position === pos)
                .sort((a, b) => a.depthOrder - b.depthOrder);
              if (byPos.length === 0) return null;
              const movePlayer = (idx: number, dir: "up" | "down") => {
                const arr = [...byPos];
                const swap = dir === "up" ? idx - 1 : idx + 1;
                [arr[idx], arr[swap]] = [arr[swap], arr[idx]];
                updateDepthOrder(pos, arr.map(pl => pl.id));
              };
              return (
                <View key={pos} style={{ marginBottom: 1 }}>
                  <View style={[st.posHeader, { backgroundColor: teamColor + "18", borderLeftColor: teamColor }]}>
                    <Text style={[st.posLabel, { color: teamColor }]}>{pos}</Text>
                    <Text style={[st.posCount, { color: colors.mutedForeground }]}>{byPos.length} deep</Text>
                  </View>
                  {byPos.map((p, idx) => {
                    const isStarter = idx === 0;
                    const salaryStr = typeof p.salary === "number" ? p.salary.toFixed(1) : String(p.salary);
                    return (
                      <TouchableOpacity key={p.id} onPress={() => setSelectedPlayer(p)} activeOpacity={0.75}
                        style={[st.depthRow, {
                          backgroundColor: isStarter ? teamColor + "12" : colors.card,
                          borderBottomColor: colors.border,
                        }]}>
                        <View style={[st.depthNum, { backgroundColor: isStarter ? teamColor : colors.secondary }]}>
                          <Text style={[st.depthNumText, { color: isStarter ? "#fff" : colors.mutedForeground }]}>{idx + 1}</Text>
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <View style={st.depthNameRow}>
                            <Text style={[st.depthName, { color: isStarter ? colors.foreground : colors.mutedForeground }]} numberOfLines={1}>{p.name}</Text>
                            {p.yearsExperience === 0 && (
                              <View style={st.rookieBadge}><Text style={st.rookieText}>R</Text></View>
                            )}
                            {p.developmentTrait !== "Normal" && (
                              <View style={[st.devTag, { backgroundColor: DEV_COLORS[p.developmentTrait] + "25" }]}>
                                <Text style={[st.devText, { color: DEV_COLORS[p.developmentTrait] }]}>{p.developmentTrait[0]}</Text>
                              </View>
                            )}
                            {p.injury && (
                              <View style={[st.injTag, { backgroundColor: colors.danger + "25" }]}>
                                <Feather name="alert-circle" size={8} color={colors.danger} />
                              </View>
                            )}
                          </View>
                          <Text style={[st.depthMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
                            {p.age}yo · ${salaryStr}M · {p.contractYears}yr
                          </Text>
                        </View>
                        <View style={[st.depthOvr, { backgroundColor: teamColor + "20", borderColor: teamColor + "50" }]}>
                          <Text style={[st.depthOvrText, { color: teamColor }]}>{p.overall}</Text>
                        </View>
                        <View style={st.arrowCol}>
                          <TouchableOpacity onPress={e => { e.stopPropagation?.(); movePlayer(idx, "up"); }}
                            disabled={idx === 0} style={[st.arrowBtn, { opacity: idx === 0 ? 0.18 : 1 }]}
                            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
                            <Feather name="chevron-up" size={15} color={teamColor} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={e => { e.stopPropagation?.(); movePlayer(idx, "down"); }}
                            disabled={idx === byPos.length - 1}
                            style={[st.arrowBtn, { opacity: idx === byPos.length - 1 ? 0.18 : 1 }]}
                            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
                            <Feather name="chevron-down" size={15} color={colors.mutedForeground} />
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })}
          </View>
        )}

        {/* ── Players (sortable table) ─────────────────────────────────────── */}
        {tab === "roster" && (
          <View>
            {/* Team selector — dropdown button */}
            <TouchableOpacity onPress={() => setTeamPickerOpen(true)}
              style={[st.teamDropBtn, { backgroundColor: colors.card, borderColor: viewColor + "60" }]}>
              <View style={[st.teamDropSwatch, { backgroundColor: viewColor }]} />
              <View style={{ flex: 1 }}>
                <Text style={[st.teamDropLabel, { color: colors.mutedForeground }]}>
                  {isViewingOwnTeam ? "MY TEAM" : "SCOUTING"}
                </Text>
                <Text style={[st.teamDropName, { color: colors.foreground }]} numberOfLines={1}>
                  {viewTeam?.city} {viewTeam?.name}
                  <Text style={{ color: viewColor }}> ({viewTeam?.abbreviation})</Text>
                </Text>
              </View>
              <Feather name="chevron-down" size={16} color={viewColor} />
            </TouchableOpacity>

            {/* Position filter pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
              contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 6 }}>
              {(["ALL", ...ALL_POS] as (NFLPosition | "ALL")[]).map(pos => {
                const active = posFilter === pos;
                const pillColor = pos === "ALL" ? viewColor : POS_COLOR[pos as NFLPosition];
                return (
                  <TouchableOpacity key={pos} onPress={() => setPosFilter(pos)}
                    style={[st.posPill, {
                      backgroundColor: active ? pillColor : colors.secondary,
                      borderColor: active ? pillColor : colors.border,
                    }]}>
                    <Text style={[st.posPillText, { color: active ? "#fff" : colors.mutedForeground }]}>{pos}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Sortable table */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ minWidth: 640 }}>
                {/* Header row */}
                <View style={[st.tableHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                  <Text style={[st.colFixHdr, { color: colors.mutedForeground }]}># POS PLAYER</Text>
                  <RSortHeader label="OVR"  sortKey="overall"          current={rosterSortKey} asc={rosterSortAsc} onSort={handleRosterSort} colors={colors} accent={viewColor} />
                  <RSortHeader label="SPD"  sortKey="speed"            current={rosterSortKey} asc={rosterSortAsc} onSort={handleRosterSort} colors={colors} accent={viewColor} />
                  <RSortHeader label="ACC"  sortKey="acceleration"     current={rosterSortKey} asc={rosterSortAsc} onSort={handleRosterSort} colors={colors} accent={viewColor} />
                  <RSortHeader label="AGI"  sortKey="agility"          current={rosterSortKey} asc={rosterSortAsc} onSort={handleRosterSort} colors={colors} accent={viewColor} />
                  <RSortHeader label="EXP"  sortKey="yearsExperience"  current={rosterSortKey} asc={rosterSortAsc} onSort={handleRosterSort} colors={colors} accent={viewColor} />
                  <RSortHeader label="SAL"  sortKey="salary"           current={rosterSortKey} asc={rosterSortAsc} onSort={handleRosterSort} colors={colors} accent={viewColor} />
                </View>

                {sortedRoster.map((p, idx) => (
                  <RosterPlayerRow
                    key={p.id}
                    p={p}
                    rank={idx + 1}
                    colors={colors}
                    accent={viewColor}
                    onPress={() => setStatsPlayer(p)}
                    isOwnTeam={isViewingOwnTeam}
                    onManage={isGM && isViewingOwnTeam ? () => setSelectedPlayer(p) : undefined}
                  />
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* ── Game Plan ──────────────────────────────────────────────────── */}
        {tab === "gamePlan" && (
          <View style={{ padding: 16, gap: 16 }}>
            <PlanSection title="Game Plan" desc="Overall offensive and defensive strategy" options={GAME_PLANS} value={team.gamePlan} onSelect={(v) => updateGamePlan(v as GamePlan)} colors={colors} teamColor={teamColor} />
            <PlanSection title="Defense Formation" desc="Base defensive alignment" options={FORMATIONS} value={team.defenseFormation} onSelect={(v) => updateFormation(v as Formation)} colors={colors} teamColor={teamColor} />
            <PlanSection title="Offense Scheme" desc="How your offense attacks the defense" options={SCHEMES} value={team.offenseScheme} onSelect={(v) => updateOffenseScheme(v as OffenseScheme)} colors={colors} teamColor={teamColor} />
          </View>
        )}
      </ScrollView>

      {/* ── Depth chart player detail — slide-up sheet ── */}
      {selectedPlayer && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
          <TouchableOpacity style={StyleSheet.absoluteFillObject}
            onPress={() => setSelectedPlayer(null)}
            activeOpacity={1}
            style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.55)" }]}
          />
          <View style={[st.sheet, { backgroundColor: colors.card }]}>
            <View style={st.sheetHandle} />
            <TouchableOpacity onPress={() => setSelectedPlayer(null)} style={st.sheetClose}>
              <Feather name="x" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}>
              {/* Player hero */}
              <View style={[st.sheetHero, { backgroundColor: teamColor + "18", borderColor: teamColor + "40" }]}>
                <View style={[st.sheetOvrBadge, { backgroundColor: teamColor + "30", borderColor: teamColor }]}>
                  <Text style={[st.sheetOvrText, { color: teamColor }]}>{selectedPlayer.overall}</Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[st.sheetName, { color: colors.foreground }]}>{selectedPlayer.name}</Text>
                  <Text style={[st.sheetMeta, { color: colors.mutedForeground }]}>
                    {selectedPlayer.position} · {selectedPlayer.age}yo · {selectedPlayer.yearsExperience}yr exp
                  </Text>
                  <View style={{ flexDirection: "row", gap: 6, marginTop: 2 }}>
                    {selectedPlayer.developmentTrait !== "Normal" && (
                      <View style={[st.devTag, { backgroundColor: DEV_COLORS[selectedPlayer.developmentTrait] + "25" }]}>
                        <Text style={[st.devText, { color: DEV_COLORS[selectedPlayer.developmentTrait] }]}>{selectedPlayer.developmentTrait}</Text>
                      </View>
                    )}
                    {selectedPlayer.injury && (
                      <View style={[st.injTag, { backgroundColor: colors.danger + "25" }]}>
                        <Feather name="alert-circle" size={9} color={colors.danger} />
                        <Text style={{ fontSize: 9, color: colors.danger, fontFamily: "Inter_600SemiBold" }}>
                          {selectedPlayer.injury.location} ({selectedPlayer.injury.severity})
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Contract block */}
              <View style={[st.contractBlock, { backgroundColor: colors.secondary }]}>
                <ContractRow label="Annual Salary"    value={`$${selectedPlayer.salary.toFixed(1)}M`} />
                <ContractRow label="Signing Bonus"    value={`$${selectedPlayer.signingBonus?.toFixed(1) ?? "0"}M`} />
                <ContractRow label="Guaranteed"       value={`$${selectedPlayer.guaranteedMoney?.toFixed(1) ?? "0"}M`} />
                <ContractRow label="Dead Cap"         value={`$${selectedPlayer.deadCap?.toFixed(1) ?? "0"}M`} color={colors.danger} />
                <ContractRow label="Years Remaining"  value={`${selectedPlayer.contractYears}`} />
              </View>

              {/* Actions */}
              <TouchableOpacity onPress={() => { setStatsPlayer(selectedPlayer); setSelectedPlayer(null); }}
                style={[st.actionBtn, { backgroundColor: teamColor + "18", borderColor: teamColor + "40" }]}>
                <Feather name="bar-chart-2" size={12} color={teamColor} />
                <Text style={[st.actionBtnText, { color: teamColor }]}>Season &amp; Career Stats</Text>
              </TouchableOpacity>
              {isGM && (
                <View style={st.actionRow}>
                  {selectedPlayer.contractYears >= 2 && (
                    <TouchableOpacity onPress={() => handleRestructure(selectedPlayer)}
                      style={[st.actionBtn, { flex: 1, backgroundColor: colors.nflBlue + "20", borderColor: colors.nflBlue + "50" }]}>
                      <Feather name="refresh-cw" size={12} color={colors.nflBlue} />
                      <Text style={[st.actionBtnText, { color: colors.nflBlue }]}>Restructure</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => handleRelease(selectedPlayer)}
                    style={[st.actionBtn, { flex: 1, backgroundColor: colors.danger + "15", borderColor: colors.danger + "40" }]}>
                    <Feather name="x-circle" size={12} color={colors.danger} />
                    <Text style={[st.actionBtnText, { color: colors.danger }]}>Release</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      )}

      {/* ── Team Picker Modal ── */}
      <Modal visible={teamPickerOpen} animationType="slide" transparent onRequestClose={() => setTeamPickerOpen(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.72)" }}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setTeamPickerOpen(false)} activeOpacity={1} />
          <View style={[st.pickerSheet, { backgroundColor: colors.card }]}>
            {/* Handle */}
            <View style={[st.sheetHandle, { alignSelf: "center", marginBottom: 0 }]} />
            <View style={[st.pickerHeader, { borderBottomColor: colors.border }]}>
              <Text style={[st.pickerTitle, { color: colors.foreground }]}>Select Team</Text>
              <TouchableOpacity onPress={() => setTeamPickerOpen(false)}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
              {/* My Team row */}
              <TouchableOpacity
                onPress={() => { setViewTeamId(""); setTeamPickerOpen(false); }}
                style={[st.pickerRow, {
                  backgroundColor: isViewingOwnTeam ? viewColor + "18" : "transparent",
                  borderBottomColor: colors.border,
                }]}>
                <View style={[st.pickerSwatch, { backgroundColor: teamColor }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[st.pickerRowName, { color: isViewingOwnTeam ? viewColor : colors.foreground }]}>
                    {team?.city} {team?.name}
                  </Text>
                  <Text style={[st.pickerRowSub, { color: colors.mutedForeground }]}>
                    {team?.abbreviation} · MY TEAM
                  </Text>
                </View>
                {isViewingOwnTeam && <Feather name="check" size={16} color={viewColor} />}
              </TouchableOpacity>

              {/* Conference / division groups */}
              {["Ironclad","Gridiron"].map(conf => (
                <View key={conf}>
                  <View style={[st.pickerConfHeader, { backgroundColor: colors.secondary }]}>
                    <Text style={[st.pickerConfText, { color: colors.mutedForeground }]}>{conf.toUpperCase()} CONFERENCE</Text>
                  </View>
                  {["East","North","South","West"].map(div => {
                    const divTeams = (season?.teams ?? []).filter(t => t.conference === conf && t.division === div && t.id !== team?.id);
                    if (divTeams.length === 0) return null;
                    return (
                      <View key={div}>
                        <View style={[st.pickerDivHeader, { borderBottomColor: colors.border }]}>
                          <Text style={[st.pickerDivText, { color: colors.mutedForeground }]}>{div}</Text>
                        </View>
                        {divTeams.map(t => {
                          const accent = pickAccent(t.primaryColor, t.secondaryColor);
                          const isActive = viewTeamId === t.id;
                          return (
                            <TouchableOpacity key={t.id}
                              onPress={() => { setViewTeamId(t.id); setTeamPickerOpen(false); }}
                              style={[st.pickerRow, {
                                backgroundColor: isActive ? accent + "15" : "transparent",
                                borderBottomColor: colors.border,
                              }]}>
                              <View style={[st.pickerSwatch, { backgroundColor: accent }]} />
                              <View style={{ flex: 1 }}>
                                <Text style={[st.pickerRowName, { color: isActive ? accent : colors.foreground }]}>
                                  {t.city} {t.name}
                                </Text>
                                <Text style={[st.pickerRowSub, { color: colors.mutedForeground }]}>{t.abbreviation}</Text>
                              </View>
                              {isActive && <Feather name="check" size={16} color={accent} />}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Stats Modal ── */}
      <PlayerStatsModal
        player={statsPlayer}
        visible={!!statsPlayer}
        onClose={() => setStatsPlayer(null)}
        teamPrimaryColor={viewColor}
        teamSecondaryColor={viewSecondary}
        gamesPlayedThisSeason={gamesPlayed}
      />
    </View>
  );
}

// ─── RSortHeader ─────────────────────────────────────────────────────────────
function RSortHeader({ label, sortKey: key, current, asc, onSort, colors, accent }:
  { label: string; sortKey: RosterSortKey; current: RosterSortKey; asc: boolean;
    onSort: (k: RosterSortKey) => void; colors: any; accent: string }) {
  const active = key === current;
  return (
    <TouchableOpacity onPress={() => onSort(key)}
      style={[st.colHeader, { borderBottomColor: active ? accent : "transparent", borderBottomWidth: active ? 2 : 0 }]}>
      <Text style={[st.colHeaderText, { color: active ? accent : colors.mutedForeground }]}>{label}</Text>
      {active && <Feather name={asc ? "chevron-up" : "chevron-down"} size={9} color={accent} />}
    </TouchableOpacity>
  );
}

// ─── RosterPlayerRow ─────────────────────────────────────────────────────────
function RosterPlayerRow({ p, rank, colors, accent, onPress, isOwnTeam, onManage }:
  { p: Player; rank: number; colors: any; accent: string;
    onPress: () => void; isOwnTeam: boolean; onManage?: () => void }) {
  // Team-colorway rating tiers: full → bright → mid → muted
  const ratingColor = (v: number) =>
    v >= 90 ? accent :
    v >= 80 ? accent + "CC" :
    v >= 70 ? accent + "88" :
    colors.mutedForeground;
  // Salary: max earners = full accent (flagship player), mid = dimmer, low = muted
  const salaryColor = (sal: number) =>
    sal >= 20 ? accent :
    sal >= 10 ? accent + "AA" :
    colors.mutedForeground;

  const acc = (p.positionRatings as any)?.acceleration ?? 50;
  const agi = (p.positionRatings as any)?.agility ?? 50;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}
      style={[st.rosterRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      {/* Fixed left name cell */}
      <View style={{ width: 185, paddingRight: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Text style={{ fontSize: 10, color: colors.mutedForeground, fontFamily: "Inter_500Medium", width: 20, textAlign: "right" }}>{rank}</Text>
          <View style={[st.posBadge, { backgroundColor: accent + "25" }]}>
            <Text style={[st.posBadgeText, { color: accent }]}>{p.position}</Text>
          </View>
          <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground, flexShrink: 1 }} numberOfLines={1}>
            {p.name.split(" ").slice(-1)[0]}
          </Text>
          {p.developmentTrait !== "Normal" && (
            <Text style={{ fontSize: 9, color: accent + "DD", fontFamily: "Inter_700Bold" }}>
              {p.developmentTrait === "X-Factor" ? "⚡" : p.developmentTrait === "Superstar" ? "★" : p.developmentTrait === "Star" ? "◆" : "↑"}
            </Text>
          )}
        </View>
        <Text style={{ fontSize: 10, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 1, paddingLeft: 24 }}>
          Age {p.age} · {p.yearsExperience === 0 ? "Rookie" : `${p.yearsExperience}yr`}
        </Text>
      </View>

      {/* Stat cells */}
      <ColCell value={`${p.overall}`}           color={ratingColor(p.overall)} />
      <ColCell value={`${p.speed}`}             color={ratingColor(p.speed)} />
      <ColCell value={`${acc}`}                 color={ratingColor(acc)} />
      <ColCell value={`${agi}`}                 color={ratingColor(agi)} />
      <ColCell value={`${p.yearsExperience}yr`} color={accent + "99"} />
      <ColCell value={`$${p.salary.toFixed(1)}M`} color={salaryColor(p.salary)} />

      {/* Manage button (own team only) */}
      {onManage && (
        <TouchableOpacity onPress={e => { e.stopPropagation?.(); onManage(); }}
          style={{ width: 40, alignItems: "center", justifyContent: "center" }}>
          <Feather name="more-horizontal" size={16} color={accent} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

function ColCell({ value, color }: { value: string; color: string }) {
  return <Text style={[st.colCell, { color }]}>{value}</Text>;
}

// ─── PlanSection ─────────────────────────────────────────────────────────────
function PlanSection({ title, desc, options, value, onSelect, colors, teamColor }:
  { title: string; desc: string; options: { value: string; label: string; desc: string }[];
    value: string; onSelect: (v: string) => void; colors: any; teamColor: string }) {
  return (
    <View style={[st.planCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[st.planTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[st.planDesc, { color: colors.mutedForeground }]}>{desc}</Text>
      <View style={{ gap: 6, marginTop: 8 }}>
        {options.map(opt => (
          <TouchableOpacity key={opt.value} onPress={() => onSelect(opt.value)}
            style={[st.planOption, {
              backgroundColor: value === opt.value ? teamColor + "18" : colors.secondary,
              borderColor: value === opt.value ? teamColor : colors.border,
            }]}>
            <View style={{ flex: 1 }}>
              <Text style={[st.planOptionLabel, { color: value === opt.value ? teamColor : colors.foreground }]}>{opt.label}</Text>
              <Text style={[st.planOptionDesc, { color: colors.mutedForeground }]}>{opt.desc}</Text>
            </View>
            {value === opt.value && <Feather name="check-circle" size={16} color={teamColor} />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─── ContractRow ─────────────────────────────────────────────────────────────
function ContractRow({ label, value, color }: { label: string; value: string; color?: string }) {
  const colors = useColors();
  return (
    <View style={st.contractRow}>
      <Text style={[st.contractLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[st.contractValue, { color: color ?? colors.foreground }]}>{value}</Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  header:       { borderBottomWidth: 1, zIndex: 10 },
  headerTop:    { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  headerTitle:  { fontSize: 20, fontFamily: "Inter_700Bold" },
  headerSub:    { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  scoutingBadge:{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, borderWidth: 1 },
  scoutingText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  exportBtn:    { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  exportBtnText:{ fontSize: 12, fontFamily: "Inter_500Medium" },
  roleBadge:    { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  roleText:     { fontSize: 11, fontFamily: "Inter_700Bold" },
  tabScroll:    { flexGrow: 0 },
  tabBtn:       { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  tabLabel:     { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  teamDropBtn:   { flexDirection: "row", alignItems: "center", gap: 12, margin: 12, padding: 14, borderRadius: 14, borderWidth: 1.5 },
  teamDropSwatch:{ width: 14, height: 14, borderRadius: 7 },
  teamDropLabel: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1, textTransform: "uppercase" },
  teamDropName:  { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 2 },
  posPill:      { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  posPillText:  { fontSize: 10, fontFamily: "Inter_700Bold" },

  // Sortable table
  tableHeader:  { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, gap: 4 },
  colFixHdr:    { width: 185, fontSize: 11, fontFamily: "Inter_600SemiBold" },
  colHeader:    { width: 60, alignItems: "center", flexDirection: "row", gap: 2, justifyContent: "center" },
  colHeaderText:{ fontSize: 11, fontFamily: "Inter_600SemiBold" },
  colCell:      { width: 60, textAlign: "center", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  rosterRow:    { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: 1, gap: 4 },
  posBadge:     { paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 },
  posBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold" },

  // Depth chart
  posHeader:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 7, borderLeftWidth: 3 },
  posLabel:     { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  posCount:     { fontSize: 11, fontFamily: "Inter_400Regular" },
  depthRow:     { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, gap: 10 },
  depthNum:     { width: 24, height: 24, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  depthNumText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  depthNameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  depthName:    { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  depthMeta:    { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  depthOvr:     { width: 40, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  depthOvrText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  arrowCol:     { gap: 0 },
  arrowBtn:     { padding: 2 },
  rookieBadge:  { backgroundColor: "#D97706", borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  rookieText:   { fontSize: 8, fontFamily: "Inter_700Bold", color: "#fff" },
  devTag:       { paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 },
  devText:      { fontSize: 8, fontFamily: "Inter_600SemiBold" },
  injTag:       { flexDirection: "row", alignItems: "center", gap: 2, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 },

  // Slide-up sheet
  sheet:        { position: "absolute", bottom: 0, left: 0, right: 0, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "85%", paddingTop: 12 },
  sheetHandle:  { width: 40, height: 4, borderRadius: 2, backgroundColor: "#ffffff30", alignSelf: "center", marginBottom: 6 },
  sheetClose:   { position: "absolute", right: 16, top: 14, zIndex: 10 },
  sheetHero:    { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
  sheetOvrBadge:{ width: 52, height: 52, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  sheetOvrText: { fontSize: 22, fontFamily: "Inter_700Bold" },
  sheetName:    { fontSize: 16, fontFamily: "Inter_700Bold" },
  sheetMeta:    { fontSize: 12, fontFamily: "Inter_400Regular" },

  // Contract + actions
  contractBlock:{ borderRadius: 10, padding: 12, gap: 8 },
  contractRow:  { flexDirection: "row", justifyContent: "space-between" },
  contractLabel:{ fontSize: 12, fontFamily: "Inter_400Regular" },
  contractValue:{ fontSize: 12, fontFamily: "Inter_600SemiBold" },
  actionRow:    { flexDirection: "row", gap: 8 },
  actionBtn:    { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  actionBtnText:{ fontSize: 12, fontFamily: "Inter_600SemiBold" },

  // Team picker modal
  pickerSheet:     { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, maxHeight: "85%" },
  pickerHeader:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  pickerTitle:     { fontSize: 17, fontFamily: "Inter_700Bold" },
  pickerRow:       { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth },
  pickerSwatch:    { width: 10, height: 10, borderRadius: 5 },
  pickerRowName:   { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  pickerRowSub:    { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  pickerConfHeader:{ paddingHorizontal: 20, paddingVertical: 8 },
  pickerConfText:  { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.2 },
  pickerDivHeader: { paddingHorizontal: 20, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  pickerDivText:   { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },

  // Game plan
  planCard:     { borderRadius: 12, padding: 14, borderWidth: 1, gap: 4 },
  planTitle:    { fontSize: 15, fontFamily: "Inter_700Bold" },
  planDesc:     { fontSize: 11, fontFamily: "Inter_400Regular" },
  planOption:   { flexDirection: "row", alignItems: "center", padding: 10, borderRadius: 10, borderWidth: 1, gap: 10 },
  planOptionLabel:{ fontSize: 13, fontFamily: "Inter_600SemiBold" },
  planOptionDesc: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
});
