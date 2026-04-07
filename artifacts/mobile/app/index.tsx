import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated, Dimensions, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { VFLLogo } from "@/components/VFLLogo";

// ─── Brand ────────────────────────────────────────────────────────────────────
const VFL_RED   = "#C8102E";
const VFL_BLUE  = "#003087";
const VFL_NAVY  = "#07182E";
const VFL_DARK  = "#050E1C";
const CARD_BG   = "#0C1C30";
const BORDER    = "#1A3050";

// ─── 32 VFL Teams ─────────────────────────────────────────────────────────────
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

const SEASON_KEY    = "vfl_season_v1";
const { width: SW } = Dimensions.get("window");

function genInviteCode(): string {
  const digits = Math.floor(100 + Math.random() * 900);
  const chars  = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const trio   = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `VFL-${digits}-${trio}`;
}

type Action = "load" | "create";
type Mode   = "solo" | "cogm" | "join";

// ─── Mode metadata ─────────────────────────────────────────────────────────────
const MODES: { key: Mode; icon: string; label: string; sub: string }[] = [
  { key:"solo",  icon:"lock",      label:"Solo GM",         sub:"Full control · no sharing" },
  { key:"cogm",  icon:"users",     label:"Co-GM",           sub:"Share with a friend" },
  { key:"join",  icon:"user-plus", label:"Join Franchise",  sub:"Enter an invite code" },
];

