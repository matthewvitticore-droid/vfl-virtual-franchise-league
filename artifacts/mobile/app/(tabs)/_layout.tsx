import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useTeamTheme } from "@/hooks/useTeamTheme";

export default function TabLayout() {
  const colors = useColors();
  const theme  = useTeamTheme();
  const isIOS  = Platform.OS === "ios";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor:   theme.primary,
        tabBarInactiveTintColor: colors.mutedForeground + "99",
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.card,
          borderTopWidth: 1.5,
          borderTopColor: theme.primary + "60",
          elevation: 0,
          height: Platform.OS === "web" ? 70 : undefined,
        },
        tabBarLabelStyle: { fontFamily: "Inter_600SemiBold", fontSize: 10 },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={90} tint="systemChromeMaterialDark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />
          ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Home", tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="roster"
        options={{ title: "Roster", tabBarIcon: ({ color, size }) => <Feather name="users" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="frontoffice"
        options={{ title: "Front Office", tabBarIcon: ({ color, size }) => <Feather name="briefcase" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="schedule"
        options={{ title: "Schedule", tabBarIcon: ({ color, size }) => <Feather name="calendar" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="standings"
        options={{ title: "Standings", tabBarIcon: ({ color, size }) => <Feather name="bar-chart-2" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="customize"
        options={{ title: "Customize", tabBarIcon: ({ color, size }) => <Feather name="sliders" size={size} color={color} /> }}
      />
      {/* Stats still exists as a file but is hidden from tab bar — accessible via nav */}
      <Tabs.Screen
        name="stats"
        options={{ href: null }}
      />
    </Tabs>
  );
}
