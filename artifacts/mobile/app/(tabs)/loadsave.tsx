import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react"; // useRef kept for ScrollView ref
import {
  Alert, Platform, ScrollView, Share, StyleSheet,
  Text, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NFLTeamBadge } from "@/components/NFLTeamBadge";
import { VFLLogo } from "@/components/VFLLogo";
import { CoGMMeetingRoom } from "@/components/CoGMMeetingRoom";
import { useColors } from "@/hooks/useColors";
import { useTeamTheme } from "@/hooks/useTeamTheme";
import { useNFL } from "@/context/NFLContext";
import { useAuth } from "@/context/AuthContext";
import { bigSet, bigGet, bigDelete } from "@/utils/bigStorage";
import { supabase } from "@/lib/supabase";

const SEASON_KEY  = "vfl_season_v1";
const CUSTOM_KEY  = "vfl_customization_v1";
const SAVES_KEY   = "vfl_named_saves";
const GM_MODE_KEY = "vfl_gm_mode";
const MAX_SAVES   = 8;

function saveDataKey(id: string) { return `vfl_save_data_${id}`; }

// Strip heavyweight data that isn't needed to restore game state.
// Play-by-play on completed games is the biggest offender (100-200 events × 256 games).
function stripSeasonForSave(season: any): any {
  return {
    ...season,
    // Remove play-by-play + drives from every completed game (score + team stats kept)
    games: (season.games ?? []).map((g: any) => ({
      ...g,
      plays:  [],
      drives: [],
    })),
    // Keep only last 2 seasons of career stats per player — trims historical bloat
    teams: (season.teams ?? []).map((t: any) => ({
      ...t,
      roster: (t.roster ?? []).map((p: any) => ({
        ...p,
        careerStats: (p.careerStats ?? []).slice(-2),
      })),
    })),
    freeAgents: (season.freeAgents ?? []).map((p: any) => ({
      ...p,
      careerStats: (p.careerStats ?? []).slice(-2),
    })),
    // Keep only the 50 most recent news items
    news: (season.news ?? []).slice(0, 50),
    // Strip combine + college stats from already-drafted prospects (not needed post-draft)
    draftProspects: (season.draftProspects ?? []).map((dp: any) =>
      dp.isPickedUp
        ? { id: dp.id, name: dp.name, position: dp.position, isPickedUp: dp.isPickedUp, pickedByTeamId: dp.pickedByTeamId }
        : dp
    ),
  };
}

export interface SaveSlot {
  id: string;
  name: string;
  savedAt: number;
  teamAbbr: string;
  teamName: string;
  teamCity: string;
  teamPrimary: string;
  teamSecondary: string;
  record: string;
  phase: string;
  weekLabel: string;
  year: number;
  gmMode: string;
  seasonData: string;
  customizationData: string | null;
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

function phaseLabel(phase: string): string {
  const map: Record<string, string> = {
    regular:    "Regular Season",
    playoffs:   "Playoffs",
    offseason:  "Offseason",
    freeAgency: "Free Agency",
    draft:      "Draft",
    preseason:  "Preseason",
  };
  return map[phase] ?? phase;
}

export default function LoadSaveScreen() {
  const colors = useColors();
  const theme  = useTeamTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { season, teamCustomization, isCoGMMode, pendingProposals } = useNFL();
  const { membership, user } = useAuth();

  const [saves,       setSaves]       = useState<SaveSlot[]>([]);
  const [saving,      setSaving]      = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError,   setSaveError]   = useState<string | null>(null);
  const [gmMode,      setGmMode]      = useState<string>("solo");
  const [activeView,  setActiveView]  = useState<"franchise" | "meeting">("meeting");
  const [syncing,     setSyncing]     = useState(false);
  const [syncMsg,     setSyncMsg]     = useState<string | null>(null);

  // Accept both spellings + Supabase membership as signal of co-GM mode
  const isCoGM = isCoGMMode || gmMode === "co-gm" || gmMode === "cogm" || gmMode === "join" || !!membership;

