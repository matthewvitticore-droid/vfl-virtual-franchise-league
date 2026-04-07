import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert, Animated, KeyboardAvoidingView, Platform, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NFLTeamBadge } from "@/components/NFLTeamBadge";
import { VFLLogo } from "@/components/VFLLogo";
import { useColors } from "@/hooks/useColors";
import { useTeamTheme } from "@/hooks/useTeamTheme";
import { useNFL } from "@/context/NFLContext";

const SEASON_KEY  = "vfl_season_v1";
const CUSTOM_KEY  = "vfl_customization_v1";
const SAVES_KEY   = "vfl_named_saves";
const GM_MODE_KEY = "vfl_gm_mode";
const MAX_SAVES   = 8;

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
  const { season, teamCustomization } = useNFL();

  const [saves,       setSaves]       = useState<SaveSlot[]>([]);
  const [showModal,   setShowModal]   = useState(false);
  const [saveName,    setSaveName]    = useState("");
  const [saving,      setSaving]      = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [gmMode,      setGmMode]      = useState<string>("solo");

  const slideAnim = useRef(new Animated.Value(80)).current;

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

  function openSaveModal() {
    const myTeam = season?.teams.find(t => t.id === season.playerTeamId);
    const week   = season?.isPlayoffs
      ? (season.playoffRound ?? "Playoffs")
      : `Wk ${season?.currentWeek ?? 1}`;
    const suggested = myTeam
      ? `${myTeam.name} · ${week} · ${season?.year ?? 2026}`
      : `My Franchise · ${season?.year ?? 2026}`;
    setSaveName(suggested);
    setShowModal(true);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
  }

  function closeModal() {
    Animated.timing(slideAnim, { toValue: 80, duration: 180, useNativeDriver: true }).start(() => setShowModal(false));
  }

  async function commitSave() {
    if (!season || !saveName.trim()) return;
    setSaving(true);
    try {
      const myTeam = season.teams.find(t => t.id === season.playerTeamId);
      const gmModeVal = await AsyncStorage.getItem(GM_MODE_KEY) ?? "solo";
      const record = myTeam
        ? `${myTeam.wins}-${myTeam.losses}${myTeam.ties ? `-${myTeam.ties}` : ""}`
        : "—";
      const weekLabel = season.isPlayoffs
        ? (season.playoffRound ?? "Playoffs")
        : `Week ${season.currentWeek ?? 1}`;

      const slot: SaveSlot = {
        id:                Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        name:              saveName.trim(),
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
        seasonData:        JSON.stringify(season),
        customizationData: teamCustomization ? JSON.stringify(teamCustomization) : null,
      };

      const existing = await AsyncStorage.getItem(SAVES_KEY);
      let slots: SaveSlot[] = [];
      if (existing) { try { slots = JSON.parse(existing); } catch {} }

      slots.unshift(slot);
      if (slots.length > MAX_SAVES) slots = slots.slice(0, MAX_SAVES);

      await AsyncStorage.setItem(SAVES_KEY, JSON.stringify(slots));
      setSaves(slots);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      closeModal();
    } catch {
      Alert.alert("Save Failed", "Could not save your franchise. Please try again.");
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
            const updated = saves.filter(s => s.id !== id);
            await AsyncStorage.setItem(SAVES_KEY, JSON.stringify(updated));
            setSaves(updated);
          },
        },
      ],
    );
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
          <View style={[
            styles.modePill,
            {
              backgroundColor: gmMode === "solo" ? colors.nflBlue + "25" : colors.nflGold + "25",
              borderColor:     gmMode === "solo" ? colors.nflBlue + "60" : colors.nflGold + "60",
            },
          ]}>
            <Feather name={gmMode === "solo" ? "lock" : "users"} size={11} color={gmMode === "solo" ? colors.nflBlue : colors.nflGold} />
            <Text style={[styles.modePillText, { color: gmMode === "solo" ? colors.nflBlue : colors.nflGold }]}>
              {gmMode === "solo" ? "SOLO" : "CO-GM"}
            </Text>
          </View>
        </View>

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
              </View>

              <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

              <TouchableOpacity
                onPress={openSaveModal}
                style={[styles.actionBtn, { backgroundColor: primary }]}
              >
                <Feather name="save" size={16} color="#fff" />
                <Text style={styles.actionBtnText}>Save Franchise Now</Text>
              </TouchableOpacity>

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

        <Text style={[styles.footer, { color: colors.mutedForeground }]}>
          Virtual Franchise League · Season {season?.year ?? 2026}
        </Text>
      </ScrollView>

      {/* ── Save Name Modal ──────────────────────────────────────────────── */}
      {showModal && (
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeModal} activeOpacity={1} />
          <Animated.View
            style={[
              styles.modalSheet,
              { backgroundColor: colors.card, borderColor: primary + "60", transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.modalHandle} />

            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Name This Save</Text>
              <TouchableOpacity onPress={closeModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <View style={[styles.inputWrap, { backgroundColor: colors.background, borderColor: primary + "60" }]}>
              <Feather name="edit-2" size={15} color={colors.mutedForeground} style={{ marginLeft: 12 }} />
              <TextInput
                value={saveName}
                onChangeText={setSaveName}
                style={[styles.nameInput, { color: colors.foreground }]}
                placeholderTextColor={colors.mutedForeground}
                placeholder="e.g. Sharks · Week 12 · 2025"
                maxLength={48}
                autoFocus
                selectTextOnFocus
                returnKeyType="done"
                onSubmitEditing={commitSave}
              />
              {saveName.length > 0 && (
                <TouchableOpacity onPress={() => setSaveName("")} style={{ padding: 10 }}>
                  <Feather name="x-circle" size={15} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity
                onPress={closeModal}
                style={[styles.cancelBtn, { borderColor: colors.border }]}
              >
                <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={commitSave}
                disabled={saving || !saveName.trim()}
                style={[styles.confirmBtn, { backgroundColor: primary, opacity: (!saveName.trim() || saving) ? 0.5 : 1 }]}
              >
                <Feather name="save" size={15} color="#fff" />
                <Text style={styles.confirmBtnText}>{saving ? "Saving…" : "Save"}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      )}
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

  // Modal
  modalOverlay:       { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  modalSheet:         { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderBottomWidth: 0, padding: 18, paddingBottom: 28, gap: 12 },
  modalHandle:        { width: 36, height: 4, borderRadius: 2, backgroundColor: "#ffffff30", alignSelf: "center", marginBottom: 2 },
  modalHeaderRow:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalTitle:         { fontSize: 19, fontFamily: "Inter_700Bold" },
  inputWrap:          { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1.5, overflow: "hidden" },
  nameInput:          { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium", paddingHorizontal: 10, paddingVertical: 12 },
  modalBtns:          { flexDirection: "row", gap: 10 },
  cancelBtn:          { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  cancelBtnText:      { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  confirmBtn:         { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12 },
  confirmBtnText:     { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
});
