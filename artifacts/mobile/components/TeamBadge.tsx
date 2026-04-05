import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface TeamBadgeProps {
  shortName: string;
  color: string;
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: { badge: 32, font: 9 },
  md: { badge: 44, font: 12 },
  lg: { badge: 64, font: 17 },
};

export function TeamBadge({ shortName, color, size = "md" }: TeamBadgeProps) {
  const dim = SIZES[size];
  return (
    <View style={[styles.badge, { width: dim.badge, height: dim.badge, borderRadius: dim.badge / 2, backgroundColor: color + "33", borderColor: color }]}>
      <Text style={[styles.text, { fontSize: dim.font, color }]}>{shortName}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  text: {
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
});
