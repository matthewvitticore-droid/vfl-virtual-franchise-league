import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ColorPickerModal } from "@/components/ColorPickerModal";
import { LogoCreatorCanvas } from "@/components/LogoCreatorCanvas";
import { useColors } from "@/hooks/useColors";
import { useNFL } from "@/context/NFLContext";
import { autoAbbr, isClean, sanitize, sanitizeAbbr } from "@/utils/contentFilter";
import type { TeamCustomization } from "@/context/types";

const CITY_OPTS = [
  "Hartford","Providence","Burlington","Albany","Syracuse","Pittsburgh","Columbus",
  "Cleveland","Nashville","Memphis","Birmingham","Chattanooga","Denver","Reno",
  "Salt Lake","Sacramento","Raleigh","Richmond","Annapolis","Charlotte","Rockford",
  "Milwaukee","Madison","Grand Rapids","Savannah","Baton Rouge","Tampa","Orlando",
  "Portland","Seattle","San Francisco","Los Angeles","Phoenix","Dallas","Houston",
  "Miami","Atlanta","Chicago","Detroit","Kansas City","Las Vegas","Minneapolis",
  "New Orleans","Philadelphia","Albuquerque","Tucson","Boise","Spokane","Omaha",
];

const NAME_OPTS = [
  "Sentinels","Storm","Frost","Forge","Stallions","Ironmen","Knights","Foundry",
  "Desperados","Blaze","Bolt","Thunder","Peaks","Royals","Blizzard","Miners",
  "Thunderhawks","Cavalry","Corsairs","Vipers","Wolves","Ice","Fury","Surge",
  "Lumberjacks","Cascade","Fog","Phantoms","Renegades","Vanguard","Outlaws",
  "Spartans","Titans","Legends","Force","Aces","Raiders","Predators","Falcons",
  "Hawks","Cobras","Bears","Lions","Tigers","Eagles","Wolves","Raptors","Mustangs",
  "Rockets","Blasters","Charge","Wrath","Reign","Dynasty","Frontier","Empires",
];

function makeDefaultCustomization(teamId: string, primaryColor: string, secondaryColor: string, city: string, name: string): TeamCustomization {
  const abbr = autoAbbr(city, name);
  const uniformBase = {
    helmetColor: primaryColor,
    helmetLogoPlacement: "both" as const,
    jerseyStyle: "traditional" as const,
    jerseyColor: primaryColor,
    jerseyAccentColor: secondaryColor,
    numberFont: "block" as const,
    numberColor: "#FFFFFF",
    numberOutlineColor: secondaryColor,
    pantColor: primaryColor,
    pantStripeStyle: "single" as const,
    pantStripeColor: secondaryColor,
    sockColor: primaryColor,
    sockAccentColor: secondaryColor,
  };
  return {
    teamId,
    city,
    name,
    abbreviation: abbr,
    primaryColor,
    secondaryColor,
    accentColor: "#D97706",
    logo: {
      type: "shield",
      primaryColor,
      secondaryColor,
      accentColor: "#FFFFFF",
      shieldStyle: 1,
      letter: abbr.slice(0, 2),
    },
    uniforms: {
      home:      { ...uniformBase, jerseyColor: primaryColor, pantColor: primaryColor },
      away:      { ...uniformBase, jerseyColor: "#FFFFFF", numberColor: primaryColor, numberOutlineColor: secondaryColor, pantColor: "#FFFFFF", sockColor: "#FFFFFF", sockAccentColor: primaryColor },
      alternate: { ...uniformBase, helmetColor: secondaryColor, jerseyColor: secondaryColor, jerseyAccentColor: "#D97706", pantColor: primaryColor, pantStripeStyle: "double" as const, pantStripeColor: "#D97706" },
    },
  };
}

