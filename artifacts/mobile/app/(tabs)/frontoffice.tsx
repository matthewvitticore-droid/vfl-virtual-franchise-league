import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Alert, Platform, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { DraftProspect, NFLPosition, Player, TradeOffer, useNFL } from "@/context/NFLContext";
import { CombineMeasurables } from "@/context/types";

type Tab = "freeAgency" | "draft" | "trades";
type DraftView = "board" | "combine" | "warRoom";
type SortKey = "grade" | "fortyYardDash" | "benchPress" | "verticalJump" | "broadJump" | "shuttleRun" | "threeCone";

const ALL_POS: NFLPosition[] = ["QB","RB","WR","TE","OL","DE","DT","LB","CB","S","K","P"];
const POS_COLOR: Record<NFLPosition, string> = {
  QB:"#E31837", RB:"#FB4F14", WR:"#FFC20E", TE:"#00B5E2", OL:"#8B949E",
  DE:"#3FB950", DT:"#26A69A", LB:"#1F6FEB", CB:"#6E40C9", S:"#9C27B0",
  K:"#FF7043", P:"#795548",
};
const GRADE_COLORS: Record<string, string> = {
  "1st":"#FFD700","2nd":"#FF6B35","3rd":"#3FB950","4th":"#00B5E2","5th":"#8B949E","6th":"#795548","7th":"#525252","UDFA":"#333"
};

