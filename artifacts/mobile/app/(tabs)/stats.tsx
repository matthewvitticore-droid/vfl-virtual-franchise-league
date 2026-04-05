import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useNFL } from "@/context/NFLContext";
import { PlayerCard } from "@/components/PlayerCard";
import type { Player, NFLPosition, PlayerSeasonStats } from "@/context/types";

type StatTab = "passing" | "rushing" | "receiving" | "defense" | "specTeams" | "records";
type DefSort = "tackles" | "sacks" | "defensiveINTs" | "passDeflections" | "forcedFumbles";

const POS_COLOR: Record<NFLPosition, string> = {
  QB:"#E31837", RB:"#FB4F14", WR:"#FFC20E", TE:"#00B5E2", OL:"#8B949E",
  DE:"#3FB950", DT:"#26A69A", LB:"#1F6FEB", CB:"#6E40C9", S:"#9C27B0",
  K:"#FF7043", P:"#795548",
};

interface PlayerWithTeam extends Player {
  teamAbbr: string;
  teamColor: string;
  teamSecondary: string;
}

interface RecordEntry {
  category: string;
  value: string;
  playerName: string;
  team: string;
  season?: number;
}

function ovrColor(v: number) {
  if (v >= 90) return "#FFD700";
  if (v >= 80) return "#3FB950";
  if (v >= 70) return "#FFC107";
  return "#E31837";
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ label, colors }: { label: string; colors: any }) {
  return (
    <View style={[st.sectionLabel, { backgroundColor: colors.secondary, borderBottomColor: colors.border }]}>
      <Text style={[st.sectionLabelText, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function LeaderRow({
  rank, player, cols, colors, onPress,
}: {
  rank: number; player: PlayerWithTeam; cols: string[]; colors: any; onPress: () => void;
}) {
  const pc = POS_COLOR[player.position];
  const isTop3 = rank <= 3;
  const rankColor = rank === 1 ? "#FFD700" : rank === 2 ? "#C0C0C0" : rank === 3 ? "#CD7F32" : colors.mutedForeground;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}
      style={[st.leaderRow, { backgroundColor: isTop3 ? player.teamColor + "0C" : colors.card, borderBottomColor: colors.border }]}>
      <Text style={[st.leaderRank, { color: rankColor }]}>{rank}</Text>
      <View style={[st.posDot, { backgroundColor: pc + "22" }]}>
        <Text style={[st.posDotText, { color: pc }]}>{player.position}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[st.leaderName, { color: colors.foreground }]} numberOfLines={1}>{player.name}</Text>
        <Text style={[st.leaderTeam, { color: colors.mutedForeground }]}>{player.teamAbbr} · #{player.jerseyNumber ?? "—"}</Text>
      </View>
      {cols.map((c, i) => (
        <Text key={i} style={[st.leaderStat, {
          color: i === 0 ? ovrColor(player.overall) : colors.foreground,
          fontFamily: i === 0 ? "Inter_700Bold" : "Inter_600SemiBold",
        }]}>{c}</Text>
      ))}
    </TouchableOpacity>
  );
}

function ColHeader({ labels, colors }: { labels: string[]; colors: any }) {
  return (
    <View style={[st.colHeader, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
      <Text style={[st.colRank, { color: colors.mutedForeground }]}>#</Text>
      <View style={{ width: 28 }} />
      <Text style={[st.colName, { color: colors.mutedForeground }]}>PLAYER</Text>
      {labels.map((l, i) => (
        <Text key={i} style={[st.colStat, { color: colors.mutedForeground }]}>{l}</Text>
      ))}
    </View>
  );
}

function EmptyStatsMsg({ colors }: { colors: any }) {
  return (
    <View style={st.emptyBox}>
      <Feather name="bar-chart-2" size={32} color={colors.mutedForeground} />
      <Text style={[st.emptyTitle, { color: colors.foreground }]}>No stats yet</Text>
      <Text style={[st.emptySub, { color: colors.mutedForeground }]}>Simulate games to see leaderboards populate</Text>
    </View>
  );
}

function RecordRow({ r, idx, colors }: { r: RecordEntry; idx: number; colors: any }) {
  const noData = r.value === "—";
  return (
    <View style={[st.recordRow, { backgroundColor: idx % 2 === 0 ? colors.card : colors.background, borderBottomColor: colors.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={[st.recordCategory, { color: colors.mutedForeground }]}>{r.category}</Text>
        <Text style={[st.recordPlayer, { color: noData ? colors.mutedForeground : colors.foreground }]}>
          {noData ? "No data yet" : `${r.playerName} · ${r.team}`}
        </Text>
      </View>
      <View>
        <Text style={[st.recordValue, { color: noData ? colors.mutedForeground : colors.nflGold }]}>{r.value}</Text>
        {r.season && !noData && (
          <Text style={[st.recordSeason, { color: colors.mutedForeground }]}>Season {r.season}</Text>
        )}
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function StatsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { season } = useNFL();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [tab, setTab] = useState<StatTab>("passing");
  const [defSort, setDefSort] = useState<DefSort>("tackles");
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerWithTeam | null>(null);

  const allPlayers = useMemo<PlayerWithTeam[]>(() => {
    if (!season) return [];
    return season.teams.flatMap(t =>
      t.roster.map(p => ({
        ...p,
        teamAbbr: t.abbreviation,
        teamColor: t.primaryColor,
        teamSecondary: t.secondaryColor,
      }))
    );
  }, [season]);

  const gamesPlayed = season?.games.filter(g => g.played).length ?? 0;

  const passing = useMemo(() =>
    allPlayers.filter(p => p.position === "QB" && (p.stats.attempts > 0 || p.stats.passingYards > 0))
      .sort((a, b) => b.stats.passingYards - a.stats.passingYards).slice(0, 25),
    [allPlayers]
  );
  const rushing = useMemo(() =>
    allPlayers.filter(p => ["QB","RB","WR"].includes(p.position) && p.stats.rushingYards > 0)
      .sort((a, b) => b.stats.rushingYards - a.stats.rushingYards).slice(0, 25),
    [allPlayers]
  );
  const receiving = useMemo(() =>
    allPlayers.filter(p => ["RB","WR","TE"].includes(p.position) && p.stats.receivingYards > 0)
      .sort((a, b) => b.stats.receivingYards - a.stats.receivingYards).slice(0, 25),
    [allPlayers]
  );
  const defense = useMemo(() => {
    const base = allPlayers.filter(p => ["DE","DT","LB","CB","S"].includes(p.position));
    return [...base].sort((a, b) => b.stats[defSort] - a.stats[defSort]).slice(0, 25);
  }, [allPlayers, defSort]);

  const specTeams = useMemo(() =>
    allPlayers.filter(p => ["K","P"].includes(p.position))
      .sort((a, b) => b.stats.fieldGoalsMade + b.stats.puntsAverage - (a.stats.fieldGoalsMade + a.stats.puntsAverage))
      .slice(0, 20),
    [allPlayers]
  );

  const records = useMemo((): RecordEntry[] => {
    type GetFn = (s: PlayerSeasonStats) => number;
    function best(
      category: string, filter: (p: PlayerWithTeam) => boolean, get: GetFn, fmt: (v: number) => string,
    ): RecordEntry {
      let bv = 0, bn = "—", bt = "—", bSeason: number | undefined;
      for (const p of allPlayers) {
        if (!filter(p)) continue;
        for (const cs of p.careerStats) {
          const v = get(cs);
          if (v > bv) { bv = v; bn = p.name; bt = p.teamAbbr; bSeason = cs.season; }
        }
        const cv = get(p.stats);
        if (cv > bv) { bv = cv; bn = p.name; bt = p.teamAbbr; bSeason = p.stats.season; }
      }
      return { category, value: bv > 0 ? fmt(bv) : "—", playerName: bn, team: bt, season: bSeason };
    }
    return [
      best("Pass Yards (Season)",  p => p.position === "QB",                              s => s.passingYards,    v => v.toLocaleString()),
      best("Pass TDs (Season)",    p => p.position === "QB",                              s => s.passingTDs,      v => String(v)),
      best("QB Rating (Season)",   p => p.position === "QB",                              s => s.qbRating,        v => String(v)),
      best("Completions (Season)", p => p.position === "QB",                              s => s.completions,     v => String(v)),
      best("Rush Yards (Season)",  p => ["RB","QB"].includes(p.position),                 s => s.rushingYards,    v => v.toLocaleString()),
      best("Rush TDs (Season)",    p => ["RB","QB"].includes(p.position),                 s => s.rushingTDs,      v => String(v)),
      best("Rush Avg (Season)",    p => p.position === "RB",                              s => s.yardsPerCarry,   v => v.toFixed(1)),
      best("Rec Yards (Season)",   p => ["WR","TE","RB"].includes(p.position),            s => s.receivingYards,  v => v.toLocaleString()),
      best("Receptions (Season)",  p => ["WR","TE","RB"].includes(p.position),            s => s.receptions,      v => String(v)),
      best("Rec TDs (Season)",     p => ["WR","TE","RB"].includes(p.position),            s => s.receivingTDs,    v => String(v)),
      best("Sacks (Season)",       p => ["DE","DT","LB"].includes(p.position),            s => s.sacks,           v => v.toFixed(1)),
      best("Tackles (Season)",     p => ["LB","CB","S"].includes(p.position),             s => s.tackles,         v => String(v)),
      best("Interceptions (Season)", p => ["CB","S","LB"].includes(p.position),           s => s.defensiveINTs,   v => String(v)),
      best("Pass Deflections (Season)", p => ["CB","S"].includes(p.position),             s => s.passDeflections, v => String(v)),
    ];
  }, [allPlayers]);

  const TABS: { key: StatTab; label: string; icon: string }[] = [
    { key:"passing",   label:"Pass",    icon:"send"        },
    { key:"rushing",   label:"Rush",    icon:"zap"         },
    { key:"receiving", label:"Rec",     icon:"target"      },
    { key:"defense",   label:"Def",     icon:"shield"      },
    { key:"specTeams", label:"ST",      icon:"star"        },
    { key:"records",   label:"Records", icon:"award"       },
  ];

  const DEF_SORTS: { key: DefSort; label: string }[] = [
    { key:"tackles",         label:"TKL"  },
    { key:"sacks",           label:"SCK"  },
    { key:"defensiveINTs",   label:"INT"  },
    { key:"passDeflections", label:"PD"   },
    { key:"forcedFumbles",   label:"FF"   },
  ];

  const teamColor = season?.teams.find(t => t.id === season.playerTeamId)?.primaryColor ?? colors.nflBlue;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[st.header, { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={st.headerTop}>
          <View>
            <Text style={[st.headerTitle, { color: colors.foreground }]}>League Stats</Text>
            <Text style={[st.headerSub, { color: colors.mutedForeground }]}>
              {season ? `Season ${season.year} · ${gamesPlayed} games played` : "No season data"}
            </Text>
          </View>
          <View style={[st.statsBadge, { backgroundColor: teamColor + "20", borderColor: teamColor + "50" }]}>
            <Feather name="bar-chart-2" size={14} color={teamColor} />
          </View>
        </View>
        {/* Tab pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 16, paddingBottom: 12 }}>
          {TABS.map(t => (
            <TouchableOpacity key={t.key} onPress={() => setTab(t.key)}
              style={[st.tabBtn, { backgroundColor: tab === t.key ? teamColor : colors.secondary, borderColor: tab === t.key ? teamColor : colors.border }]}>
              <Feather name={t.icon as any} size={11} color={tab === t.key ? "#fff" : colors.mutedForeground} />
              <Text style={[st.tabLabel, { color: tab === t.key ? "#fff" : colors.mutedForeground }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* ── PASSING ── */}
        {tab === "passing" && (
          <View>
            <ColHeader labels={["YDS","TD","INT","RTG"]} colors={colors} />
            {passing.length === 0 ? <EmptyStatsMsg colors={colors} /> : passing.map((p, i) => (
              <LeaderRow key={p.id} rank={i+1} player={p}
                cols={[p.stats.passingYards.toString(), p.stats.passingTDs.toString(), p.stats.interceptions.toString(), p.stats.qbRating.toString()]}
                colors={colors} onPress={() => setSelectedPlayer(p)} />
            ))}
          </View>
        )}

        {/* ── RUSHING ── */}
        {tab === "rushing" && (
          <View>
            <ColHeader labels={["YDS","AVG","TD","CAR"]} colors={colors} />
            {rushing.length === 0 ? <EmptyStatsMsg colors={colors} /> : rushing.map((p, i) => (
              <LeaderRow key={p.id} rank={i+1} player={p}
                cols={[p.stats.rushingYards.toString(), p.stats.yardsPerCarry.toFixed(1), p.stats.rushingTDs.toString(), p.stats.carries.toString()]}
                colors={colors} onPress={() => setSelectedPlayer(p)} />
            ))}
          </View>
        )}

        {/* ── RECEIVING ── */}
        {tab === "receiving" && (
          <View>
            <ColHeader labels={["YDS","AVG","TD","REC"]} colors={colors} />
            {receiving.length === 0 ? <EmptyStatsMsg colors={colors} /> : receiving.map((p, i) => (
              <LeaderRow key={p.id} rank={i+1} player={p}
                cols={[p.stats.receivingYards.toString(), p.stats.yardsPerCatch.toFixed(1), p.stats.receivingTDs.toString(), p.stats.receptions.toString()]}
                colors={colors} onPress={() => setSelectedPlayer(p)} />
            ))}
          </View>
        )}

        {/* ── DEFENSE ── */}
        {tab === "defense" && (
          <View>
            {/* Sort sub-tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6, padding: 10 }} style={{ flexGrow: 0, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              {DEF_SORTS.map(s => (
                <TouchableOpacity key={s.key} onPress={() => setDefSort(s.key)}
                  style={[st.subTab, { backgroundColor: defSort === s.key ? colors.nflRed + "30" : colors.secondary, borderColor: defSort === s.key ? colors.nflRed : colors.border }]}>
                  <Text style={[st.subTabText, { color: defSort === s.key ? colors.nflRed : colors.mutedForeground }]}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <ColHeader labels={["TKL","SCK","INT","PD","FF"]} colors={colors} />
            {defense.length === 0 ? <EmptyStatsMsg colors={colors} /> : defense.map((p, i) => (
              <LeaderRow key={p.id} rank={i+1} player={p}
                cols={[p.stats.tackles.toString(), p.stats.sacks.toFixed(1), p.stats.defensiveINTs.toString(), p.stats.passDeflections.toString(), p.stats.forcedFumbles.toString()]}
                colors={colors} onPress={() => setSelectedPlayer(p)} />
            ))}
          </View>
        )}

        {/* ── SPECIAL TEAMS ── */}
        {tab === "specTeams" && (
          <View>
            <ColHeader labels={["FGM","FGA","FG%","AVG"]} colors={colors} />
            {specTeams.length === 0 ? <EmptyStatsMsg colors={colors} /> : specTeams.map((p, i) => {
              const fgPct = p.stats.fieldGoalsAttempted > 0
                ? Math.round((p.stats.fieldGoalsMade / p.stats.fieldGoalsAttempted) * 100)
                : 0;
              return (
                <LeaderRow key={p.id} rank={i+1} player={p}
                  cols={[p.stats.fieldGoalsMade.toString(), p.stats.fieldGoalsAttempted.toString(), `${fgPct}%`, p.stats.puntsAverage.toFixed(1)]}
                  colors={colors} onPress={() => setSelectedPlayer(p)} />
              );
            })}
          </View>
        )}

        {/* ── RECORDS ── */}
        {tab === "records" && (
          <View>
            <View style={[st.recordsHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
              <Feather name="award" size={14} color={colors.nflGold} />
              <Text style={[st.recordsTitle, { color: colors.foreground }]}>All-Time Single Season Records</Text>
            </View>
            {records.map((r, i) => <RecordRow key={i} r={r} idx={i} colors={colors} />)}
          </View>
        )}

      </ScrollView>

      {/* Player Card Modal */}
      <Modal visible={!!selectedPlayer} animationType="slide" transparent onRequestClose={() => setSelectedPlayer(null)}>
        <View style={st.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setSelectedPlayer(null)} />
          <View style={[st.modalSheet, { backgroundColor: colors.background }]}>
            <View style={[st.modalHandle, { backgroundColor: colors.border }]} />
            <TouchableOpacity onPress={() => setSelectedPlayer(null)} style={st.modalClose}>
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
            {selectedPlayer && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 16 }}>
                <PlayerCard
                  player={selectedPlayer}
                  teamPrimaryColor={selectedPlayer.teamColor}
                  teamSecondaryColor={selectedPlayer.teamSecondary}
                  expanded
                  showInjury
                />
                {/* Season stats card */}
                <StatsPanel player={selectedPlayer} colors={colors} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Stats panel shown inside the player modal ────────────────────────────────

function StatsPanel({ player, colors }: { player: PlayerWithTeam; colors: any }) {
  const [view, setView] = useState<"season" | "career">("season");

  const careerTotals = useMemo(() => {
    const cs = player.careerStats;
    if (cs.length === 0) return null;
    return cs.reduce((acc, s) => {
      acc.gamesPlayed += s.gamesPlayed;
      acc.passingYards += s.passingYards; acc.passingTDs += s.passingTDs;
      acc.interceptions += s.interceptions; acc.completions += s.completions; acc.attempts += s.attempts;
      acc.rushingYards += s.rushingYards; acc.rushingTDs += s.rushingTDs; acc.carries += s.carries;
      acc.receivingYards += s.receivingYards; acc.receivingTDs += s.receivingTDs;
      acc.receptions += s.receptions; acc.targets += s.targets;
      acc.tackles += s.tackles; acc.sacks += s.sacks;
      acc.forcedFumbles += s.forcedFumbles; acc.defensiveINTs += s.defensiveINTs;
      acc.passDeflections += s.passDeflections;
      acc.fieldGoalsMade += s.fieldGoalsMade; acc.fieldGoalsAttempted += s.fieldGoalsAttempted;
      return acc;
    }, {
      gamesPlayed:0, passingYards:0, passingTDs:0, interceptions:0, completions:0, attempts:0,
      rushingYards:0, rushingTDs:0, carries:0, receivingYards:0, receivingTDs:0, receptions:0, targets:0,
      tackles:0, sacks:0, forcedFumbles:0, defensiveINTs:0, passDeflections:0,
      fieldGoalsMade:0, fieldGoalsAttempted:0,
    });
  }, [player]);

  const stats = view === "season" ? player.stats : (careerTotals ?? player.stats);

  function StatItem({ label, value }: { label: string; value: string }) {
    return (
      <View style={st.statItem}>
        <Text style={[st.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[st.statValue, { color: colors.foreground }]}>{value}</Text>
      </View>
    );
  }

  const pos = player.position;
  const isQB  = pos === "QB";
  const isRB  = pos === "RB";
  const isWRTE = ["WR","TE"].includes(pos);
  const isDef  = ["DE","DT","LB","CB","S"].includes(pos);
  const isK   = pos === "K";
  const isP   = pos === "P";

  return (
    <View style={[st.statsPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={st.statsPanelHeader}>
        <Text style={[st.statsPanelTitle, { color: colors.foreground }]}>Statistics</Text>
        <View style={[st.viewToggle, { backgroundColor: colors.secondary }]}>
          {(["season","career"] as const).map(v => (
            <TouchableOpacity key={v} onPress={() => setView(v)}
              style={[st.viewToggleBtn, { backgroundColor: view === v ? colors.nflBlue : "transparent" }]}>
              <Text style={[st.viewToggleText, { color: view === v ? "#fff" : colors.mutedForeground }]}>
                {v === "season" ? "Season" : "Career"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {view === "career" && (player.careerStats.length === 0) ? (
        <Text style={[st.noCareer, { color: colors.mutedForeground }]}>No career stats — rookie season</Text>
      ) : (
        <View style={st.statsGrid}>
          <StatItem label="GP" value={String(stats.gamesPlayed)} />
          {isQB && <>
            <StatItem label="CMP" value={`${stats.completions}/${stats.attempts}`} />
            <StatItem label="YDS" value={stats.passingYards.toLocaleString()} />
            <StatItem label="TD" value={String(stats.passingTDs)} />
            <StatItem label="INT" value={String(stats.interceptions)} />
            <StatItem label="RTG" value={String(stats.qbRating)} />
            <StatItem label="CMP%" value={stats.attempts > 0 ? `${Math.round(stats.completions/stats.attempts*100)}%` : "—"} />
            <StatItem label="RU YDS" value={stats.rushingYards.toLocaleString()} />
          </>}
          {isRB && <>
            <StatItem label="CAR" value={String(stats.carries)} />
            <StatItem label="YDS" value={stats.rushingYards.toLocaleString()} />
            <StatItem label="AVG" value={stats.yardsPerCarry.toFixed(1)} />
            <StatItem label="TD" value={String(stats.rushingTDs)} />
            <StatItem label="REC" value={String(stats.receptions)} />
            <StatItem label="RE YDS" value={stats.receivingYards.toLocaleString()} />
            <StatItem label="RE TD" value={String(stats.receivingTDs)} />
          </>}
          {isWRTE && <>
            <StatItem label="TGT" value={String(stats.targets)} />
            <StatItem label="REC" value={String(stats.receptions)} />
            <StatItem label="YDS" value={stats.receivingYards.toLocaleString()} />
            <StatItem label="AVG" value={stats.yardsPerCatch.toFixed(1)} />
            <StatItem label="TD" value={String(stats.receivingTDs)} />
          </>}
          {isDef && <>
            <StatItem label="TKL" value={String(stats.tackles)} />
            <StatItem label="SCK" value={stats.sacks.toFixed(1)} />
            <StatItem label="INT" value={String(stats.defensiveINTs)} />
            <StatItem label="PD" value={String(stats.passDeflections)} />
            <StatItem label="FF" value={String(stats.forcedFumbles)} />
          </>}
          {isK && <>
            <StatItem label="FGM" value={String(stats.fieldGoalsMade)} />
            <StatItem label="FGA" value={String(stats.fieldGoalsAttempted)} />
            <StatItem label="FG%" value={stats.fieldGoalsAttempted > 0 ? `${Math.round(stats.fieldGoalsMade/stats.fieldGoalsAttempted*100)}%` : "—"} />
          </>}
          {isP && <>
            <StatItem label="AVG" value={stats.puntsAverage.toFixed(1)} />
          </>}
        </View>
      )}
      {/* Career seasons */}
      {view === "career" && player.careerStats.length > 0 && (
        <View style={[st.careerSeasons, { borderTopColor: colors.border }]}>
          <Text style={[st.careerSeasonsTitle, { color: colors.mutedForeground }]}>SEASON LOG</Text>
          {[...player.careerStats].reverse().map((cs, i) => (
            <View key={i} style={[st.careerRow, { borderBottomColor: colors.border }]}>
              <Text style={[st.careerYr, { color: colors.nflGold }]}>{cs.season ?? "—"}</Text>
              <Text style={[st.careerGP, { color: colors.mutedForeground }]}>{cs.gamesPlayed}G</Text>
              <Text style={[st.careerStat, { color: colors.foreground }]}>
                {isQB && `${cs.passingYards.toLocaleString()} YDS · ${cs.passingTDs} TD · ${cs.interceptions} INT`}
                {isRB && `${cs.rushingYards.toLocaleString()} RU · ${cs.rushingTDs} TD · ${cs.yardsPerCarry.toFixed(1)} YPC`}
                {isWRTE && `${cs.receivingYards.toLocaleString()} RE · ${cs.receivingTDs} TD · ${cs.receptions} REC`}
                {isDef && `${cs.tackles} TKL · ${cs.sacks.toFixed(1)} SCK · ${cs.defensiveINTs} INT`}
                {isK && `${cs.fieldGoalsMade}/${cs.fieldGoalsAttempted} FG`}
                {isP && `${cs.puntsAverage.toFixed(1)} AVG`}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  header:           { borderBottomWidth: 1, paddingBottom: 0 },
  headerTop:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 8 },
  headerTitle:      { fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSub:        { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  statsBadge:       { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  tabBtn:           { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  tabLabel:         { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  sectionLabel:     { padding: 12, borderBottomWidth: 1 },
  sectionLabelText: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8 },

  colHeader:        { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1 },
  colRank:          { width: 24, fontSize: 10, fontFamily: "Inter_600SemiBold" },
  colName:          { flex: 1, fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.4 },
  colStat:          { width: 42, textAlign: "center", fontSize: 10, fontFamily: "Inter_600SemiBold" },

  leaderRow:        { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, gap: 8 },
  leaderRank:       { width: 22, fontSize: 13, fontFamily: "Inter_700Bold", textAlign: "center" },
  posDot:           { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  posDotText:       { fontSize: 10, fontFamily: "Inter_700Bold" },
  leaderName:       { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  leaderTeam:       { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 1 },
  leaderStat:       { width: 42, textAlign: "center", fontSize: 12 },

  subTab:           { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  subTabText:       { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  emptyBox:         { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyTitle:       { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptySub:         { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 40 },

  recordsHeader:    { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderBottomWidth: 1 },
  recordsTitle:     { fontSize: 15, fontFamily: "Inter_700Bold" },
  recordRow:        { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  recordCategory:   { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.3, marginBottom: 2 },
  recordPlayer:     { fontSize: 13, fontFamily: "Inter_400Regular" },
  recordValue:      { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "right" },
  recordSeason:     { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "right", marginTop: 2 },

  modalOverlay:     { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.7)" },
  modalSheet:       { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "92%", paddingTop: 12 },
  modalHandle:      { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  modalClose:       { position: "absolute", right: 16, top: 16, zIndex: 10 },

  statsPanel:       { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  statsPanelHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, paddingBottom: 10 },
  statsPanelTitle:  { fontSize: 15, fontFamily: "Inter_700Bold" },
  viewToggle:       { flexDirection: "row", borderRadius: 8, overflow: "hidden", padding: 2 },
  viewToggleBtn:    { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6 },
  viewToggleText:   { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  noCareer:         { padding: 20, fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  statsGrid:        { flexDirection: "row", flexWrap: "wrap", gap: 0, paddingHorizontal: 14, paddingBottom: 14 },
  statItem:         { width: "33.33%", paddingVertical: 10, paddingHorizontal: 4 },
  statLabel:        { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 0.6, marginBottom: 2 },
  statValue:        { fontSize: 18, fontFamily: "Inter_700Bold" },

  careerSeasons:    { borderTopWidth: 1, padding: 12 },
  careerSeasonsTitle:{ fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.8, marginBottom: 8 },
  careerRow:        { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 7, borderBottomWidth: 0.5 },
  careerYr:         { width: 36, fontSize: 12, fontFamily: "Inter_700Bold" },
  careerGP:         { width: 26, fontSize: 11, fontFamily: "Inter_400Regular" },
  careerStat:       { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular" },
});
