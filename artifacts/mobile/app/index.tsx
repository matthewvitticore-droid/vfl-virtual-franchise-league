import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert, Animated, Dimensions, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { VFLLogo } from "@/components/VFLLogo";
import { bigGet } from "@/utils/bigStorage";

// ─── Brand ─────────────────────────────────────────────────────────────────────
const VFL_RED  = "#C8102E";
const VFL_BLUE = "#003087";
const VFL_DARK = "#050E1C";
const VFL_NAVY = "#07182E";
const CARD_BG  = "#0C1C30";
const BORDER   = "#1A3050";

// ─── 32 VFL Teams ──────────────────────────────────────────────────────────────
const TEAMS = [
  // Ironclad — East
  { city:"Hartford",      name:"Sentinels",    abbr:"HRT", primary:"#1B3462", secondary:"#9CA3AF" },
  { city:"Providence",    name:"Storm",         abbr:"PVS", primary:"#7F1D1D", secondary:"#374151" },
  { city:"Burlington",    name:"Frost",         abbr:"BLF", primary:"#1E3A8A", secondary:"#BFDBFE" },
  { city:"Albany",        name:"Forge",         abbr:"ALF", primary:"#1C2833", secondary:"#D97706" },
  // Ironclad — North
  { city:"Syracuse",      name:"Stallions",     abbr:"SYS", primary:"#4527A0", secondary:"#FFC107" },
  { city:"Pittsburgh",    name:"Ironmen",       abbr:"PMN", primary:"#374151", secondary:"#FFC107" },
  { city:"Columbus",      name:"Knights",       abbr:"CKN", primary:"#7F1D1D", secondary:"#9CA3AF" },
  { city:"Cleveland",     name:"Foundry",       abbr:"CLD", primary:"#92400E", secondary:"#6B7280" },
  // Ironclad — South
  { city:"Nashville",     name:"Desperados",    abbr:"NVD", primary:"#111827", secondary:"#D97706" },
  { city:"Memphis",       name:"Blaze",         abbr:"MBZ", primary:"#C2410C", secondary:"#1F2937" },
  { city:"Birmingham",    name:"Bolt",          abbr:"BBT", primary:"#6B21A8", secondary:"#6B7280" },
  { city:"Chattanooga",   name:"Thunder",       abbr:"CTR", primary:"#065F46", secondary:"#B45309" },
  // Ironclad — West
  { city:"Denver",        name:"Peaks",         abbr:"DVP", primary:"#3730A3", secondary:"#FBBF24" },
  { city:"Coastal",       name:"Sharks",        abbr:"CSH", primary:"#CF2027", secondary:"#003087" },
  { city:"Salt Lake",     name:"Blizzard",      abbr:"SLB", primary:"#1E3A8A", secondary:"#E0F2FE" },
  { city:"Sacramento",    name:"Miners",        abbr:"SMN", primary:"#D97706", secondary:"#111827" },
  // Gridiron — East
  { city:"Raleigh",       name:"Thunderhawks",  abbr:"RTH", primary:"#6B1B3C", secondary:"#374151" },
  { city:"Richmond",      name:"Cavalry",       abbr:"RCV", primary:"#1E3A8A", secondary:"#991B1B" },
  { city:"Annapolis",     name:"Corsairs",      abbr:"ACS", primary:"#0C2340", secondary:"#C41230" },
  { city:"Charlotte",     name:"Vipers",        abbr:"CHV", primary:"#4B1994", secondary:"#65A30D" },
  // Gridiron — North
  { city:"Rockford",      name:"Blaze",         abbr:"RBZ", primary:"#C2410C", secondary:"#111827" },
  { city:"Milwaukee",     name:"Wolves",        abbr:"MWW", primary:"#14532D", secondary:"#9CA3AF" },
  { city:"Madison",       name:"Ice",           abbr:"MDI", primary:"#1E40AF", secondary:"#E0F2FE" },
  { city:"Grand Rapids",  name:"Fury",          abbr:"GRF", primary:"#4E0B2A", secondary:"#FBBF24" },
  // Gridiron — South
  { city:"Savannah",      name:"Marshmen",      abbr:"SVT", primary:"#0F4C35", secondary:"#FBBF24" },
  { city:"Baton Rouge",   name:"Bayou",         abbr:"BRB", primary:"#4B1994", secondary:"#FBBF24" },
  { city:"Tampa",         name:"Surge",         abbr:"TSG", primary:"#991B1B", secondary:"#6B7280" },
  { city:"Orlando",       name:"Storm",         abbr:"ORS", primary:"#0C2340", secondary:"#0369A1" },
  // Gridiron — West
  { city:"Portland",      name:"Lumberjacks",   abbr:"PLJ", primary:"#14532D", secondary:"#991B1B" },
  { city:"Seattle",       name:"Cascade",       abbr:"SCS", primary:"#1E3A8A", secondary:"#166534" },
  { city:"San Francisco", name:"Fog",           abbr:"SFF", primary:"#B45309", secondary:"#7F1D1D" },
  { city:"Los Angeles",   name:"Surf",          abbr:"LAS", primary:"#0E7490", secondary:"#EA580C" },
];