export default function CustomizeIndexScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { season, teamCustomization, saveCustomization } = useNFL();

  const team = season?.teams.find(t => t.id === season.playerTeamId);
  const [custom, setCustom] = useState<TeamCustomization | null>(null);
  const [saving, setSaving] = useState(false);
  const [cityInput, setCityInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [abbrInput, setAbbrInput] = useState("");
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showNamePicker, setShowNamePicker] = useState(false);
  const [pickerFor, setPickerFor] = useState<"primary" | "secondary" | "accent" | null>(null);

  useEffect(() => {
    if (teamCustomization) {
      setCustom(teamCustomization);
      setCityInput(teamCustomization.city);
      setNameInput(teamCustomization.name);
      setAbbrInput(teamCustomization.abbreviation);
    } else if (team) {
      const def = makeDefaultCustomization(team.id, team.primaryColor, team.secondaryColor, team.city, team.name);
      setCustom(def);
      setCityInput(def.city);
      setNameInput(def.name);
      setAbbrInput(def.abbreviation);
    }
  }, [teamCustomization, team]);

  if (!custom || !team) return (
    <View style={[st.center, { backgroundColor: colors.background }]}>
      <Text style={{ color: colors.mutedForeground }}>No active franchise</Text>
    </View>
  );

  const updateCity = (val: string) => {
    const clean = sanitize(val, 24);
    setCityInput(clean);
    setAbbrInput(autoAbbr(clean, nameInput));
    setCustom(c => c ? { ...c, city: clean, abbreviation: autoAbbr(clean, nameInput) } : c);
  };

  const updateName = (val: string) => {
    const clean = sanitize(val, 24);
    setNameInput(clean);
    setAbbrInput(autoAbbr(cityInput, clean));
    setCustom(c => c ? { ...c, name: clean, abbreviation: autoAbbr(cityInput, clean) } : c);
  };

  const updateAbbr = (val: string) => {
    const clean = sanitizeAbbr(val);
    setAbbrInput(clean);
    setCustom(c => c ? { ...c, abbreviation: clean } : c);
  };

  const updateColor = (key: "primaryColor" | "secondaryColor" | "accentColor", hex: string) => {
    setCustom(c => c ? { ...c, [key]: hex } : c);
  };

  const handleSave = async () => {
    if (!cityInput.trim() || !nameInput.trim()) { Alert.alert("Name required", "Please enter a city and team name."); return; }
    if (!isClean(cityInput) || !isClean(nameInput)) { Alert.alert("Content Filter", "Team name contains inappropriate language."); return; }
    setSaving(true);
    try { await saveCustomization(custom!); router.back(); }
    catch { Alert.alert("Error", "Failed to save customization."); }
    finally { setSaving(false); }
  };

  const colorOf = (key: "primary" | "secondary" | "accent") =>
    key === "primary" ? custom.primaryColor : key === "secondary" ? custom.secondaryColor : custom.accentColor;

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[st.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[st.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={st.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[st.headerTitle, { color: colors.foreground }]}>Customize Team</Text>
          <TouchableOpacity onPress={handleSave} style={[st.saveBtn, { backgroundColor: colors.nflBlue }]} disabled={saving}>
            <Text style={st.saveBtnText}>{saving ? "Saving…" : "Save"}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={[st.content, { paddingBottom: 100 }]} showsVerticalScrollIndicator={false}>

          {/* Logo preview + quick links */}
          <View style={[st.previewCard, { backgroundColor: custom.primaryColor + "18", borderColor: custom.primaryColor + "50" }]}>
            <LogoCreatorCanvas logo={{ ...custom.logo, primaryColor: custom.primaryColor, secondaryColor: custom.secondaryColor, accentColor: custom.accentColor }} size={110} />
            <View style={{ flex: 1, marginLeft: 18, gap: 8 }}>
              <Text style={[st.previewName, { color: colors.foreground }]}>{custom.city}</Text>
              <Text style={[st.previewTeam, { color: custom.primaryColor }]}>{custom.name}</Text>
              <Text style={[st.previewAbbr, { color: colors.mutedForeground }]}>{custom.abbreviation}</Text>
              <TouchableOpacity
                onPress={() => router.push("/customize/logo")}
                style={[st.editLogoBtn, { borderColor: custom.primaryColor }]}
              >
                <Feather name="edit-2" size={13} color={custom.primaryColor} />
                <Text style={[st.editLogoBtnText, { color: custom.primaryColor }]}>Edit Logo</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Team Identity ── */}
          <SectionHeader title="TEAM IDENTITY" colors={colors} />

          <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* City */}
            <Text style={[st.fieldLabel, { color: colors.mutedForeground }]}>CITY</Text>
            <TextInput
              value={cityInput}
              onChangeText={updateCity}
              style={[st.fieldInput, { color: colors.foreground, borderBottomColor: colors.border }]}
              placeholder="e.g. Reno"
              placeholderTextColor={colors.mutedForeground}
              maxLength={24}
            />
            <TouchableOpacity onPress={() => setShowCityPicker(v => !v)} style={st.presetToggle}>
              <Text style={[st.presetToggleText, { color: colors.nflBlue }]}>
                {showCityPicker ? "Hide" : "Pick from list"} ›
              </Text>
            </TouchableOpacity>
            {showCityPicker && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chipRow}>
                {CITY_OPTS.map(c => (
                  <TouchableOpacity key={c} onPress={() => { updateCity(c); setShowCityPicker(false); }}
                    style={[st.chip, { backgroundColor: cityInput === c ? colors.nflBlue : colors.background, borderColor: colors.border }]}>
                    <Text style={[st.chipText, { color: cityInput === c ? "#fff" : colors.foreground }]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <View style={[st.divider, { backgroundColor: colors.border }]} />

            {/* Nickname */}
            <Text style={[st.fieldLabel, { color: colors.mutedForeground }]}>NICKNAME</Text>
            <TextInput
              value={nameInput}
              onChangeText={updateName}
              style={[st.fieldInput, { color: colors.foreground, borderBottomColor: colors.border }]}
              placeholder="e.g. Royals"
              placeholderTextColor={colors.mutedForeground}
              maxLength={24}
            />
            <TouchableOpacity onPress={() => setShowNamePicker(v => !v)} style={st.presetToggle}>
              <Text style={[st.presetToggleText, { color: colors.nflBlue }]}>
                {showNamePicker ? "Hide" : "Pick from list"} ›
              </Text>
            </TouchableOpacity>
            {showNamePicker && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chipRow}>
                {NAME_OPTS.map(n => (
                  <TouchableOpacity key={n} onPress={() => { updateName(n); setShowNamePicker(false); }}
                    style={[st.chip, { backgroundColor: nameInput === n ? colors.nflBlue : colors.background, borderColor: colors.border }]}>
                    <Text style={[st.chipText, { color: nameInput === n ? "#fff" : colors.foreground }]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <View style={[st.divider, { backgroundColor: colors.border }]} />

            {/* Abbreviation */}
            <Text style={[st.fieldLabel, { color: colors.mutedForeground }]}>ABBREVIATION (2–4 LETTERS)</Text>
            <TextInput
              value={abbrInput}
              onChangeText={updateAbbr}
              style={[st.fieldInput, { color: colors.foreground, borderBottomColor: colors.border, fontFamily: "Inter_700Bold", fontSize: 22, letterSpacing: 4 }]}
              placeholder="e.g. RNR"
              placeholderTextColor={colors.mutedForeground}
              maxLength={4}
              autoCapitalize="characters"
            />
          </View>

          {/* ── Brand Colors ── */}
          <SectionHeader title="BRAND COLORS" colors={colors} />

          <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {(["primary","secondary","accent"] as const).map((key) => (
              <View key={key}>
                <ColorRow
                  label={key === "primary" ? "PRIMARY" : key === "secondary" ? "SECONDARY" : "ACCENT"}
                  color={colorOf(key)}
                  onPress={() => setPickerFor(key)}
                  colors={colors}
                />
                {key !== "accent" && <View style={[st.divider, { backgroundColor: colors.border }]} />}
              </View>
            ))}
          </View>

          {/* ── Uniforms quick link ── */}
          <SectionHeader title="UNIFORMS" colors={colors} />
          <TouchableOpacity
            onPress={() => router.push({ pathname: "/customize/uniform", params: { customJson: JSON.stringify(custom) } })}
            style={[st.uniformBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={st.uniformBtnLeft}>
              <Feather name="layers" size={20} color={colors.nflBlue} />
              <View>
                <Text style={[st.uniformBtnTitle, { color: colors.foreground }]}>Uniform Sets</Text>
                <Text style={[st.uniformBtnSub, { color: colors.mutedForeground }]}>Home · Away · Alternate</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </ScrollView>

        {/* Color picker modal */}
        <ColorPickerModal
          visible={pickerFor !== null}
          color={pickerFor ? colorOf(pickerFor) : "#4F46E5"}
          title={pickerFor === "primary" ? "Primary Color" : pickerFor === "secondary" ? "Secondary Color" : "Accent Color"}
          onClose={() => setPickerFor(null)}
          onSelect={(hex) => {
            if (pickerFor) updateColor(`${pickerFor}Color` as any, hex);
          }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

function SectionHeader({ title, colors }: { title: string; colors: any }) {
  return (
    <Text style={[st.sectionHeader, { color: colors.mutedForeground }]}>{title}</Text>
  );
}

function ColorRow({ label, color, onPress, colors }: { label: string; color: string; onPress: () => void; colors: any }) {
  return (
    <TouchableOpacity onPress={onPress} style={st.colorRow} activeOpacity={0.7}>
      <Text style={[st.colorRowLabel, { color: colors.foreground }]}>{label}</Text>
      <View style={st.colorRowRight}>
        <Text style={[st.colorRowHex, { color: colors.mutedForeground }]}>{color.toUpperCase()}</Text>
        <View style={[st.colorSwatch, { backgroundColor: color }]} />
        <Feather name="chevron-right" size={15} color={colors.mutedForeground} />
      </View>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  container:       { flex: 1 },
  center:          { flex: 1, alignItems: "center", justifyContent: "center" },
  header:          { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn:         { padding: 4, marginRight: 8 },
  headerTitle:     { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold" },
  saveBtn:         { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  saveBtnText:     { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff" },
  content:         { padding: 16, gap: 8 },
  previewCard:     { flexDirection: "row", alignItems: "center", borderRadius: 18, padding: 18, borderWidth: 1.5, marginBottom: 6 },
  previewName:     { fontSize: 13, fontFamily: "Inter_600SemiBold", opacity: 0.7 },
  previewTeam:     { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  previewAbbr:     { fontSize: 13, fontFamily: "Inter_600SemiBold", letterSpacing: 2 },
  editLogoBtn:     { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1.5, alignSelf: "flex-start", marginTop: 4 },
  editLogoBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  sectionHeader:   { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.5, marginTop: 14, marginBottom: 6, marginLeft: 4 },
  card:            { borderRadius: 16, borderWidth: 1, overflow: "hidden", marginBottom: 4 },
  fieldLabel:      { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.2, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  fieldInput:      { fontSize: 17, fontFamily: "Inter_600SemiBold", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  presetToggle:    { paddingHorizontal: 16, paddingBottom: 8 },
  presetToggleText:{ fontSize: 12, fontFamily: "Inter_600SemiBold" },
  chipRow:         { paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  chip:            { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  chipText:        { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  divider:         { height: 1, marginHorizontal: 16 },
  colorRow:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 },
  colorRowLabel:   { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  colorRowRight:   { flexDirection: "row", alignItems: "center", gap: 10 },
  colorRowHex:     { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  colorSwatch:     { width: 30, height: 30, borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  uniformBtn:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 16, borderWidth: 1, padding: 16 },
  uniformBtnLeft:  { flexDirection: "row", alignItems: "center", gap: 14 },
  uniformBtnTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  uniformBtnSub:   { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
});
