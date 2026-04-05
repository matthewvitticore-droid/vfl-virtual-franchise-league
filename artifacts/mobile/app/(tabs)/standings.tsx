import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NFLTeamBadge } from "@/components/NFLTeamBadge";
import { useColors } from "@/hooks/useColors";
import { Conference, Division, NFLTeam, useNFL } from "@/context/NFLContext";

const CONFERENCES: Conference[] = ["AFC", "NFC"];
const DIVISIONS: Division[] = ["East", "North", "South", "West"];

export default function StandingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { season, getStandings } = useNFL();
  const [activeConf, setActiveConf] = useState<Conference>("AFC");
  const [viewMode, setViewMode] = useState<"division" | "conference">("division");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const confTeams = getStandings(activeConf);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Standings</Text>

        {/* Conference Toggle */}
        <View style={[styles.confToggle, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          {CONFERENCES.map(conf => (
            <TouchableOpacity
              key={conf}
              onPress={() => setActiveConf(conf)}
              style={[styles.confBtn, { backgroundColor: activeConf === conf ? colors.nflBlue : "transparent" }]}
            >
              <Text style={[styles.confBtnText, { color: activeConf === conf ? "#fff" : colors.mutedForeground }]}>{conf}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* View Mode */}
        <View style={styles.viewModeRow}>
          {(["division", "conference"] as const).map(mode => (
            <TouchableOpacity
              key={mode}
              onPress={() => setViewMode(mode)}
              style={[styles.viewModeBtn, viewMode === mode && { borderBottomColor: colors.nflGold, borderBottomWidth: 2 }]}
            >
              <Text style={[styles.viewModeBtnText, { color: viewMode === mode ? colors.nflGold : colors.mutedForeground }]}>
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 120 : 110 }} showsVerticalScrollIndicator={false}>
        {/* Column Headers */}
        <View style={[styles.colHeader, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.colTeam, { color: colors.mutedForeground }]}>Team</Text>
          <Text style={[styles.colStat, { color: colors.mutedForeground }]}>W</Text>
          <Text style={[styles.colStat, { color: colors.mutedForeground }]}>L</Text>
          <Text style={[styles.colStat, { color: colors.mutedForeground }]}>T</Text>
          <Text style={[styles.colStat, { color: colors.mutedForeground }]}>PCT</Text>
          <Text style={[styles.colStat, { color: colors.mutedForeground }]}>PF</Text>
          <Text style={[styles.colStat, { color: colors.mutedForeground }]}>PA</Text>
        </View>

        {viewMode === "division" ? (
          DIVISIONS.map(div => {
            const divTeams = confTeams.filter(t => t.division === div);
            if (divTeams.length === 0) return null;
            return (
              <View key={div} style={styles.divSection}>
                <View style={[styles.divHeader, { backgroundColor: colors.nflBlue + "30" }]}>
                  <Text style={[styles.divHeaderText, { color: colors.nflGold }]}>{activeConf} {div}</Text>
                </View>
                {divTeams.map((t, idx) => (
                  <TeamRow key={t.id} team={t} rank={idx + 1} myTeamId={season?.playerTeamId} />
                ))}
              </View>
            );
          })
        ) : (
          <View>
            {confTeams.map((t, idx) => (
              <TeamRow key={t.id} team={t} rank={idx + 1} myTeamId={season?.playerTeamId} showDivision />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function TeamRow({ team, rank, myTeamId, showDivision }: { team: NFLTeam; rank: number; myTeamId?: string; showDivision?: boolean }) {
  const colors = useColors();
  const isMe = team.id === myTeamId;
  const total = team.wins + team.losses + team.ties;
  const pct = total === 0 ? ".000" : (team.wins / total).toFixed(3).replace("0.", ".");
  const rankColor = rank === 1 ? colors.nflGold : rank <= 4 ? colors.success : colors.mutedForeground;

  return (
    <View style={[styles.teamRow, { backgroundColor: isMe ? team.primaryColor + "18" : "transparent", borderBottomColor: colors.border, borderLeftColor: isMe ? team.primaryColor : "transparent" }]}>
      <Text style={[styles.rankText, { color: rankColor }]}>{rank}</Text>
      <View style={styles.teamCell}>
        <NFLTeamBadge abbreviation={team.abbreviation} primaryColor={team.primaryColor} size="xs" />
        <View>
          <Text style={[styles.teamName, { color: isMe ? team.primaryColor : colors.foreground }]} numberOfLines={1}>
            {team.city} {team.name}
          </Text>
          {showDivision && (
            <Text style={[styles.divisionLabel, { color: colors.mutedForeground }]}>{team.division}</Text>
          )}
        </View>
        {isMe && <View style={[styles.youBadge, { backgroundColor: team.primaryColor }]}><Text style={styles.youBadgeText}>YOU</Text></View>}
      </View>
      <Text style={[styles.colStat, { color: colors.success }]}>{team.wins}</Text>
      <Text style={[styles.colStat, { color: colors.danger }]}>{team.losses}</Text>
      <Text style={[styles.colStat, { color: colors.mutedForeground }]}>{team.ties}</Text>
      <Text style={[styles.colStat, { color: colors.foreground }]}>{pct}</Text>
      <Text style={[styles.colStat, { color: colors.mutedForeground }]}>{team.pointsFor}</Text>
      <Text style={[styles.colStat, { color: colors.mutedForeground }]}>{team.pointsAgainst}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 0 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5, marginBottom: 12 },
  confToggle: { flexDirection: "row", borderRadius: 10, padding: 3, borderWidth: 1, marginBottom: 10 },
  confBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
  confBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  viewModeRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#252535" },
  viewModeBtn: { flex: 1, alignItems: "center", paddingVertical: 10 },
  viewModeBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  colHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 8 },
  colTeam: { flex: 1, fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, paddingLeft: 28 },
  colStat: { width: 38, textAlign: "center", fontSize: 10, fontFamily: "Inter_600SemiBold" },
  divSection: { marginBottom: 4 },
  divHeader: { paddingHorizontal: 16, paddingVertical: 8 },
  divHeaderText: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.5, textTransform: "uppercase" },
  teamRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 11, borderBottomWidth: 1, borderLeftWidth: 3 },
  rankText: { fontSize: 12, fontFamily: "Inter_700Bold", width: 22, textAlign: "center" },
  teamCell: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  teamName: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  divisionLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  youBadge: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  youBadgeText: { fontSize: 7, fontFamily: "Inter_700Bold", color: "#000" },
});
