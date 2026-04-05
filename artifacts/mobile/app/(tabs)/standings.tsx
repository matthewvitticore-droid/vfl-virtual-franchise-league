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
import { NFLTeamBadge } from "@/components/NFLTeamBadge";
import { useColors } from "@/hooks/useColors";
import { Conference, Division, NFLTeam, useNFL } from "@/context/NFLContext";

const CONFERENCES: Conference[] = ["Ironclad", "Gridiron"];
const DIVISIONS: Division[] = ["East", "North", "South", "West"];

interface TeamRecord {
  id: string;
  homeW: number; homeL: number;
  awayW: number; awayL: number;
  divW: number;  divL: number;
  streak: string;
}

function buildRecords(teams: NFLTeam[], games: any[]): Map<string, TeamRecord> {
  const map = new Map<string, TeamRecord>();
  for (const t of teams) {
    map.set(t.id, { id: t.id, homeW: 0, homeL: 0, awayW: 0, awayL: 0, divW: 0, divL: 0, streak: "—" });
  }
  const teamById = new Map(teams.map(t => [t.id, t]));
  const finalGames = [...games].filter(g => g.status === "final").sort((a, b) => a.week - b.week);

  for (const g of finalGames) {
    const homeTeam = teamById.get(g.homeTeamId);
    const awayTeam = teamById.get(g.awayTeamId);
    const homeWon = g.homeScore > g.awayScore;
    const isDivGame = homeTeam && awayTeam && homeTeam.division === awayTeam.division;

    const homeRec = map.get(g.homeTeamId);
    const awayRec = map.get(g.awayTeamId);
    if (homeRec) {
      if (homeWon) { homeRec.homeW++; if (isDivGame) homeRec.divW++; }
      else         { homeRec.homeL++; if (isDivGame) homeRec.divL++; }
    }
    if (awayRec) {
      if (!homeWon) { awayRec.awayW++; if (isDivGame) awayRec.divW++; }
      else          { awayRec.awayL++; if (isDivGame) awayRec.divL++; }
    }
  }

  // Compute streak per team (last result repeated consecutively)
  for (const t of teams) {
    const teamGames = finalGames.filter(g => g.homeTeamId === t.id || g.awayTeamId === t.id).reverse();
    if (teamGames.length === 0) continue;
    const firstResult = teamGames[0].homeTeamId === t.id
      ? teamGames[0].homeScore > teamGames[0].awayScore
      : teamGames[0].awayScore > teamGames[0].homeScore;
    let count = 1;
    for (let i = 1; i < teamGames.length; i++) {
      const g = teamGames[i];
      const won = g.homeTeamId === t.id ? g.homeScore > g.awayScore : g.awayScore > g.homeScore;
      if (won === firstResult) count++;
      else break;
    }
    const rec = map.get(t.id)!;
    rec.streak = `${firstResult ? "W" : "L"}${count}`;
  }

  return map;
}

