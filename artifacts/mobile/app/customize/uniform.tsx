import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ColorPickerModal } from "@/components/ColorPickerModal";
import { UniformPreview } from "@/components/UniformPreview";
import { useColors } from "@/hooks/useColors";
import { useNFL } from "@/context/NFLContext";
import type {
  HelmetLogoPlacement, JerseyStyle, NumberFont, PantStripeStyle, TeamCustomization, UniformSet,
} from "@/context/types";

type UniformKey = "home" | "away" | "alternate";

const JERSEY_STYLES: { value: JerseyStyle; label: string; desc: string }[] = [
  { value: "traditional", label: "Traditional", desc: "Classic solid jersey" },
  { value: "modern",      label: "Modern",      desc: "Shoulder accent panels" },
  { value: "retro",       label: "Retro",       desc: "Waist stripe band" },
  { value: "sleek",       label: "Sleek",       desc: "Thin side stripes" },
];

const NUMBER_FONTS: { value: NumberFont; label: string }[] = [
  { value: "block",      label: "Block" },
  { value: "serif",      label: "Serif" },
  { value: "collegiate", label: "Collegiate" },
  { value: "futuristic", label: "Futuristic" },
  { value: "slab",       label: "Slab" },
];

const STRIPE_STYLES: { value: PantStripeStyle; label: string }[] = [
  { value: "none",      label: "None" },
  { value: "single",    label: "Single" },
  { value: "double",    label: "Double" },
  { value: "triple",    label: "Triple" },
  { value: "lightning", label: "Lightning" },
];

const LOGO_PLACEMENTS: { value: HelmetLogoPlacement; label: string }[] = [
  { value: "both",  label: "Both Sides" },
  { value: "left",  label: "Left Only" },
  { value: "none",  label: "None" },
];

type PickerTarget =
  | "helmetColor" | "jerseyColor" | "jerseyAccentColor"
  | "numberColor" | "numberOutlineColor" | "pantColor"
  | "pantStripeColor" | "sockColor" | "sockAccentColor";

