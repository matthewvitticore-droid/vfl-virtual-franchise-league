import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ColorPickerModal } from "@/components/ColorPickerModal";
import { LogoCreatorCanvas } from "@/components/LogoCreatorCanvas";
import { useColors } from "@/hooks/useColors";
import { useNFL } from "@/context/NFLContext";
import type {
  LogoFontStyle, LogoType, ShieldStyle, TeamCustomization, TeamLogo,
} from "@/context/types";

const LOGO_TYPES: { value: LogoType; label: string; icon: string }[] = [
  { value: "shield",     label: "Shield",     icon: "shield" },
  { value: "lettermark", label: "Lettermark", icon: "type"   },
];

const SHIELD_STYLES: { value: ShieldStyle; label: string }[] = [
  { value: 1, label: "Classic" },
  { value: 2, label: "Hexagon" },
  { value: 3, label: "Wide"    },
  { value: 4, label: "Tall"    },
];

const FONT_STYLES: { value: LogoFontStyle; label: string }[] = [
  { value: "block",   label: "Block"   },
  { value: "serif",   label: "Serif"   },
  { value: "script",  label: "Script"  },
  { value: "stencil", label: "Stencil" },
];

type ColorTarget = "primaryColor" | "secondaryColor" | "accentColor";

export default function LogoScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { teamCustomization, saveCustomization, season } = useNFL();

  const team = season?.teams.find(t => t.id === season.playerTeamId);
  const pc = teamCustomization?.primaryColor ?? team?.primaryColor ?? "#4F46E5";
  const sc = teamCustomization?.secondaryColor ?? team?.secondaryColor ?? "#0D9488";

  const initLogo = (): TeamLogo => teamCustomization?.logo ?? {
    type: "shield", primaryColor: pc, secondaryColor: sc, accentColor: "#FFFFFF",
    shieldStyle: 1, letter: (teamCustomization?.abbreviation ?? team?.abbreviation ?? "VFL").slice(0, 2),
  };

  const [logo, setLogo] = useState<TeamLogo>(initLogo);
  const [pickerTarget, setPickerTarget] = useState<ColorTarget | null>(null);
  const [saving, setSaving] = useState(false);

  const updateLogo = (patch: Partial<TeamLogo>) => setLogo(l => ({ ...l, ...patch }));

  const handleSave = async () => {
    if (!teamCustomization && !team) { Alert.alert("No franchise found."); return; }
    setSaving(true);
    try {
      const base = teamCustomization ?? {
        teamId: team!.id, city: team!.city, name: team!.name,
        abbreviation: team!.abbreviation, primaryColor: pc, secondaryColor: sc, accentColor: "#D97706",
        uniforms: {} as any,
      };
      await saveCustomization({ ...base, logo });
      router.back();
    } catch { Alert.alert("Error", "Could not save logo."); }
    finally { setSaving(false); }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[st.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[st.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[st.headerTitle, { color: colors.foreground }]}>Logo Creator</Text>
        <TouchableOpacity onPress={handleSave} style={[st.saveBtn, { backgroundColor: colors.nflBlue }]} disabled={saving}>
          <Text style={st.saveBtnText}>{saving ? "…" : "Save"}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[st.content, { paddingBottom: 100 }]} showsVerticalScrollIndicator={false}>

        {/* Live preview */}
        <View style={[st.previewWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[st.previewBg, { backgroundColor: logo.primaryColor + "20" }]}>
            <LogoCreatorCanvas logo={logo} size={140} />
          </View>
        </View>

        {/* Logo type tabs */}
        <View style={[st.typeTabs, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {LOGO_TYPES.map(lt => (
            <TouchableOpacity
              key={lt.value}
              onPress={() => updateLogo({ type: lt.value })}
              style={[st.typeTab, logo.type === lt.value && { backgroundColor: colors.nflBlue }]}
            >
              <Feather name={lt.icon as any} size={15} color={logo.type === lt.value ? "#fff" : colors.mutedForeground} />
              <Text style={[st.typeTabText, { color: logo.type === lt.value ? "#fff" : colors.mutedForeground }]}>
                {lt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logo colors (shared across all types) */}
        <Text style={[st.sectionLabel, { color: colors.mutedForeground }]}>LOGO COLORS</Text>
        <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {(["primaryColor","secondaryColor","accentColor"] as ColorTarget[]).map((key, i, arr) => (
            <View key={key}>
              <ColorRow
                label={key === "primaryColor" ? "Primary" : key === "secondaryColor" ? "Secondary" : "Accent"}
                color={logo[key] ?? "#fff"}
                onPress={() => setPickerTarget(key)}
                colors={colors}
              />
              {i < arr.length - 1 && <Divider colors={colors} />}
            </View>
          ))}
        </View>

        {/* ── SHIELD options ── */}
        {logo.type === "shield" && (
          <>
            <Text style={[st.sectionLabel, { color: colors.mutedForeground }]}>SHIELD STYLE</Text>
            <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.border, padding: 14 }]}>
              <View style={st.chipRow}>
                {SHIELD_STYLES.map(s => (
                  <Chip key={s.value} label={s.label} active={logo.shieldStyle === s.value}
                    onPress={() => updateLogo({ shieldStyle: s.value })} colors={colors} />
                ))}
              </View>
              <Divider colors={colors} />
              <Text style={[st.optLabel, { color: colors.mutedForeground }]}>LETTERS (1–3 CHARS)</Text>
              <TextInput
                value={logo.letter ?? ""}
                onChangeText={v => updateLogo({ letter: v.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,3) })}
                style={[st.letterInput, { color: colors.foreground, borderColor: colors.border }]}
                placeholder="e.g. VFL"
                placeholderTextColor={colors.mutedForeground}
                maxLength={3}
                autoCapitalize="characters"
              />
            </View>
          </>
        )}

        {/* ── LETTERMARK options ── */}
        {logo.type === "lettermark" && (
          <>
            <Text style={[st.sectionLabel, { color: colors.mutedForeground }]}>LETTERMARK</Text>
            <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.border, padding: 14 }]}>
              <Text style={[st.optLabel, { color: colors.mutedForeground }]}>LETTERS (1–3 CHARS)</Text>
              <TextInput
                value={logo.letter ?? ""}
                onChangeText={v => updateLogo({ letter: v.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,3) })}
                style={[st.letterInput, { color: colors.foreground, borderColor: colors.border }]}
                placeholder="e.g. VFL"
                placeholderTextColor={colors.mutedForeground}
                maxLength={3}
                autoCapitalize="characters"
              />
              <Divider colors={colors} />
              <Text style={[st.optLabel, { color: colors.mutedForeground }]}>FONT STYLE</Text>
              <View style={st.chipRow}>
                {FONT_STYLES.map(f => (
                  <Chip key={f.value} label={f.label} active={logo.fontStyle === f.value}
                    onPress={() => updateLogo({ fontStyle: f.value })} colors={colors} />
                ))}
              </View>
            </View>
          </>
        )}

      </ScrollView>

      <ColorPickerModal
        visible={pickerTarget !== null}
        color={pickerTarget ? (logo[pickerTarget] ?? "#4F46E5") : "#4F46E5"}
        title={pickerTarget === "primaryColor" ? "Primary Color" : pickerTarget === "secondaryColor" ? "Secondary Color" : "Accent Color"}
        onClose={() => setPickerTarget(null)}
        onSelect={(hex) => { if (pickerTarget) updateLogo({ [pickerTarget]: hex }); }}
      />
    </View>
  );
}

