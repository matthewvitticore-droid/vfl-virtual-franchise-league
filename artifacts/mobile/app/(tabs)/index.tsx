import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator, Alert, Platform, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { UniformPreview } from "@/components/UniformPreview";
import { VFLLogo } from "@/components/VFLLogo";
import { useColors } from "@/hooks/useColors";
import { useTeamTheme } from "@/hooks/useTeamTheme";
import { useAuth } from "@/context/AuthContext";
import { useNFL } from "@/context/NFLContext";
import type { UniformSet } from "@/context/NFLContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

const FALLBACK_UNIFORM: UniformSet = {
  helmetColor: "#4F46E5", helmetFacemaskColor: "#C0C6D0",
  helmetChinstrapColor: "#4F46E5", helmetLogoPlacement: "both",
  jerseyStyle: "traditional", jerseyColor: "#4F46E5",
  jerseyAccentColor: "#0D9488", numberFont: "block",
  numberColor: "#FFFFFF", numberOutlineColor: "#0D9488",
  pantColor: "#4F46E5", pantStripeStyle: "single",
  pantStripeColor: "#0D9488", sockColor: "#4F46E5", sockAccentColor: "#0D9488",
};

const PHASE_ORDER = ["regular","playoffs","offseason","freeAgency","draft","preseason"] as const;
type Phase = typeof PHASE_ORDER[number];

const PHASE_LABELS: Record<Phase, string> = {
  regular: "Regular Season", playoffs: "Playoffs",
  offseason: "Offseason", freeAgency: "Free Agency",
  draft: "Draft", preseason: "Preseason",
};

