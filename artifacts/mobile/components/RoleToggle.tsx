import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { Role, useNFL } from "@/context/NFLContext";

export function RoleToggle() {
  const colors = useColors();
  const { activeRole, setRole } = useNFL();

  const roles: { key: Role; label: string; icon: string }[] = [
    { key: "GM", label: "GM", icon: "📋" },
    { key: "Coach", label: "Coach", icon: "🎯" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
      {roles.map(r => (
        <TouchableOpacity
          key={r.key}
          onPress={() => setRole(r.key)}
          style={[
            styles.btn,
            activeRole === r.key && { backgroundColor: r.key === "GM" ? colors.nflBlue : colors.nflRed },
          ]}
        >
          <Text style={[styles.label, { color: activeRole === r.key ? "#fff" : colors.mutedForeground }]}>
            {r.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
  },
  btn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: "center",
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
});
