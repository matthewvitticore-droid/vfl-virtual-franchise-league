import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { NFLPosition, Player, useNFL } from "@/context/NFLContext";
import { DraftPick, NFLTeam, TradeOffer } from "@/context/types";

// ─── Constants ────────────────────────────────────────────────────────────────
const ALL_POS: NFLPosition[] = ["QB","RB","WR","TE","OL","DE","DT","LB","CB","S","K","P"];
const POS_COLOR: Record<NFLPosition, string> = {
  QB:"#E31837", RB:"#FB4F14", WR:"#FFC20E", TE:"#00B5E2", OL:"#8B949E",
  DE:"#3FB950", DT:"#26A69A", LB:"#1F6FEB", CB:"#6E40C9", S:"#9C27B0",
  K:"#FF7043", P:"#795548",
};
// Round 1 = most valuable, Round 7 = least. Index = round.
export const PICK_ROUND_VALUES  = [0, 150, 100, 70, 50, 35, 25, 15];
const PICK_ROUND_COLORS  = ["", "#FFD700", "#FF8C00", "#3FB950", "#00B5E2", "#8B949E", "#795548", "#525252"];
const PICK_STARS         = ["", "★★★★★", "★★★★", "★★★", "★★", "★", "·", "·"];

// ─── Helpers ─────────────────────────────────────────────────────────────────
export function pickAccentForTeam(primary: string, secondary: string): string {
  const h = primary.replace("#", "");
  const r = parseInt(h.substr(0,2), 16);
  const g = parseInt(h.substr(2,2), 16);
  const b = parseInt(h.substr(4,2), 16);
  const lum = (0.299*r + 0.587*g + 0.114*b) / 255;
  return lum >= 0.18 ? primary : secondary;
}

type BuildTab = "myRoster" | "theirRoster" | "picks";

// ─── Props ───────────────────────────────────────────────────────────────────
interface TradeBuilderProps {
  visible: boolean;
  onClose: () => void;
  teamColor: string;
  onPropose: (offer: Omit<TradeOffer, "id" | "status" | "aiValue" | "expiresWeek">) => void;
}

