import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert, Modal, Platform, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NFLTeamBadge } from "@/components/NFLTeamBadge";
import { VFLLogo } from "@/components/VFLLogo";
import { useColors } from "@/hooks/useColors";
import { useTeamTheme } from "@/hooks/useTeamTheme";
import { useNFL } from "@/context/NFLContext";

const SEASON_KEY       = "vfl_season_v1";
const CUSTOM_KEY       = "vfl_customization_v1";
const SAVE_TS_KEY      = "vfl_last_saved_ts";
const GM_MODE_KEY      = "vfl_gm_mode";

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
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
  const { season, teamCustomization } = useNFL();

  const [lastSaved,      setLastSaved]      = useState<number | null>(null);
  const [saving,         setSaving]         = useState(false);
  const [saveSuccess,    setSaveSuccess]    = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [gmMode,         setGmMode]         = useState<string>("solo");

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    AsyncStorage.getItem(SAVE_TS_KEY).then(v => { if (v) setLastSaved(Number(v)); });
    AsyncStorage.getItem(GM_MODE_KEY).then(v => { if (v) setGmMode(v); });
  }, []);

  const myTeam    = season?.teams.find(t => t.id === season.playerTeamId);
  const primary   = theme.primary;
  const record    = myTeam ? `${myTeam.wins}-${myTeam.losses}${myTeam.ties ? `-${myTeam.ties}` : ""}` : "—";
  const phase     = season?.phase ? phaseLabel(season.phase) : "—";
  const weekLabel = season?.isPlayoffs
    ? season.playoffRound ?? "Playoffs"
    : season?.currentWeek != null ? `Week ${season.currentWeek}` : "—";

  async function handleSave() {
    if (!season) return;
    setSaving(true);
    try {
      const ts = Date.now();
      await AsyncStorage.setItem(SEASON_KEY, JSON.stringify(season));
      if (teamCustomization) await AsyncStorage.setItem(CUSTOM_KEY, JSON.stringify(teamCustomization));
      await AsyncStorage.setItem(SAVE_TS_KEY, String(ts));
      setLastSaved(ts);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch {
      Alert.alert("Save Failed", "Could not save your franchise. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setShowResetModal(false);
    await AsyncStorage.multiRemove([SEASON_KEY, CUSTOM_KEY, SAVE_TS_KEY, GM_MODE_KEY, "vfl_war_room_v1"]);
    router.replace("/");
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header gradient accent */}
      <LinearGradient
        colors={[primary + "30", "transparent"]}
        style={[StyleSheet.absoluteFill, { height: topPad + 120 }]}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: Platform.OS === "web" ? 120 : 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <View style={styles.headerRow}>
          <VFLLogo size="sm" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.pageTitle, { color: colors.foreground }]}>Franchise</Text>
            <Text style={[styles.pageSub, { color: colors.mutedForeground }]}>
              {gmMode === "cogm" ? "Co-GM Mode" : gmMode === "join" ? "Joined Franchise" : "Solo GM Mode"}
            </Text>
          </View>
          <View style={[styles.modePill, { backgroundColor: gmMode === "solo" ? colors.nflBlue + "25" : colors.nflGold + "25", borderColor: gmMode === "solo" ? colors.nflBlue + "60" : colors.nflGold + "60" }]}>
            <Feather name={gmMode === "solo" ? "lock" : "users"} size={11} color={gmMode === "solo" ? colors.nflBlue : colors.nflGold} />
            <Text style={[styles.modePillText, { color: gmMode === "solo" ? colors.nflBlue : colors.nflGold }]}>
              {gmMode === "solo" ? "SOLO" : "CO-GM"}
            </Text>
          </View>
        </View>

        {/* ── Franchise info card ──────────────────────────────────────────── */}
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
              <StatCell label="PHASE"  value={phase}     color={colors.nflGold} />
              <StatCell label="WEEK"   value={weekLabel}  color={colors.foreground} />
              <StatCell label="SEASON" value={`${season.year ?? "2026"}`} color={colors.foreground} />
            </View>
          </View>
        ) : (
          <View style={[styles.noFranchiseCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="alert-circle" size={32} color={colors.mutedForeground} />
            <Text style={[styles.noFranchiseText, { color: colors.mutedForeground }]}>No franchise loaded yet.</Text>
            <TouchableOpacity onPress={() => router.replace("/")} style={[styles.goLaunchBtn, { backgroundColor: colors.nflBlue }]}>
              <Text style={styles.goLaunchBtnText}>Go to Launch Screen</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Save / Load row ──────────────────────────────────────────────── */}
        {season && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>SAVE & LOAD</Text>

            <View style={[styles.saveCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Last saved indicator */}
              <View style={styles.saveRow}>
                <View style={[styles.saveIconWrap, { backgroundColor: colors.success + "20" }]}>
                  <Feather name="clock" size={18} color={colors.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.saveTitle, { color: colors.foreground }]}>Last Saved</Text>
                  <Text style={[styles.saveSub, { color: colors.mutedForeground }]}>
                    {lastSaved ? formatRelativeTime(lastSaved) : "Auto-saved each action"}
                  </Text>
                </View>
                {saveSuccess && (
                  <View style={[styles.savedBadge, { backgroundColor: colors.success }]}>
                    <Feather name="check" size={12} color="#fff" />
                    <Text style={styles.savedBadgeText}>Saved!</Text>
                  </View>
                )}
              </View>

              <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

              {/* Save now button */}
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                style={[styles.actionBtn, { backgroundColor: primary, opacity: saving ? 0.7 : 1 }]}
              >
                <Feather name="save" size={16} color="#fff" />
                <Text style={styles.actionBtnText}>{saving ? "Saving…" : "Save Franchise Now"}</Text>
              </TouchableOpacity>

              {/* Return to launch screen */}
              <TouchableOpacity
                onPress={() => router.replace("/")}
                style={[styles.actionBtnOutline, { borderColor: colors.nflBlue + "60", backgroundColor: colors.nflBlue + "12" }]}
              >
                <Feather name="home" size={16} color={colors.nflBlue} />
                <Text style={[styles.actionBtnOutlineText, { color: colors.nflBlue }]}>Return to Launch Screen</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── Co-GM info ───────────────────────────────────────────────────── */}
        {gmMode !== "solo" && season?.inviteCode && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>CO-GM</Text>
            <View style={[styles.saveCard, { backgroundColor: colors.card, borderColor: colors.nflGold + "50" }]}>
              <View style={styles.saveRow}>
                <View style={[styles.saveIconWrap, { backgroundColor: colors.nflGold + "20" }]}>
                  <Feather name="users" size={18} color={colors.nflGold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.saveTitle, { color: colors.foreground }]}>Invite Code</Text>
                  <Text style={[styles.saveSub, { color: colors.mutedForeground }]}>Share with your co-GMs to join</Text>
                </View>
              </View>
              <View style={[styles.codeBox, { backgroundColor: colors.nflGold + "15", borderColor: colors.nflGold + "50" }]}>
                <Text style={[styles.codeText, { color: colors.nflGold }]}>{season.inviteCode}</Text>
              </View>
            </View>
          </>
        )}

        {/* ── Danger zone ─────────────────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>DANGER ZONE</Text>
        <View style={[styles.saveCard, { backgroundColor: colors.card, borderColor: colors.danger + "40" }]}>
          <View style={styles.saveRow}>
            <View style={[styles.saveIconWrap, { backgroundColor: colors.danger + "20" }]}>
              <Feather name="trash-2" size={18} color={colors.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.saveTitle, { color: colors.foreground }]}>Start New Franchise</Text>
              <Text style={[styles.saveSub, { color: colors.mutedForeground }]}>Wipes all data. Cannot be undone.</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => setShowResetModal(true)}
            style={[styles.dangerBtn, { borderColor: colors.danger + "70", backgroundColor: colors.danger + "12" }]}
          >
            <Feather name="alert-triangle" size={15} color={colors.danger} />
            <Text style={[styles.dangerBtnText, { color: colors.danger }]}>Reset & Start Over</Text>
          </TouchableOpacity>
        </View>

        {/* VFL footer */}
        <Text style={[styles.footer, { color: colors.mutedForeground }]}>Virtual Franchise League · Season {season?.year ?? 2026}</Text>
      </ScrollView>

      {/* ── Reset confirmation modal ────────────────────────────────────── */}
      <Modal visible={showResetModal} transparent animationType="fade" onRequestClose={() => setShowResetModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.danger + "60" }]}>
            <View style={[styles.modalIconWrap, { backgroundColor: colors.danger + "20" }]}>
              <Feather name="alert-triangle" size={28} color={colors.danger} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Reset Franchise?</Text>
            <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
              This will permanently delete your entire franchise — all players, games, standings, and customizations. This cannot be undone.
            </Text>
            <TouchableOpacity
              onPress={handleReset}
              style={[styles.modalDangerBtn, { backgroundColor: colors.danger }]}
            >
              <Feather name="trash-2" size={16} color="#fff" />
              <Text style={styles.modalDangerBtnText}>Yes, Reset Everything</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowResetModal(false)}
              style={[styles.modalCancelBtn, { borderColor: colors.border }]}
            >
              <Text style={[styles.modalCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function StatCell({ label, value, color }: { label: string; value: string; color: string }) {
  const colors = useColors();
  return (
    <View style={styles.statCell}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1 },
  scroll:            { paddingHorizontal: 16, gap: 12 },

  headerRow:         { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 },
  pageTitle:         { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  pageSub:           { fontSize: 12, fontFamily: "Inter_400Regular" },
  modePill:          { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  modePillText:      { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },

  sectionLabel:      { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.2, marginTop: 4 },

  franchiseCard:     { borderRadius: 16, borderWidth: 1.5, padding: 16, overflow: "hidden", gap: 14 },
  cardTop:           { flexDirection: "row", alignItems: "center", gap: 12 },
  teamCity:          { fontSize: 11, fontFamily: "Inter_400Regular" },
  teamName:          { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  teamAbbr:          { fontSize: 13, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  recordBlock:       { alignItems: "center" },
  recordMain:        { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  recordLabel:       { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  cardDivider:       { height: 1, marginVertical: 2 },
  cardStats:         { flexDirection: "row", justifyContent: "space-around" },
  statCell:          { alignItems: "center", gap: 2 },
  statValue:         { fontSize: 15, fontFamily: "Inter_700Bold" },
  statLabel:         { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1 },

  noFranchiseCard:   { borderRadius: 16, borderWidth: 1, padding: 32, alignItems: "center", gap: 12 },
  noFranchiseText:   { fontSize: 14, fontFamily: "Inter_400Regular" },
  goLaunchBtn:       { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  goLaunchBtnText:   { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },

  saveCard:          { borderRadius: 14, borderWidth: 1, padding: 14, gap: 12 },
  saveRow:           { flexDirection: "row", alignItems: "center", gap: 12 },
  saveIconWrap:      { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  saveTitle:         { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  saveSub:           { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  savedBadge:        { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  savedBadgeText:    { fontSize: 11, fontFamily: "Inter_700Bold", color: "#fff" },

  actionBtn:         { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12 },
  actionBtnText:     { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
  actionBtnOutline:  { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5 },
  actionBtnOutlineText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },

  codeBox:           { borderRadius: 12, borderWidth: 1, paddingVertical: 14, alignItems: "center" },
  codeText:          { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: 10 },

  dangerBtn:         { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5 },
  dangerBtnText:     { fontSize: 15, fontFamily: "Inter_600SemiBold" },

  footer:            { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 8 },

  modalOverlay:      { flex: 1, backgroundColor: "rgba(0,0,0,0.72)", alignItems: "center", justifyContent: "center", padding: 32 },
  modalBox:          { borderRadius: 20, borderWidth: 1.5, padding: 24, gap: 14, width: "100%", alignItems: "center" },
  modalIconWrap:     { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  modalTitle:        { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  modalSub:          { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  modalDangerBtn:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, width: "100%" },
  modalDangerBtnText:{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
  modalCancelBtn:    { paddingVertical: 12, borderRadius: 14, borderWidth: 1, width: "100%", alignItems: "center" },
  modalCancelText:   { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