export default function FrontOfficeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { membership } = useAuth();
  const { season, getPlayerTeam, signFreeAgent, userDraftPick, simulateDraftPick, unlockScouting, proposeTrade, respondToTrade } = useNFL();
  const [tab, setTab] = useState<Tab>("freeAgency");
  const [draftView, setDraftView] = useState<DraftView>("board");
  const [posFilter, setPosFilter] = useState<NFLPosition | "ALL">("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("grade");
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedProspect, setExpandedProspect] = useState<string | null>(null);
  const [expandedFA, setExpandedFA] = useState<string | null>(null);
  const [tradeMode, setTradeMode] = useState<"browse"|"build">("browse");
  const [offeringPlayerIds, setOfferingPlayerIds] = useState<string[]>([]);
  const [receivingPlayerIds, setReceivingPlayerIds] = useState<string[]>([]);
  const [tradeTargetTeamId, setTradeTargetTeamId] = useState<string | null>(null);

  const role = membership?.role ?? "GM";
  const isGM = role === "GM";
  const team = getPlayerTeam();
  const teamColor = team?.primaryColor ?? "#013369";
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const ds = season?.draftState;

  // ── Free Agency data ──────────────────────────────────────────────────────

  const freeAgents = useMemo(() => {
    if (!season) return [];
    const sorted = [...season.freeAgents].sort((a, b) => b.overall - a.overall);
    return posFilter === "ALL" ? sorted : sorted.filter(p => p.position === posFilter);
  }, [season, posFilter]);

  // ── Draft data ────────────────────────────────────────────────────────────

  const prospects = useMemo(() => {
    if (!season) return [];
    let list = season.draftProspects.filter(p => !p.isPickedUp);
    if (posFilter !== "ALL") list = list.filter(p => p.position === posFilter);
    return list.sort((a, b) => {
      if (sortKey === "grade") return sortAsc ? a.overallGrade - b.overallGrade : b.overallGrade - a.overallGrade;
      const getVal = (p: DraftProspect) => {
        if (!p.combine || p.combine.didNotParticipate) return sortAsc ? 999 : -999;
        return (p.combine as any)[sortKey] ?? 0;
      };
      // For times (forty, shuttle, cone), lower = better, so invert direction
      const invertSort = ["fortyYardDash","shuttleRun","threeCone"].includes(sortKey);
      const aVal = getVal(a), bVal = getVal(b);
      return (sortAsc !== invertSort) ? aVal - bVal : bVal - aVal;
    });
  }, [season, posFilter, sortKey, sortAsc]);

  const userPicks = useMemo(() => {
    if (!team) return [];
    return team.draftPicks.filter(pk => pk.ownedByTeamId === team.id);
  }, [team]);

  // ── Trades data ────────────────────────────────────────────────────────────

  const pendingOffers = season?.tradeOffers.filter(o => o.status === "pending") ?? [];

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(key !== "grade"); }
  }

  async function handleSimulateAllAI() {
    if (!ds || ds.isComplete || ds.isUserTurn) return;
    await simulateDraftPick();
  }

  function evaluateTradeValue() {
    if (!season || !team) return 0;
    const allPlayers = season.teams.flatMap(t => t.roster);
    const giving = offeringPlayerIds.reduce((s, id) => {
      const p = team.roster.find(pl => pl.id === id);
      return s + (p ? p.overall * 1.5 + p.potential * 0.5 : 0);
    }, 0);
    const getting = receivingPlayerIds.reduce((s, id) => {
      const p = allPlayers.find(pl => pl.id === id);
      return s + (p ? p.overall * 1.5 + p.potential * 0.5 : 0);
    }, 0);
    return Math.round(getting - giving);
  }

  const tradeValue = evaluateTradeValue();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[st.header, { paddingTop: topPad + 8, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <Text style={[st.headerTitle, { color: colors.foreground }]}>Front Office</Text>
        <View style={st.tabBar}>
          {(["freeAgency","draft","trades"] as Tab[]).map(t => {
            const labels: Record<Tab, string> = { freeAgency:"Free Agency", draft:"Draft", trades:"Trades" };
            const icons: Record<Tab, any> = { freeAgency:"user-plus", draft:"award", trades:"git-merge" };
            return (
              <TouchableOpacity key={t} onPress={() => setTab(t)}
                style={[st.tabBtn, { backgroundColor: tab === t ? teamColor : colors.secondary, borderColor: tab === t ? teamColor : colors.border }]}>
                <Feather name={icons[t]} size={13} color={tab === t ? "#fff" : colors.mutedForeground} />
                <Text style={[st.tabLabel, { color: tab === t ? "#fff" : colors.mutedForeground }]}>{labels[t]}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── FREE AGENCY ─────────────────────────────────────────────────────── */}
      {tab === "freeAgency" && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          <View style={[st.phaseBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <Feather name="user-plus" size={14} color={teamColor} />
            <Text style={[st.phaseText, { color: colors.foreground }]}>{freeAgents.length} free agents available</Text>
            <View style={[st.phaseBadge, { backgroundColor: season?.phase === "freeAgency" ? colors.success + "25" : colors.secondary }]}>
              <Text style={[st.phaseBadgeText, { color: season?.phase === "freeAgency" ? colors.success : colors.mutedForeground }]}>
                {season?.phase === "freeAgency" ? "FA PERIOD OPEN" : season?.phase?.toUpperCase()}
              </Text>
            </View>
          </View>
          {/* Position filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap:6, padding:12 }}>
            {(["ALL", ...ALL_POS] as (NFLPosition|"ALL")[]).map(p => (
              <TouchableOpacity key={p} onPress={() => setPosFilter(p)}
                style={[st.posChip, { backgroundColor: posFilter===p ? (p==="ALL"?teamColor:POS_COLOR[p as NFLPosition]) : colors.secondary, borderColor: posFilter===p ? (p==="ALL"?teamColor:POS_COLOR[p as NFLPosition]) : colors.border }]}>
                <Text style={[st.posChipText, { color: posFilter===p ? "#fff" : colors.mutedForeground }]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {freeAgents.slice(0, 40).map(p => (
            <FAPlayerCard key={p.id} p={p} expanded={expandedFA === p.id} teamColor={teamColor} isGM={isGM} colors={colors}
              onToggle={() => setExpandedFA(expandedFA === p.id ? null : p.id)}
              onSign={(yrs, sal) => {
                Alert.alert(`Sign ${p.name}?`, `${yrs}-year, $${sal}M/yr deal.`, [
                  { text:"Cancel" },
                  { text:"Sign Player", onPress: () => signFreeAgent(p.id, yrs, sal) },
                ]);
              }}
            />
          ))}
        </ScrollView>
      )}

      {/* ── DRAFT ──────────────────────────────────────────────────────────── */}
      {tab === "draft" && (
        <View style={{ flex: 1 }}>
          {/* Draft status banner */}
          {ds && (
            <View style={[st.draftBanner, { backgroundColor: ds.isUserTurn ? teamColor + "25" : colors.card, borderBottomColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[st.draftBannerTitle, { color: ds.isUserTurn ? teamColor : colors.foreground }]}>
                  {ds.isComplete ? "Draft Complete" : ds.isUserTurn ? "YOUR PICK — ON THE CLOCK" : `Round ${ds.currentRound}, Pick ${ds.currentPickInRound}`}
                </Text>
                <Text style={[st.draftBannerSub, { color: colors.mutedForeground }]}>
                  {ds.isComplete ? `${ds.completedPicks.length} picks made` : ds.isUserTurn ? `Overall pick #${ds.overallPick}` : `${season?.teams.find(t=>t.id===ds.currentTeamId)?.city ?? "Team"} on the clock`}
                </Text>
              </View>
              {!ds.isComplete && !ds.isUserTurn && (
                <TouchableOpacity onPress={handleSimulateAllAI}
                  style={[st.simPickBtn, { backgroundColor: teamColor }]}>
                  <Feather name="chevrons-right" size={14} color="#fff" />
                  <Text style={[st.simPickBtnText]}>Sim Pick</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          {/* View switcher */}
          <View style={[st.draftViewBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            {(["board","combine","warRoom"] as DraftView[]).map(v => {
              const labels: Record<DraftView,string> = { board:"Board", combine:"Combine", warRoom:"War Room" };
              return (
                <TouchableOpacity key={v} onPress={() => setDraftView(v)} style={[st.draftViewBtn, { borderBottomColor: draftView===v ? teamColor : "transparent", borderBottomWidth: 2.5 }]}>
                  <Text style={[st.draftViewLabel, { color: draftView===v ? teamColor : colors.mutedForeground }]}>{labels[v]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {/* Position filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap:6, padding:10 }} style={{ flexGrow:0 }}>
            {(["ALL", ...ALL_POS] as (NFLPosition|"ALL")[]).map(p => (
              <TouchableOpacity key={p} onPress={() => setPosFilter(p)}
                style={[st.posChip, { backgroundColor: posFilter===p ? (p==="ALL"?teamColor:POS_COLOR[p as NFLPosition]) : colors.secondary, borderColor: posFilter===p ? (p==="ALL"?teamColor:POS_COLOR[p as NFLPosition]) : colors.border }]}>
                <Text style={[st.posChipText, { color: posFilter===p ? "#fff" : colors.mutedForeground }]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Board view */}
          {draftView === "board" && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
              {prospects.slice(0, 80).map((p, idx) => (
                <ProspectCard key={p.id} p={p} rank={idx + 1} expanded={expandedProspect === p.id} teamColor={teamColor} colors={colors}
                  isGM={isGM} isUserTurn={ds?.isUserTurn ?? false}
                  onToggle={() => setExpandedProspect(expandedProspect === p.id ? null : p.id)}
                  onScout={() => unlockScouting(p.id)}
                  onDraft={() => {
                    Alert.alert(`Draft ${p.name}?`, `${p.position} · ${p.college} · Grade: ${p.grade} · Overall: ${p.overallGrade}`, [
                      { text:"Cancel" },
                      { text:"Select Player", onPress: () => userDraftPick(p.id) },
                    ]);
                  }}
                />
              ))}
            </ScrollView>
          )}

          {/* Combine view — sortable table */}
          {draftView === "combine" && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
              {/* Column headers */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  <View style={[st.combineHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                    <Text style={[st.colFix, { color: colors.mutedForeground }]}>#  PLAYER</Text>
                    <SortHeader label="GRD" sortKey="grade" current={sortKey} asc={sortAsc} onSort={handleSort} colors={colors} teamColor={teamColor} />
                    <SortHeader label="40yd" sortKey="fortyYardDash" current={sortKey} asc={sortAsc} onSort={handleSort} colors={colors} teamColor={teamColor} />
                    <SortHeader label="Bench" sortKey="benchPress" current={sortKey} asc={sortAsc} onSort={handleSort} colors={colors} teamColor={teamColor} />
                    <SortHeader label="Vert" sortKey="verticalJump" current={sortKey} asc={sortAsc} onSort={handleSort} colors={colors} teamColor={teamColor} />
                    <SortHeader label="Broad" sortKey="broadJump" current={sortKey} asc={sortAsc} onSort={handleSort} colors={colors} teamColor={teamColor} />
                    <SortHeader label="Shuttle" sortKey="shuttleRun" current={sortKey} asc={sortAsc} onSort={handleSort} colors={colors} teamColor={teamColor} />
                    <SortHeader label="3-Cone" sortKey="threeCone" current={sortKey} asc={sortAsc} onSort={handleSort} colors={colors} teamColor={teamColor} />
                  </View>
                  {prospects.slice(0, 60).map((p, idx) => (
                    <CombineRow key={p.id} p={p} rank={idx+1} colors={colors} teamColor={teamColor}
                      isUserTurn={ds?.isUserTurn ?? false} isGM={isGM}
                      onDraft={() => {
                        Alert.alert(`Draft ${p.name}?`, `${p.position} · ${p.college} · Grade: ${p.grade}`, [
                          { text:"Cancel" },
                          { text:"Select Player", onPress: () => userDraftPick(p.id) },
                        ]);
                      }}
                    />
                  ))}
                </View>
              </ScrollView>
            </ScrollView>
          )}

          {/* War Room — recent picks */}
          {draftView === "warRoom" && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
              <View style={[st.warRoomHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <Feather name="clock" size={14} color={teamColor} />
                <Text style={[st.warRoomTitle, { color: colors.foreground }]}>Draft Board — {ds?.completedPicks.length ?? 0} picks made</Text>
              </View>
              {(ds?.completedPicks ?? []).slice().reverse().map(pick => {
                const pickTeam = season?.teams.find(t => t.id === pick.teamId);
                const isUser = pick.teamId === season?.playerTeamId;
                return (
                  <View key={`${pick.round}-${pick.pickInRound}`} style={[st.pickRow, { backgroundColor: isUser ? teamColor + "15" : colors.card, borderBottomColor: colors.border }]}>
                    <View style={[st.pickNum, { backgroundColor: isUser ? teamColor : colors.secondary }]}>
                      <Text style={[st.pickNumText, { color: isUser ? "#fff" : colors.mutedForeground }]}>R{pick.round}.{pick.pickInRound}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection:"row", alignItems:"center", gap:6 }}>
                        <Text style={[st.pickName, { color: isUser ? teamColor : colors.foreground }]}>{pick.prospectName}</Text>
                        <View style={[st.posPill, { backgroundColor: POS_COLOR[pick.prospectPosition] + "25" }]}>
                          <Text style={[st.posPillText, { color: POS_COLOR[pick.prospectPosition] }]}>{pick.prospectPosition}</Text>
                        </View>
                      </View>
                      <Text style={[st.pickMeta, { color: colors.mutedForeground }]}>{pickTeam?.abbreviation ?? "?"} · {pick.prospectCollege} · Grade {pick.prospectGrade}</Text>
                    </View>
                    <Text style={[st.pickOverall, { color: colors.mutedForeground }]}>#{pick.overallPick}</Text>
                  </View>
                );
              })}
              {(ds?.completedPicks.length ?? 0) === 0 && (
                <View style={[st.emptyState, { paddingVertical: 60 }]}>
                  <Feather name="award" size={32} color={colors.mutedForeground} />
                  <Text style={[st.emptyStateText, { color: colors.mutedForeground }]}>Draft hasn't started yet</Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      )}

      {/* ── TRADES ─────────────────────────────────────────────────────────── */}
      {tab === "trades" && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Trade builder */}
          {isGM && (
            <View style={[st.tradeBuilder, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
              <View style={st.tradeHeader}>
                <Feather name="git-merge" size={16} color={teamColor} />
                <Text style={[st.tradeTitle, { color: colors.foreground }]}>Build Trade Offer</Text>
              </View>

              {/* Target team selector */}
              <Text style={[st.tradeSubLabel, { color: colors.mutedForeground }]}>Target Team</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap:8, paddingBottom:8 }}>
                {(season?.teams.filter(t => t.id !== season.playerTeamId) ?? []).map(t => (
                  <TouchableOpacity key={t.id} onPress={() => setTradeTargetTeamId(t.id)}
                    style={[st.teamChip, { backgroundColor: tradeTargetTeamId===t.id ? t.primaryColor+"25" : colors.secondary, borderColor: tradeTargetTeamId===t.id ? t.primaryColor : colors.border }]}>
                    <Text style={[st.teamChipText, { color: tradeTargetTeamId===t.id ? t.primaryColor : colors.mutedForeground }]}>{t.abbreviation}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* You offer */}
              <Text style={[st.tradeSubLabel, { color: colors.mutedForeground }]}>You Offer</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap:8, paddingBottom:8 }}>
                {(team?.roster ?? []).sort((a,b) => b.overall-a.overall).slice(0, 15).map(p => {
                  const sel = offeringPlayerIds.includes(p.id);
                  return (
                    <TouchableOpacity key={p.id} onPress={() => setOfferingPlayerIds(sel ? offeringPlayerIds.filter(id=>id!==p.id) : [...offeringPlayerIds, p.id])}
                      style={[st.playerChip, { backgroundColor: sel ? teamColor+"25" : colors.secondary, borderColor: sel ? teamColor : colors.border }]}>
                      <Text style={[st.playerChipName, { color: sel ? teamColor : colors.foreground }]}>{p.name.split(" ")[1]}</Text>
                      <Text style={[st.playerChipPos, { color: sel ? teamColor+"aa" : colors.mutedForeground }]}>{p.position} {p.overall}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* You receive */}
              {tradeTargetTeamId && (
                <>
                  <Text style={[st.tradeSubLabel, { color: colors.mutedForeground }]}>You Receive</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap:8, paddingBottom:8 }}>
                    {(season?.teams.find(t=>t.id===tradeTargetTeamId)?.roster ?? []).sort((a,b) => b.overall-a.overall).slice(0, 15).map(p => {
                      const sel = receivingPlayerIds.includes(p.id);
                      return (
                        <TouchableOpacity key={p.id} onPress={() => setReceivingPlayerIds(sel ? receivingPlayerIds.filter(id=>id!==p.id) : [...receivingPlayerIds, p.id])}
                          style={[st.playerChip, { backgroundColor: sel ? colors.success+"20" : colors.secondary, borderColor: sel ? colors.success : colors.border }]}>
                          <Text style={[st.playerChipName, { color: sel ? colors.success : colors.foreground }]}>{p.name.split(" ")[1]}</Text>
                          <Text style={[st.playerChipPos, { color: sel ? colors.success+"aa" : colors.mutedForeground }]}>{p.position} {p.overall}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              )}

              {/* Trade value meter */}
              {(offeringPlayerIds.length > 0 || receivingPlayerIds.length > 0) && (
                <View style={[st.valueMeter, { backgroundColor: colors.secondary }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[st.valueLabel, { color: colors.mutedForeground }]}>TRADE VALUE</Text>
                    <Text style={[st.valueNum, { color: tradeValue > 10 ? colors.success : tradeValue < -10 ? colors.danger : colors.nflGold }]}>
                      {tradeValue > 0 ? "+" : ""}{tradeValue} pts
                    </Text>
                    <Text style={[st.valueVerdict, { color: tradeValue > 10 ? colors.success : tradeValue < -10 ? colors.danger : colors.nflGold }]}>
                      {tradeValue > 20 ? "Win for your team" : tradeValue > 5 ? "Slight advantage" : tradeValue > -5 ? "Even trade" : tradeValue > -20 ? "Slight disadvantage" : "Lopsided against you"}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => {
                    if (!tradeTargetTeamId) { Alert.alert("Select a team first"); return; }
                    proposeTrade({ fromTeamId: season!.playerTeamId, toTeamId: tradeTargetTeamId, offeringPlayerIds, offeringPickIds: [], receivingPlayerIds, receivingPickIds: [] });
                    setOfferingPlayerIds([]); setReceivingPlayerIds([]); setTradeTargetTeamId(null);
                    Alert.alert("Trade Offered!", "The offer has been sent to the other GM.");
                  }}
                  disabled={offeringPlayerIds.length === 0 && receivingPlayerIds.length === 0}
                  style={[st.sendTradeBtn, { backgroundColor: teamColor, opacity: offeringPlayerIds.length === 0 && receivingPlayerIds.length === 0 ? 0.4 : 1 }]}>
                    <Feather name="send" size={14} color="#fff" />
                    <Text style={st.sendTradeBtnText}>Send Offer</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Pending offers */}
          <View style={{ padding: 16 }}>
            <Text style={[st.sectionTitle, { color: colors.foreground }]}>Incoming Offers</Text>
            {pendingOffers.length === 0 && (
              <View style={st.emptyState}>
                <Feather name="inbox" size={28} color={colors.mutedForeground} />
                <Text style={[st.emptyStateText, { color: colors.mutedForeground }]}>No pending trade offers</Text>
              </View>
            )}
            {pendingOffers.map(offer => {
              const fromTeam = season?.teams.find(t => t.id === offer.fromTeamId);
              const allRoster = season?.teams.flatMap(t => t.roster) ?? [];
              const giving = offer.offeringPlayerIds.map(id => allRoster.find(p => p.id === id)).filter(Boolean);
              const getting = offer.receivingPlayerIds.map(id => allRoster.find(p => p.id === id)).filter(Boolean);
              return (
                <View key={offer.id} style={[st.offerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={st.offerHeader}>
                    <Text style={[st.offerFrom, { color: colors.foreground }]}>From {fromTeam?.city} {fromTeam?.name}</Text>
                    <View style={[st.offerValue, { backgroundColor: offer.aiValue > 0 ? colors.success+"25" : offer.aiValue < 0 ? colors.danger+"25" : colors.secondary }]}>
                      <Text style={[st.offerValueText, { color: offer.aiValue > 0 ? colors.success : offer.aiValue < 0 ? colors.danger : colors.mutedForeground }]}>
                        {offer.aiValue > 0 ? "+" : ""}{offer.aiValue}
                      </Text>
                    </View>
                  </View>
                  <View style={st.offerContent}>
                    <View style={{ flex:1 }}>
                      <Text style={[st.offerSide, { color: colors.mutedForeground }]}>THEY GIVE</Text>
                      {giving.map(p => p && <Text key={p.id} style={[st.offerPlayer, { color: colors.foreground }]}>{p.name} ({p.position} {p.overall})</Text>)}
                      {giving.length === 0 && <Text style={[st.offerPlayer, { color: colors.mutedForeground }]}>—</Text>}
                    </View>
                    <Feather name="arrow-right" size={16} color={colors.mutedForeground} />
                    <View style={{ flex:1 }}>
                      <Text style={[st.offerSide, { color: colors.mutedForeground }]}>YOU GIVE</Text>
                      {getting.map(p => p && <Text key={p.id} style={[st.offerPlayer, { color: colors.foreground }]}>{p.name} ({p.position} {p.overall})</Text>)}
                      {getting.length === 0 && <Text style={[st.offerPlayer, { color: colors.mutedForeground }]}>—</Text>}
                    </View>
                  </View>
                  {isGM && (
                    <View style={st.offerBtns}>
                      <TouchableOpacity onPress={() => respondToTrade(offer.id, false)} style={[st.offerBtn, { backgroundColor: colors.danger+"20", borderColor: colors.danger+"50" }]}>
                        <Text style={[st.offerBtnText, { color: colors.danger }]}>Decline</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => respondToTrade(offer.id, true)} style={[st.offerBtn, { backgroundColor: colors.success+"20", borderColor: colors.success+"50" }]}>
                        <Text style={[st.offerBtnText, { color: colors.success }]}>Accept</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FAPlayerCard({ p, expanded, teamColor, isGM, colors, onToggle, onSign }: {
  p: Player; expanded: boolean; teamColor: string; isGM: boolean; colors: any;
  onToggle: () => void; onSign: (yrs: number, sal: number) => void;
}) {
  return (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.8}
      style={[st.playerCard, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      <View style={st.playerRow}>
        <View style={[st.posCircle, { backgroundColor: POS_COLOR[p.position] + "25" }]}>
          <Text style={[st.posCircleText, { color: POS_COLOR[p.position] }]}>{p.position}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[st.playerName, { color: colors.foreground }]}>{p.name}</Text>
          <Text style={[st.playerMeta, { color: colors.mutedForeground }]}>Age {p.age} · {p.yearsExperience}yr exp · Market: ${p.salary}M/yr</Text>
          <View style={st.interestRow}>
            {[1,2,3,4,5].map(i => <View key={i} style={[st.interestDot, { backgroundColor: i <= p.faInterestLevel ? teamColor : "#ffffff15" }]} />)}
            <Text style={[st.interestLabel, { color: colors.mutedForeground }]}>
              {p.faInterestLevel >= 5 ? "Very Interested" : p.faInterestLevel >= 4 ? "Interested" : p.faInterestLevel >= 3 ? "Open" : p.faInterestLevel >= 2 ? "Low Interest" : "Not Interested"}
            </Text>
          </View>
        </View>
        <View style={[st.ovrBadge, { backgroundColor: POS_COLOR[p.position]+"22", borderColor: POS_COLOR[p.position]+"55" }]}>
          <Text style={[st.ovrText, { color: POS_COLOR[p.position] }]}>{p.overall}</Text>
        </View>
      </View>
      {expanded && (
        <View style={[st.expandedSection, { borderTopColor: colors.border }]}>
          <View style={st.ratingsRow}>
            {[{l:"SPD",v:p.speed,c:"#3FB950"},{l:"STR",v:p.strength,c:"#FB4F14"},{l:"AWR",v:p.awareness,c:"#00B5E2"},{l:"POS",v:p.specific,c:POS_COLOR[p.position]}].map(r => (
              <View key={r.l} style={{ flex:1, gap:3 }}>
                <View style={{flexDirection:"row",justifyContent:"space-between"}}>
                  <Text style={{fontSize:9,fontFamily:"Inter_600SemiBold",color:colors.mutedForeground}}>{r.l}</Text>
                  <Text style={{fontSize:9,fontFamily:"Inter_700Bold",color:r.c}}>{r.v}</Text>
                </View>
                <View style={{height:4,backgroundColor:colors.secondary,borderRadius:2}}>
                  <View style={{height:"100%",width:`${r.v}%`,backgroundColor:r.c,borderRadius:2}} />
                </View>
              </View>
            ))}
          </View>
          {isGM && (
            <View style={{ flexDirection:"row", gap:8 }}>
              {[1,2,3].map(yrs => {
                const sal = parseFloat((p.salary * (1 + (yrs-1)*0.03)).toFixed(1));
                return (
                  <TouchableOpacity key={yrs} onPress={() => onSign(yrs, sal)}
                    style={[st.signBtn, { backgroundColor: teamColor+"20", borderColor: teamColor+"60" }]}>
                    <Text style={[st.signBtnText, { color: teamColor }]}>{yrs}yr · ${sal}M</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

function ProspectCard({ p, rank, expanded, teamColor, colors, isGM, isUserTurn, onToggle, onScout, onDraft }: {
  p: DraftProspect; rank: number; expanded: boolean; teamColor: string; colors: any;
  isGM: boolean; isUserTurn: boolean; onToggle: () => void; onScout: () => void; onDraft: () => void;
}) {
  const gc = GRADE_COLORS[p.grade] ?? "#525252";
  return (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.8}
      style={[st.playerCard, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      <View style={st.playerRow}>
        <Text style={[st.prospectRank, { color: rank <= 32 ? colors.nflGold : colors.mutedForeground }]}>{rank}</Text>
        <View style={[st.posCircle, { backgroundColor: POS_COLOR[p.position] + "25" }]}>
          <Text style={[st.posCircleText, { color: POS_COLOR[p.position] }]}>{p.position}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[st.playerName, { color: colors.foreground }]}>{p.name}</Text>
          <Text style={[st.playerMeta, { color: colors.mutedForeground }]}>{p.college} · {p.archetype}</Text>
        </View>
        <View style={[st.gradePill, { backgroundColor: gc + "25", borderColor: gc + "60" }]}>
          <Text style={[st.gradePillText, { color: gc }]}>{p.grade}</Text>
        </View>
        {p.scoutingUnlocked && (
          <View style={[st.ovrBadge, { backgroundColor: POS_COLOR[p.position]+"22", borderColor: POS_COLOR[p.position]+"55", marginLeft: 6 }]}>
            <Text style={[st.ovrText, { color: POS_COLOR[p.position] }]}>{p.overallGrade}</Text>
          </View>
        )}
      </View>
      {expanded && (
        <View style={[st.expandedSection, { borderTopColor: colors.border }]}>
          {!p.scoutingUnlocked ? (
            <View style={{ alignItems:"center", gap:10, paddingVertical:8 }}>
              <Feather name="lock" size={20} color={colors.mutedForeground} />
              <Text style={{ color: colors.mutedForeground, fontFamily:"Inter_400Regular", fontSize:13 }}>Scout this prospect to unlock full report</Text>
              {isGM && (
                <TouchableOpacity onPress={onScout} style={[st.scoutBtn, { backgroundColor: teamColor+"20", borderColor: teamColor }]}>
                  <Feather name="search" size={12} color={teamColor} />
                  <Text style={[st.scoutBtnText, { color: teamColor }]}>Scout Player</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={{ gap:10 }}>
              {/* College stats */}
              <CollegeStatsBlock p={p} colors={colors} />
              {/* Combine quick */}
              <View style={[st.combineQuick, { backgroundColor: colors.secondary }]}>
                {!p.combine.didNotParticipate ? (
                  <>
                    <CombineStat label="40 YD" value={`${p.combine.fortyYardDash}s`} />
                    <CombineStat label="BENCH" value={`${p.combine.benchPress}`} />
                    <CombineStat label="VERT" value={`${p.combine.verticalJump}"`} />
                    <CombineStat label="HT" value={formatHeight(p.combine.height)} />
                    <CombineStat label="WT" value={`${p.combine.weight}`} />
                  </>
                ) : (
                  <Text style={{ color: colors.mutedForeground, fontFamily:"Inter_400Regular", fontSize:12 }}>Did not participate in combine</Text>
                )}
              </View>
              {/* Strengths & weaknesses */}
              <View style={{ flexDirection:"row", gap:10 }}>
                <View style={{ flex:1 }}>
                  <Text style={{ fontSize:11, fontFamily:"Inter_700Bold", color: colors.success, marginBottom:4 }}>STRENGTHS</Text>
                  {p.strengths.map((s,i) => <Text key={i} style={{ fontSize:11, fontFamily:"Inter_400Regular", color:colors.mutedForeground, lineHeight:17 }}>• {s}</Text>)}
                </View>
                <View style={{ flex:1 }}>
                  <Text style={{ fontSize:11, fontFamily:"Inter_700Bold", color: colors.danger, marginBottom:4 }}>WEAKNESSES</Text>
                  {p.weaknesses.map((w,i) => <Text key={i} style={{ fontSize:11, fontFamily:"Inter_400Regular", color:colors.mutedForeground, lineHeight:17 }}>• {w}</Text>)}
                </View>
              </View>
              {isGM && isUserTurn && (
                <TouchableOpacity onPress={onDraft} style={[st.draftBtn, { backgroundColor: teamColor }]}>
                  <Feather name="award" size={14} color="#fff" />
                  <Text style={st.draftBtnText}>Draft {p.name}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

function CollegeStatsBlock({ p, colors }: { p: DraftProspect; colors: any }) {
  const cs = p.collegeStats;
  const items: { label: string; value: string }[] = [];
  if (cs.completionPct != null) items.push({ label:"CMP%", value:`${cs.completionPct}%` });
  if (cs.passingYards != null)  items.push({ label:"PASS YDS", value:`${cs.passingYards}` });
  if (cs.passingTDs != null)    items.push({ label:"PASS TD", value:`${cs.passingTDs}` });
  if (cs.interceptions != null) items.push({ label:"INT", value:`${cs.interceptions}` });
  if (cs.rushingYards != null)  items.push({ label:"RUSH YDS", value:`${cs.rushingYards}` });
  if (cs.rushingTDs != null)    items.push({ label:"RUSH TD", value:`${cs.rushingTDs}` });
  if (cs.receptions != null)    items.push({ label:"REC", value:`${cs.receptions}` });
  if (cs.receivingYards != null)items.push({ label:"REC YDS", value:`${cs.receivingYards}` });
  if (cs.receivingTDs != null)  items.push({ label:"REC TD", value:`${cs.receivingTDs}` });
  if (cs.tackles != null)       items.push({ label:"TACKLES", value:`${cs.tackles}` });
  if (cs.sacks != null)         items.push({ label:"SACKS", value:`${cs.sacks}` });
  if (cs.interceptionsDef != null) items.push({ label:"INTs", value:`${cs.interceptionsDef}` });
  if (cs.passDeflections != null)  items.push({ label:"PD", value:`${cs.passDeflections}` });
  if (cs.gamesStarted != null)  items.push({ label:"GS", value:`${cs.gamesStarted}` });
  if (items.length === 0) return null;
  return (
    <View>
      <Text style={{ fontSize:10, fontFamily:"Inter_600SemiBold", color: colors.mutedForeground, marginBottom:5, letterSpacing:0.5 }}>COLLEGE STATS ({cs.gamesPlayed ?? 12} GP)</Text>
      <View style={{ flexDirection:"row", flexWrap:"wrap", gap:8 }}>
        {items.map(item => (
          <View key={item.label} style={{ alignItems:"center" }}>
            <Text style={{ fontSize:13, fontFamily:"Inter_700Bold", color: colors.foreground }}>{item.value}</Text>
            <Text style={{ fontSize:9, fontFamily:"Inter_500Medium", color: colors.mutedForeground }}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function CombineStat({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={{ flex:1, alignItems:"center" }}>
      <Text style={{ fontSize:12, fontFamily:"Inter_700Bold", color: colors.foreground }}>{value}</Text>
      <Text style={{ fontSize:9, fontFamily:"Inter_500Medium", color: colors.mutedForeground }}>{label}</Text>
    </View>
  );
}

function CombineRow({ p, rank, colors, teamColor, isUserTurn, isGM, onDraft }: {
  p: DraftProspect; rank: number; colors: any; teamColor: string; isUserTurn: boolean; isGM: boolean; onDraft: () => void;
}) {
  const c = p.combine;
  const dnp = c.didNotParticipate;
  return (
    <View style={[st.combineRowContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      <Text style={[st.colFix2, { color: colors.mutedForeground }]}>{rank}. {p.name.split(" ")[1]}</Text>
      <ColCell value={`${p.overallGrade}`}    color={colors.nflGold} />
      <ColCell value={dnp ? "—" : `${c.fortyYardDash}`} color={!dnp && c.fortyYardDash < 4.4 ? colors.success : colors.foreground} />
      <ColCell value={dnp ? "—" : `${c.benchPress}`}    color={!dnp && c.benchPress > 28 ? colors.success : colors.foreground} />
      <ColCell value={dnp ? "—" : `${c.verticalJump}"`}  color={!dnp && c.verticalJump > 38 ? colors.success : colors.foreground} />
      <ColCell value={dnp ? "—" : `${c.broadJump}"`}     color={colors.foreground} />
      <ColCell value={dnp ? "—" : `${c.shuttleRun}"`}    color={!dnp && c.shuttleRun < 4.1 ? colors.success : colors.foreground} />
      <ColCell value={dnp ? "—" : `${c.threeCone}"`}     color={!dnp && c.threeCone < 6.8 ? colors.success : colors.foreground} />
      {isGM && isUserTurn && (
        <TouchableOpacity onPress={onDraft} style={[st.draftBtnSm, { backgroundColor: teamColor }]}>
          <Text style={st.draftBtnSmText}>Draft</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function ColCell({ value, color }: { value: string; color: string }) {
  return <Text style={[st.colCell, { color }]}>{value}</Text>;
}

function SortHeader({ label, sortKey: key, current, asc, onSort, colors, teamColor }: {
  label: string; sortKey: SortKey; current: SortKey; asc: boolean; onSort: (k: SortKey) => void; colors: any; teamColor: string;
}) {
  const active = current === key;
  return (
    <TouchableOpacity onPress={() => onSort(key)} style={[st.colHeader, { borderBottomColor: active ? teamColor : "transparent" }]}>
      <Text style={[st.colHeaderText, { color: active ? teamColor : colors.mutedForeground }]}>{label}</Text>
      {active && <Feather name={asc ? "chevron-up" : "chevron-down"} size={10} color={teamColor} />}
    </TouchableOpacity>
  );
}

function formatHeight(inches: number): string {
  const ft = Math.floor(inches / 12);
  const i = inches % 12;
  return `${ft}'${i}"`;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  header:           { paddingHorizontal:16, paddingBottom:10, borderBottomWidth:1 },
  headerTitle:      { fontSize:20, fontFamily:"Inter_700Bold", marginBottom:12 },
  tabBar:           { flexDirection:"row", gap:8 },
  tabBtn:           { flex:1, flexDirection:"row", alignItems:"center", justifyContent:"center", gap:5, paddingVertical:9, borderRadius:10, borderWidth:1 },
  tabLabel:         { fontSize:12, fontFamily:"Inter_600SemiBold" },
  phaseBar:         { flexDirection:"row", alignItems:"center", gap:8, padding:12, borderBottomWidth:1 },
  phaseText:        { flex:1, fontSize:13, fontFamily:"Inter_500Medium" },
  phaseBadge:       { paddingHorizontal:8, paddingVertical:3, borderRadius:6 },
  phaseBadgeText:   { fontSize:10, fontFamily:"Inter_700Bold", letterSpacing:0.5 },
  posChip:          { paddingHorizontal:12, paddingVertical:5, borderRadius:8, borderWidth:1 },
  posChipText:      { fontSize:12, fontFamily:"Inter_600SemiBold" },
  playerCard:       { borderBottomWidth:1, paddingHorizontal:14, paddingVertical:11 },
  playerRow:        { flexDirection:"row", alignItems:"center", gap:10 },
  posCircle:        { width:34, height:34, borderRadius:8, alignItems:"center", justifyContent:"center" },
  posCircleText:    { fontSize:11, fontFamily:"Inter_700Bold" },
  playerName:       { fontSize:14, fontFamily:"Inter_600SemiBold" },
  playerMeta:       { fontSize:11, fontFamily:"Inter_400Regular", marginTop:1 },
  interestRow:      { flexDirection:"row", alignItems:"center", gap:3, marginTop:4 },
  interestDot:      { width:12, height:4, borderRadius:2 },
  interestLabel:    { fontSize:10, fontFamily:"Inter_400Regular", marginLeft:3 },
  ovrBadge:         { width:38, height:38, borderRadius:9, alignItems:"center", justifyContent:"center", borderWidth:1.5 },
  ovrText:          { fontSize:14, fontFamily:"Inter_700Bold" },
  expandedSection:  { borderTopWidth:1, marginTop:10, paddingTop:10, gap:10 },
  ratingsRow:       { flexDirection:"row", gap:10 },
  signBtn:          { flex:1, alignItems:"center", paddingVertical:8, borderRadius:8, borderWidth:1 },
  signBtnText:      { fontSize:12, fontFamily:"Inter_700Bold" },
  prospectRank:     { width:28, fontSize:13, fontFamily:"Inter_700Bold" },
  gradePill:        { paddingHorizontal:8, paddingVertical:3, borderRadius:6, borderWidth:1 },
  gradePillText:    { fontSize:11, fontFamily:"Inter_700Bold" },
  combineQuick:     { flexDirection:"row", borderRadius:10, padding:10 },
  scoutBtn:         { flexDirection:"row", alignItems:"center", gap:5, paddingHorizontal:14, paddingVertical:8, borderRadius:8, borderWidth:1.5 },
  scoutBtnText:     { fontSize:13, fontFamily:"Inter_600SemiBold" },
  draftBtn:         { flexDirection:"row", alignItems:"center", justifyContent:"center", gap:6, paddingVertical:10, borderRadius:10 },
  draftBtnText:     { fontSize:14, fontFamily:"Inter_700Bold", color:"#fff" },
  // Draft banner
  draftBanner:      { flexDirection:"row", alignItems:"center", padding:12, borderBottomWidth:1, gap:10 },
  draftBannerTitle: { fontSize:14, fontFamily:"Inter_700Bold" },
  draftBannerSub:   { fontSize:12, fontFamily:"Inter_400Regular", marginTop:2 },
  simPickBtn:       { flexDirection:"row", alignItems:"center", gap:5, paddingHorizontal:12, paddingVertical:7, borderRadius:8 },
  simPickBtnText:   { fontSize:12, fontFamily:"Inter_700Bold", color:"#fff" },
  draftViewBar:     { flexDirection:"row", borderBottomWidth:1 },
  draftViewBtn:     { flex:1, alignItems:"center", paddingVertical:10 },
  draftViewLabel:   { fontSize:13, fontFamily:"Inter_600SemiBold" },
  // Combine table
  combineHeader:    { flexDirection:"row", alignItems:"center", paddingHorizontal:12, paddingVertical:8, borderBottomWidth:1, gap:4 },
  combineRowContainer:{ flexDirection:"row", alignItems:"center", paddingHorizontal:12, paddingVertical:9, borderBottomWidth:1, gap:4 },
  colFix:           { width:120, fontSize:11, fontFamily:"Inter_500Medium" },
  colFix2:          { width:100, fontSize:11, fontFamily:"Inter_500Medium" },
  colHeader:        { width:60, alignItems:"center", flexDirection:"row", gap:2, justifyContent:"center" },
  colHeaderText:    { fontSize:11, fontFamily:"Inter_600SemiBold" },
  colCell:          { width:60, textAlign:"center", fontSize:12, fontFamily:"Inter_600SemiBold" },
  draftBtnSm:       { paddingHorizontal:8, paddingVertical:4, borderRadius:6 },
  draftBtnSmText:   { fontSize:11, fontFamily:"Inter_700Bold", color:"#fff" },
  // War room
  warRoomHeader:    { flexDirection:"row", alignItems:"center", gap:8, padding:12, borderBottomWidth:1 },
  warRoomTitle:     { fontSize:14, fontFamily:"Inter_700Bold" },
  pickRow:          { flexDirection:"row", alignItems:"center", gap:10, paddingHorizontal:14, paddingVertical:10, borderBottomWidth:1 },
  pickNum:          { paddingHorizontal:8, paddingVertical:4, borderRadius:6 },
  pickNumText:      { fontSize:11, fontFamily:"Inter_700Bold" },
  pickName:         { fontSize:14, fontFamily:"Inter_600SemiBold" },
  pickMeta:         { fontSize:11, fontFamily:"Inter_400Regular", marginTop:1 },
  pickOverall:      { fontSize:13, fontFamily:"Inter_600SemiBold" },
  posPill:          { paddingHorizontal:5, paddingVertical:2, borderRadius:5 },
  posPillText:      { fontSize:10, fontFamily:"Inter_700Bold" },
  // Trade builder
  tradeBuilder:     { borderBottomWidth:1, padding:14, gap:10 },
  tradeHeader:      { flexDirection:"row", alignItems:"center", gap:8 },
  tradeTitle:       { fontSize:16, fontFamily:"Inter_700Bold" },
  tradeSubLabel:    { fontSize:11, fontFamily:"Inter_600SemiBold", letterSpacing:0.5, marginTop:4 },
  teamChip:         { paddingHorizontal:12, paddingVertical:6, borderRadius:8, borderWidth:1 },
  teamChipText:     { fontSize:12, fontFamily:"Inter_700Bold" },
  playerChip:       { paddingHorizontal:10, paddingVertical:6, borderRadius:8, borderWidth:1, minWidth:80 },
  playerChipName:   { fontSize:12, fontFamily:"Inter_600SemiBold" },
  playerChipPos:    { fontSize:10, fontFamily:"Inter_400Regular" },
  valueMeter:       { flexDirection:"row", alignItems:"center", padding:12, borderRadius:12, gap:10 },
  valueLabel:       { fontSize:10, fontFamily:"Inter_600SemiBold", letterSpacing:0.5 },
  valueNum:         { fontSize:22, fontFamily:"Inter_700Bold" },
  valueVerdict:     { fontSize:12, fontFamily:"Inter_500Medium" },
  sendTradeBtn:     { flexDirection:"row", alignItems:"center", gap:5, paddingHorizontal:14, paddingVertical:10, borderRadius:10 },
  sendTradeBtnText: { fontSize:13, fontFamily:"Inter_700Bold", color:"#fff" },
  sectionTitle:     { fontSize:16, fontFamily:"Inter_700Bold", marginBottom:10 },
  emptyState:       { alignItems:"center", gap:10, paddingVertical:40 },
  emptyStateText:   { fontSize:14, fontFamily:"Inter_400Regular" },
  offerCard:        { borderRadius:14, borderWidth:1, padding:12, marginBottom:10, gap:10 },
  offerHeader:      { flexDirection:"row", alignItems:"center", justifyContent:"space-between" },
  offerFrom:        { fontSize:14, fontFamily:"Inter_700Bold" },
  offerValue:       { paddingHorizontal:8, paddingVertical:3, borderRadius:6 },
  offerValueText:   { fontSize:12, fontFamily:"Inter_700Bold" },
  offerContent:     { flexDirection:"row", alignItems:"flex-start", gap:10 },
  offerSide:        { fontSize:9, fontFamily:"Inter_700Bold", letterSpacing:0.5, marginBottom:4 },
  offerPlayer:      { fontSize:12, fontFamily:"Inter_500Medium", lineHeight:18 },
  offerBtns:        { flexDirection:"row", gap:8 },
  offerBtn:         { flex:1, alignItems:"center", paddingVertical:8, borderRadius:8, borderWidth:1 },
  offerBtnText:     { fontSize:13, fontFamily:"Inter_700Bold" },
});