export default function LaunchScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();

  const [hasSaved, setHasSaved]       = useState(false);
  const [action,   setAction]         = useState<Action>("load");
  const [mode,     setMode]           = useState<Mode>("solo");
  const [inviteCode, setInviteCode]   = useState(genInviteCode);
  const [joinInput,  setJoinInput]    = useState("");
  const [teamIdx,    setTeamIdx]      = useState(13); // Coastal Sharks default
  const [pickerOpen, setPickerOpen]   = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    AsyncStorage.getItem(SEASON_KEY).then(v => {
      const found = !!v;
      setHasSaved(found);
      setAction(found ? "load" : "create");
    });
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue:1, duration:700, useNativeDriver:true }),
      Animated.timing(slideAnim, { toValue:0, duration:600, delay:100, useNativeDriver:true }),
    ]).start();
  }, []);

  function handleEnter() {
    if (mode === "join" && joinInput.trim().length < 4) return;
    router.replace("/(tabs)");
  }

  function handleModeChange(m: Mode) {
    setMode(m);
    if (m === "cogm") setInviteCode(genInviteCode());
  }

  const team = TEAMS[teamIdx];
  const canEnter = mode !== "join" || joinInput.trim().length >= 4;

  return (
    <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==="ios" ? "padding" : undefined}>
      <LinearGradient
        colors={[VFL_DARK, VFL_NAVY, "#0A1628"]}
        style={StyleSheet.absoluteFill}
      />
      {/* Red accent glow at top */}
      <LinearGradient
        colors={[VFL_RED + "55", "transparent"]}
        style={[StyleSheet.absoluteFill, { height: 220 }]}
        start={{ x:0.5, y:0 }} end={{ x:0.5, y:1 }}
      />

      <ScrollView
        contentContainerStyle={[st.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <Animated.View style={[st.header, { opacity: fadeAnim, transform:[{ translateY: slideAnim }] }]}>
          <VFLLogo size="xl" />
          <Text style={st.title}>VIRTUAL FRANCHISE LEAGUE</Text>
          <View style={st.seasonBadge}>
            <Text style={st.seasonText}>2026 SEASON</Text>
          </View>
        </Animated.View>

        <View style={st.divider} />

        {/* ── Action selector ─────────────────────────────────────────────── */}
        <Animated.View style={[st.section, { opacity: fadeAnim, transform:[{ translateY: slideAnim }] }]}>
          <View style={st.actionRow}>
            {(["load","create"] as Action[]).map(a => {
              const isActive = action === a;
              const disabled = a === "load" && !hasSaved;
              return (
                <TouchableOpacity
                  key={a}
                  onPress={() => !disabled && setAction(a)}
                  activeOpacity={disabled ? 1 : 0.75}
                  style={[
                    st.actionBtn,
                    isActive && { backgroundColor: VFL_RED, borderColor: VFL_RED },
                    disabled && { opacity: 0.35 },
                  ]}
                >
                  <Feather
                    name={a === "load" ? "download" : "plus-circle"}
                    size={20}
                    color={isActive ? "#fff" : "#6080A0"}
                  />
                  <Text style={[st.actionLabel, isActive && { color:"#fff" }]}>
                    {a === "load" ? "Load Saved\nFranchise" : "Create New\nFranchise"}
                  </Text>
                  {a === "load" && hasSaved && (
                    <View style={st.savedDot} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          {action === "load" && !hasSaved && (
            <Text style={st.noSaveHint}>No saved franchise found — create one below</Text>
          )}
        </Animated.View>

        {/* ── Mode pills ──────────────────────────────────────────────────── */}
        <Animated.View style={[st.section, { opacity: fadeAnim }]}>
          <Text style={st.sectionLabel}>GM MODE</Text>
          <View style={st.modeRow}>
            {MODES.map(m => {
              const isActive = mode === m.key;
              return (
                <TouchableOpacity
                  key={m.key}
                  onPress={() => handleModeChange(m.key)}
                  activeOpacity={0.75}
                  style={[st.modePill, isActive && { backgroundColor: VFL_BLUE, borderColor: VFL_BLUE }]}
                >
                  <Feather name={m.icon as any} size={13} color={isActive ? "#fff" : "#6080A0"} />
                  <Text style={[st.modeLabel, isActive && { color:"#fff" }]}>{m.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Mode detail card */}
          <View style={st.modeCard}>
            {mode === "solo" && (
              <View style={st.modeDetail}>
                <Feather name="lock" size={18} color={VFL_BLUE} />
                <View style={{ flex:1 }}>
                  <Text style={st.modeCardTitle}>Solo GM Mode</Text>
                  <Text style={st.modeCardSub}>You have full control of the franchise. No invite codes, no shared access.</Text>
                </View>
              </View>
            )}
            {mode === "cogm" && (
              <View style={st.modeDetail}>
                <Feather name="users" size={18} color="#22C55E" />
                <View style={{ flex:1 }}>
                  <Text style={st.modeCardTitle}>Co-GM Mode</Text>
                  <Text style={st.modeCardSub}>Share your invite code with a friend to manage together.</Text>
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
                <View style={{ flex:1 }}>
                  <Text style={st.modeCardTitle}>Join a Franchise</Text>
                  <Text style={st.modeCardSub}>Enter the invite code your commissioner shared with you.</Text>
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
        </Animated.View>

        {/* ── Team picker ─────────────────────────────────────────────────── */}
        <Animated.View style={[st.section, { opacity: fadeAnim }]}>
          <Text style={st.sectionLabel}>FRANCHISE TEAM</Text>
          <TouchableOpacity
            style={st.teamPicker}
            onPress={() => setPickerOpen(o => !o)}
            activeOpacity={0.8}
          >
            <View style={[st.teamSwatch, { backgroundColor: team.primary }]} />
            <View style={[st.teamSwatchAlt, { backgroundColor: team.secondary }]} />
            <View style={{ flex:1 }}>
              <Text style={st.teamPickerCity}>{team.city.toUpperCase()}</Text>
              <Text style={st.teamPickerName}>{team.name}</Text>
            </View>
            <Text style={[st.teamAbbr, { color: team.primary }]}>{team.abbr}</Text>
            <Feather name={pickerOpen ? "chevron-up" : "chevron-down"} size={16} color="#6080A0" />
          </TouchableOpacity>

          {pickerOpen && (
            <View style={st.teamList}>
              <ScrollView style={{ maxHeight: 280 }} nestedScrollEnabled showsVerticalScrollIndicator>
                {TEAMS.map((t, i) => {
                  const isSelected = i === teamIdx;
                  return (
                    <TouchableOpacity
                      key={t.abbr}
                      onPress={() => { setTeamIdx(i); setPickerOpen(false); }}
                      activeOpacity={0.7}
                      style={[st.teamRow, isSelected && { backgroundColor: t.primary + "22" }]}
                    >
                      <View style={[st.teamRowSwatch, { backgroundColor: t.primary }]} />
                      <View style={[st.teamRowSwatchAlt, { backgroundColor: t.secondary }]} />
                      <Text style={[st.teamRowName, { color: isSelected ? t.primary : "#C0D0E0" }]}>
                        {t.city} <Text style={{ fontFamily:"Inter_700Bold" }}>{t.name}</Text>
                      </Text>
                      <Text style={[st.teamRowAbbr, { color: t.primary + "AA" }]}>{t.abbr}</Text>
                      {isSelected && <Feather name="check" size={14} color={t.primary} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </Animated.View>

        {/* ── CTA ─────────────────────────────────────────────────────────── */}
        <Animated.View style={{ opacity: fadeAnim, paddingHorizontal: 20, marginTop: 8 }}>
          <TouchableOpacity
            onPress={handleEnter}
            activeOpacity={canEnter ? 0.85 : 1}
            style={[st.cta, !canEnter && { opacity: 0.4 }]}
          >
            <LinearGradient
              colors={[VFL_RED, "#A00C22"]}
              start={{ x:0, y:0 }} end={{ x:1, y:0 }}
              style={st.ctaGradient}
            >
              <Feather name="arrow-right-circle" size={20} color="#fff" />
              <Text style={st.ctaText}>
                {action === "load" ? "LOAD FRANCHISE" : "CREATE FRANCHISE"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={st.footerText}>Virtual Franchise League · Season 2026</Text>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  scroll:         { flexGrow:1, paddingHorizontal:20 },
  header:         { alignItems:"center", gap:12, marginBottom:8 },
  title:          { color:"#E0EAF8", fontFamily:"Inter_700Bold", fontSize:14, letterSpacing:3, textAlign:"center", marginTop:4 },
  seasonBadge:    { backgroundColor: VFL_RED + "22", borderWidth:1, borderColor: VFL_RED + "55", borderRadius:20, paddingHorizontal:14, paddingVertical:4 },
  seasonText:     { color: VFL_RED, fontFamily:"Inter_700Bold", fontSize:11, letterSpacing:2 },
  divider:        { height:1, backgroundColor: VFL_BLUE + "40", marginVertical:20 },

  section:        { marginBottom:20 },
  sectionLabel:   { color:"#4A6A8A", fontFamily:"Inter_700Bold", fontSize:10, letterSpacing:2, marginBottom:10 },

  // Action
  actionRow:      { flexDirection:"row", gap:12 },
  actionBtn:      { flex:1, alignItems:"center", gap:8, paddingVertical:18, paddingHorizontal:12, backgroundColor:CARD_BG, borderWidth:1.5, borderColor:BORDER, borderRadius:14 },
  actionLabel:    { color:"#6080A0", fontFamily:"Inter_600SemiBold", fontSize:13, textAlign:"center" },
  savedDot:       { width:8, height:8, borderRadius:4, backgroundColor:"#22C55E", position:"absolute", top:10, right:10 },
  noSaveHint:     { color:"#4A6A8A", fontFamily:"Inter_400Regular", fontSize:11, textAlign:"center", marginTop:8 },

  // Mode
  modeRow:        { flexDirection:"row", gap:8, marginBottom:12 },
  modePill:       { flex:1, flexDirection:"row", alignItems:"center", justifyContent:"center", gap:5, paddingVertical:10, backgroundColor:CARD_BG, borderWidth:1.5, borderColor:BORDER, borderRadius:10 },
  modeLabel:      { color:"#6080A0", fontFamily:"Inter_600SemiBold", fontSize:11 },
  modeCard:       { backgroundColor:CARD_BG, borderWidth:1, borderColor:BORDER, borderRadius:12, padding:14 },
  modeDetail:     { flexDirection:"row", gap:12, alignItems:"flex-start" },
  modeCardTitle:  { color:"#E0EAF8", fontFamily:"Inter_700Bold", fontSize:14, marginBottom:4 },
  modeCardSub:    { color:"#6080A0", fontFamily:"Inter_400Regular", fontSize:12, lineHeight:18 },
  inviteBox:      { flexDirection:"row", alignItems:"center", gap:10, marginTop:10, backgroundColor: VFL_BLUE + "18", borderWidth:1, borderColor: VFL_BLUE + "55", borderRadius:8, paddingHorizontal:12, paddingVertical:8 },
  inviteCode:     { flex:1, color:"#E0EAF8", fontFamily:"Inter_700Bold", fontSize:18, letterSpacing:2 },
  refreshBtn:     { padding:4 },
  joinInput:      { marginTop:10, backgroundColor:"#0A1628", borderWidth:1, borderColor: VFL_BLUE + "55", borderRadius:8, paddingHorizontal:12, paddingVertical:10, color:"#E0EAF8", fontFamily:"Inter_700Bold", fontSize:16, letterSpacing:2 },

  // Team picker
  teamPicker:     { flexDirection:"row", alignItems:"center", gap:10, backgroundColor:CARD_BG, borderWidth:1.5, borderColor:BORDER, borderRadius:12, paddingHorizontal:14, paddingVertical:12 },
  teamSwatch:     { width:14, height:28, borderRadius:3 },
  teamSwatchAlt:  { width:8,  height:28, borderRadius:2, marginLeft:-6 },
  teamPickerCity: { color:"#6080A0", fontFamily:"Inter_700Bold", fontSize:9, letterSpacing:1.5 },
  teamPickerName: { color:"#E0EAF8", fontFamily:"Inter_700Bold", fontSize:15 },
  teamAbbr:       { fontFamily:"Inter_700Bold", fontSize:13 },
  teamList:       { marginTop:4, backgroundColor:CARD_BG, borderWidth:1, borderColor:BORDER, borderRadius:12, overflow:"hidden" },
  teamRow:        { flexDirection:"row", alignItems:"center", gap:8, paddingHorizontal:14, paddingVertical:10, borderBottomWidth:1, borderBottomColor: BORDER },
  teamRowSwatch:  { width:10, height:22, borderRadius:2 },
  teamRowSwatchAlt:{ width:6, height:22, borderRadius:2, marginLeft:-4 },
  teamRowName:    { flex:1, fontFamily:"Inter_400Regular", fontSize:13 },
  teamRowAbbr:    { fontFamily:"Inter_700Bold", fontSize:11 },

  // CTA
  cta:            { borderRadius:14, overflow:"hidden", marginBottom:12 },
  ctaGradient:    { flexDirection:"row", alignItems:"center", justifyContent:"center", gap:10, paddingVertical:18 },
  ctaText:        { color:"#fff", fontFamily:"Inter_700Bold", fontSize:17, letterSpacing:1 },
  footerText:     { color:"#2A4060", fontFamily:"Inter_400Regular", fontSize:11, textAlign:"center" },
});