const SEASON_KEY = "vfl_season_v1";
const CUSTOM_KEY = "vfl_customization_v1";
const SAVES_KEY  = "vfl_named_saves";

function saveDataKey(id: string) { return `vfl_save_data_${id}`; }

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

function genInviteCode(): string {
  const digits = Math.floor(100 + Math.random() * 900);
  const chars  = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const trio   = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `VFL-${digits}-${trio}`;
}

type Mode = "solo" | "cogm" | "join";
type View = "saves" | "create";

const MODES: { key: Mode; icon: string; label: string }[] = [
  { key: "solo",  icon: "lock",      label: "Solo GM"        },
  { key: "cogm",  icon: "users",     label: "Co-GM"          },
  { key: "join",  icon: "user-plus", label: "Join Franchise" },
];

export default function LaunchScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { width: SW } = Dimensions.get("window");

  const [saves,       setSaves]       = useState<SaveSlot[]>([]);
  const [legacySave,  setLegacySave]  = useState(false); // old vfl_season_v1 with no name
  const [activeView,  setActiveView]  = useState<View>("saves");
  const [mode,        setMode]        = useState<Mode>("solo");
  const [inviteCode,  setInviteCode]  = useState(genInviteCode);
  const [joinInput,   setJoinInput]   = useState("");
  const [teamIdx,     setTeamIdx]     = useState(13);
  const [pickerOpen,  setPickerOpen]  = useState(false);
  const [loading,     setLoading]     = useState<string | null>(null);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(SAVES_KEY),
      AsyncStorage.getItem(SEASON_KEY),
    ]).then(([rawSaves, rawSeason]) => {
      let slots: SaveSlot[] = [];
      if (rawSaves) { try { slots = JSON.parse(rawSaves); } catch {} }
      setSaves(slots);
      // If there's an old auto-save but no named saves, show legacy option
      if (rawSeason && slots.length === 0) setLegacySave(true);
      // Default view: saves if any exist, create if none
      setActiveView(slots.length > 0 || rawSeason ? "saves" : "create");
    });

    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, delay: 100, useNativeDriver: true }),
    ]).start();
  }, []);

  async function handleLoadSlot(slot: SaveSlot) {
    setLoading(slot.id);
    try {
      // Season data is stored in a separate key to avoid localStorage size limits.
      // Fall back to inline seasonData for any saves made before this change.
      let seasonData     = slot.seasonData;
      let customData     = slot.customizationData;

      const dataRaw = await bigGet(saveDataKey(slot.id));
      if (dataRaw) {
        try {
          const parsed = JSON.parse(dataRaw);
          if (parsed.seasonData)        seasonData = parsed.seasonData;
          if (parsed.customizationData != null) customData = parsed.customizationData;
        } catch {}
      }

      if (!seasonData) throw new Error("No season data found for this save.");

      await AsyncStorage.setItem(SEASON_KEY, seasonData);
      if (customData) {
        await AsyncStorage.setItem(CUSTOM_KEY, customData);
      } else {
        await AsyncStorage.removeItem(CUSTOM_KEY);
      }
      await AsyncStorage.setItem("vfl_gm_mode", slot.gmMode ?? "solo");
      router.replace("/(tabs)");
    } catch (e) {
      console.error("[VFL] Load failed:", e);
      Alert.alert("Load Failed", String(e));
      setLoading(null);
    }
  }

  async function handleLegacyLoad() {
    setLoading("legacy");
    await AsyncStorage.setItem("vfl_gm_mode", "solo");
    router.replace("/(tabs)");
  }

  function handleCreate() {
    if (mode === "solo") {
      AsyncStorage.setItem("vfl_gm_mode", "solo").then(() => router.replace("/(tabs)"));
    } else if (mode === "cogm") {
      AsyncStorage.setItem("vfl_gm_mode", "cogm").then(() => router.push("/auth/login"));
    } else {
      if (joinInput.trim().length < 4) return;
      Promise.all([
        AsyncStorage.setItem("vfl_gm_mode", "join"),
        AsyncStorage.setItem("vfl_pending_join_code", joinInput.trim().toUpperCase()),
      ]).then(() => router.push("/auth/login"));
    }
  }

  function handleModeChange(m: Mode) {
    setMode(m);
    if (m === "cogm") setInviteCode(genInviteCode());
  }

  const team     = TEAMS[teamIdx];
  const canCreate = mode !== "join" || joinInput.trim().length >= 4;
  const hasSaves  = saves.length > 0 || legacySave;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <LinearGradient colors={[VFL_DARK, VFL_NAVY, "#0A1628"]} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={[VFL_RED + "55", "transparent"]}
        style={[StyleSheet.absoluteFill, { height: 220 }]}
        start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
      />

      <ScrollView
        contentContainerStyle={[st.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── VFL Header ───────────────────────────────────────────────────── */}
        <Animated.View style={[st.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <VFLLogo size="xl" />
          <Text style={st.title}>VIRTUAL FRANCHISE LEAGUE</Text>
          <View style={st.seasonBadge}>
            <Text style={st.seasonText}>2026 SEASON</Text>
          </View>
        </Animated.View>

        <View style={st.divider} />

        {/* ── Top tab: Load / Create ───────────────────────────────────────── */}
        <Animated.View style={[st.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={st.tabRow}>
            <TouchableOpacity
              onPress={() => setActiveView("saves")}
              style={[st.tabBtn, activeView === "saves" && st.tabBtnActive]}
            >
              <Feather name="download" size={14} color={activeView === "saves" ? "#fff" : "#6080A0"} />
              <Text style={[st.tabBtnText, activeView === "saves" && st.tabBtnTextActive]}>
                Load Franchise
              </Text>
              {hasSaves && activeView !== "saves" && <View style={st.savedDot} />}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveView("create")}
              style={[st.tabBtn, activeView === "create" && st.tabBtnCreate]}
            >
              <Feather name="plus-circle" size={14} color={activeView === "create" ? "#fff" : "#6080A0"} />
              <Text style={[st.tabBtnText, activeView === "create" && st.tabBtnTextActive]}>
                New Franchise
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ── LOAD VIEW ───────────────────────────────────────────────────── */}
        {activeView === "saves" && (
          <Animated.View style={{ opacity: fadeAnim, gap: 10 }}>
            {saves.length === 0 && !legacySave && (
              <View style={st.emptySaves}>
                <Feather name="inbox" size={36} color="#2A4060" />
                <Text style={st.emptySavesTitle}>No Saved Franchises</Text>
                <Text style={st.emptySavesSub}>
                  Save a franchise from the Franchise tab to see it here.
                </Text>
                <TouchableOpacity onPress={() => setActiveView("create")} style={st.createInsteadBtn}>
                  <Text style={st.createInsteadText}>Create New Franchise →</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Legacy auto-save (old save slot with no name) */}
            {legacySave && saves.length === 0 && (
              <View style={[st.slotCard, { borderLeftColor: VFL_BLUE }]}>
                <View style={st.slotCardTop}>
                  <View style={[st.slotIcon, { backgroundColor: VFL_BLUE + "25" }]}>
                    <Feather name="archive" size={16} color={VFL_BLUE} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.slotName}>Auto-Save</Text>
                    <Text style={st.slotMeta}>Continue where you left off</Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleLegacyLoad}
                    disabled={loading === "legacy"}
                    style={[st.loadBtn, { backgroundColor: VFL_BLUE, opacity: loading === "legacy" ? 0.6 : 1 }]}
                  >
                    <Text style={st.loadBtnText}>{loading === "legacy" ? "…" : "LOAD"}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Named save slots */}
            {saves.map((slot) => (
              <TouchableOpacity
                key={slot.id}
                onPress={() => handleLoadSlot(slot)}
                activeOpacity={0.85}
                disabled={!!loading}
                style={[st.slotCard, { borderLeftColor: slot.teamPrimary, opacity: loading && loading !== slot.id ? 0.5 : 1 }]}
              >
                <View style={st.slotCardTop}>
                  {/* Team color swatch */}
                  <View style={[st.slotSwatch, { backgroundColor: slot.teamPrimary }]}>
                    <View style={[st.slotSwatchAlt, { backgroundColor: slot.teamSecondary }]} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={st.slotName} numberOfLines={1}>{slot.name}</Text>
                    <Text style={st.slotMeta} numberOfLines={1}>
                      {slot.teamName} · {slot.record} · {slot.phase}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleLoadSlot(slot)}
                    disabled={!!loading}
                    style={[st.loadBtn, { backgroundColor: slot.teamPrimary, opacity: loading === slot.id ? 0.6 : 1 }]}
                  >
                    {loading === slot.id
                      ? <Feather name="loader" size={12} color="#fff" />
                      : <Text style={st.loadBtnText}>LOAD</Text>
                    }
                  </TouchableOpacity>
                </View>
                <View style={st.slotTagRow}>
                  <SlotTag icon="clock"    text={formatRelativeTime(slot.savedAt)} />
                  <SlotTag icon="calendar" text={`${slot.weekLabel} · ${slot.year}`} color="#F59E0B" />
                  <SlotTag icon={slot.gmMode === "solo" ? "lock" : "users"} text={slot.gmMode === "solo" ? "SOLO" : "CO-GM"} color={slot.gmMode === "solo" ? "#60A5FA" : "#4ADE80"} />
                </View>
              </TouchableOpacity>
            ))}

            {saves.length > 0 && (
              <Text style={st.slotHint}>Tap a save to load it · Manage saves in the Franchise tab</Text>
            )}
          </Animated.View>
        )}

        {/* ── CREATE VIEW ─────────────────────────────────────────────────── */}
        {activeView === "create" && (
          <Animated.View style={{ opacity: fadeAnim, gap: 0 }}>
            {/* GM Mode */}
            <View style={st.section}>
              <Text style={st.sectionLabel}>GM MODE</Text>
              <View style={st.modeRow}>
                {MODES.map(m => {
                  const isActive = mode === m.key;
                  return (
                    <TouchableOpacity
                      key={m.key}
                      onPress={() => handleModeChange(m.key)}
                      style={[st.modePill, isActive && { backgroundColor: VFL_BLUE, borderColor: VFL_BLUE }]}
                    >
                      <Feather name={m.icon as any} size={13} color={isActive ? "#fff" : "#6080A0"} />
                      <Text style={[st.modeLabel, isActive && { color: "#fff" }]}>{m.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={st.modeCard}>
                {mode === "solo" && (
                  <View style={st.modeDetail}>
                    <Feather name="lock" size={18} color={VFL_BLUE} />
                    <View style={{ flex: 1 }}>
                      <Text style={st.modeCardTitle}>Solo GM Mode</Text>
                      <Text style={st.modeCardSub}>Full control of your franchise. No sharing, no invite codes.</Text>
                    </View>
                  </View>
                )}
                {mode === "cogm" && (
                  <View style={st.modeDetail}>
                    <Feather name="users" size={18} color="#22C55E" />
                    <View style={{ flex: 1 }}>
                      <Text style={st.modeCardTitle}>Co-GM Mode</Text>
                      <Text style={st.modeCardSub}>Share your invite code to manage with a friend.</Text>
                      <View style={st.inviteBox}>
                        <Text style={st.inviteCode}>{inviteCode}</Text>
                        <TouchableOpacity onPress={() => setInviteCode(genInviteCode())} style={st.refreshBtn}>
                          <Feather name="refresh-cw" size={13} color={VFL_BLUE} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}
                {mode === "join" && (
                  <View style={st.modeDetail}>
                    <Feather name="user-plus" size={18} color="#F59E0B" />
                    <View style={{ flex: 1 }}>
                      <Text style={st.modeCardTitle}>Join a Franchise</Text>
                      <Text style={st.modeCardSub}>Enter the invite code your commissioner shared.</Text>
                      <TextInput
                        style={st.joinInput}
                        placeholder="VFL-447-XTK"
                        placeholderTextColor="#3A5070"
                        value={joinInput}
                        onChangeText={t => setJoinInput(t.toUpperCase())}
                        autoCapitalize="characters"
                        maxLength={12}
                      />
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Team picker */}
            <View style={st.section}>
              <Text style={st.sectionLabel}>FRANCHISE TEAM</Text>
              <TouchableOpacity
                style={st.teamPicker}
                onPress={() => setPickerOpen(o => !o)}
              >
                <View style={[st.teamSwatch, { backgroundColor: team.primary }]} />
                <View style={[st.teamSwatchAlt, { backgroundColor: team.secondary }]} />
                <View style={{ flex: 1 }}>
                  <Text style={st.teamPickerCity}>{team.city.toUpperCase()}</Text>
                  <Text style={st.teamPickerName}>{team.name}</Text>
                </View>
                <Text style={[st.teamAbbrText, { color: team.primary }]}>{team.abbr}</Text>
                <Feather name={pickerOpen ? "chevron-up" : "chevron-down"} size={16} color="#6080A0" />
              </TouchableOpacity>

              {pickerOpen && (
                <View style={st.teamList}>
                  <ScrollView style={{ maxHeight: 260 }} nestedScrollEnabled showsVerticalScrollIndicator>
                    {TEAMS.map((t, i) => {
                      const sel = i === teamIdx;
                      return (
                        <TouchableOpacity
                          key={t.abbr}
                          onPress={() => { setTeamIdx(i); setPickerOpen(false); }}
                          style={[st.teamRow, sel && { backgroundColor: t.primary + "22" }]}
                        >
                          <View style={[st.teamRowSwatch, { backgroundColor: t.primary }]} />
                          <View style={[st.teamRowSwatchAlt, { backgroundColor: t.secondary }]} />
                          <Text style={[st.teamRowName, { color: sel ? t.primary : "#C0D0E0" }]}>
                            {t.city} <Text style={{ fontFamily: "Inter_700Bold" }}>{t.name}</Text>
                          </Text>
                          <Text style={[st.teamRowAbbr, { color: t.primary + "AA" }]}>{t.abbr}</Text>
                          {sel && <Feather name="check" size={14} color={t.primary} />}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Create CTA */}
            <View style={{ paddingHorizontal: 0, marginTop: 4 }}>
              <TouchableOpacity
                onPress={handleCreate}
                activeOpacity={canCreate ? 0.85 : 1}
                style={[st.cta, !canCreate && { opacity: 0.4 }]}
              >
                <LinearGradient
                  colors={[VFL_RED, "#A00C22"]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={st.ctaGradient}
                >
                  <Feather name="arrow-right-circle" size={20} color="#fff" />
                  <Text style={st.ctaText}>CREATE FRANCHISE</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        <Text style={st.footerText}>Virtual Franchise League · Season 2026</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Slot tag pill ────────────────────────────────────────────────────────────

function SlotTag({ icon, text, color = "#6080A0" }: { icon: string; text: string; color?: string }) {
  return (
    <View style={st.slotTag}>
      <Feather name={icon as any} size={9} color={color} />
      <Text style={[st.slotTagText, { color }]}>{text}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  scroll:        { flexGrow: 1, paddingHorizontal: 20 },
  header:        { alignItems: "center", gap: 12, marginBottom: 8 },
  title:         { color: "#E0EAF8", fontFamily: "Inter_700Bold", fontSize: 14, letterSpacing: 3, textAlign: "center", marginTop: 4 },
  seasonBadge:   { backgroundColor: VFL_RED + "22", borderWidth: 1, borderColor: VFL_RED + "55", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4 },
  seasonText:    { color: VFL_RED, fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 2 },
  divider:       { height: 1, backgroundColor: VFL_BLUE + "40", marginVertical: 20 },
  section:       { marginBottom: 20 },
  sectionLabel:  { color: "#4A6A8A", fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 2, marginBottom: 10 },

  // Tab row (Load / Create)
  tabRow:            { flexDirection: "row", gap: 10 },
  tabBtn:            { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 14, backgroundColor: CARD_BG, borderWidth: 1.5, borderColor: BORDER, borderRadius: 14 },
  tabBtnActive:      { backgroundColor: VFL_RED, borderColor: VFL_RED },
  tabBtnCreate:      { backgroundColor: VFL_BLUE, borderColor: VFL_BLUE },
  tabBtnText:        { color: "#6080A0", fontFamily: "Inter_600SemiBold", fontSize: 13 },
  tabBtnTextActive:  { color: "#fff" },
  savedDot:          { width: 7, height: 7, borderRadius: 4, backgroundColor: "#22C55E", position: "absolute", top: 8, right: 8 },

  // Empty state
  emptySaves:        { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptySavesTitle:   { color: "#6080A0", fontFamily: "Inter_700Bold", fontSize: 16 },
  emptySavesSub:     { color: "#3A5070", fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "center", lineHeight: 18 },
  createInsteadBtn:  { marginTop: 6, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: VFL_BLUE + "22", borderRadius: 10, borderWidth: 1, borderColor: VFL_BLUE + "55" },
  createInsteadText: { color: "#60A5FA", fontFamily: "Inter_600SemiBold", fontSize: 13 },

  // Save slot card
  slotCard:      { backgroundColor: CARD_BG, borderWidth: 1, borderLeftWidth: 4, borderColor: BORDER, borderRadius: 14, padding: 14, gap: 10 },
  slotCardTop:   { flexDirection: "row", alignItems: "center", gap: 10 },
  slotIcon:      { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  slotSwatch:    { width: 14, height: 38, borderRadius: 4, position: "relative", overflow: "visible" },
  slotSwatchAlt: { position: "absolute", right: -6, top: 6, width: 8, height: 26, borderRadius: 3 },
  slotName:      { color: "#E0EAF8", fontFamily: "Inter_700Bold", fontSize: 14 },
  slotMeta:      { color: "#6080A0", fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 2 },
  loadBtn:       { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, alignItems: "center", justifyContent: "center", minWidth: 52 },
  loadBtnText:   { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1 },
  slotTagRow:    { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  slotTag:       { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#07182E", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  slotTagText:   { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 0.3 },
  slotHint:      { color: "#2A4060", fontFamily: "Inter_400Regular", fontSize: 10, textAlign: "center", marginTop: 4 },

  // Mode
  modeRow:       { flexDirection: "row", gap: 8, marginBottom: 12 },
  modePill:      { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 10, backgroundColor: CARD_BG, borderWidth: 1.5, borderColor: BORDER, borderRadius: 10 },
  modeLabel:     { color: "#6080A0", fontFamily: "Inter_600SemiBold", fontSize: 11 },
  modeCard:      { backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER, borderRadius: 12, padding: 14 },
  modeDetail:    { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  modeCardTitle: { color: "#E0EAF8", fontFamily: "Inter_700Bold", fontSize: 14, marginBottom: 4 },
  modeCardSub:   { color: "#6080A0", fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 18 },
  inviteBox:     { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10, backgroundColor: VFL_BLUE + "18", borderWidth: 1, borderColor: VFL_BLUE + "55", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  inviteCode:    { flex: 1, color: "#E0EAF8", fontFamily: "Inter_700Bold", fontSize: 18, letterSpacing: 2 },
  refreshBtn:    { padding: 4 },
  joinInput:     { marginTop: 10, backgroundColor: "#0A1628", borderWidth: 1, borderColor: VFL_BLUE + "55", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: "#E0EAF8", fontFamily: "Inter_700Bold", fontSize: 16, letterSpacing: 2 },

  // Team picker
  teamPicker:     { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: CARD_BG, borderWidth: 1.5, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  teamSwatch:     { width: 14, height: 28, borderRadius: 3 },
  teamSwatchAlt:  { width: 8,  height: 28, borderRadius: 2, marginLeft: -6 },
  teamPickerCity: { color: "#6080A0", fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.5 },
  teamPickerName: { color: "#E0EAF8", fontFamily: "Inter_700Bold", fontSize: 15 },
  teamAbbrText:   { fontFamily: "Inter_700Bold", fontSize: 13 },
  teamList:       { marginTop: 4, backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER, borderRadius: 12, overflow: "hidden" },
  teamRow:        { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BORDER },
  teamRowSwatch:  { width: 10, height: 22, borderRadius: 2 },
  teamRowSwatchAlt: { width: 6, height: 22, borderRadius: 2, marginLeft: -4 },
  teamRowName:    { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13 },
  teamRowAbbr:    { fontFamily: "Inter_700Bold", fontSize: 11 },

  // CTA
  cta:           { borderRadius: 14, overflow: "hidden", marginBottom: 12 },
  ctaGradient:   { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 18 },
  ctaText:       { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 17, letterSpacing: 1 },
  footerText:    { color: "#2A4060", fontFamily: "Inter_400Regular", fontSize: 11, textAlign: "center", marginTop: 16, marginBottom: 8 },
});
