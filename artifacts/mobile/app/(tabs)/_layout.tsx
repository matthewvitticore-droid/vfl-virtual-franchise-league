import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useTeamTheme } from "@/hooks/useTeamTheme";

function TabIcon({ name, size, focused, teamColor }: {
  name: React.ComponentProps<typeof Feather>["name"];
  size: number;
  focused: boolean;
  teamColor: string;
}) {
  if (focused) {
    return (
      <View style={{
        backgroundColor: teamColor,
        borderRadius: 18,
        paddingHorizontal: 13,
        paddingVertical: 5,
        marginTop: Platform.OS === "web" ? 6 : 4,
        alignItems: "center",
        justifyContent: "center",
      }}>
        <Feather name={name} size={size - 2} color="#FFFFFF" />
      </View>
    );
  }
  return (
    <View style={{ marginTop: Platform.OS === "web" ? 6 : 4, alignItems: "center", justifyContent: "center" }}>
      <Feather name={name} size={size} color="rgba(255,255,255,0.38)" />
    </View>
  );
}

export default function TabLayout() {
  const colors = useColors();
  const theme  = useTeamTheme();
  const isIOS  = Platform.OS === "ios";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor:   "#FFFFFF",
        tabBarInactiveTintColor: "rgba(255,255,255,0.38)",
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.card,
          borderTopWidth: 1.5,
          borderTopColor: theme.primary + "70",
          elevation: 0,
          height: Platform.OS === "web" ? 72 : undefined,
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
        options={{
          title: "Home",
          tabBarIcon: ({ size, focused }) => <TabIcon name="home" size={size} focused={focused} teamColor={theme.primary} />,
        }}
      />
      <Tabs.Screen
        name="roster"
        options={{
          title: "Roster",
          tabBarIcon: ({ size, focused }) => <TabIcon name="users" size={size} focused={focused} teamColor={theme.primary} />,
        }}
      />
      <Tabs.Screen
        name="frontoffice"
        options={{
          title: "Front Office",
          tabBarIcon: ({ size, focused }) => <TabIcon name="briefcase" size={size} focused={focused} teamColor={theme.primary} />,
        }}
      />
      <Tabs.Screen
        name="standings"
        options={{
          title: "Standings",
          tabBarIcon: ({ size, focused }) => <TabIcon name="list" size={size} focused={focused} teamColor={theme.primary} />,
        }}
      />
      <Tabs.Screen
        name="loadsave"
        options={{
          title: "Franchise",
          tabBarIcon: ({ size, focused }) => <TabIcon name="shield" size={size} focused={focused} teamColor={theme.primary} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="customize"
        options={{
          title: "Customize",
          tabBarIcon: ({ size, focused }) => <TabIcon name="sliders" size={size} focused={focused} teamColor={theme.primary} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: "Stats",
          tabBarIcon: ({ size, focused }) => <TabIcon name="bar-chart-2" size={size} focused={focused} teamColor={theme.primary} />,
        }}
      />
    </Tabs>
  );
}
