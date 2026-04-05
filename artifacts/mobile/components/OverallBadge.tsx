import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface OverallBadgeProps {
  overall: number;
  size?: "sm" | "md";
}

export function OverallBadge({ overall, size = "md" }: OverallBadgeProps) {
  const colors = useColors();
  const color =
    overall >= 90 ? "#ffd700" :
    overall >= 80 ? colors.success :
    overall >= 70 ? colors.warning :
    colors.mutedForeground;

  const dim = size === "sm" ? { w: 34, h: 34, font: 12, r: 8 } : { w: 44, h: 44, font: 16, r: 10 };

  return (
    <View style={[styles.badge, { width: dim.w, height: dim.h, borderRadius: dim.r, backgroundColor: color + "22", borderColor: color }]}>
      <Text style={[styles.text, { fontSize: dim.font, color }]}>{overall}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  text: {
    fontFamily: "Inter_700Bold",
  },
});
