import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface StatBarProps {
  label: string;
  value: number;
  max?: number;
  color?: string;
}

export function StatBar({ label, value, max = 99, color }: StatBarProps) {
  const colors = useColors();
  const pct = Math.min(1, value / max);

  const barColor = color ?? (value >= 80 ? colors.success : value >= 65 ? colors.warning : colors.danger);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={[styles.track, { backgroundColor: colors.secondary }]}>
        <View style={[styles.fill, { width: `${pct * 100}%` as any, backgroundColor: barColor }]} />
      </View>
      <Text style={[styles.value, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 3,
  },
  label: {
    fontSize: 11,
    width: 48,
    fontFamily: "Inter_500Medium",
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },
  value: {
    fontSize: 12,
    width: 26,
    textAlign: "right",
    fontFamily: "Inter_600SemiBold",
  },
});