  const scrollRef = useRef<ScrollView>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    AsyncStorage.getItem(GM_MODE_KEY).then(v => { if (v) setGmMode(v); });
    loadSaves();
  }, []);

  async function loadSaves() {
    const raw = await AsyncStorage.getItem(SAVES_KEY);
    if (raw) {
      try { setSaves(JSON.parse(raw)); } catch {}
    }
  }

  async function handleInstantSave() {
    console.log("[VFL] Save tapped — season:", !!season, "saving:", saving);
    if (!season) {
      Alert.alert("No Active Franchise", "Load or start a franchise first.\n\nMake sure you have a franchise running before saving.");
      return;
    }
    if (saving) return;
    setSaving(true);
    console.log("[VFL] Starting save for season year:", season.year, "teams:", season.teams?.length);
    try {
      const myTeam    = season.teams.find(t => t.id === season.playerTeamId);
      const gmModeVal = await AsyncStorage.getItem(GM_MODE_KEY) ?? "solo";
      const record    = myTeam
        ? `${myTeam.wins}-${myTeam.losses}${myTeam.ties ? `-${myTeam.ties}` : ""}`
        : "—";
      const weekLabel = season.isPlayoffs
        ? (season.playoffRound ?? "Playoffs")
        : `Week ${season.currentWeek ?? 1}`;
      const autoName  = myTeam
        ? `${myTeam.name} · ${weekLabel} · ${season.year ?? 2026}`
        : `Franchise · ${season.year ?? 2026}`;

      const slotId = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

      // Strip bulky play-by-play data before storing (each game has 150+ events — too large)
      const leanSeason = stripSeasonForSave(season);

      // Store season data in IndexedDB (web) / AsyncStorage (native) — no 5 MB quota limit
      await bigSet(
        saveDataKey(slotId),
        JSON.stringify({
          seasonData:        JSON.stringify(leanSeason),
          customizationData: teamCustomization ? JSON.stringify(teamCustomization) : null,
        }),
      );

      const slot: SaveSlot = {
        id:                slotId,
        name:              autoName,
        savedAt:           Date.now(),
        teamAbbr:          myTeam?.abbreviation ?? "???",
        teamName:          myTeam ? `${myTeam.city} ${myTeam.name}` : "Unknown Team",
        teamCity:          myTeam?.city ?? "",
        teamPrimary:       myTeam?.primaryColor ?? colors.nflBlue,
        teamSecondary:     myTeam?.secondaryColor ?? "#ffffff",
        record,
        phase:             season.phase ? phaseLabel(season.phase) : "—",
        weekLabel,
        year:              season.year ?? 2026,
        gmMode:            gmModeVal,
        seasonData:        "",          // data lives in saveDataKey(slotId)
        customizationData: null,
      };

      const existing = await AsyncStorage.getItem(SAVES_KEY);
      let slots: SaveSlot[] = [];
      if (existing) { try { slots = JSON.parse(existing); } catch {} }
      slots.unshift(slot);
      if (slots.length > MAX_SAVES) {
        // Clean up data keys for evicted slots
        const evicted = slots.slice(MAX_SAVES);
        for (const ev of evicted) {
          await bigDelete(saveDataKey(ev.id));
        }
        slots = slots.slice(0, MAX_SAVES);
      }

      await AsyncStorage.setItem(SAVES_KEY, JSON.stringify(slots));
      console.log("[VFL] Save complete:", slotId, autoName);
      setSaves(slots);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error("[VFL] Save FAILED:", e);
      const msg = String(e).replace("Error: ", "");
      setSaveError(msg);
      setTimeout(() => setSaveError(null), 6000);
    } finally {
      setSaving(false);
    }
  }

  async function deleteSlot(id: string) {
    Alert.alert(
      "Delete Save?",
      "This save slot will be permanently deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete", style: "destructive",
          onPress: async () => {
            await bigDelete(saveDataKey(id));
            const updated = saves.filter(s => s.id !== id);
            await AsyncStorage.setItem(SAVES_KEY, JSON.stringify(updated));
            setSaves(updated);
          },
        },
      ],
    );
  }

  async function handlePushToCloud() {
    if (!season || !membership?.franchiseId) return;
    setSyncing(true); setSyncMsg(null);
    try {
      const { error } = await supabase
        .from("franchise_state")
        .upsert(
          { franchise_id: membership.franchiseId, state_json: season, updated_by: user?.id },
          { onConflict: "franchise_id" }
        );
      setSyncMsg(error ? "Push failed — check connection" : "State pushed to cloud!");
    } catch { setSyncMsg("Push failed"); }
    setSyncing(false);
    setTimeout(() => setSyncMsg(null), 3500);
  }

  async function handlePullFromCloud() {
    if (!membership?.franchiseId) return;
    setSyncing(true); setSyncMsg(null);
    try {
      const { data, error } = await supabase
        .from("franchise_state")
        .select("state_json")
        .eq("franchise_id", membership.franchiseId)
        .maybeSingle();
      if (!error && data?.state_json) {
        await bigSet("vfl_season_v1", data.state_json);
        setSyncMsg("Pulled! Loading fresh state…");
        setTimeout(() => router.replace("/(tabs)"), 900);
      } else {
        setSyncMsg("No cloud state found yet. Ask your GM to push first.");
      }
    } catch { setSyncMsg("Pull failed"); }
    setSyncing(false);
    setTimeout(() => setSyncMsg(null), 4500);
  }

  function handleReturnToLaunch() {
    router.replace("/launch");
  }

  const myTeam  = season?.teams.find(t => t.id === season.playerTeamId);
  const primary = theme.primary;
  const record  = myTeam
    ? `${myTeam.wins}-${myTeam.losses}${myTeam.ties ? `-${myTeam.ties}` : ""}`
    : "—";
  const phase     = season?.phase ? phaseLabel(season.phase) : "—";
  const weekLabel = season?.isPlayoffs
    ? (season.playoffRound ?? "Playoffs")
    : season?.currentWeek != null ? `Week ${season.currentWeek}` : "—";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[primary + "30", "transparent"]}
        style={[StyleSheet.absoluteFill, { height: topPad + 120 }]}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
      />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: Platform.OS === "web" ? 120 : 110 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <View style={styles.headerRow}>
          <VFLLogo size="sm" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.pageTitle, { color: colors.foreground }]}>Franchise</Text>
            <Text style={[styles.pageSub, { color: colors.mutedForeground }]}>
              {isCoGM ? "Co-GM Mode" : "Solo GM Mode"}
            </Text>
          </View>
          <View style={[
            styles.modePill,
            {
              backgroundColor: isCoGM ? colors.nflGold + "25" : colors.nflBlue + "25",
              borderColor:     isCoGM ? colors.nflGold + "60" : colors.nflBlue + "60",
            },
          ]}>
            <Feather name={isCoGM ? "users" : "lock"} size={11} color={isCoGM ? colors.nflGold : colors.nflBlue} />
            <Text style={[styles.modePillText, { color: isCoGM ? colors.nflGold : colors.nflBlue }]}>
              {isCoGM ? "CO-GM" : "SOLO"}
            </Text>
          </View>
        </View>

        {/* ── Co-GM Tab Switcher ─────────────────────────────────────────── */}
        {isCoGM && (
          <View style={styles.cogmTabRow}>
            {([
              { key: "meeting", label: "Meeting Room", icon: "users" as const },
              { key: "franchise", label: "Saves",        icon: "save" as const },
            ] as const).map(tab => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveView(tab.key)}
                style={[styles.cogmTab, {
                  backgroundColor: activeView === tab.key ? primary : primary + "18",
                  borderColor:     activeView === tab.key ? primary : primary + "35",
                }]}
              >
                <Feather name={tab.icon} size={13} color={activeView === tab.key ? "#fff" : "rgba(255,255,255,0.55)"} />
                <Text style={[styles.cogmTabText, { color: activeView === tab.key ? "#fff" : "rgba(255,255,255,0.55)" }]}>
                  {tab.label}
                </Text>
                {tab.key === "meeting" && pendingProposals.length > 0 && (
                  <View style={[styles.cogmBadge, { backgroundColor: activeView === "meeting" ? "#fff" : primary }]}>
                    <Text style={[styles.cogmBadgeText, { color: activeView === "meeting" ? primary : "#fff" }]}>
                      {pendingProposals.length}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Meeting Room (Co-GM only) ─────────────────────────────────── */}
        {isCoGM && activeView === "meeting" && <CoGMMeetingRoom />}

        {/* ── Below only shown in franchise (save/load) view ─────────────── */}
        {(!isCoGM || activeView === "franchise") && <>

        {/* ── Active franchise card ────────────────────────────────────────── */}
        {season && myTeam ? (
          <View style={[styles.franchiseCard, { backgroundColor: colors.card, borderColor: primary + "50" }]}>
            <LinearGradient
              colors={[primary + "20", "transparent"]}
              style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            />
            <View style={styles.cardTop}>
              <NFLTeamBadge abbreviation={myTeam.abbreviation} primaryColor={myTeam.primaryColor} size="lg" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.teamCity, { color: colors.mutedForeground }]}>{myTeam.city}</Text>
                <Text style={[styles.teamName, { color: colors.foreground }]}>{myTeam.name}</Text>
                <Text style={[styles.teamAbbr, { color: primary }]}>{myTeam.abbreviation}</Text>
              </View>
              <View style={styles.recordBlock}>
                <Text style={[styles.recordMain, { color: colors.foreground }]}>{record}</Text>
                <Text style={[styles.recordLabel, { color: colors.mutedForeground }]}>RECORD</Text>
              </View>
            </View>
            <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />
            <View style={styles.cardStats}>
              <StatCell label="PHASE"  value={phase}                      color={colors.nflGold}   />
              <StatCell label="WEEK"   value={weekLabel}                  color={colors.foreground} />
              <StatCell label="SEASON" value={`${season.year ?? "2026"}`} color={colors.foreground} />
            </View>
          </View>
        ) : (
          <View style={[styles.noFranchiseCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="alert-circle" size={32} color={colors.mutedForeground} />
            <Text style={[styles.noFranchiseText, { color: colors.mutedForeground }]}>No franchise loaded yet.</Text>
            <TouchableOpacity onPress={handleReturnToLaunch} style={[styles.goLaunchBtn, { backgroundColor: colors.nflBlue }]}>
              <Text style={styles.goLaunchBtnText}>Go to Launch Screen</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Save actions ─────────────────────────────────────────────────── */}
        {season && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>SAVE & LOAD</Text>

            <View style={[styles.saveCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.saveRow}>
                <View style={[styles.saveIconWrap, { backgroundColor: colors.success + "20" }]}>
                  <Feather name="save" size={18} color={colors.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.saveTitle, { color: colors.foreground }]}>Save Franchise</Text>
                  <Text style={[styles.saveSub, { color: colors.mutedForeground }]}>
                    Name your save — load it precisely later from the launch screen
                  </Text>
                </View>
                {saveSuccess && (
                  <View style={[styles.savedBadge, { backgroundColor: colors.success }]}>
                    <Feather name="check" size={12} color="#fff" />
                    <Text style={styles.savedBadgeText}>Saved!</Text>
                  </View>
                )}
                {saveError && (
                  <View style={[styles.savedBadge, { backgroundColor: "#C8102E" }]}>
                    <Feather name="alert-circle" size={12} color="#fff" />
                    <Text style={styles.savedBadgeText}>Error</Text>
                  </View>
                )}
              </View>

              <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

              <TouchableOpacity
                onPress={handleInstantSave}
                disabled={saving}
                activeOpacity={0.7}
                style={[styles.actionBtn, { backgroundColor: primary, opacity: saving ? 0.6 : 1 }]}
              >
                <Feather name="save" size={16} color="#fff" />
                <Text style={styles.actionBtnText}>{saving ? "Saving…" : "Save Franchise Now"}</Text>
              </TouchableOpacity>

              {saveError && (
                <View style={{ backgroundColor: "#C8102E20", borderRadius: 8, padding: 10, marginTop: 6, borderWidth: 1, borderColor: "#C8102E50" }}>
                  <Text style={{ color: "#C8102E", fontSize: 12, fontFamily: "Inter_400Regular" }}>{saveError}</Text>
                </View>
              )}

              {/* ── Co-GM Cloud Sync ─────────────────────────────────────── */}
              {isCoGM && membership && (
                <>
                  <View style={[styles.cardDivider, { backgroundColor: "#10B98130", marginVertical: 10 }]} />
                  <Text style={{ color: "#10B981", fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 0.8, marginBottom: 6 }}>
                    CO-GM CLOUD SYNC
                  </Text>

                  <TouchableOpacity
                    onPress={handlePushToCloud}
                    disabled={syncing || !season}
                    style={[styles.actionBtn, { backgroundColor: "#10B981", opacity: syncing || !season ? 0.55 : 1 }]}
                  >
                    <Feather name="upload-cloud" size={16} color="#fff" />
                    <Text style={styles.actionBtnText}>{syncing ? "Syncing…" : "Push State to Cloud"}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handlePullFromCloud}
                    disabled={syncing}
                    style={[styles.actionBtnOutline, { borderColor: "#10B98160", backgroundColor: "#10B98112", marginTop: 8, opacity: syncing ? 0.55 : 1 }]}
                  >
                    <Feather name="download-cloud" size={16} color="#10B981" />
                    <Text style={[styles.actionBtnOutlineText, { color: "#10B981" }]}>Pull Latest from Cloud</Text>
                  </TouchableOpacity>

                  {syncMsg && (
                    <View style={{ backgroundColor: "#10B98118", borderRadius: 8, padding: 10, marginTop: 6, borderWidth: 1, borderColor: "#10B98140" }}>
                      <Text style={{ color: "#10B981", fontSize: 12, fontFamily: "Inter_400Regular" }}>{syncMsg}</Text>
                    </View>
                  )}
                </>
              )}

              <TouchableOpacity
                onPress={handleReturnToLaunch}
                style={[styles.actionBtnOutline, { borderColor: colors.nflBlue + "60", backgroundColor: colors.nflBlue + "12" }]}
              >
                <Feather name="home" size={16} color={colors.nflBlue} />
                <Text style={[styles.actionBtnOutlineText, { color: colors.nflBlue }]}>Return to Launch Screen</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── Named saves list ─────────────────────────────────────────────── */}
        {saves.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>SAVE SLOTS ({saves.length}/{MAX_SAVES})</Text>
            {saves.map((slot, idx) => (
              <SaveSlotCard
                key={slot.id}
                slot={slot}
                idx={idx}
                colors={colors}
                onDelete={() => deleteSlot(slot.id)}
              />
            ))}
          </>
        )}

        {/* ── Co-GM invite code ────────────────────────────────────────────── */}
        {gmMode !== "solo" && season?.inviteCode && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>INVITE CO-GMs</Text>
            <View style={[styles.saveCard, { backgroundColor: colors.card, borderColor: colors.nflGold + "50" }]}>
              <View style={styles.saveRow}>
                <View style={[styles.saveIconWrap, { backgroundColor: colors.nflGold + "20" }]}>
                  <Feather name="users" size={18} color={colors.nflGold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.saveTitle, { color: colors.foreground }]}>Franchise Invite Code</Text>
                  <Text style={[styles.saveSub, { color: colors.mutedForeground }]}>Send to a friend — they enter it in the VFL app</Text>
                </View>
              </View>
              <View style={[styles.codeBox, { backgroundColor: colors.nflGold + "15", borderColor: colors.nflGold + "50" }]}>
                <Text style={[styles.codeText, { color: colors.nflGold }]}>{season.inviteCode}</Text>
              </View>
              <TouchableOpacity
                onPress={async () => {
                  try {
                    await Share.share({
                      message: `🏈 Join my VFL franchise as a Co-GM!\n\nOpen the VFL app → Franchise → Join with Code → enter:\n\n${season.inviteCode}\n\nSee you in the war room!`,
                      title: "VFL Franchise Invite",
                    });
                  } catch {}
                }}
                style={[styles.actionBtn, { backgroundColor: colors.nflGold, marginTop: 8 }]}
                activeOpacity={0.8}
              >
                <Feather name="share-2" size={16} color="#000" />
                <Text style={[styles.actionBtnText, { color: "#000" }]}>Send Invite via iMessage / Email…</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <Text style={[styles.footer, { color: colors.mutedForeground }]}>
          Virtual Franchise League · Season {season?.year ?? 2026}
        </Text>
        </>}
      </ScrollView>


    </View>
  );
}

// ─── SaveSlotCard ─────────────────────────────────────────────────────────────

function SaveSlotCard({ slot, idx, colors, onDelete }: {
  slot: SaveSlot; idx: number; colors: any; onDelete: () => void;
}) {
  return (
    <View style={[styles.slotCard, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: slot.teamPrimary }]}>
      <View style={styles.slotTop}>
        <View style={[styles.slotNumBadge, { backgroundColor: slot.teamPrimary + "25" }]}>
          <Text style={[styles.slotNum, { color: slot.teamPrimary }]}>{idx + 1}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.slotName, { color: colors.foreground }]} numberOfLines={1}>{slot.name}</Text>
          <Text style={[styles.slotMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
            {slot.teamName} · {slot.record} · {slot.phase}
          </Text>
        </View>
        <TouchableOpacity onPress={onDelete} style={styles.deleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="trash-2" size={14} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>
      <View style={styles.slotBottom}>
        <View style={[styles.slotTimePill, { backgroundColor: colors.background }]}>
          <Feather name="clock" size={10} color={colors.mutedForeground} />
          <Text style={[styles.slotTime, { color: colors.mutedForeground }]}>{formatRelativeTime(slot.savedAt)}</Text>
        </View>
        <View style={[styles.slotWeekPill, { backgroundColor: colors.nflGold + "15", borderColor: colors.nflGold + "50" }]}>
          <Text style={[styles.slotWeekText, { color: colors.nflGold }]}>{slot.weekLabel} · {slot.year}</Text>
        </View>
        <View style={[styles.slotGmPill, { backgroundColor: slot.gmMode === "solo" ? colors.nflBlue + "15" : colors.success + "15" }]}>
          <Text style={[styles.slotGmText, { color: slot.gmMode === "solo" ? colors.nflBlue : colors.success }]}>
            {slot.gmMode === "solo" ? "SOLO" : "CO-GM"}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatCell({ label, value, color }: { label: string; value: string; color: string }) {
  const colors = useColors();
  return (
    <View style={styles.statCell}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:          { flex: 1 },
  scroll:             { paddingHorizontal: 16, gap: 12 },

  headerRow:          { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 },
  pageTitle:          { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  pageSub:            { fontSize: 12, fontFamily: "Inter_400Regular" },
  modePill:           { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  modePillText:       { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },

  sectionLabel:       { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.2, marginTop: 4 },

  franchiseCard:      { borderRadius: 16, borderWidth: 1.5, padding: 16, overflow: "hidden", gap: 14 },
  cardTop:            { flexDirection: "row", alignItems: "center", gap: 12 },
  teamCity:           { fontSize: 11, fontFamily: "Inter_400Regular" },
  teamName:           { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  teamAbbr:           { fontSize: 13, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  recordBlock:        { alignItems: "center" },
  recordMain:         { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  recordLabel:        { fontSize: 9,  fontFamily: "Inter_700Bold", letterSpacing: 1 },
  cardDivider:        { height: 1, marginVertical: 2 },
  cardStats:          { flexDirection: "row", justifyContent: "space-around" },
  statCell:           { alignItems: "center", gap: 2 },
  statValue:          { fontSize: 15, fontFamily: "Inter_700Bold" },
  statLabel:          { fontSize: 9,  fontFamily: "Inter_700Bold", letterSpacing: 1 },

  noFranchiseCard:    { borderRadius: 16, borderWidth: 1, padding: 32, alignItems: "center", gap: 12 },
  noFranchiseText:    { fontSize: 14, fontFamily: "Inter_400Regular" },
  goLaunchBtn:        { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  goLaunchBtnText:    { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },

  saveCard:           { borderRadius: 14, borderWidth: 1, padding: 14, gap: 12 },
  saveRow:            { flexDirection: "row", alignItems: "center", gap: 12 },
  saveIconWrap:       { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  saveTitle:          { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  saveSub:            { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 16 },
  savedBadge:         { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  savedBadgeText:     { fontSize: 11, fontFamily: "Inter_700Bold", color: "#fff" },

  actionBtn:          { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12 },
  actionBtnText:      { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
  actionBtnOutline:   { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5 },
  actionBtnOutlineText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },

  // Save slots
  slotCard:           { borderRadius: 12, borderWidth: 1, borderLeftWidth: 4, padding: 12, gap: 8 },
  slotTop:            { flexDirection: "row", alignItems: "center", gap: 10 },
  slotNumBadge:       { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  slotNum:            { fontSize: 13, fontFamily: "Inter_700Bold" },
  slotName:           { fontSize: 14, fontFamily: "Inter_700Bold" },
  slotMeta:           { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  deleteBtn:          { padding: 4 },
  slotBottom:         { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  slotTimePill:       { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  slotTime:           { fontSize: 10, fontFamily: "Inter_400Regular" },
  slotWeekPill:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  slotWeekText:       { fontSize: 10, fontFamily: "Inter_700Bold" },
  slotGmPill:         { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  slotGmText:         { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },

  codeBox:            { borderRadius: 12, borderWidth: 1, paddingVertical: 14, alignItems: "center" },
  codeText:           { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: 10 },

  footer:             { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 8 },

  cogmTabRow:         { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  cogmTab:            { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7,
                        paddingVertical: 10, borderRadius: 14, borderWidth: 1 },
  cogmTabText:        { fontFamily: "Inter_700Bold", fontSize: 13, letterSpacing: 0.2 },
  cogmBadge:          { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, minWidth: 18, alignItems: "center" },
  cogmBadgeText:      { fontFamily: "Inter_700Bold", fontSize: 10 },

  // Modal
  modalOverlay:       { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  modalSheet:         { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderBottomWidth: 0, padding: 18, paddingBottom: 28, gap: 12 },
  modalHandle:        { width: 36, height: 4, borderRadius: 2, backgroundColor: "#ffffff30", alignSelf: "center", marginBottom: 2 },
  modalHeaderRow:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalTitle:         { fontSize: 19, fontFamily: "Inter_700Bold" },
  inputWrap:          { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1.5, overflow: "hidden" },
  nameInput:          { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium", paddingHorizontal: 10, paddingVertical: 12 },
  inlineNaming:       { gap: 10, paddingTop: 4 },
  modalBtns:          { flexDirection: "row", gap: 10 },
  cancelBtn:          { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  cancelBtnText:      { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  confirmBtn:         { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12 },
  confirmBtnText:     { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
});
