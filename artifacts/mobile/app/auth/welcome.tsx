import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { VFLLogo } from "@/components/VFLLogo";

const VFL_RED  = "#C8102E";
const VFL_BLUE = "#003087";
const VFL_NAVY = "#07182E";
const GOLD     = "#FFD700";

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={[s.root, { backgroundColor: VFL_NAVY }]}>
      <LinearGradient
        colors={[VFL_RED + "28", VFL_NAVY, VFL_BLUE + "35"]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Field texture lines */}
      {[...Array(6)].map((_, i) => (
        <View
          key={i}
          style={[
            s.fieldLine,
            { top: 80 + i * 110, opacity: 0.04 + i * 0.005 },
          ]}
        />
      ))}

      <Animated.View
        style={[
          s.inner,
          {
            paddingTop: insets.top + 40,
            paddingBottom: insets.bottom + 32,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* ── Logo ──────────────────────────────────────────────────────────── */}
        <View style={s.logoBlock}>
          <VFLLogo size="lg" />
          <Text style={s.leagueTitle}>VIRTUAL FRANCHISE LEAGUE</Text>
          <View style={s.seasonBadge}>
            <Text style={s.seasonBadgeTxt}>2026 SEASON</Text>
          </View>
        </View>

        {/* ── Tagline ───────────────────────────────────────────────────────── */}
        <View style={s.tagBlock}>
          <Text style={s.tagline}>Build your dynasty.</Text>
          <Text style={s.tagSub}>
            Create a franchise, run the draft war room,{"\n"}
            sign free agents, and compete with Co-GMs.
          </Text>
        </View>

        {/* ── Feature pills ─────────────────────────────────────────────────── */}
        <View style={s.pillRow}>
          {[
            { icon: "users" as const,      label: "Co-GM Mode"    },
            { icon: "clipboard" as const,  label: "Draft Room"    },
            { icon: "user-plus" as const,  label: "Free Agency"   },
            { icon: "repeat" as const,     label: "Trade Builder" },
          ].map(p => (
            <View key={p.label} style={s.pill}>
              <Feather name={p.icon} size={10} color={GOLD} />
              <Text style={s.pillTxt}>{p.label}</Text>
            </View>
          ))}
        </View>

        {/* ── CTA buttons ───────────────────────────────────────────────────── */}
        <View style={s.btnBlock}>
          <TouchableOpacity
            onPress={() => router.push("/auth/register")}
            style={s.primaryBtn}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[VFL_RED, "#A50D24"]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
            <Feather name="user-plus" size={18} color="#fff" />
            <Text style={s.primaryBtnTxt}>Create Account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/auth/login")}
            style={s.secondaryBtn}
            activeOpacity={0.85}
          >
            <Feather name="log-in" size={18} color="#fff" />
            <Text style={s.secondaryBtnTxt}>Sign In</Text>
          </TouchableOpacity>
        </View>

        {/* ── Skip ──────────────────────────────────────────────────────────── */}
        <TouchableOpacity
          onPress={() => router.replace("/(tabs)")}
          style={s.skipBtn}
          activeOpacity={0.7}
        >
          <Text style={s.skipTxt}>Continue without account</Text>
          <Feather name="arrow-right" size={13} color="rgba(255,255,255,0.4)" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1 },
  inner:        { flex: 1, alignItems: "center", justifyContent: "space-between", paddingHorizontal: 28 },
  fieldLine:    { position: "absolute", left: 0, right: 0, height: 1, backgroundColor: "#fff" },

  // Logo
  logoBlock:    { alignItems: "center", gap: 12 },
  leagueTitle:  { fontFamily: "Inter_700Bold", fontSize: 13, letterSpacing: 4, color: "rgba(255,255,255,0.55)", marginTop: 4 },
  seasonBadge:  { backgroundColor: VFL_RED, paddingHorizontal: 14, paddingVertical: 4, borderRadius: 20 },
  seasonBadgeTxt: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1.5, color: "#fff" },

  // Tagline
  tagBlock:     { alignItems: "center", gap: 8 },
  tagline:      { fontFamily: "Inter_700Bold", fontSize: 28, color: "#fff", textAlign: "center", letterSpacing: -0.5 },
  tagSub:       { fontFamily: "Inter_400Regular", fontSize: 13, color: "rgba(255,255,255,0.5)", textAlign: "center", lineHeight: 20 },

  // Pills
  pillRow:      { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },
  pill:         { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,215,0,0.08)", borderWidth: 1, borderColor: "rgba(255,215,0,0.25)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  pillTxt:      { fontFamily: "Inter_600SemiBold", fontSize: 11, color: "rgba(255,255,255,0.75)" },

  // Buttons
  btnBlock:     { width: "100%", gap: 12 },
  primaryBtn:   { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 17, borderRadius: 16, overflow: "hidden" },
  primaryBtnTxt:{ fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff", letterSpacing: 0.3 },
  secondaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, borderRadius: 16, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.25)", backgroundColor: "rgba(255,255,255,0.06)" },
  secondaryBtnTxt: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff", letterSpacing: 0.3 },

  // Skip
  skipBtn:      { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8 },
  skipTxt:      { fontFamily: "Inter_400Regular", fontSize: 13, color: "rgba(255,255,255,0.4)" },
});
