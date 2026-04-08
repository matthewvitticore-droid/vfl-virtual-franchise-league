import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const VFL_NAVY = "#07182E";
const VFL_BLUE = "#003087";

export default function FranchiseCreatedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [joinCode, setJoinCode] = useState<string>("");
  const [franchiseName, setFranchiseName] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem("vfl_created_join_code"),
      AsyncStorage.getItem("vfl_created_franchise_name"),
    ]).then(([code, name]) => {
      setJoinCode(code ?? "");
      setFranchiseName(name ?? "Your Franchise");
    });
  }, []);

  const handleCopy = async () => {
    if (!joinCode) return;
    await Clipboard.setStringAsync(joinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleEnter = async () => {
    await AsyncStorage.multiRemove(["vfl_created_join_code", "vfl_created_franchise_name"]);
    router.replace("/(tabs)");
  };

  return (
    <View style={[styles.container, { backgroundColor: VFL_NAVY }]}>
      <LinearGradient
        colors={["#003087" + "40", "transparent"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.5 }}
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Trophy */}
        <View style={styles.badgeWrap}>
          <View style={[styles.badge, { backgroundColor: "#22C55E15", borderColor: "#22C55E40" }]}>
            <Feather name="check-circle" size={52} color="#22C55E" />
          </View>
        </View>

        <Text style={styles.heading}>Franchise Created!</Text>
        <Text style={styles.sub}>{franchiseName}</Text>

        {/* Code block */}
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>SHARE THIS CODE WITH YOUR CO-GMs</Text>

          <View style={styles.codeRow}>
            {joinCode.split("").map((ch, i) => (
              <View key={i} style={[styles.codeLetter, ch === "-" && styles.codeDash]}>
                <Text style={[styles.codeChar, ch === "-" && styles.codeDashChar]}>{ch}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.codeSub}>
            Your co-GMs enter this on the "Join Franchise" screen to join your game.
          </Text>
        </View>

        {/* Copy */}
        <TouchableOpacity
          onPress={handleCopy}
          activeOpacity={0.8}
          style={[styles.copyBtn, copied && styles.copyBtnSuccess]}
        >
          <Feather name={copied ? "check" : "copy"} size={16} color={copied ? "#22C55E" : "#93C5FD"} />
          <Text style={[styles.copyText, copied && { color: "#22C55E" }]}>
            {copied ? "Copied to clipboard!" : "Copy Code"}
          </Text>
        </TouchableOpacity>

        {/* Enter game */}
        <TouchableOpacity onPress={handleEnter} activeOpacity={0.85} style={styles.enterBtn}>
          <LinearGradient
            colors={[VFL_BLUE, "#001a4d"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.enterGradient}
          >
            <Feather name="arrow-right-circle" size={20} color="#fff" />
            <Text style={styles.enterText}>Enter My Franchise</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.hint}>
          This code is also visible in the Franchise → Meeting Room tab once you're in the game.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  content:      { paddingHorizontal: 28, alignItems: "center" },
  badgeWrap:    { marginBottom: 28 },
  badge:        { width: 100, height: 100, borderRadius: 30, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  heading:      { color: "#E0EAF8", fontFamily: "Inter_700Bold", fontSize: 30, letterSpacing: -0.5, marginBottom: 6, textAlign: "center" },
  sub:          { color: "#6080A0", fontFamily: "Inter_400Regular", fontSize: 15, textAlign: "center", marginBottom: 36 },

  codeCard:     { width: "100%", backgroundColor: "#0D1E33", borderWidth: 1.5, borderColor: "#22C55E30", borderRadius: 20, padding: 28, alignItems: "center", gap: 16, marginBottom: 16 },
  codeLabel:    { color: "#6080A0", fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1.5 },

  codeRow:      { flexDirection: "row", gap: 4, alignItems: "center", flexWrap: "wrap", justifyContent: "center" },
  codeLetter:   { width: 36, height: 48, borderRadius: 10, backgroundColor: "#1A3050", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#22C55E40" },
  codeDash:     { backgroundColor: "transparent", borderColor: "transparent", width: 10 },
  codeChar:     { color: "#22C55E", fontFamily: "Inter_700Bold", fontSize: 22, letterSpacing: 0 },
  codeDashChar: { color: "#3A5070", fontSize: 18 },

  codeSub:      { color: "#4A6480", fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "center", lineHeight: 18 },

  copyBtn:      { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: VFL_BLUE + "60", backgroundColor: "#0D1E33", marginBottom: 12 },
  copyBtnSuccess: { borderColor: "#22C55E60", backgroundColor: "#22C55E10" },
  copyText:     { color: "#93C5FD", fontFamily: "Inter_600SemiBold", fontSize: 15 },

  enterBtn:     { width: "100%", borderRadius: 14, overflow: "hidden", marginBottom: 24 },
  enterGradient:{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16 },
  enterText:    { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 17 },

  hint:         { color: "#3A5070", fontFamily: "Inter_400Regular", fontSize: 11, textAlign: "center", lineHeight: 16 },
});