// ─── TradeBuilder ─────────────────────────────────────────────────────────────
export function TradeBuilder({ visible, onClose, teamColor, onPropose }: TradeBuilderProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { season, getPlayerTeam } = useNFL();
  const myTeam = getPlayerTeam();

  const [buildTab,          setBuildTab]          = useState<BuildTab>("myRoster");
  const [targetTeamId,      setTargetTeamId]      = useState<string>("");
  const [posFilter,         setPosFilter]         = useState<NFLPosition | "ALL">("ALL");
  const [offeringPlayerIds, setOfferingPlayerIds] = useState<string[]>([]);
  const [receivingPlayerIds,setReceivingPlayerIds]= useState<string[]>([]);
  const [offeringPickIds,   setOfferingPickIds]   = useState<string[]>([]);
  const [receivingPickIds,  setReceivingPickIds]  = useState<string[]>([]);
  const [teamPickerOpen,    setTeamPickerOpen]    = useState(false);

  const targetTeam   = season?.teams.find(t => t.id === targetTeamId) ?? null;
  const targetAccent = targetTeam
    ? pickAccentForTeam(targetTeam.primaryColor, targetTeam.secondaryColor)
    : "#8B949E";

  // ── Picks ──────────────────────────────────────────────────────────────────
  const myPicks    = useMemo(() =>
    (myTeam?.draftPicks ?? []).filter(pk => pk.ownedByTeamId === myTeam?.id).sort((a,b) => a.round - b.round),
    [myTeam]
  );
  const theirPicks = useMemo(() =>
    (targetTeam?.draftPicks ?? []).filter(pk => pk.ownedByTeamId === targetTeam?.id).sort((a,b) => a.round - b.round),
    [targetTeam]
  );

  // ── Rosters ────────────────────────────────────────────────────────────────
  const myRoster = useMemo(() => {
    if (!myTeam) return [];
    const list = posFilter === "ALL" ? [...myTeam.roster] : myTeam.roster.filter(p => p.position === posFilter);
    return list.sort((a, b) => b.overall - a.overall);
  }, [myTeam, posFilter]);

  const theirRoster = useMemo(() => {
    if (!targetTeam) return [];
    const list = posFilter === "ALL" ? [...targetTeam.roster] : targetTeam.roster.filter(p => p.position === posFilter);
    return list.sort((a, b) => b.overall - a.overall);
  }, [targetTeam, posFilter]);

  // ── Value calc ─────────────────────────────────────────────────────────────
  const tradeValue = useMemo(() => {
    if (!season) return 0;
    const allPlayers = season.teams.flatMap(t => t.roster);
    const allPicks   = season.teams.flatMap(t => t.draftPicks);
    const score = (ids: string[], pickIds: string[]) =>
      ids.reduce((s, id) => {
        const p = allPlayers.find(pl => pl.id === id);
        return s + (p ? p.overall * 1.2 + (p.potential ?? p.overall) * 0.5 : 0);
      }, 0) +
      pickIds.reduce((s, id) => {
        const pk = allPicks.find(p => p.id === id);
        return s + (pk ? (PICK_ROUND_VALUES[pk.round] ?? 15) : 0);
      }, 0);
    return Math.round(score(receivingPlayerIds, receivingPickIds) - score(offeringPlayerIds, offeringPickIds));
  }, [season, offeringPlayerIds, receivingPlayerIds, offeringPickIds, receivingPickIds]);

  const verdictColor = tradeValue >  20 ? colors.success
                     : tradeValue < -20 ? colors.danger
                     : "#D97706";
  const verdict = tradeValue > 40 ? "🔥 Big Win"
                : tradeValue > 10 ? "✓ Slight Win"
                : tradeValue > -10 ? "⚖ Fair Trade"
                : tradeValue > -40 ? "↓ Slight Loss"
                : "✗ Bad Deal";

  // ── Helpers ────────────────────────────────────────────────────────────────
  const allRoster = season?.teams.flatMap(t => t.roster) ?? [];
  const allPicks  = season?.teams.flatMap(t => t.draftPicks) ?? [];
  const offerPlayers = offeringPlayerIds.map(id => allRoster.find(p => p.id === id)).filter(Boolean) as Player[];
  const recvPlayers  = receivingPlayerIds.map(id => allRoster.find(p => p.id === id)).filter(Boolean) as Player[];
  const offerPicks   = offeringPickIds.map(id => allPicks.find(p => p.id === id)).filter(Boolean) as DraftPick[];
  const recvPicks    = receivingPickIds.map(id => allPicks.find(p => p.id === id)).filter(Boolean) as DraftPick[];
  const hasSelection = offerPlayers.length > 0 || offerPicks.length > 0 || recvPlayers.length > 0 || recvPicks.length > 0;

  function clearAll() {
    setOfferingPlayerIds([]); setReceivingPlayerIds([]);
    setOfferingPickIds([]);   setReceivingPickIds([]);
    setTargetTeamId(""); setBuildTab("myRoster"); setPosFilter("ALL");
  }

  function handleClose() { clearAll(); onClose(); }

  function handleSend() {
    if (!targetTeam || !myTeam || !season) {
      Alert.alert("Pick a partner", "Select a trade partner team first."); return;
    }
    if (offerPlayers.length === 0 && offerPicks.length === 0) {
      Alert.alert("Nothing offered", "Add at least one player or pick to offer."); return;
    }
    if (recvPlayers.length === 0 && recvPicks.length === 0) {
      Alert.alert("Nothing requested", "Select at least one player or pick from the other team."); return;
    }
    onPropose({
      fromTeamId: season.playerTeamId,
      toTeamId: targetTeam.id,
      offeringPlayerIds,  offeringPickIds,
      receivingPlayerIds, receivingPickIds,
    });
    clearAll(); onClose();
    Alert.alert("Trade Sent! 🤝", `Your offer has been sent to the ${targetTeam.city} ${targetTeam.name}.`);
  }

  function toggleOffer(id: string) {
    setOfferingPlayerIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }
  function toggleReceive(id: string) {
    setReceivingPlayerIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }
  function toggleOfferPick(id: string) {
    setOfferingPickIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }
  function toggleReceivePick(id: string) {
    setReceivingPickIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleClose}>
      <View style={[tb.root, { backgroundColor: colors.background }]}>

        {/* ── HEADER ── */}
        <View style={[tb.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
          <View style={tb.headerRow}>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top:8, bottom:8, left:8, right:8 }}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
            <Text style={[tb.headerTitle, { color: colors.foreground }]}>Build Trade</Text>
            {/* Partner team pill */}
            <TouchableOpacity onPress={() => setTeamPickerOpen(true)}
              style={[tb.partnerBtn, {
                backgroundColor: targetTeam ? targetAccent + "22" : colors.secondary,
                borderColor: targetTeam ? targetAccent + "70" : colors.border,
              }]}>
              {targetTeam && <View style={[tb.partnerSwatch, { backgroundColor: targetAccent }]} />}
              {!targetTeam && <Feather name="users" size={13} color={colors.mutedForeground} />}
              <Text style={[tb.partnerText, { color: targetTeam ? targetAccent : colors.mutedForeground }]} numberOfLines={1}>
                {targetTeam ? `${targetTeam.city} ${targetTeam.name}` : "Select Partner"}
              </Text>
              <Feather name="chevron-down" size={12} color={targetTeam ? targetAccent : colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── TRADE SUMMARY CARD ── */}
        {hasSelection && (
          <View style={[tb.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={tb.summaryRow}>
              {/* YOU OFFER */}
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[tb.sideLabel, { color: colors.mutedForeground }]}>YOU OFFER</Text>
                {offerPlayers.map(p => (
                  <TouchableOpacity key={p.id} onPress={() => toggleOffer(p.id)}
                    style={[tb.chip, { backgroundColor: teamColor + "20", borderColor: teamColor + "50" }]}>
                    <Text style={[tb.chipText, { color: teamColor }]} numberOfLines={1}>
                      {p.position} {p.overall} · {p.name.split(" ").slice(-1)[0]}
                    </Text>
                    <Feather name="x" size={9} color={teamColor} />
                  </TouchableOpacity>
                ))}
                {offerPicks.map(pk => (
                  <TouchableOpacity key={pk.id} onPress={() => toggleOfferPick(pk.id)}
                    style={[tb.chip, { backgroundColor: PICK_ROUND_COLORS[pk.round] + "20", borderColor: PICK_ROUND_COLORS[pk.round] + "50" }]}>
                    <Text style={[tb.chipText, { color: PICK_ROUND_COLORS[pk.round] }]} numberOfLines={1}>R{pk.round} Pick</Text>
                    <Feather name="x" size={9} color={PICK_ROUND_COLORS[pk.round]} />
                  </TouchableOpacity>
                ))}
                {offerPlayers.length === 0 && offerPicks.length === 0 &&
                  <Text style={[tb.chipEmpty, { color: colors.mutedForeground }]}>—</Text>}
              </View>

              <View style={{ alignItems: "center", justifyContent: "center", paddingTop: 16 }}>
                <Feather name="arrow-right" size={18} color={colors.mutedForeground} />
              </View>

              {/* YOU RECEIVE */}
              <View style={{ flex: 1, paddingLeft: 8 }}>
                <Text style={[tb.sideLabel, { color: colors.mutedForeground }]}>YOU RECEIVE</Text>
                {recvPlayers.map(p => (
                  <TouchableOpacity key={p.id} onPress={() => toggleReceive(p.id)}
                    style={[tb.chip, { backgroundColor: targetAccent + "20", borderColor: targetAccent + "50" }]}>
                    <Text style={[tb.chipText, { color: targetAccent }]} numberOfLines={1}>
                      {p.position} {p.overall} · {p.name.split(" ").slice(-1)[0]}
                    </Text>
                    <Feather name="x" size={9} color={targetAccent} />
                  </TouchableOpacity>
                ))}
                {recvPicks.map(pk => (
                  <TouchableOpacity key={pk.id} onPress={() => toggleReceivePick(pk.id)}
                    style={[tb.chip, { backgroundColor: PICK_ROUND_COLORS[pk.round] + "20", borderColor: PICK_ROUND_COLORS[pk.round] + "50" }]}>
                    <Text style={[tb.chipText, { color: PICK_ROUND_COLORS[pk.round] }]} numberOfLines={1}>
                      R{pk.round} Pick {targetTeam?.abbreviation ? `(${targetTeam.abbreviation})` : ""}
                    </Text>
                    <Feather name="x" size={9} color={PICK_ROUND_COLORS[pk.round]} />
                  </TouchableOpacity>
                ))}
                {recvPlayers.length === 0 && recvPicks.length === 0 &&
                  <Text style={[tb.chipEmpty, { color: colors.mutedForeground }]}>—</Text>}
              </View>
            </View>

            {/* Value meter */}
            <View style={[tb.valueBar, { backgroundColor: verdictColor + "18", borderColor: verdictColor + "40" }]}>
              <Text style={[tb.valueVerdict, { color: verdictColor }]}>{verdict}</Text>
              <Text style={[tb.valueNum, { color: verdictColor }]}>
                {tradeValue > 0 ? "+" : ""}{tradeValue} pts
              </Text>
            </View>
          </View>
        )}

        {/* ── BUILD TABS ── */}
        <View style={[tb.tabBar, { borderBottomColor: colors.border }]}>
          {(["myRoster", "theirRoster", "picks"] as BuildTab[]).map(t => {
            const labels: Record<BuildTab, string> = {
              myRoster: "My Players",
              theirRoster: targetTeam ? `${targetTeam.abbreviation} Players` : "Their Players",
              picks: "Draft Picks",
            };
            const active = buildTab === t;
            return (
              <TouchableOpacity key={t} onPress={() => setBuildTab(t)}
                style={[tb.tabBtn, { borderBottomColor: active ? teamColor : "transparent" }]}>
                <Text style={[tb.tabText, { color: active ? teamColor : colors.mutedForeground }]}>{labels[t]}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── POSITION FILTER (roster tabs) ── */}
        {buildTab !== "picks" && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={{ flexShrink: 0, borderBottomWidth: 1, borderBottomColor: colors.border }}
            contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 6 }}>
            {(["ALL", ...ALL_POS] as (NFLPosition | "ALL")[]).map(pos => {
              const active = posFilter === pos;
              const c = pos === "ALL" ? teamColor : POS_COLOR[pos as NFLPosition];
              return (
                <TouchableOpacity key={pos} onPress={() => setPosFilter(pos)}
                  style={[tb.posPill, { backgroundColor: active ? c : colors.secondary, borderColor: active ? c : colors.border }]}>
                  <Text style={[tb.posPillText, { color: active ? "#fff" : colors.mutedForeground }]}>{pos}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* ── MY ROSTER ── */}
        {buildTab === "myRoster" && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 140 }}>
            {myRoster.map((p, idx) => {
              const on = offeringPlayerIds.includes(p.id);
              return (
                <PlayerPickRow key={p.id} p={p} rank={idx+1} active={on}
                  accent={teamColor} label={on ? "OFFER ✓" : "OFFER"} colors={colors}
                  onToggle={() => toggleOffer(p.id)} />
              );
            })}
          </ScrollView>
        )}

        {/* ── THEIR ROSTER ── */}
        {buildTab === "theirRoster" && !targetTeam && (
          <View style={tb.emptyState}>
            <Feather name="git-merge" size={36} color={colors.mutedForeground} />
            <Text style={[tb.emptyTitle, { color: colors.foreground }]}>No team selected</Text>
            <Text style={[tb.emptyText, { color: colors.mutedForeground }]}>Choose a trade partner to browse their roster</Text>
            <TouchableOpacity onPress={() => setTeamPickerOpen(true)}
              style={[tb.emptyBtn, { backgroundColor: teamColor }]}>
              <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 14 }}>Choose Partner Team</Text>
            </TouchableOpacity>
          </View>
        )}
        {buildTab === "theirRoster" && targetTeam && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 140 }}>
            {theirRoster.map((p, idx) => {
              const on = receivingPlayerIds.includes(p.id);
              return (
                <PlayerPickRow key={p.id} p={p} rank={idx+1} active={on}
                  accent={targetAccent} label={on ? "GET ✓" : "GET"} colors={colors}
                  onToggle={() => toggleReceive(p.id)} />
              );
            })}
          </ScrollView>
        )}

        {/* ── PICKS ── */}
        {buildTab === "picks" && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 24, paddingBottom: 140 }}>
            {/* Your picks */}
            <View>
              <Text style={[tb.pickHeader, { color: colors.foreground }]}>Your Draft Picks</Text>
              <Text style={[tb.pickSubHeader, { color: colors.mutedForeground }]}>Tap a round to include it in your offer</Text>
              <View style={tb.pickGrid}>
                {myPicks.map(pk => (
                  <PickCard key={pk.id} pk={pk} active={offeringPickIds.includes(pk.id)}
                    teamAbbr={myTeam?.abbreviation ?? "MY"}
                    onToggle={() => toggleOfferPick(pk.id)} colors={colors} />
                ))}
                {myPicks.length === 0 && (
                  <Text style={[tb.emptyText, { color: colors.mutedForeground }]}>No picks available</Text>
                )}
              </View>
            </View>

            {/* Their picks */}
            {!targetTeam ? (
              <View style={[tb.emptyState, { paddingVertical: 20, gap: 8 }]}>
                <Text style={[tb.emptyText, { color: colors.mutedForeground }]}>
                  Select a partner team above to request their picks
                </Text>
              </View>
            ) : (
              <View>
                <Text style={[tb.pickHeader, { color: colors.foreground }]}>{targetTeam.city} {targetTeam.name} Picks</Text>
                <Text style={[tb.pickSubHeader, { color: colors.mutedForeground }]}>Tap a round to request it in return</Text>
                <View style={tb.pickGrid}>
                  {theirPicks.map(pk => (
                    <PickCard key={pk.id} pk={pk} active={receivingPickIds.includes(pk.id)}
                      teamAbbr={targetTeam.abbreviation}
                      onToggle={() => toggleReceivePick(pk.id)} colors={colors} />
                  ))}
                  {theirPicks.length === 0 && (
                    <Text style={[tb.emptyText, { color: colors.mutedForeground }]}>No picks available</Text>
                  )}
                </View>
              </View>
            )}
          </ScrollView>
        )}

        {/* ── FOOTER ── */}
        <View style={[tb.footer, { paddingBottom: insets.bottom + 12, borderTopColor: colors.border, backgroundColor: colors.background }]}>
          <TouchableOpacity onPress={clearAll}
            style={[tb.footerClear, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Feather name="x" size={16} color={colors.mutedForeground} />
            <Text style={[tb.footerBtnText, { color: colors.mutedForeground }]}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSend}
            style={[tb.footerSend, { backgroundColor: teamColor }]}>
            <Feather name="send" size={16} color="#fff" />
            <Text style={[tb.footerBtnText, { color: "#fff" }]}>Send Offer</Text>
          </TouchableOpacity>
        </View>

        {/* ── TEAM PICKER ── */}
        <Modal visible={teamPickerOpen} animationType="slide" transparent onRequestClose={() => setTeamPickerOpen(false)}>
          <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.72)" }}>
            <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setTeamPickerOpen(false)} activeOpacity={1} />
            <View style={[tb.pickerSheet, { backgroundColor: colors.card }]}>
              <View style={tb.pickerHandle} />
              <View style={[tb.pickerHdr, { borderBottomColor: colors.border }]}>
                <Text style={[tb.pickerTitle, { color: colors.foreground }]}>Select Trade Partner</Text>
                <TouchableOpacity onPress={() => setTeamPickerOpen(false)}>
                  <Feather name="x" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
                {["Ironclad","Gridiron"].map(conf => (
                  <View key={conf}>
                    <View style={[tb.confHdr, { backgroundColor: colors.secondary }]}>
                      <Text style={[tb.confText, { color: colors.mutedForeground }]}>{conf.toUpperCase()} CONFERENCE</Text>
                    </View>
                    {["East","North","South","West"].map(div => {
                      const divTeams = (season?.teams ?? []).filter(t =>
                        t.conference === conf && t.division === div && t.id !== myTeam?.id
                      );
                      if (divTeams.length === 0) return null;
                      return (
                        <View key={div}>
                          <View style={[tb.divHdr, { borderBottomColor: colors.border }]}>
                            <Text style={[tb.divText, { color: colors.mutedForeground }]}>{div}</Text>
                          </View>
                          {divTeams.map(t => {
                            const acc = pickAccentForTeam(t.primaryColor, t.secondaryColor);
                            const sel = targetTeamId === t.id;
                            return (
                              <TouchableOpacity key={t.id}
                                onPress={() => { setTargetTeamId(t.id); setTeamPickerOpen(false); }}
                                style={[tb.pickerRow, { backgroundColor: sel ? acc + "18" : "transparent", borderBottomColor: colors.border }]}>
                                <View style={[tb.pickerDot, { backgroundColor: acc }]} />
                                <View style={{ flex: 1 }}>
                                  <Text style={[tb.pickerRowName, { color: sel ? acc : colors.foreground }]}>
                                    {t.city} {t.name}
                                  </Text>
                                  <Text style={[tb.pickerRowSub, { color: colors.mutedForeground }]}>
                                    {t.abbreviation} · {t.conference} {t.division}
                                  </Text>
                                </View>
                                {sel && <Feather name="check" size={16} color={acc} />}
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

      </View>
    </Modal>
  );
}

// ─── PlayerPickRow ────────────────────────────────────────────────────────────
function PlayerPickRow({ p, rank, active, accent, label, colors, onToggle }:
  { p: Player; rank: number; active: boolean; accent: string; label: string; colors: any; onToggle: () => void }) {
  return (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.8}
      style={[tb.playerRow, {
        backgroundColor: active ? accent + "15" : colors.card,
        borderBottomColor: colors.border,
        borderLeftWidth: active ? 3 : 0,
        borderLeftColor: accent,
      }]}>
      <Text style={{ width: 22, fontSize: 10, color: colors.mutedForeground, fontFamily: "Inter_500Medium", textAlign: "right" }}>{rank}</Text>
      <View style={[tb.posBadge, { backgroundColor: POS_COLOR[p.position] + "25" }]}>
        <Text style={[tb.posBadgeText, { color: POS_COLOR[p.position] }]}>{p.position}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[tb.playerName, { color: active ? accent : colors.foreground }]} numberOfLines={1}>{p.name}</Text>
        <Text style={[tb.playerMeta, { color: colors.mutedForeground }]}>
          {p.age}yo · {p.yearsExperience === 0 ? "Rookie" : `${p.yearsExperience}yr`} · ${p.salary.toFixed(1)}M
        </Text>
      </View>
      <View style={[tb.ovrBadge, { backgroundColor: accent + "20", borderColor: accent + "50" }]}>
        <Text style={[tb.ovrText, { color: accent }]}>{p.overall}</Text>
      </View>
      <View style={[tb.toggleBtn, { backgroundColor: active ? accent : colors.secondary, borderColor: active ? accent : colors.border }]}>
        <Text style={[tb.toggleText, { color: active ? "#fff" : colors.mutedForeground }]}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── PickCard ─────────────────────────────────────────────────────────────────
function PickCard({ pk, active, teamAbbr, onToggle, colors }:
  { pk: DraftPick; active: boolean; teamAbbr: string; onToggle: () => void; colors: any }) {
  const c   = PICK_ROUND_COLORS[pk.round];
  const val = PICK_ROUND_VALUES[pk.round];
  const stars = PICK_STARS[pk.round];
  return (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.8}
      style={[tb.pickCard, { backgroundColor: active ? c + "25" : colors.card, borderColor: active ? c : colors.border }]}>
      {active && (
        <View style={[tb.pickCheck, { backgroundColor: c }]}>
          <Feather name="check" size={10} color="#fff" />
        </View>
      )}
      <Text style={[tb.pickRound, { color: active ? c : colors.foreground }]}>ROUND {pk.round}</Text>
      <Text style={[tb.pickTeam, { color: colors.mutedForeground }]}>{teamAbbr} · {pk.year}</Text>
      <Text style={[tb.pickStars, { color: c }]}>{stars}</Text>
      <View style={[tb.pickValBadge, { backgroundColor: c + "20", borderColor: c + "40" }]}>
        <Text style={[tb.pickValText, { color: c }]}>{val} pts</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const tb = StyleSheet.create({
  root:        { flex: 1 },
  header:      { borderBottomWidth: 1, paddingHorizontal: 16, paddingBottom: 12 },
  headerRow:   { flexDirection: "row", alignItems: "center", gap: 12 },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold" },
  partnerBtn:  { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, maxWidth: 200 },
  partnerSwatch:{ width: 10, height: 10, borderRadius: 5 },
  partnerText: { fontSize: 12, fontFamily: "Inter_600SemiBold", flex: 1 },

  summaryCard:  { margin: 12, borderRadius: 14, borderWidth: 1, padding: 12 },
  summaryRow:   { flexDirection: "row", alignItems: "flex-start" },
  sideLabel:    { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" },
  chip:         { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6, borderWidth: 1, marginBottom: 4 },
  chipText:     { fontSize: 11, fontFamily: "Inter_600SemiBold", flex: 1 },
  chipEmpty:    { fontSize: 11, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  valueBar:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10, padding: 10, borderRadius: 8, borderWidth: 1 },
  valueVerdict: { fontSize: 13, fontFamily: "Inter_700Bold" },
  valueNum:     { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  tabBar:     { flexDirection: "row", borderBottomWidth: 1 },
  tabBtn:     { flex: 1, alignItems: "center", paddingVertical: 12, borderBottomWidth: 2 },
  tabText:    { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  posPill:     { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  posPillText: { fontSize: 10, fontFamily: "Inter_700Bold" },

  playerRow:   { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  posBadge:    { paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 },
  posBadgeText:{ fontSize: 9, fontFamily: "Inter_700Bold" },
  playerName:  { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  playerMeta:  { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 1 },
  ovrBadge:    { width: 38, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  ovrText:     { fontSize: 14, fontFamily: "Inter_700Bold" },
  toggleBtn:   { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  toggleText:  { fontSize: 10, fontFamily: "Inter_700Bold" },

  emptyState:  { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 40 },
  emptyTitle:  { fontSize: 16, fontFamily: "Inter_700Bold", textAlign: "center" },
  emptyText:   { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  emptyBtn:    { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },

  pickHeader:    { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 2 },
  pickSubHeader: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 12 },
  pickGrid:      { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  pickCard:      { width: "30.5%", borderRadius: 12, borderWidth: 1.5, padding: 12, gap: 5, position: "relative" },
  pickCheck:     { position: "absolute", top: 8, right: 8, width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  pickRound:     { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  pickTeam:      { fontSize: 9, fontFamily: "Inter_400Regular" },
  pickStars:     { fontSize: 10, letterSpacing: 1 },
  pickValBadge:  { borderRadius: 5, borderWidth: 1, paddingHorizontal: 5, paddingVertical: 3, alignSelf: "flex-start", marginTop: 2 },
  pickValText:   { fontSize: 9, fontFamily: "Inter_700Bold" },

  footer:       { flexDirection: "row", gap: 10, padding: 14, borderTopWidth: 1 },
  footerClear:  { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1, flex: 0.4 },
  footerSend:   { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, flex: 1 },
  footerBtnText:{ fontSize: 15, fontFamily: "Inter_700Bold" },

  pickerSheet:  { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, maxHeight: "88%" },
  pickerHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#ffffff25", alignSelf: "center", marginBottom: 8 },
  pickerHdr:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  pickerTitle:  { fontSize: 17, fontFamily: "Inter_700Bold" },
  pickerRow:    { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth },
  pickerDot:    { width: 10, height: 10, borderRadius: 5 },
  pickerRowName:{ fontSize: 15, fontFamily: "Inter_600SemiBold" },
  pickerRowSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  confHdr:      { paddingHorizontal: 20, paddingVertical: 8 },
  confText:     { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.2 },
  divHdr:       { paddingHorizontal: 20, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  divText:      { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
});
