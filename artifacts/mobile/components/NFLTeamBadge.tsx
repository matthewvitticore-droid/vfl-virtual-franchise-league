import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface NFLTeamBadgeProps {
  abbreviation: string;
  primaryColor: string;
  size?: "xs" | "sm" | "md" | "lg";
}

const SIZES = {
  xs: { badge: 28, font: 8, border: 1.5 },
  sm: { badge: 36, font: 10, border: 2 },
  md: { badge: 48, font: 13, border: 2 },
  lg: { badge: 64, font: 17, border: 2.5 },
};

export function NFLTeamBadge({ abbreviation, primaryColor, size = "md" }: NFLTeamBadgeProps) {
  const dim = SIZES[size];
  return (
    <View style={[
      styles.badge,
      {
        width: dim.badge,
        height: dim.badge,
        borderRadius: 6,
        backgroundColor: primaryColor + "25",
        borderColor: primaryColor,
        borderWidth: dim.border,
      }
    ]}>
      <Text style={[styles.text, { fontSize: dim.font, color: primaryColor }]}>{abbreviation}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
});
