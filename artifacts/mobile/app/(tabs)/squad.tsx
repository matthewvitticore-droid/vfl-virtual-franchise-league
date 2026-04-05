import { Feather } from "@expo/vector-icons";
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
import { StatBar } from "@/components/StatBar";
import { useGame } from "@/context/GameContext";
import { Player, Position } from "@/context/GameContext";
import { useColors } from "@/hooks/useColors";

const POSITIONS: Position[] = ["GK", "DEF", "MID", "FWD"];

const POSITION_COLORS: Record<Position, string> = {
  GK: "#e3b341",
  DEF: "#1f6feb",
  MID: "#3fb950",
  FWD: "#f85149",
};

export default function SquadScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getPlayerTeam } = useGame();
  const playerTeam = getPlayerTeam();
  const [selectedPos, setSelectedPos] = useState<Position | "ALL">("ALL");
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const filtered = useMemo(() => {
    if (!playerTeam) return [];
    return selectedPos === "ALL"
      ? playerTeam.players
      : playerTeam.players.filter(p => p.position === selectedPos);
  }, [playerTeam, selectedPos]);

  const sortedPlayers = useMemo(
    () => [...filtered].sort((a, b) => b.rating - a.rating),
    [filtered]
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (!playerTeam) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Squad</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {playerTeam.name} · {playerTeam.players.length} players
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filters}>
          {(["ALL", ...POSITIONS] as (Position | "ALL")[]).map(pos => (
            <TouchableOpacity
              key={pos}
              onPress={() => setSelectedPos(pos)}
              style={[
                styles.filterBtn,
                {
                  backgroundColor: selectedPos === pos
                    ? (pos === "ALL" ? colors.primary : POSITION_COLORS[pos as Position])
                    : colors.card,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: selectedPos === pos ? (pos === "ALL" ? "#000" : "#fff") : colors.mutedForeground },
                ]}
              >
                {pos}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === "web" ? 34 + 84 : 100 }]}
      >
        {sortedPlayers.map(player => (
          <TouchableOpacity
            key={player.id}
            onPress={() => setSelectedPlayer(selectedPlayer?.id === player.id ? null : player)}
            activeOpacity={0.8}
            style={[
              styles.playerCard,
              {
                backgroundColor: colors.card,
                borderColor: selectedPlayer?.id === player.id ? POSITION_COLORS[player.position] : colors.border,
                borderWidth: selectedPlayer?.id === player.id ? 1.5 : 1,
              },
            ]}
          >
            <View style={styles.playerRow}>
              <View style={[styles.posBadge, { backgroundColor: POSITION_COLORS[player.position] + "30" }]}>
                <Text style={[styles.posText, { color: POSITION_COLORS[player.position] }]}>{player.position}</Text>
              </View>
              <View style={styles.playerInfo}>
                <Text style={[styles.playerName, { color: colors.foreground }]}>{player.name}</Text>
                <Text style={[styles.playerAge, { color: colors.mutedForeground }]}>Age {player.age}</Text>
              </View>
              <View style={[styles.ratingBadge, { backgroundColor: getRatingBg(player.rating, colors) }]}>
                <Text style={[styles.ratingText, { color: getRatingColor(player.rating, colors) }]}>{player.rating}</Text>
              </View>
              <Feather
                name={selectedPlayer?.id === player.id ? "chevron-up" : "chevron-down"}
                size={16}
                color={colors.mutedForeground}
              />
            </View>

            {selectedPlayer?.id === player.id && (
              <View style={[styles.expanded, { borderTopColor: colors.border }]}>
                <StatBar label="PAC" value={player.pace} color={colors.accent} />
                <StatBar label="SHO" value={player.shooting} color={colors.danger} />
                <StatBar label="PAS" value={player.passing} color={colors.success} />
                <StatBar label="DEF" value={player.defending} color={colors.warning} />
                <View style={styles.statsRow}>
                  <StatItem label="Goals" value={player.goals} />
                  <StatItem label="Assists" value={player.assists} />
                  <StatItem label="Apps" value={player.appearances} />
                </View>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

function StatItem({ label, value }: { label: string; value: number }) {
  const colors = useColors();
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: colors.foreground }}>{value}</Text>
      <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>{label}</Text>
    </View>
  );
}

function getRatingBg(rating: number, colors: ReturnType<typeof useColors>) {
  if (rating >= 85) return colors.success + "30";
  if (rating >= 75) return colors.warning + "30";
  return colors.danger + "30";
}

function getRatingColor(rating: number, colors: ReturnType<typeof useColors>) {
  if (rating >= 85) return colors.success;
  if (rating >= 75) return colors.warning;
  return colors.danger;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
    marginBottom: 12,
  },
  filterScroll: { marginBottom: 8 },
  filters: {
    gap: 8,
    paddingRight: 20,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
  },
  filterText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  list: {
    padding: 16,
    gap: 10,
  },
  playerCard: {
    borderRadius: 12,
    padding: 14,
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  posBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  posText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  playerAge: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  ratingBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  ratingText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  expanded: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    gap: 2,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 12,
    paddingTop: 12,
  },
});