export default function UniformScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ customJson?: string }>();
  const { teamCustomization, saveCustomization, season } = useNFL();

  const team = season?.teams.find(t => t.id === season.playerTeamId);
  const abbr = teamCustomization?.abbreviation ?? team?.abbreviation ?? "VFL";

  const initCustom = (): TeamCustomization => {
    if (params.customJson) { try { return JSON.parse(params.customJson); } catch {} }
    if (teamCustomization) return teamCustomization;
    const pc = team?.primaryColor ?? "#4F46E5";
    const sc = team?.secondaryColor ?? "#0D9488";
    const base: UniformSet = {
      helmetColor: pc, helmetLogoPlacement: "both",
      jerseyStyle: "traditional", jerseyColor: pc, jerseyAccentColor: sc,
      numberFont: "block", numberColor: "#FFFFFF", numberOutlineColor: sc,
      pantColor: pc, pantStripeStyle: "single", pantStripeColor: sc,
      sockColor: pc, sockAccentColor: sc,
    };
    return {
      teamId: team?.id ?? "team-13", city: team?.city ?? "Reno", name: team?.name ?? "Royals",
      abbreviation: abbr, primaryColor: pc, secondaryColor: sc, accentColor: "#D97706",
      logo: { type: "shield", primaryColor: pc, secondaryColor: sc, accentColor: "#fff", shieldStyle: 1, letter: abbr.slice(0, 2) },
      uniforms: { home: { ...base }, away: { ...base, jerseyColor: "#fff", pantColor: "#fff", sockColor: "#fff" }, alternate: { ...base, helmetColor: sc, jerseyColor: sc } },
    };
  };

  const [custom, setCustom] = useState<TeamCustomization>(initCustom);
  const [activeTab, setActiveTab] = useState<UniformKey>("home");
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [saving, setSaving] = useState(false);

  const u = custom.uniforms[activeTab];

  const updateUniform = (key: keyof UniformSet, value: any) => {
    setCustom(c => ({
      ...c,
      uniforms: { ...c.uniforms, [activeTab]: { ...c.uniforms[activeTab], [key]: value } },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try { await saveCustomization(custom); router.back(); }
    catch { Alert.alert("Error", "Could not save uniforms."); }
    finally { setSaving(false); }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const pickerColor = pickerTarget ? (u as any)[pickerTarget] as string : "#4F46E5";
  const pickerTitle = pickerTarget ? pickerTarget.replace(/([A-Z])/g, " $1").trim() : "";

  return (
    <View style={[st.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[st.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[st.headerTitle, { color: colors.foreground }]}>Uniforms</Text>
        <TouchableOpacity onPress={handleSave} style={[st.saveBtn, { backgroundColor: colors.nflBlue }]} disabled={saving}>
          <Text style={st.saveBtnText}>{saving ? "…" : "Save"}</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[st.tabs, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        {(["home","away","alternate"] as UniformKey[]).map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[st.tab, activeTab === tab && { borderBottomColor: colors.nflBlue, borderBottomWidth: 2 }]}
          >
            <Text style={[st.tabText, { color: activeTab === tab ? colors.nflBlue : colors.mutedForeground }]}>
              {tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={[st.content, { paddingBottom: 100 }]} showsVerticalScrollIndicator={false}>

        {/* Live Preview */}
        <View style={[st.previewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <UniformPreview uniform={u} abbreviation={abbr} number="00" width={180} height={288} />
        </View>

        {/* ── HELMET ── */}
        <SectionHeader title="HELMET" icon="shield" colors={colors} />
        <OptionCard colors={colors}>
          <ColorRow label="Helmet Color" color={u.helmetColor} onPress={() => setPickerTarget("helmetColor")} colors={colors} />
          <Divider colors={colors} />
          <Text style={[st.optLabel, { color: colors.mutedForeground }]}>LOGO PLACEMENT</Text>
          <View style={st.chipRow}>
            {LOGO_PLACEMENTS.map(p => (
              <Chip key={p.value} label={p.label} active={u.helmetLogoPlacement === p.value}
                onPress={() => updateUniform("helmetLogoPlacement", p.value)} colors={colors} />
            ))}
          </View>
        </OptionCard>

        {/* ── JERSEY ── */}
        <SectionHeader title="JERSEY" icon="align-left" colors={colors} />
        <OptionCard colors={colors}>
          <Text style={[st.optLabel, { color: colors.mutedForeground }]}>STYLE</Text>
          <View style={st.chipRow}>
            {JERSEY_STYLES.map(s => (
              <Chip key={s.value} label={s.label} active={u.jerseyStyle === s.value}
                onPress={() => updateUniform("jerseyStyle", s.value)} colors={colors} />
            ))}
          </View>
          <Divider colors={colors} />
          <ColorRow label="Jersey Color"  color={u.jerseyColor}       onPress={() => setPickerTarget("jerseyColor")}       colors={colors} />
          <Divider colors={colors} />
          <ColorRow label="Accent Color"  color={u.jerseyAccentColor} onPress={() => setPickerTarget("jerseyAccentColor")} colors={colors} />
        </OptionCard>

        {/* ── NUMBER ── */}
        <SectionHeader title="NUMBER" icon="hash" colors={colors} />
        <OptionCard colors={colors}>
          <Text style={[st.optLabel, { color: colors.mutedForeground }]}>FONT STYLE</Text>
          <View style={st.chipRow}>
            {NUMBER_FONTS.map(f => (
              <Chip key={f.value} label={f.label} active={u.numberFont === f.value}
                onPress={() => updateUniform("numberFont", f.value)} colors={colors} />
            ))}
          </View>
          <Divider colors={colors} />
          <ColorRow label="Number Color"   color={u.numberColor}        onPress={() => setPickerTarget("numberColor")}        colors={colors} />
          <Divider colors={colors} />
          <ColorRow label="Outline Color"  color={u.numberOutlineColor} onPress={() => setPickerTarget("numberOutlineColor")} colors={colors} />
        </OptionCard>

        {/* ── PANTS ── */}
        <SectionHeader title="PANTS" icon="minus" colors={colors} />
        <OptionCard colors={colors}>
          <ColorRow label="Pant Color" color={u.pantColor} onPress={() => setPickerTarget("pantColor")} colors={colors} />
          <Divider colors={colors} />
          <Text style={[st.optLabel, { color: colors.mutedForeground }]}>STRIPE STYLE</Text>
          <View style={st.chipRow}>
            {STRIPE_STYLES.map(s => (
              <Chip key={s.value} label={s.label} active={u.pantStripeStyle === s.value}
                onPress={() => updateUniform("pantStripeStyle", s.value)} colors={colors} />
            ))}
          </View>
          {u.pantStripeStyle !== "none" && (
            <>
              <Divider colors={colors} />
              <ColorRow label="Stripe Color" color={u.pantStripeColor} onPress={() => setPickerTarget("pantStripeColor")} colors={colors} />
            </>
          )}
        </OptionCard>

        {/* ── SOCKS ── */}
        <SectionHeader title="SOCKS" icon="activity" colors={colors} />
        <OptionCard colors={colors}>
          <ColorRow label="Sock Color"   color={u.sockColor}       onPress={() => setPickerTarget("sockColor")}       colors={colors} />
          <Divider colors={colors} />
          <ColorRow label="Accent Band"  color={u.sockAccentColor} onPress={() => setPickerTarget("sockAccentColor")} colors={colors} />
        </OptionCard>

      </ScrollView>

      {/* Color picker */}
      <ColorPickerModal
        visible={pickerTarget !== null}
        color={pickerColor}
        title={pickerTitle}
        onClose={() => setPickerTarget(null)}
        onSelect={(hex) => { if (pickerTarget) updateUniform(pickerTarget, hex); }}
      />
    </View>
  );
}

function SectionHeader({ title, icon, colors }: { title: string; icon: string; colors: any }) {
  return (
    <View style={st.sectionRow}>
      <Feather name={icon as any} size={13} color={colors.nflBlue} />
      <Text style={[st.sectionTitle, { color: colors.mutedForeground }]}>{title}</Text>
    </View>
  );
}

function OptionCard({ children, colors }: { children: React.ReactNode; colors: any }) {
  return (
    <View style={[st.optCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {children}
    </View>
  );
}

function ColorRow({ label, color, onPress, colors }: { label: string; color: string; onPress: () => void; colors: any }) {
  return (
    <TouchableOpacity onPress={onPress} style={st.colorRow} activeOpacity={0.7}>
      <Text style={[st.colorRowLabel, { color: colors.foreground }]}>{label}</Text>
      <View style={st.colorRowRight}>
        <Text style={[st.colorHex, { color: colors.mutedForeground }]}>{color.toUpperCase()}</Text>
        <View style={[st.colorSwatch, { backgroundColor: color }]} />
        <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
      </View>
    </TouchableOpacity>
  );
}

function Chip({ label, active, onPress, colors }: { label: string; active: boolean; onPress: () => void; colors: any }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[st.chip, { backgroundColor: active ? colors.nflBlue : colors.background, borderColor: active ? colors.nflBlue : colors.border }]}
    >
      <Text style={[st.chipText, { color: active ? "#fff" : colors.mutedForeground }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Divider({ colors }: { colors: any }) {
  return <View style={[st.divider, { backgroundColor: colors.border }]} />;
}

const st = StyleSheet.create({
  container:     { flex: 1 },
  header:        { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle:   { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold", marginLeft: 8 },
  saveBtn:       { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  saveBtnText:   { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff" },
  tabs:          { flexDirection: "row", borderBottomWidth: 1 },
  tab:           { flex: 1, alignItems: "center", paddingVertical: 12 },
  tabText:       { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  content:       { padding: 14, gap: 6 },
  previewCard:   { alignItems: "center", borderRadius: 18, borderWidth: 1, paddingVertical: 20, marginBottom: 6 },
  sectionRow:    { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, marginBottom: 4, marginLeft: 4 },
  sectionTitle:  { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.5 },
  optCard:       { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  optLabel:      { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.2, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  chipRow:       { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 14, paddingBottom: 12 },
  chip:          { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  chipText:      { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  colorRow:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 13 },
  colorRowLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  colorRowRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  colorHex:      { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  colorSwatch:   { width: 28, height: 28, borderRadius: 7, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  divider:       { height: 1, marginHorizontal: 16 },
});