function ColorRow({ label, color, onPress, colors }: { label: string; color: string; onPress: () => void; colors: any }) {
  return (
    <TouchableOpacity onPress={onPress} style={st.colorRow} activeOpacity={0.7}>
      <Text style={[{ fontSize: 14, fontFamily: "Inter_600SemiBold" }, { color: colors.foreground }]}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground }}>{color.toUpperCase()}</Text>
        <View style={[st.colorSwatch, { backgroundColor: color }]} />
        <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
      </View>
    </TouchableOpacity>
  );
}

function Chip({ label, active, onPress, colors }: { label: string; active: boolean; onPress: () => void; colors: any }) {
  return (
    <TouchableOpacity onPress={onPress}
      style={[st.chip, { backgroundColor: active ? colors.nflBlue : colors.background, borderColor: active ? colors.nflBlue : colors.border }]}>
      <Text style={[st.chipText, { color: active ? "#fff" : colors.mutedForeground }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Divider({ colors }: { colors: any }) {
  return <View style={[st.divider, { backgroundColor: colors.border }]} />;
}

const st = StyleSheet.create({
  container:   { flex: 1 },
  header:      { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold", marginLeft: 8 },
  saveBtn:     { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  saveBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff" },
  content:     { padding: 14, gap: 6 },
  previewWrap: { borderRadius: 20, borderWidth: 1, overflow: "hidden", marginBottom: 8 },
  previewBg:   { alignItems: "center", justifyContent: "center", padding: 24 },
  typeTabs:    { flexDirection: "row", borderRadius: 14, borderWidth: 1, overflow: "hidden", marginBottom: 8 },
  typeTab:     { flex: 1, alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 12 },
  typeTabText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  sectionLabel:{ fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.5, marginTop: 10, marginBottom: 4, marginLeft: 4 },
  card:        { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  optLabel:    { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.2, marginBottom: 8 },
  chipRow:     { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  chip:        { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9, borderWidth: 1 },
  chipText:    { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  colorRow:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 },
  colorSwatch: { width: 28, height: 28, borderRadius: 7, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  divider:     { height: 1, marginHorizontal: 0, marginVertical: 8 },
  letterInput: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: 4, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginTop: 6, marginBottom: 4 },
});