export default function StandingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { season, getStandings } = useNFL();
  const [activeConf, setActiveConf] = useState<Conference>("Ironclad");
  const [viewMode, setViewMode] = useState<"division" | "conference">("division");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const confTeams = getStandings(activeConf);

  const records = useMemo(() => {
    if (!season) return new Map<string, TeamRecord>();
    return buildRecords(season.teams, season.games);
  }, [season]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Standings</Text>

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

        <View style={[styles.viewModeRow, { borderBottomColor: colors.border }]}>
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ minWidth: "100%" }}>
            <View style={[styles.colHeader, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.colTeam, { color: colors.mutedForeground }]}>TEAM</Text>
              <ColH label="W"    color={colors.mutedForeground} w={30} />
              <ColH label="L"    color={colors.mutedForeground} w={30} />
              <ColH label="PCT"  color={colors.mutedForeground} w={44} />
              <ColH label="PF"   color={colors.mutedForeground} w={38} />
              <ColH label="PA"   color={colors.mutedForeground} w={38} />
              <ColH label="DIFF" color={colors.mutedForeground} w={44} />
              <ColH label="HOME" color={colors.mutedForeground} w={50} />
              <ColH label="AWAY" color={colors.mutedForeground} w={50} />
              <ColH label="DIV"  color={colors.mutedForeground} w={46} />
              <ColH label="STRK" color={colors.mutedForeground} w={46} />
            </View>

            {viewMode === "division" ? (
              DIVISIONS.map(div => {
                const divTeams = confTeams.filter(t => t.division === div);
                if (divTeams.length === 0) return null;
                return (
                  <View key={div} style={styles.divSection}>
                    <View style={[styles.divHeader, { backgroundColor: colors.nflBlue + "25" }]}>
                      <Text style={[styles.divHeaderText, { color: colors.nflGold }]}>{activeConf} {div}</Text>
                    </View>
                    {divTeams.map((t, idx) => (
                      <TeamRow key={t.id} team={t} rank={idx + 1} myTeamId={season?.playerTeamId} rec={records.get(t.id)} colors={colors} />
                    ))}
                  </View>
                );
              })
            ) : (
              <View>
                {confTeams.map((t, idx) => (
                  <TeamRow key={t.id} team={t} rank={idx + 1} myTeamId={season?.playerTeamId} showDivision rec={records.get(t.id)} colors={colors} />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  );
}

function ColH({ label, color, w }: { label: string; color: string; w: number }) {
  return <Text style={{ width: w, textAlign: "center", fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.5, color }}>{label}</Text>;
}

function TeamRow({ team, rank, myTeamId, showDivision, rec, colors }: {
  team: NFLTeam; rank: number; myTeamId?: string; showDivision?: boolean; rec?: TeamRecord; colors: any;
}) {
  const isMe = team.id === myTeamId;
  const total = team.wins + team.losses + team.ties;
  const pct = total === 0 ? ".000" : (team.wins / total).toFixed(3).replace("0.", ".");
  const diff = team.pointsFor - team.pointsAgainst;
  const diffStr = diff > 0 ? `+${diff}` : `${diff}`;
  const rankColor = rank === 1 ? "#FFD700" : rank <= 4 ? colors.success : colors.mutedForeground;

  const streakColor = (s: string) => {
    if (!s || s === "—") return colors.mutedForeground;
    return s.startsWith("W") ? colors.success : colors.danger;
  };

  return (
    <View style={[
      styles.teamRow,
      {
        backgroundColor: isMe ? team.primaryColor + "15" : "transparent",
        borderBottomColor: colors.border,
        borderLeftColor: isMe ? team.primaryColor : "transparent",
      },
    ]}>
      <Text style={[styles.rankText, { color: rankColor }]}>{rank}</Text>
      <View style={styles.teamCell}>
        <NFLTeamBadge abbreviation={team.abbreviation} primaryColor={team.primaryColor} size="xs" />
        <View style={{ minWidth: 0 }}>
          <Text style={[styles.teamName, { color: isMe ? team.primaryColor : colors.foreground }]} numberOfLines={1}>
            {team.city} {team.name}
          </Text>
          {showDivision && (
            <Text style={[styles.divisionLabel, { color: colors.mutedForeground }]}>{team.division}</Text>
          )}
        </View>
        {isMe && <View style={[styles.youBadge, { backgroundColor: team.primaryColor }]}><Text style={styles.youBadgeText}>YOU</Text></View>}
      </View>
      <ColV value={`${team.wins}`}   color={colors.success} w={30} bold />
      <ColV value={`${team.losses}`} color={colors.danger}  w={30} bold />
      <ColV value={pct}              color={colors.foreground} w={44} />
      <ColV value={`${team.pointsFor}`}     color={colors.mutedForeground} w={38} />
      <ColV value={`${team.pointsAgainst}`} color={colors.mutedForeground} w={38} />
      <ColV value={diffStr} color={diff >= 0 ? colors.success : colors.danger} w={44} bold />
      <ColV value={rec ? `${rec.homeW}-${rec.homeL}` : "—"} color={colors.mutedForeground} w={50} />
      <ColV value={rec ? `${rec.awayW}-${rec.awayL}` : "—"} color={colors.mutedForeground} w={50} />
      <ColV value={rec ? `${rec.divW}-${rec.divL}` : "—"}   color={colors.mutedForeground} w={46} />
      <ColV value={rec?.streak ?? "—"} color={streakColor(rec?.streak ?? "")} w={46} bold />
    </View>
  );
}

function ColV({ value, color, w, bold }: { value: string; color: string; w: number; bold?: boolean }) {
  return (
    <Text style={{
      width: w, textAlign: "center", fontSize: 11,
      fontFamily: bold ? "Inter_700Bold" : "Inter_400Regular",
      color,
    }}>
      {value}
    </Text>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1 },
  header:         { paddingHorizontal: 16, paddingBottom: 0 },
  title:          { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5, marginBottom: 12 },
  confToggle:     { flexDirection: "row", borderRadius: 10, padding: 3, borderWidth: 1, marginBottom: 10 },
  confBtn:        { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
  confBtnText:    { fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  viewModeRow:    { flexDirection: "row", borderBottomWidth: 1 },
  viewModeBtn:    { flex: 1, alignItems: "center", paddingVertical: 10 },
  viewModeBtnText:{ fontSize: 13, fontFamily: "Inter_600SemiBold" },
  colHeader:      { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 7 },
  colTeam:        { width: 148, fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.5, paddingLeft: 32 },
  divSection:     { marginBottom: 4 },
  divHeader:      { paddingHorizontal: 16, paddingVertical: 7 },
  divHeaderText:  { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.8, textTransform: "uppercase" },
  teamRow:        { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 10, borderBottomWidth: 1, borderLeftWidth: 3 },
  rankText:       { fontSize: 12, fontFamily: "Inter_700Bold", width: 20, textAlign: "center" },
  teamCell:       { width: 148, flexDirection: "row", alignItems: "center", gap: 6, paddingRight: 4 },
  teamName:       { fontSize: 11, fontFamily: "Inter_600SemiBold", flexShrink: 1 },
  divisionLabel:  { fontSize: 9, fontFamily: "Inter_400Regular" },
  youBadge:       { paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 },
  youBadgeText:   { fontSize: 7, fontFamily: "Inter_700Bold", color: "#000" },
});
