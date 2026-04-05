import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TeamBadge } from "@/components/TeamBadge";
import { Match, MatchEvent, useGame } from "@/context/GameContext";
import { useColors } from "@/hooks/useColors";

const EVENT_ICONS: Record<string, string> = {
  goal: "target",
  yellow_card: "square",
  red_card: "square",
  substitution: "repeat",
  chance: "zap",
};

export default function MatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { season, simulateMatch } = useGame();
  const [simulating, setSimulating] = useState(false);
  const [liveMatch, setLiveMatch] = useState<Match | null>(null);
  const [visibleEvents, setVisibleEvents] = useState<MatchEvent[]>([]);
  const [currentMinute, setCurrentMinute] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const match = useMemo(
    () => liveMatch ?? season?.matches.find(m => m.id === id),
    [id, season, liveMatch]
  );
  const homeTeam = useMemo(() => season?.teams.find(t => t.id === match?.homeTeamId), [season, match]);
  const awayTeam = useMemo(() => season?.teams.find(t => t.id === match?.awayTeamId), [season, match]);

  const isPlayerMatch = match?.homeTeamId === season?.playerTeamId || match?.awayTeamId === season?.playerTeamId;

  useEffect(() => {
    if (simulating) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [simulating]);

  const handleSimulate = async () => {
    if (!match || match.status === "completed") return;
    setSimulating(true);
    setVisibleEvents([]);
    setCurrentMinute(0);

    try {
      const result = await simulateMatch(match.id);
      setLiveMatch(result);

      const events = result.events;
      for (let i = 0; i < events.length; i++) {
        await new Promise(r => setTimeout(r, 500));
        setCurrentMinute(events[i].minute);
        setVisibleEvents(prev => [...prev, events[i]]);
        if (events[i].type === "goal") {
          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }
      }
      await new Promise(r => setTimeout(r, 400));
      setCurrentMinute(90);
    } finally {
      setSimulating(false);
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (!match || !homeTeam || !awayTeam) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const displayEvents = simulating ? visibleEvents : match.events;
  const displayHomeScore = simulating
    ? visibleEvents.filter(e => e.type === "goal" && e.team === "home").length
    : match.homeScore;
  const displayAwayScore = simulating
    ? visibleEvents.filter(e => e.type === "goal" && e.team === "away").length
    : match.awayScore;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Back Button */}
      <TouchableOpacity
        onPress={() => router.back()}
        style={[styles.backBtn, { top: topPad + 12 }]}
      >
        <Feather name="arrow-left" size={20} color={colors.foreground} />
      </TouchableOpacity>

      {/* Scoreboard */}
      <View style={[styles.scoreboard, { backgroundColor: colors.card, paddingTop: topPad + 60 }]}>
        <View style={styles.teamCol}>
          <TeamBadge shortName={homeTeam.shortName} color={homeTeam.color} size="lg" />
          <Text style={[styles.teamName, { color: colors.foreground }]} numberOfLines={2}>
            {homeTeam.name}
          </Text>
          <Text style={[styles.teamLabel, { color: colors.mutedForeground }]}>HOME</Text>
        </View>

        <View style={styles.scoreCenter}>
          {simulating && (
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <View style={[styles.liveBadge, { backgroundColor: colors.danger }]}>
                <Text style={styles.liveBadgeText}>LIVE {currentMinute}'</Text>
              </View>
            </Animated.View>
          )}
          <Text style={[styles.score, { color: colors.foreground }]}>
            {displayHomeScore} - {displayAwayScore}
          </Text>
          {match.status === "completed" && !simulating && (
            <Text style={[styles.ftLabel, { color: colors.mutedForeground }]}>FULL TIME</Text>
          )}
          {match.status === "upcoming" && !simulating && (
            <Text style={[styles.ftLabel, { color: colors.mutedForeground }]}>UPCOMING</Text>
          )}
        </View>

        <View style={styles.teamCol}>
          <TeamBadge shortName={awayTeam.shortName} color={awayTeam.color} size="lg" />
          <Text style={[styles.teamName, { color: colors.foreground }]} numberOfLines={2}>
            {awayTeam.name}
          </Text>
          <Text style={[styles.teamLabel, { color: colors.mutedForeground }]}>AWAY</Text>
        </View>
      </View>

      {/* Simulate Button */}
      {match.status === "upcoming" && !simulating && (
        <TouchableOpacity
          onPress={handleSimulate}
          activeOpacity={0.8}
          style={[styles.simBtn, { backgroundColor: colors.primary }]}
        >
          <Feather name="play" size={18} color="#000" />
          <Text style={[styles.simBtnText, { color: "#000" }]}>Simulate Match</Text>
        </TouchableOpacity>
      )}

      {simulating && (
        <View style={[styles.simBtn, { backgroundColor: colors.secondary }]}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={[styles.simBtnText, { color: colors.mutedForeground }]}>Match in progress...</Text>
        </View>
      )}

      {/* Commentary */}
      <FlatList
        data={[...displayEvents].reverse()}
        keyExtractor={(_, i) => i.toString()}
        contentContainerStyle={[styles.events, { paddingBottom: Platform.OS === "web" ? 34 + 84 : 100 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          match.status === "upcoming" && !simulating ? (
            <View style={styles.empty}>
              <Feather name="clock" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Match hasn't started yet
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.mutedForeground }]}>
                Tap simulate to play this match
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item: event }) => (
          <View style={[styles.event, { borderLeftColor: getEventColor(event, colors), backgroundColor: colors.card }]}>
            <View style={[styles.minuteBadge, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.minuteText, { color: colors.mutedForeground }]}>{event.minute}'</Text>
            </View>
            <View style={styles.eventContent}>
              <View style={styles.eventHeader}>
                <Feather
                  name={EVENT_ICONS[event.type] as any}
                  size={14}
                  color={getEventColor(event, colors)}
                />
                <Text style={[styles.eventPlayer, { color: colors.foreground }]}>
                  {event.playerName}
                </Text>
                <Text style={[styles.eventTeam, { color: colors.mutedForeground }]}>
                  {event.team === "home" ? homeTeam.shortName : awayTeam.shortName}
                </Text>
              </View>
              <Text style={[styles.eventDesc, { color: colors.mutedForeground }]}>
                {event.description}
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

function getEventColor(event: MatchEvent, colors: ReturnType<typeof useColors>) {
  if (event.type === "goal") return colors.success;
  if (event.type === "yellow_card") return colors.warning;
  if (event.type === "red_card") return colors.danger;
  if (event.type === "chance") return colors.accent;
  return colors.mutedForeground;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  backBtn: {
    position: "absolute",
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreboard: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 24,
    paddingHorizontal: 20,
    gap: 12,
  },
  teamCol: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  teamName: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    lineHeight: 18,
  },
  teamLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1,
  },
  scoreCenter: {
    alignItems: "center",
    gap: 4,
  },
  score: {
    fontSize: 44,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1,
  },
  ftLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
  },
  liveBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 4,
  },
  liveBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.5,
  },
  simBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: 14,
  },
  simBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  events: {
    padding: 16,
    gap: 10,
  },
  event: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    padding: 12,
    marginBottom: 8,
  },
  minuteBadge: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 36,
    alignItems: "center",
  },
  minuteText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  eventContent: {
    flex: 1,
    gap: 3,
  },
  eventHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  eventPlayer: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  eventTeam: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  eventDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
});
