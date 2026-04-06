import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface VFLLogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showWordmark?: boolean;
}

const SIZES = {
  xs: { badge: 28, font: 9,  accent: 2.5, radius: 6,  wFont: 9  },
  sm: { badge: 40, font: 13, accent: 3,   radius: 9,  wFont: 11 },
  md: { badge: 56, font: 18, accent: 4,   radius: 12, wFont: 13 },
  lg: { badge: 76, font: 24, accent: 5,   radius: 16, wFont: 16 },
  xl: { badge: 96, font: 30, accent: 6,   radius: 20, wFont: 19 },
};

// Standardized VFL brand colors — always red/white/blue, never team-themed
const VFL_RED  = "#C8102E";
const VFL_BLUE = "#003087";
const VFL_NAVY = "#07182E";

export function VFLLogo({ size = "md", showWordmark = false }: VFLLogoProps) {
  const d = SIZES[size];
  return (
    <View style={showWordmark ? styles.wordmarkRow : undefined}>
      <View style={[
        styles.badge,
        {
          width: d.badge,
          height: d.badge,
          borderRadius: d.radius,
          borderBottomLeftRadius: d.badge * 0.42,
          borderBottomRightRadius: d.badge * 0.42,
        }
      ]}>
        <View style={[styles.topStripe, { height: d.accent, borderTopLeftRadius: d.radius, borderTopRightRadius: d.radius }]} />
        <View style={styles.innerContent}>
          <Text style={[styles.vText, { fontSize: d.font * 0.55, lineHeight: d.font * 0.55 }]}>◆</Text>
          <Text style={[styles.vflText, { fontSize: d.font, lineHeight: d.font }]}>VFL</Text>
        </View>
        <View style={[styles.bottomStripe, { height: d.accent * 0.7 }]} />
      </View>
      {showWordmark && (
        <View style={styles.wordmarkText}>
          <Text style={[styles.wordmarkLeague, { fontSize: d.wFont + 2 }]}>VFL</Text>
          <Text style={[styles.wordmarkFull, { fontSize: d.wFont }]}>Virtual Franchise League</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: VFL_NAVY,
    borderWidth: 1.5,
    borderColor: VFL_BLUE,
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
  },
  topStripe: {
    width: "100%",
    backgroundColor: VFL_RED,
  },
  innerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  vText: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    opacity: 0.85,
  },
  vflText: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  bottomStripe: {
    width: "100%",
    backgroundColor: VFL_BLUE,
  },
  wordmarkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  wordmarkText: {
    gap: 2,
  },
  wordmarkLeague: {
    color: "#EEEEF8",
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  wordmarkFull: {
    color: "#6060A0",
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.3,
  },
});
