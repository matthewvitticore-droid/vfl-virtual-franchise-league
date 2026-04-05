import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard, Modal, PanResponder, Platform, StyleSheet, Text,
  TextInput, TouchableOpacity, TouchableWithoutFeedback, View,
} from "react-native";
import { useColors } from "@/hooks/useColors";

// ─── Color math ───────────────────────────────────────────────────────────────

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const hex = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${hex(f(0))}${hex(f(8))}${hex(f(4))}`;
}

function hexToHsl(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map(c => c + c).join("");
  if (h.length !== 6) return [220, 80, 40];
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let hue = 0, sat = 0;
  const lum = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    sat = lum > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hue = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: hue = ((b - r) / d + 2) / 6; break;
      case b: hue = ((r - g) / d + 4) / 6; break;
    }
  }
  return [Math.round(hue * 360), Math.round(sat * 100), Math.round(lum * 100)];
}

function isValidHex(hex: string): boolean {
  return /^#?[0-9A-Fa-f]{6}$/.test(hex);
}

// ─── Presets ──────────────────────────────────────────────────────────────────

const SWATCHES = [
  "#B91C1C","#DC2626","#F97316","#D97706","#CA8A04","#16A34A",
  "#0D9488","#0891B2","#2563EB","#4F46E5","#7C3AED","#9333EA",
  "#C2410C","#0F766E","#1E40AF","#3730A3","#6B21A8","#BE185D",
  "#111827","#1F2937","#374151","#4B5563","#6B7280","#9CA3AF",
  "#14532D","#065F46","#164E63","#1E3A8A","#3B0764","#500724",
  "#FCD34D","#A3E635","#34D399","#67E8F9","#93C5FD","#F9A8D4",
];

// ─── Slider ───────────────────────────────────────────────────────────────────

interface SliderProps {
  value: number;
  max: number;
  gradientColors: string[];
  onChange: (v: number) => void;
}

function HSLSlider({ value, max, gradientColors, onChange }: SliderProps) {
  const [width, setWidth] = useState(280);
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) =>
        onChange(Math.round(Math.max(0, Math.min(1, e.nativeEvent.locationX / width)) * max)),
      onPanResponderMove: (e) =>
        onChange(Math.round(Math.max(0, Math.min(1, e.nativeEvent.locationX / width)) * max)),
    })
  ).current;

  const thumbX = (value / max) * width;

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={st.sliderTrack}
      {...pan.panHandlers}
    >
      <LinearGradient
        colors={gradientColors as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={st.sliderGradient}
      />
      <View
        style={[
          st.sliderThumb,
          { left: Math.max(0, Math.min(width - 24, thumbX - 12)) },
        ]}
      />
    </View>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  color: string;
  title?: string;
  onClose: () => void;
  onSelect: (hex: string) => void;
}

export function ColorPickerModal({ visible, color, title = "Pick a Color", onClose, onSelect }: Props) {
  const colors = useColors();
  const [h, setH] = useState(220);
  const [s, setS] = useState(80);
  const [l, setL] = useState(40);
  const [hexInput, setHexInput] = useState(color);

  useEffect(() => {
    if (visible && isValidHex(color)) {
      const [nh, ns, nl] = hexToHsl(color);
      setH(nh); setS(ns); setL(nl);
      setHexInput(color.startsWith("#") ? color : `#${color}`);
    }
  }, [visible, color]);

  const currentHex = useMemo(() => hslToHex(h, s, l), [h, s, l]);
  useEffect(() => { setHexInput(currentHex); }, [currentHex]);

  const handleHex = (text: string) => {
    setHexInput(text);
    const full = text.startsWith("#") ? text : `#${text}`;
    if (isValidHex(full)) {
      const [nh, ns, nl] = hexToHsl(full);
      setH(nh); setS(ns); setL(nl);
    }
  };

  const satGrad = useMemo<string[]>(
    () => [`hsl(${h},0%,${l}%)`, `hsl(${h},100%,${l}%)`],
    [h, l]
  );
  const lumGrad = useMemo<string[]>(
    () => [`hsl(${h},${s}%,10%)`, `hsl(${h},${s}%,50%)`, `hsl(${h},${s}%,90%)`],
    [h, s]
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); onClose(); }}>
        <View style={st.overlay} />
      </TouchableWithoutFeedback>

      <View style={[st.sheet, { backgroundColor: colors.card }]}>
        {/* Header */}
        <View style={st.header}>
          <Text style={[st.title, { color: colors.foreground }]}>{title}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={[st.closeBtn, { color: colors.mutedForeground }]}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Preview */}
        <View style={st.previewRow}>
          <View style={[st.previewSwatch, { backgroundColor: color }]} />
          <Text style={[{ color: colors.mutedForeground, fontSize: 18, marginHorizontal: 8 }]}>→</Text>
          <View style={[st.previewSwatch, { backgroundColor: currentHex }]} />
          <TextInput
            value={hexInput}
            onChangeText={handleHex}
            style={[st.hexInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
            maxLength={7}
            autoCapitalize="characters"
            autoCorrect={false}
            spellCheck={false}
            placeholder="#RRGGBB"
            placeholderTextColor={colors.mutedForeground}
          />
        </View>

        {/* Hue */}
        <Text style={[st.label, { color: colors.mutedForeground }]}>HUE  {h}°</Text>
        <HSLSlider
          value={h} max={360}
          gradientColors={["#ff0000","#ffff00","#00ff00","#00ffff","#0000ff","#ff00ff","#ff0000"]}
          onChange={setH}
        />

        {/* Saturation */}
        <Text style={[st.label, { color: colors.mutedForeground }]}>SATURATION  {s}%</Text>
        <HSLSlider value={s} max={100} gradientColors={satGrad} onChange={setS} />

        {/* Lightness */}
        <Text style={[st.label, { color: colors.mutedForeground }]}>LIGHTNESS  {l}%</Text>
        <HSLSlider value={l} max={100} gradientColors={lumGrad} onChange={setL} />

        {/* Swatches */}
        <View style={st.swatchGrid}>
          {SWATCHES.map((sw) => (
            <TouchableOpacity
              key={sw}
              onPress={() => {
                const [nh, ns, nl] = hexToHsl(sw);
                setH(nh); setS(ns); setL(nl);
              }}
              style={[
                st.swatch,
                { backgroundColor: sw, borderColor: sw === currentHex ? "#fff" : "transparent" },
              ]}
            />
          ))}
        </View>

        {/* Confirm */}
        <TouchableOpacity
          onPress={() => { onSelect(currentHex); onClose(); }}
          style={[st.confirmBtn, { backgroundColor: currentHex }]}
          activeOpacity={0.85}
        >
          <Text style={st.confirmText}>USE THIS COLOR</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)" },
  sheet: {
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 17, fontFamily: "Inter_700Bold" },
  closeBtn: { fontSize: 20 },
  previewRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  previewSwatch: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  hexInput: {
    flex: 1, height: 44, borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 12, fontFamily: "Inter_600SemiBold", fontSize: 14, marginLeft: 8,
  },
  label: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1.2, marginBottom: 8, marginTop: 4 },
  sliderTrack: { height: 26, borderRadius: 13, marginBottom: 4, position: "relative" },
  sliderGradient: { height: 26, borderRadius: 13 },
  sliderThumb: {
    position: "absolute", top: 1, width: 24, height: 24, borderRadius: 12,
    backgroundColor: "#fff", borderWidth: 2, borderColor: "rgba(0,0,0,0.25)",
    shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 4, elevation: 6,
  },
  swatchGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 14 },
  swatch: { width: 34, height: 34, borderRadius: 8, borderWidth: 2.5 },
  confirmBtn: { height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 2 },
  confirmText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 1.2 },
});