export default function HomeScreen() {
  const colors   = useColors();
  const theme    = useTeamTheme();
  const insets   = useSafeAreaInsets();
  const router   = useRouter();
  const { membership, signOut } = useAuth();
  const {
    season, isLoading, isSyncing, syncError,
    teamCustomization,
    getPlayerTeam, getWeekGames,
    simulateWeek, simulateSeason, advancePhase, toggleCoGMMode,
  } = useNFL();

  const [simulating, setSimulating] = useState(false);
  const [simSeason,  setSimSeason]  = useState(false);
  const [advancing,  setAdvancing]  = useState(false);
  const [warRoomCount, setWarRoomCount] = useState(0);

  const team    = getPlayerTeam();
  const topPad  = Platform.OS === "web" ? 16 : insets.top;
  const role    = membership?.role ?? "GM";

  // Active kit
  const kitKey  = teamCustomization?.featuredUniformSet ?? "home";
  const uniform = teamCustomization?.uniforms?.[kitKey] ?? FALLBACK_UNIFORM;
  const abbr    = teamCustomization?.abbreviation ?? team?.abbreviation ?? "VFL";

  // Record
  const wins    = team?.wins   ?? 0;
  const losses  = team?.losses ?? 0;
  const wPct    = (wins / Math.max(1, wins + losses)).toFixed(3).replace("0.", ".");
  const roster  = team?.roster ?? [];

  // Team ratings
  const offPos    = ["QB","RB","WR","TE","OL"];
  const defPos    = ["DE","DT","LB","CB","S"];
  const ovrRating = roster.length > 0
    ? Math.round(roster.reduce((s, p) => s + p.overall, 0) / roster.length) : 0;
  const offRoster = roster.filter(p => offPos.includes(p.position));
  const defRoster = roster.filter(p => defPos.includes(p.position));
  const offRating = offRoster.length > 0
    ? Math.round(offRoster.reduce((s, p) => s + p.overall, 0) / offRoster.length) : 0;
  const defRating = defRoster.length > 0
    ? Math.round(defRoster.reduce((s, p) => s + p.overall, 0) / defRoster.length) : 0;

  // Phase state
  const currentPhase     = (season?.phase ?? "regular") as Phase;
  const isOffseason      = ["offseason","freeAgency","draft","preseason"].includes(currentPhase);
  const allDone          = !!season?.vflBowlWinnerId;
  const weekGames        = getWeekGames(season?.currentWeek ?? 1);
  const canSim           = weekGames.some(g => g.status === "upcoming") && !isOffseason;
  const canAdvance       = isOffseason || allDone;
  const busy             = canAdvance ? advancing : simulating;
  const canPress         = !busy && role !== "Scout" && (canSim || canAdvance);

  // Draft state
  const ds = season?.draftState;
  const isUserTurn = ds?.isUserTurn ?? false;
  const isDraftComplete = ds?.isComplete ?? false;

  // War room count from AsyncStorage
  React.useEffect(() => {
    AsyncStorage.getItem("vfl_war_room_v1").then(raw => {
      if (raw) {
        try { setWarRoomCount(JSON.parse(raw).length); } catch {}
      }
    });
  }, [currentPhase]);

  // VFL Bowl winner name
  const vflWinner = season?.vflBowlWinnerId
    ? season.teams.find(t => t.id === season.vflBowlWinnerId)
    : null;

  const handleSim = async () => {
    if (role === "Scout") { Alert.alert("Permission Denied", "Only the GM or Coach can simulate."); return; }
    if (canAdvance) { setAdvancing(true); try { await advancePhase(); } finally { setAdvancing(false); } }
    else            { setSimulating(true); try { await simulateWeek(); } finally { setSimulating(false); } }
  };

  const goTo = (tab: "freeAgency" | "draft" | "trades") => {
    router.push(`/(tabs)/frontoffice?tab=${tab}` as any);
  };

  if (isLoading) return (
    <View style={[st.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={theme.primary} size="large" />
      <Text style={[st.mutedTxt, { color: colors.mutedForeground }]}>Loading franchise…</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <View style={[st.topBar, { paddingTop: topPad + 8, borderBottomColor: "#003087" + "50" }]}>
        <View style={st.topRow}>
          <VFLLogo size="sm" />
          <View>
            <Text style={[st.seasonLbl, { color: colors.mutedForeground }]}>
              {(season?.year ?? 2025) + 1} VIRTUAL FRANCHISE LEAGUE
            </Text>
            <Text style={[st.weekLbl, { color: colors.foreground }]}>
              {isOffseason
                ? <Text style={{ color: "#C8102E" }}>{PHASE_LABELS[currentPhase].toUpperCase()}</Text>
                : <>SEASON{" "}<Text style={{ color: "#C8102E" }}>{(season?.year ?? 2025) - 2024}</Text></>
              }
            </Text>
          </View>
        </View>
        <View style={st.topRight}>
          {isSyncing && <ActivityIndicator color="#003087" size="small" style={{ transform:[{scale:0.7}] }} />}
          {syncError && !isSyncing && <Feather name="wifi-off" size={14} color={colors.danger} />}
          <TouchableOpacity
            onPress={() => Alert.alert("Sign Out", "Leave this session?", [
              { text: "Cancel" },
              { text: "Sign Out", style: "destructive", onPress: signOut },
            ])}
            style={[st.avatarBtn, { backgroundColor: "#003087" + "30", borderColor: "#003087" + "80" }]}
          >
            <Feather name="user" size={14} color="#C8102E" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 110, gap: 0 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <LinearGradient
          colors={[theme.primary + "28", theme.secondary + "10", "transparent"]}
          style={st.hero}
        >
          <View style={[st.heroAccent, { backgroundColor: theme.primary }]} />
          <View style={st.heroInner}>
            <View style={st.heroLeft}>
              <UniformPreview
                uniform={uniform}
                abbreviation={abbr}
                number="00"
                width={140}
                height={224}
              />
            </View>
            <View style={st.heroRight}>
              <Text style={[st.heroCity, { color: theme.primary }]}>
                {(team?.city ?? "").toUpperCase()}
              </Text>
              <Text style={[st.heroName, { color: colors.foreground }]}>
                {team?.name ?? "VFL Team"}
              </Text>
              <Text style={[st.heroRecord, { color: theme.secondary }]}>
                {wins}–{losses} · {wPct}
              </Text>
              <View style={[st.heroPill, { backgroundColor: theme.primary + "20", borderColor: theme.primary + "40" }]}>
                <Text style={[st.heroPillTxt, { color: theme.primary }]}>
                  {team?.conference ?? ""} {team?.division ?? ""}
                </Text>
              </View>
              {ovrRating > 0 && (
                <View style={st.ratingsStack}>
                  {[
                    { lbl: "OVR", val: ovrRating },
                    { lbl: "OFF", val: offRating },
                    { lbl: "DEF", val: defRating },
                  ].map(r => (
                    <View key={r.lbl} style={st.ratingRow}>
                      <Text style={[st.ratingLbl, { color: colors.mutedForeground }]}>{r.lbl}</Text>
                      <Text style={[st.ratingVal, { color: theme.secondary }]}>{r.val}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        </LinearGradient>

        {/* ── Kit theme toggle ─────────────────────────────────────────── */}
        <KitToggle />

        {/* ── Phase strip ──────────────────────────────────────────────── */}
        {season && (
          <PhaseStrip phase={currentPhase} colors={colors} primary={theme.primary} secondary={theme.secondary} />
        )}

        {/* ── Season Stage Card ─────────────────────────────────────────── */}
        {season && (
          <View style={{ paddingHorizontal: 14, marginBottom: 16 }}>

            {/* VFL Bowl Champion banner (offseason entry) */}
            {vflWinner && currentPhase === "offseason" && (
              <LinearGradient
                colors={["#D9770620", "#D9770608", "transparent"]}
                style={[st.championCard, { borderColor: "#D97706" + "50" }]}
              >
                <Text style={st.championTrophy}>🏆</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[st.championLabel, { color: "#D97706" }]}>VFL BOWL CHAMPIONS</Text>
                  <Text style={[st.championTeam, { color: colors.foreground }]}>
                    {vflWinner.city} {vflWinner.name}
                  </Text>
                  <Text style={[st.championSub, { color: colors.mutedForeground }]}>
                    {season.year} Season Complete
                  </Text>
                </View>
              </LinearGradient>
            )}

            {/* Free Agency card */}
            {currentPhase === "freeAgency" && (
              <View style={[st.stageCard, { backgroundColor: colors.card, borderColor: theme.primary + "40" }]}>
                <View style={[st.stageCardAccent, { backgroundColor: theme.primary }]} />
                <View style={st.stageCardBody}>
                  <Text style={[st.stageCardLabel, { color: theme.primary }]}>FREE AGENCY</Text>
                  <Text style={[st.stageCardTitle, { color: colors.foreground }]}>Signing Period Open</Text>
                  <Text style={[st.stageCardSub, { color: colors.mutedForeground }]}>
                    Sign free agents to build your roster before the draft
                  </Text>
                  <TouchableOpacity
                    onPress={() => goTo("freeAgency")}
                    style={[st.stageCardBtn, { backgroundColor: theme.primary }]}
                  >
                    <Feather name="user-plus" size={14} color="#fff" />
                    <Text style={st.stageCardBtnTxt}>Open Free Agency</Text>
                    <Feather name="chevron-right" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Draft card — the big one */}
            {currentPhase === "draft" && (
              <View style={[st.draftCard, { backgroundColor: colors.card, borderColor: theme.secondary + "60" }]}>
                <LinearGradient
                  colors={[theme.secondary + "18", theme.primary + "08"]}
                  style={st.draftCardGrad}
                >
                  {/* Header */}
                  <View style={st.draftCardHeader}>
                    <View>
                      <Text style={[st.draftCardEyebrow, { color: theme.secondary }]}>
                        {isDraftComplete ? "DRAFT COMPLETE" : "DRAFT IN PROGRESS"}
                      </Text>
                      <Text style={[st.draftCardTitle, { color: colors.foreground }]}>
                        {isDraftComplete ? "Rookie Class Set" : `Round ${ds?.currentRound ?? 1} · Pick ${ds?.currentPickInRound ?? 1}`}
                      </Text>
                    </View>
                    {!isDraftComplete && (
                      <View style={[st.draftPickBadge, { backgroundColor: theme.secondary + "20", borderColor: theme.secondary + "50" }]}>
                        <Text style={[st.draftPickNum, { color: theme.secondary }]}>#{ds?.overallPick ?? 1}</Text>
                        <Text style={[st.draftPickLbl, { color: colors.mutedForeground }]}>OVERALL</Text>
                      </View>
                    )}
                  </View>

                  {/* Your turn alert */}
                  {isUserTurn && !isDraftComplete && (
                    <View style={[st.yourTurnBanner, { backgroundColor: theme.secondary + "25", borderColor: theme.secondary }]}>
                      <Text style={{ fontSize: 16 }}>⚡</Text>
                      <Text style={[st.yourTurnText, { color: theme.secondary }]}>YOU'RE ON THE CLOCK</Text>
                    </View>
                  )}

                  {/* Stats row */}
                  <View style={st.draftStatsRow}>
                    <View style={st.draftStat}>
                      <Text style={[st.draftStatNum, { color: theme.primary }]}>{warRoomCount}</Text>
                      <Text style={[st.draftStatLbl, { color: colors.mutedForeground }]}>TARGETED</Text>
                    </View>
                    <View style={[st.draftStatDivider, { backgroundColor: colors.border }]} />
                    <View style={st.draftStat}>
                      <Text style={[st.draftStatNum, { color: colors.foreground }]}>
                        {season.draftProspects?.filter(p => p.isPickedUp).length ?? 0}
                      </Text>
                      <Text style={[st.draftStatLbl, { color: colors.mutedForeground }]}>DRAFTED</Text>
                    </View>
                    <View style={[st.draftStatDivider, { backgroundColor: colors.border }]} />
                    <View style={st.draftStat}>
                      <Text style={[st.draftStatNum, { color: colors.foreground }]}>
                        {season.draftProspects?.filter(p => !p.isPickedUp).length ?? 0}
                      </Text>
                      <Text style={[st.draftStatLbl, { color: colors.mutedForeground }]}>AVAILABLE</Text>
                    </View>
                  </View>

                  {/* CTA buttons */}
                  <View style={st.draftBtns}>
                    <TouchableOpacity
                      onPress={() => goTo("draft")}
                      style={[st.draftCTABtn, { backgroundColor: theme.secondary, flex: 2 }]}
                    >
                      <Feather name="award" size={15} color="#000" />
                      <Text style={[st.draftCTABtnTxt, { color: "#000" }]}>
                        {isDraftComplete ? "View Rookie Class" : "Enter Draft Room"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </View>
            )}

            {/* Regular season sim block */}
            {currentPhase === "regular" && season && (canSim || allDone) && (
              <View style={st.simBlock}>
                <TouchableOpacity
                  onPress={handleSim} disabled={!canPress} activeOpacity={0.82}
                  style={[st.simBtn, { backgroundColor: canPress ? theme.primary + "CC" : colors.secondary, borderColor: canPress ? theme.primary : "transparent" }]}
                >
                  {simulating
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Feather name="fast-forward" size={18} color="#fff" />
                  }
                  <Text style={[st.simBtnTxt, { color: "#fff" }]}>
                    {role === "Scout" ? "GM / Coach Only" : `Simulate Week ${season.currentWeek}`}
                  </Text>
                </TouchableOpacity>
                {canSim && role !== "Scout" && (
                  <TouchableOpacity
                    onPress={() => { setSimSeason(true); simulateSeason().finally(() => setSimSeason(false)); }}
                    disabled={simSeason || simulating} activeOpacity={0.82}
                    style={[st.simSecBtn, { borderColor: colors.border }]}
                  >
                    {simSeason ? <ActivityIndicator color="#aaa" size="small" /> : <Feather name="zap" size={14} color="#aaa" />}
                    <Text style={[st.simSecTxt, { color: "#aaa" }]}>
                      {simSeason ? "Simulating to VFL Bowl…" : "Sim to VFL Bowl"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Playoffs sim block */}
            {currentPhase === "playoffs" && season && (
              <View style={st.simBlock}>
                <TouchableOpacity
                  onPress={handleSim} disabled={!canPress} activeOpacity={0.82}
                  style={[st.simBtn, { backgroundColor: canPress ? "#8B0000CC" : colors.secondary, borderColor: canPress ? "#8B0000" : "transparent" }]}
                >
                  {simulating
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Feather name="fast-forward" size={18} color="#fff" />
                  }
                  <Text style={[st.simBtnTxt, { color: "#fff" }]}>
                    {allDone ? "VFL Bowl Complete" : "Simulate Playoff Round"}
                  </Text>
                </TouchableOpacity>
                {allDone && (
                  <TouchableOpacity
                    onPress={handleSim} disabled={!canPress || advancing} activeOpacity={0.82}
                    style={[st.simBtn, { backgroundColor: canPress ? "#D97706CC" : colors.secondary, borderColor: "#D97706", marginTop: 8 }]}
                  >
                    {advancing ? <ActivityIndicator color="#fff" size="small" /> : <Feather name="chevrons-right" size={18} color="#fff" />}
                    <Text style={[st.simBtnTxt, { color: "#fff" }]}>Begin Offseason</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Offseason / preseason advance block */}
            {(currentPhase === "offseason" || currentPhase === "preseason") && (
              <View style={st.simBlock}>
                <TouchableOpacity
                  onPress={handleSim} disabled={!canPress} activeOpacity={0.82}
                  style={[st.simBtn, { backgroundColor: canPress ? theme.primary + "CC" : colors.secondary, borderColor: canPress ? theme.primary : "transparent" }]}
                >
                  {advancing ? <ActivityIndicator color="#fff" size="small" /> : <Feather name="chevrons-right" size={18} color="#fff" />}
                  <Text style={[st.simBtnTxt, { color: "#fff" }]}>
                    {role === "Scout" ? "GM / Coach Only"
                      : currentPhase === "offseason" ? "Open Free Agency"
                      : "Start New Season"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Free Agency advance to draft */}
            {currentPhase === "freeAgency" && (
              <TouchableOpacity
                onPress={handleSim} disabled={!canPress} activeOpacity={0.82}
                style={[st.advanceBtn, { borderColor: colors.border }]}
              >
                {advancing ? <ActivityIndicator color="#aaa" size="small" /> : <Feather name="chevrons-right" size={14} color="#aaa" />}
                <Text style={[st.advanceBtnTxt, { color: "#aaa" }]}>
                  {role === "Scout" ? "GM / Coach Only" : "Done Signing — Begin Draft"}
                </Text>
              </TouchableOpacity>
            )}

            {/* ── ROOKIE CLASS PANEL (draft complete) ── */}
            {currentPhase === "draft" && isDraftComplete && (() => {
              const rookies = (team?.roster ?? [])
                .filter(p => p.draftRound !== undefined)
                .sort((a, b) => (a.draftPick ?? 999) - (b.draftPick ?? 999));
              if (rookies.length === 0) return null;
              const POS_COL: Record<string, string> = {
                QB:"#E31837", RB:"#FB4F14", WR:"#FFC20E", TE:"#00B5E2", OL:"#8B949E",
                DE:"#3FB950", DT:"#26A69A", LB:"#1F6FEB", CB:"#6E40C9", S:"#9C27B0",
                K:"#FF7043", P:"#795548",
              };
              return (
                <View style={[st.rookiePanel, { backgroundColor: colors.card, borderColor: theme.secondary + "40" }]}>
                  <View style={st.rookiePanelHeader}>
                    <Feather name="users" size={14} color={theme.secondary} />
                    <Text style={[st.rookiePanelTitle, { color: theme.secondary }]}>YOUR ROOKIE CLASS</Text>
                    <Text style={[st.rookiePanelCount, { color: colors.mutedForeground }]}>{rookies.length} PICKS</Text>
                  </View>
                  {rookies.map(p => {
                    const ovrColor = p.overall >= 80 ? "#FFD700" : p.overall >= 70 ? "#3FB950" : p.overall >= 60 ? "#fff" : "#8B949E";
                    const pc = POS_COL[p.position] ?? theme.primary;
                    return (
                      <View key={p.id} style={[st.rookieRow, { borderBottomColor: colors.border }]}>
                        {/* Round badge */}
                        <View style={[st.rookieRdBadge, { backgroundColor: theme.secondary + "20", borderColor: theme.secondary + "50" }]}>
                          <Text style={[st.rookieRdNum, { color: theme.secondary }]}>R{p.draftRound}</Text>
                          <Text style={[st.rookieRdPick, { color: colors.mutedForeground }]}>#{p.draftPick}</Text>
                        </View>
                        {/* Pos pill */}
                        <View style={[st.rookiePosPill, { backgroundColor: pc + "20", borderColor: pc + "50" }]}>
                          <Text style={[st.rookiePosText, { color: pc }]}>{p.position}</Text>
                        </View>
                        {/* Name */}
                        <Text style={[st.rookieName, { color: colors.foreground, flex: 1 }]} numberOfLines={1}>{p.name}</Text>
                        {/* College */}
                        <Text style={[st.rookieCollege, { color: colors.mutedForeground }]} numberOfLines={1}>{p.college}</Text>
                        {/* OVR */}
                        <View style={[st.rookieOvrBadge, { borderColor: ovrColor + "50", backgroundColor: ovrColor + "18" }]}>
                          <Text style={[st.rookieOvr, { color: ovrColor }]}>{p.overall}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            })()}

            {/* Draft advance to preseason */}
            {currentPhase === "draft" && isDraftComplete && (
              <TouchableOpacity
                onPress={handleSim} disabled={!canPress} activeOpacity={0.82}
                style={[st.advanceBtn, { borderColor: colors.border, marginTop: 8 }]}
              >
                {advancing ? <ActivityIndicator color="#aaa" size="small" /> : <Feather name="chevrons-right" size={14} color="#aaa" />}
                <Text style={[st.advanceBtnTxt, { color: "#aaa" }]}>
                  {role === "Scout" ? "GM / Coach Only" : "Enter Preseason"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Home nav panels ──────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 14, paddingBottom: 24, flexDirection: "row", gap: 10, alignItems: "stretch" }}>

          {/* Left column: Front Office + Franchise Type stacked thin */}
          <View style={{ gap: 10, width: 110 }}>
            {/* Front Office */}
            <TouchableOpacity
              onPress={() => goTo("freeAgency")}
              activeOpacity={0.82}
              style={[st.slimPanel, { backgroundColor: colors.card, borderColor: theme.primary + "40", flex: 1 }]}
            >
              <View style={[st.slimIcon, { backgroundColor: theme.primary + "22" }]}>
                <Feather name="briefcase" size={18} color={theme.primary} />
              </View>
              <Text style={[st.slimTitle, { color: colors.foreground }]}>Front{"\n"}Office</Text>
              <Text style={[st.slimSub, { color: colors.mutedForeground }]}>Trades{"\n"}FA · Draft</Text>
            </TouchableOpacity>

            {/* Franchise Type */}
            <FranchiseTypePanel
              role={role}
              coGMMode={season?.coGMMode ?? false}
              primary={theme.primary}
              secondary={theme.secondary}
              colors={colors}
              onToggleCoGM={toggleCoGMMode}
            />
          </View>

          {/* Right column: Draft Class wider */}
          <View style={{ flex: 1 }}>
            <DraftClassPanel
              season={season}
              team={team}
              primary={theme.primary}
              secondary={theme.secondary}
              colors={colors}
              onPress={() => goTo("draft")}
            />
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

// ─── Phase progress strip ─────────────────────────────────────────────────────
function PhaseStrip({ phase, colors, primary, secondary }:
  { phase: Phase; colors: any; primary: string; secondary: string }) {
  const phases: Phase[] = ["regular","playoffs","freeAgency","draft","preseason"];
  const labels = ["Regular","Playoffs","Free Agency","Draft","Preseason"];
  const idx = phases.indexOf(phase === "offseason" ? "regular" : phase);
  return (
    <View style={[st.phaseStrip, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      {phases.map((p, i) => {
        const done    = i < idx;
        const current = i === idx;
        return (
          <View key={p} style={st.phaseStepWrap}>
            {i > 0 && <View style={[st.phaseLine, { backgroundColor: done || current ? primary + "60" : colors.border }]} />}
            <View style={[st.phaseDot,
              done    ? { backgroundColor: primary + "80", borderColor: primary }
              : current ? { backgroundColor: secondary, borderColor: secondary }
              : { backgroundColor: "transparent", borderColor: colors.border }
            ]} />
            <Text style={[st.phaseStepLbl, {
              color: current ? secondary : done ? primary : colors.mutedForeground,
              fontFamily: current ? "Inter_700Bold" : "Inter_400Regular",
            }]} numberOfLines={1}>{labels[i]}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Draft Class Panel ────────────────────────────────────────────────────────
const DC_POS_COL: Record<string, string> = {
  QB:"#E31837", RB:"#FB4F14", WR:"#FFC20E", TE:"#00B5E2", OL:"#8B949E",
  DE:"#3FB950", DT:"#26A69A", LB:"#1F6FEB", CB:"#6E40C9",  S:"#9C27B0",
  K:"#FF7043",  P:"#795548",
};
function fmtHt(inches: number) {
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}

function DraftClassPanel({ season, team, primary, secondary, colors, onPress }:
  { season: any; team: any; primary: string; secondary: string; colors: any; onPress: () => void }) {

  const rookies: any[] = (team?.roster ?? [])
    .filter((p: any) => p.draftRound !== undefined)
    .sort((a: any, b: any) => (a.draftPick ?? 999) - (b.draftPick ?? 999));

  const prospects: any[] = season?.draftProspects ?? [];

  return (
    <View style={[st.homePanel, { backgroundColor: colors.card, borderColor: secondary + "40",
      flexDirection: "column", padding: 0, overflow: "hidden" }]}>
      {/* Header row */}
      <TouchableOpacity onPress={onPress} activeOpacity={0.82}
        style={{ flexDirection: "row", alignItems: "center", padding: 14, gap: 10 }}>
        <View style={[st.homePanelIcon, { backgroundColor: secondary + "22" }]}>
          <Feather name="users" size={20} color={secondary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[st.homePanelTitle, { color: colors.foreground }]}>Draft Class</Text>
          <Text style={[st.homePanelSub, { color: colors.mutedForeground }]}>
            {rookies.length > 0 ? `${rookies.length} rookies · ${season?.year ? season.year + 1 : ""} Draft` : "No picks yet — draft starts soon"}
          </Text>
        </View>
        <Feather name="chevron-right" size={18} color={secondary} />
      </TouchableOpacity>

      {/* Rookie rows */}
      {rookies.map((p: any, i: number) => {
        const ovrColor = p.overall >= 80 ? "#FFD700" : p.overall >= 70 ? "#3FB950" : p.overall >= 60 ? "#fff" : "#8B949E";
        const pc = DC_POS_COL[p.position] ?? primary;
        const prospect = prospects.find((pr: any) => pr.name === p.name);
        const htIn  = prospect?.combine?.height;
        const wt    = prospect?.combine?.weight;
        const htStr = htIn ? fmtHt(htIn) : "—";
        const wtStr = wt   ? `${wt} lbs` : "—";
        return (
          <View key={p.id} style={[st.dcRow, { borderTopColor: colors.border,
            backgroundColor: i % 2 === 0 ? "transparent" : colors.background + "80" }]}>
            {/* Rd badge */}
            <View style={[st.dcRdBadge, { backgroundColor: secondary + "18", borderColor: secondary + "45" }]}>
              <Text style={{ fontSize: 9,  fontFamily: "Inter_700Bold", color: secondary, lineHeight: 11 }}>R{p.draftRound}</Text>
              <Text style={{ fontSize: 7.5, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, lineHeight: 10 }}>#{p.draftPick}</Text>
            </View>
            {/* Pos pill */}
            <View style={[st.dcPosPill, { backgroundColor: pc + "20", borderColor: pc + "50" }]}>
              <Text style={{ fontSize: 9, fontFamily: "Inter_700Bold", color: pc }}>{p.position}</Text>
            </View>
            {/* Name */}
            <Text style={{ flex: 1, fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.foreground }} numberOfLines={1}>{p.name}</Text>
            {/* HT / WT */}
            <Text style={{ fontSize: 9, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginRight: 4 }}>
              {htStr}{"\n"}{wtStr}
            </Text>
            {/* OVR */}
            <View style={{ paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5,
              borderWidth: 1, borderColor: ovrColor + "50", backgroundColor: ovrColor + "18" }}>
              <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: ovrColor }}>{p.overall}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Franchise Type Panel (slim vertical card) ────────────────────────────────
function FranchiseTypePanel({ role, coGMMode, primary, secondary, colors, onToggleCoGM }:
  { role: string; coGMMode: boolean; primary: string; secondary: string; colors: any; onToggleCoGM: () => void }) {

  const modeColor = coGMMode ? secondary : primary;
  const roleColor = role === "GM" ? "#FFD700" : role === "Coach" ? "#3FB950" : "#8B949E";

  return (
    <TouchableOpacity onPress={onToggleCoGM} activeOpacity={0.82}
      style={[st.slimPanel, { backgroundColor: colors.card, borderColor: modeColor + "45" }]}>
      <View style={[st.slimIcon, { backgroundColor: modeColor + "22" }]}>
        <Feather name={coGMMode ? "users" : "user"} size={18} color={modeColor} />
      </View>
      <Text style={[st.slimTitle, { color: colors.foreground }]}>
        {coGMMode ? "Co-GM" : "Solo\nGM"}
      </Text>
      {/* Role badge */}
      <View style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
        backgroundColor: roleColor + "18", borderWidth: 1, borderColor: roleColor + "45", marginTop: 4 }}>
        <Text style={{ fontSize: 9, fontFamily: "Inter_700Bold", color: roleColor }}>{role}</Text>
      </View>
      <Text style={[st.slimSub, { color: modeColor, marginTop: 6 }]}>
        {coGMMode ? "→ Solo" : "→ Co-GM"}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Kit toggle ───────────────────────────────────────────────────────────────
const KITS = [
  { key: "home" as const,      label: "HOME" },
  { key: "away" as const,      label: "AWAY" },
  { key: "alternate" as const, label: "ALT"  },
];

function KitToggle() {
  const colors = useColors();
  const theme  = useTeamTheme();
  const { teamCustomization, saveCustomization } = useNFL();

  const activeKit = (teamCustomization?.featuredUniformSet ?? "home") as "home" | "away" | "alternate";

  const setKit = async (kit: "home" | "away" | "alternate") => {
    if (!teamCustomization || kit === activeKit) return;
    try { await saveCustomization({ ...teamCustomization, featuredUniformSet: kit }); }
    catch {}
  };

  return (
    <View style={[st.kitRow, { backgroundColor: colors.card, borderColor: theme.primary + "30" }]}>
      <Text style={[st.kitRowLabel, { color: colors.mutedForeground }]}>THEME KIT</Text>
      <View style={st.kitPills}>
        {KITS.map(k => {
          const isActive = k.key === activeKit;
          // Each kit highlights in its signature color when active
          const activeBg: Record<typeof k.key, string> = {
            home:      theme.primary,
            away:      "#FFFFFF",
            alternate: theme.secondary,
          };
          const bg     = isActive ? activeBg[k.key]                       : theme.primary + "22";
          const bgColor = bg;
          const bdColor = isActive ? activeBg[k.key]                      : theme.primary + "55";
          const onBg    = k.key === "away" ? "#111111" : "#fff";
          const txtColor = isActive ? onBg                                : theme.primary;
          const dotColor = isActive ? onBg                                : theme.primary;
          return (
            <TouchableOpacity
              key={k.key}
              onPress={() => setKit(k.key)}
              activeOpacity={0.75}
              style={[st.kitPill, { backgroundColor: bgColor, borderColor: bdColor }]}
            >
              <View style={[st.kitDot, { backgroundColor: dotColor }]} />
              <Text style={[st.kitPillTxt, { color: txtColor }]}>{k.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  center:    { flex:1, alignItems:"center", justifyContent:"center", gap:12 },
  mutedTxt:  { fontSize:14, fontFamily:"Inter_400Regular" },

  topBar:    { flexDirection:"row", alignItems:"center", justifyContent:"space-between",
               paddingHorizontal:16, paddingBottom:12, borderBottomWidth:StyleSheet.hairlineWidth },
  topRow:    { flexDirection:"row", alignItems:"center", gap:10 },
  topRight:  { flexDirection:"row", alignItems:"center", gap:8 },
  seasonLbl: { fontSize:10, fontFamily:"Inter_600SemiBold", letterSpacing:1.5 },
  weekLbl:   { fontSize:22, fontFamily:"Inter_700Bold", letterSpacing:-0.5 },
  avatarBtn: { width:32, height:32, borderRadius:16, alignItems:"center", justifyContent:"center", borderWidth:1.5 },

  hero:      { paddingBottom: 16 },
  heroAccent:{ height: 3 },
  heroInner: { flexDirection:"row", alignItems:"center", paddingHorizontal:16, paddingTop:14, gap:8 },
  heroLeft:  { alignItems:"center", justifyContent:"center" },
  heroRight: { flex:1, gap:4, paddingLeft:4 },
  heroCity:  { fontSize:10, fontFamily:"Inter_600SemiBold", letterSpacing:2 },
  heroName:  { fontSize:28, fontFamily:"Inter_700Bold", letterSpacing:-0.5 },
  heroRecord:{ fontSize:15, fontFamily:"Inter_700Bold" },
  heroPill:  { alignSelf:"flex-start", paddingHorizontal:8, paddingVertical:3,
               borderRadius:6, borderWidth:1, marginTop:2 },
  heroPillTxt:{ fontSize:10, fontFamily:"Inter_600SemiBold" },
  ratingsStack: { marginTop: 8, gap: 2 },
  ratingRow:    { flexDirection: "row", alignItems: "baseline", gap: 6 },
  ratingLbl:    { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1.2, width: 28 },
  ratingVal:    { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.5, lineHeight: 24 },

  kitRow:    { flexDirection:"row", alignItems:"center", borderTopWidth:1, borderBottomWidth:1,
               paddingVertical:10, paddingHorizontal:14, gap:10, marginBottom:4 },
  kitRowLabel:{ fontSize:9, fontFamily:"Inter_700Bold", letterSpacing:1.5, width:46 },
  kitPills:  { flex:1, flexDirection:"row", gap:6 },
  kitPill:   { flex:1, flexDirection:"row", alignItems:"center", justifyContent:"center",
               gap:5, paddingVertical:7, borderRadius:9, borderWidth:1.5 },
  kitDot:    { width:7, height:7, borderRadius:3.5 },
  kitPillTxt:{ fontSize:10, fontFamily:"Inter_700Bold", letterSpacing:0.5 },

  // Phase strip
  phaseStrip:   { flexDirection:"row", alignItems:"center", paddingVertical:10,
                  paddingHorizontal:14, borderBottomWidth:StyleSheet.hairlineWidth, marginBottom:14 },
  phaseStepWrap:{ flex:1, alignItems:"center", gap:4, flexDirection:"column" },
  phaseLine:    { position:"absolute", left:"-50%", top:6, width:"100%", height:1.5 },
  phaseDot:     { width:12, height:12, borderRadius:6, borderWidth:1.5 },
  phaseStepLbl: { fontSize:8, letterSpacing:0.3, textAlign:"center" },

  // Stage cards
  stageCard:    { borderRadius:14, borderWidth:1.5, overflow:"hidden", marginBottom:12 },
  stageCardAccent: { height:3 },
  stageCardBody:   { padding:16, gap:6 },
  stageCardLabel:  { fontSize:10, fontFamily:"Inter_700Bold", letterSpacing:2 },
  stageCardTitle:  { fontSize:20, fontFamily:"Inter_700Bold" },
  stageCardSub:    { fontSize:12, fontFamily:"Inter_400Regular", marginBottom:4 },
  stageCardBtn:    { flexDirection:"row", alignItems:"center", justifyContent:"center",
                     gap:8, paddingVertical:12, borderRadius:10 },
  stageCardBtnTxt: { fontSize:14, fontFamily:"Inter_700Bold", color:"#fff" },

  // Champion banner
  championCard: { borderRadius:14, borderWidth:1.5, padding:16,
                  flexDirection:"row", alignItems:"center", gap:14, marginBottom:12 },
  championTrophy:  { fontSize:40 },
  championLabel:   { fontSize:10, fontFamily:"Inter_700Bold", letterSpacing:2, marginBottom:2 },
  championTeam:    { fontSize:22, fontFamily:"Inter_700Bold" },
  championSub:     { fontSize:11, fontFamily:"Inter_400Regular", marginTop:2 },

  // Draft card
  draftCard:       { borderRadius:16, borderWidth:2, overflow:"hidden", marginBottom:12 },
  draftCardGrad:   { padding:16, gap:12 },
  draftCardHeader: { flexDirection:"row", alignItems:"flex-start", justifyContent:"space-between" },
  draftCardEyebrow:{ fontSize:10, fontFamily:"Inter_700Bold", letterSpacing:2 },
  draftCardTitle:  { fontSize:24, fontFamily:"Inter_700Bold", marginTop:2 },
  draftPickBadge:  { borderRadius:10, borderWidth:1.5, padding:10, alignItems:"center", minWidth:60 },
  draftPickNum:    { fontSize:22, fontFamily:"Inter_700Bold" },
  draftPickLbl:    { fontSize:8, fontFamily:"Inter_600SemiBold", letterSpacing:1.5, marginTop:1 },
  yourTurnBanner:  { flexDirection:"row", alignItems:"center", gap:8,
                     borderRadius:8, borderWidth:1.5, paddingHorizontal:12, paddingVertical:8 },
  yourTurnText:    { fontSize:13, fontFamily:"Inter_700Bold", letterSpacing:1 },
  draftStatsRow:   { flexDirection:"row", alignItems:"center", gap:0 },
  draftStat:       { flex:1, alignItems:"center", gap:2 },
  draftStatNum:    { fontSize:28, fontFamily:"Inter_700Bold" },
  draftStatLbl:    { fontSize:8, fontFamily:"Inter_600SemiBold", letterSpacing:1.5 },
  draftStatDivider:{ width:1, height:36, marginHorizontal:4 },
  draftBtns:       { flexDirection:"row", gap:8 },
  draftCTABtn:     { flexDirection:"row", alignItems:"center", justifyContent:"center",
                     gap:8, paddingVertical:13, borderRadius:10 },
  draftCTABtnTxt:  { fontSize:15, fontFamily:"Inter_700Bold" },

  // Sim blocks
  simBlock:  { gap: 8 },
  simBtn:    { flexDirection:"row", alignItems:"center", justifyContent:"center",
               gap:10, paddingVertical:15, borderRadius:14, borderWidth:1.5 },
  simBtnTxt: { fontSize:16, fontFamily:"Inter_700Bold" },
  simSecBtn: { flexDirection:"row", alignItems:"center", justifyContent:"center",
               gap:7, paddingVertical:11, borderRadius:12, borderWidth:1 },
  simSecTxt: { fontSize:13, fontFamily:"Inter_600SemiBold" },

  advanceBtn:    { flexDirection:"row", alignItems:"center", justifyContent:"center",
                   gap:7, paddingVertical:11, borderRadius:12, borderWidth:1, marginTop:4 },
  advanceBtnTxt: { fontSize:13, fontFamily:"Inter_600SemiBold" },

  // Rookie class panel
  rookiePanel:       { borderRadius:14, borderWidth:1.5, overflow:"hidden", marginBottom:8 },
  rookiePanelHeader: { flexDirection:"row", alignItems:"center", gap:8,
                       paddingHorizontal:14, paddingVertical:10, borderBottomWidth:1, borderBottomColor:"#ffffff10" },
  rookiePanelTitle:  { fontSize:11, fontFamily:"Inter_700Bold", letterSpacing:1.5, flex:1 },
  rookiePanelCount:  { fontSize:10, fontFamily:"Inter_600SemiBold", letterSpacing:1 },
  rookieRow:         { flexDirection:"row", alignItems:"center", gap:8,
                       paddingHorizontal:12, paddingVertical:8, borderBottomWidth:StyleSheet.hairlineWidth },
  rookieRdBadge:     { borderRadius:6, borderWidth:1, paddingHorizontal:6, paddingVertical:3, alignItems:"center", minWidth:36 },
  rookieRdNum:       { fontSize:10, fontFamily:"Inter_700Bold", lineHeight:12 },
  rookieRdPick:      { fontSize:8,  fontFamily:"Inter_600SemiBold", lineHeight:10 },
  rookiePosPill:     { borderRadius:5, borderWidth:1, paddingHorizontal:6, paddingVertical:3 },
  rookiePosText:     { fontSize:10, fontFamily:"Inter_700Bold" },
  rookieName:        { fontSize:13, fontFamily:"Inter_600SemiBold" },
  rookieCollege:     { fontSize:10, fontFamily:"Inter_400Regular", maxWidth:80 },
  rookieOvrBadge:    { borderRadius:6, borderWidth:1, paddingHorizontal:7, paddingVertical:3 },
  rookieOvr:         { fontSize:12, fontFamily:"Inter_700Bold" },

  // Home nav panels (slim vertical cards for left column)
  slimPanel:  { borderRadius:14, borderWidth:1.5, padding:12,
                alignItems:"center", justifyContent:"flex-start", gap:6 },
  slimIcon:   { width:40, height:40, borderRadius:11,
                alignItems:"center", justifyContent:"center" },
  slimTitle:  { fontSize:12, fontFamily:"Inter_700Bold", textAlign:"center", lineHeight:16 },
  slimSub:    { fontSize:10, fontFamily:"Inter_600SemiBold", textAlign:"center" },

  // Draft class panel (right column)
  homePanel:      { flexDirection:"row", alignItems:"center", gap:12,
                    padding:14, borderRadius:14, borderWidth:1.5 },
  homePanelIcon:  { width:40, height:40, borderRadius:11,
                    alignItems:"center", justifyContent:"center" },
  homePanelTitle: { fontSize:13, fontFamily:"Inter_700Bold" },
  homePanelSub:   { fontSize:10, fontFamily:"Inter_400Regular", marginTop:1 },

  // Draft class rows
  dcRow:      { flexDirection:"row", alignItems:"center", gap:6,
                paddingHorizontal:10, paddingVertical:7, borderTopWidth:StyleSheet.hairlineWidth },
  dcRdBadge:  { borderRadius:5, borderWidth:1, paddingHorizontal:5, paddingVertical:2,
                alignItems:"center", minWidth:28 },
  dcPosPill:  { borderRadius:4, borderWidth:1, paddingHorizontal:5, paddingVertical:2 },
});
