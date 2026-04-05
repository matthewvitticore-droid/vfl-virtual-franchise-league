import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MatchCard } from "@/components/MatchCard";
import { useGame } from "@/context/GameContext";
import { useColors } from "@/hooks/useColors";

export default function FixturesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { season, getMatchesForWeek } = useGame();
  const [selectedWeek, setSelectedWeek] = useState(season?.currentWeek ?? 1);

  const totalWeeks = season?.totalWeeks ?? 1;
  const weekMatches = useMemo(() => getMatchesForWeek(selectedWeek), [selectedWeek, getMatchesForWeek]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const weeks = Array.from({ length: totalWeeks }, (_, i) => i + 1);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Fixtures</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.weekScroll}
          style={{ marginTop: 12 }}
        >
          {weeks.map(w => (
            <TouchableOpacity
              key={w}
              onPress={() => setSelectedWeek(w)}
              style={[
                styles.weekBtn,
                {
                  backgroundColor: w === selectedWeek ? colors.primary : colors.card,
                  borderColor: w === season?.currentWeek && w !== selectedWeek ? colors.primary + "60" : "transparent",
                  borderWidth: 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.weekBtnText,
                  { color: w === selectedWeek ? "#000" : colors.mutedForeground },
                ]}
              >
                GW{w}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === "web" ? 34 + 84 : 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.weekHeader}>
          <Feather name="calendar" size={14} color={colors.mutedForeground} />
          <Text style={[styles.weekLabel, { color: colors.mutedForeground }]}>
            Gameweek {selectedWeek}
            {selectedWeek === season?.currentWeek ? " (Current)" : ""}
          </Text>
          <Text style={[styles.matchCount, { color: colors.mutedForeground }]}>
            {weekMatches.filter(m => m.status === "completed").length}/{weekMatches.length} played
          </Text>
        </View>

        {weekMatches.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="inbox" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No matches this week</Text>
          </View>
        ) : (
          weekMatches.map(m => {
            const home = season!.teams.find(t => t.id === m.homeTeamId)!;
            const away = season!.teams.find(t => t.id === m.awayTeamId)!;
            return (
              <MatchCard
                key={m.id}
                match={m}
                homeTeam={home}
                awayTeam={away}
                isPlayerMatch={
                  m.homeTeamId === season?.playerTeamId || m.awayTeamId === season?.playerTeamId
                }
                onPress={() => router.push({ pathname: "/match/[id]", params: { id: m.id } })}
              />
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  weekScroll: {
    gap: 8,
    paddingRight: 20,
  },
  weekBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  weekBtnText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  content: {
    padding: 20,
  },
  weekHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  weekLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  matchCount: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  empty: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
});
