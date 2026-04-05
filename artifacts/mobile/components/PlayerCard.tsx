import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { PlayerFigure } from "@/components/PlayerFigure";
import { useColors } from "@/hooks/useColors";
import { useNFL } from "@/context/NFLContext";
import type { NFLPosition, Player, UniformSet } from "@/context/types";

// ─── Position meta ────────────────────────────────────────────────────────────

export const POS_COLOR: Record<NFLPosition, string> = {
  QB: "#E31837", RB: "#FB4F14", WR: "#FFC20E", TE: "#00B5E2",
  OL: "#8B949E", DE: "#3FB950", DT: "#26A69A", LB: "#1F6FEB",
  CB: "#6E40C9", S:  "#9C27B0", K:  "#FF7043", P:  "#795548",
};

const POS_SPECIFIC_LABEL: Record<NFLPosition, string> = {
  QB: "THP", RB: "BTK", WR: "CTH", TE: "CTH",
  OL: "RBK", DE: "FSN", DT: "BTK", LB: "TAK",
  CB: "MAN", S:  "ZON", K:  "KPW", P:  "KPW",
};

const DEV_COLOR: Record<string, string> = {
  "X-Factor": "#FFD700", Superstar: "#FF6B35", Star: "#3FB950",
  Normal: "#8B949E", "Late Bloomer": "#00B5E2",
};
const DEV_ICON: Record<string, any> = {
  "X-Factor": "zap", Superstar: "star", Star: "award",
  Normal: "user", "Late Bloomer": "trending-up",
};

// ─── Default uniform (falls back when no customization exists) ────────────────

function defaultUniform(primaryColor: string, secondaryColor: string): UniformSet {
  return {
    helmetColor: primaryColor,
    helmetLogoPlacement: "both",
    jerseyStyle: "traditional",
    jerseyColor: primaryColor,
    jerseyAccentColor: secondaryColor,
    numberFont: "block",
    numberColor: secondaryColor === "#ffffff" ? "#ffffff" : secondaryColor,
    numberOutlineColor: "#000000",
    pantColor: primaryColor,
    pantStripeStyle: "single",
    pantStripeColor: secondaryColor,
    sockColor: secondaryColor,
    sockAccentColor: primaryColor,
  };
}

// ─── Compact Rating Bar ───────────────────────────────────────────────────────

function RatingBar({
  label, value, color, barBg,
}: { label: string; value: number; color: string; barBg: string }) {
  return (
    <View style={rb.row}>
      <Text style={[rb.label, { color: "#9CA3AF" }]}>{label}</Text>
      <View style={[rb.track, { backgroundColor: barBg }]}>
        <View style={[rb.fill, { width: `${value}%`, backgroundColor: color }]} />
      </View>
      <Text style={[rb.val, { color: "#F9FAFB" }]}>{value}</Text>
    </View>
  );
}

const rb = StyleSheet.create({
  row:   { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 },
  label: { fontSize: 9, fontFamily: "Inter_700Bold", width: 26, letterSpacing: 0.3 },
  track: { flex: 1, height: 5, borderRadius: 3, overflow: "hidden" },
  fill:  { height: 5, borderRadius: 3 },
  val:   { fontSize: 10, fontFamily: "Inter_700Bold", width: 20, textAlign: "right" },
});

// ─── OVR Badge ────────────────────────────────────────────────────────────────

function OvrBadge({ ovr, color }: { ovr: number; color: string }) {
  return (
    <View style={[badge.wrap, { borderColor: color }]}>
      <Text style={[badge.num, { color }]}>{ovr}</Text>
      <Text style={[badge.lbl, { color }]}>OVR</Text>
    </View>
  );
}

const badge = StyleSheet.create({
  wrap: { alignItems: "center", borderRadius: 10, borderWidth: 2, paddingHorizontal: 8, paddingVertical: 4 },
  num:  { fontSize: 22, fontFamily: "Inter_700Bold", lineHeight: 26 },
  lbl:  { fontSize: 8,  fontFamily: "Inter_700Bold", letterSpacing: 1, marginTop: -4 },
});

// ─── Main PlayerCard ──────────────────────────────────────────────────────────

interface Props {
  player: Player;
  teamPrimaryColor?: string;
  teamSecondaryColor?: string;
  /** When true, shows a taller card with more contract/stat detail */
  expanded?: boolean;
  /** Show injury banner if present */
  showInjury?: boolean;
}

export function PlayerCard({
  player,
  teamPrimaryColor,
  teamSecondaryColor,
  expanded = false,
  showInjury = true,
}: Props) {
  const colors   = useColors();
  const { teamCustomization, season } = useNFL();

  // Resolve team colors
  const primary   = teamPrimaryColor   ?? teamCustomization?.primaryColor   ?? "#1E3A8A";
  const secondary = teamSecondaryColor ?? teamCustomization?.secondaryColor ?? "#ffffff";

  // Resolve uniform (customization → default)
  const uniformKey = "home";
  const uniform: UniformSet =
    teamCustomization?.uniforms?.[uniformKey] ?? defaultUniform(primary, secondary);

  const posColor  = POS_COLOR[player.position];
  const posLabel  = POS_SPECIFIC_LABEL[player.position];
  const devColor  = DEV_COLOR[player.developmentTrait] ?? "#8B949E";
  const devIcon   = DEV_ICON[player.developmentTrait]  ?? "user";

  const barBg = "rgba(255,255,255,0.12)";

  // OVR color gradient: red < 70, yellow < 80, green < 90, gold >= 90
  const ovrColor =
    player.overall >= 90 ? "#FFD700" :
    player.overall >= 80 ? "#3FB950" :
    player.overall >= 70 ? "#FFC107" : "#E31837";

  const lastName = player.name.split(" ").pop() ?? player.name;

  return (
    <View style={[
      card.container,
      { borderColor: primary + "60" },
      expanded && card.containerExpanded,
    ]}>
      {/* ── Gradient background ─────────────────────────────────── */}
      <LinearGradient
        colors={[primary + "CC", "#0D0D1A", "#0D0D1A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.6 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Subtle grid texture lines */}
      <View style={[card.gridLine, card.gridLine1, { backgroundColor: primary + "15" }]} />
      <View style={[card.gridLine, card.gridLine2, { backgroundColor: primary + "10" }]} />

      {/* ── Left: Player Figure ──────────────────────────────────── */}
      <View style={card.figureCol}>
        {/* Team color glow behind figure */}
        <View style={[card.figureGlow, { backgroundColor: primary + "30" }]} />
        <PlayerFigure
          uniform={uniform}
          position={player.position}
          number={player.jerseyNumber != null
            ? String(player.jerseyNumber).padStart(2, "0")
            : "00"}
          playerName={player.name}
          width={expanded ? 105 : 90}
          height={expanded ? 230 : 195}
        />
      </View>

      {/* ── Right: Stats & Info ──────────────────────────────────── */}
      <View style={card.infoCol}>

        {/* Row 1: POS badge + OVR + DEV trait */}
        <View style={card.topRow}>
          <View style={[card.posBadge, { backgroundColor: posColor + "25", borderColor: posColor + "60" }]}>
            <Text style={[card.posText, { color: posColor }]}>{player.position}</Text>
          </View>
          <OvrBadge ovr={player.overall} color={ovrColor} />
          <View style={card.devChip}>
            <Feather name={devIcon} size={9} color={devColor} />
            <Text style={[card.devText, { color: devColor }]}>{player.developmentTrait}</Text>
          </View>
        </View>

        {/* Player name */}
        <Text style={card.playerName} numberOfLines={1}>{player.name.toUpperCase()}</Text>

        {/* Meta row: age, experience, college */}
        <Text style={card.metaRow}>
          Age {player.age}  ·  {player.yearsExperience}yr exp
          {player.college ? `  ·  ${player.college}` : ""}
        </Text>

        {/* Injury banner */}
        {showInjury && player.injury && (
          <View style={card.injuryBanner}>
            <Feather name="alert-circle" size={9} color="#F87171" />
            <Text style={card.injuryText}>
              {player.injury.location} · {player.injury.severity} · {player.injury.weeksRemaining}wk
            </Text>
          </View>
        )}

        {/* Rating bars */}
        <View style={card.bars}>
          <RatingBar label="SPD" value={player.speed}    color={primary} barBg={barBg} />
          <RatingBar label="STR" value={player.strength} color={primary} barBg={barBg} />
          <RatingBar label="AWR" value={player.awareness} color={primary} barBg={barBg} />
          <RatingBar label={posLabel} value={player.specific} color={ovrColor} barBg={barBg} />
        </View>

        {/* Contract info */}
        <View style={card.contractRow}>
          <View style={card.contractChip}>
            <Text style={card.contractLabel}>APY</Text>
            <Text style={card.contractVal}>${player.salary.toFixed(1)}M</Text>
          </View>
          <View style={card.contractChip}>
            <Text style={card.contractLabel}>YRS</Text>
            <Text style={card.contractVal}>{player.contractYears}</Text>
          </View>
          {expanded && (
            <>
              <View style={card.contractChip}>
                <Text style={card.contractLabel}>GTD</Text>
                <Text style={card.contractVal}>${player.guaranteedMoney.toFixed(1)}M</Text>
              </View>
              <View style={card.contractChip}>
                <Text style={card.contractLabel}>DEAD</Text>
                <Text style={[card.contractVal, { color: "#F87171" }]}>${(player.deadCap ?? 0).toFixed(1)}M</Text>
              </View>
            </>
          )}
          <View style={[card.statusChip, {
            backgroundColor:
              player.status === "Starter" ? "#3FB95025" :
              player.status === "Practice Squad" ? "#FFC10725" : "#8B949E25",
          }]}>
            <Text style={[card.statusText, {
              color:
                player.status === "Starter" ? "#3FB950" :
                player.status === "Practice Squad" ? "#FFC107" : "#8B949E",
            }]}>{player.status}</Text>
          </View>
        </View>

      </View>

      {/* ── Sheen overlay (top-left corner gloss) ───────────────── */}
      <View style={card.sheen} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const card = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: "hidden",
    minHeight: 160,
    position: "relative",
  },
  containerExpanded: {
    minHeight: 210,
  },
  // Decorative grid lines
  gridLine: {
    position: "absolute",
    top: 0, bottom: 0,
    width: 1,
  },
  gridLine1: { left: "32%" },
  gridLine2: { left: "65%" },
  // Figure column
  figureCol: {
    width: 95,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 8,
    position: "relative",
    overflow: "hidden",
  },
  figureGlow: {
    position: "absolute",
    bottom: 0,
    left: 0, right: 0,
    height: 80,
    borderRadius: 999,
    transform: [{ scaleX: 1.5 }],
  },
  // Info column
  infoCol: {
    flex: 1,
    paddingVertical: 10,
    paddingRight: 12,
    paddingLeft: 4,
    gap: 4,
  },
  // Top row: pos + ovr + dev
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  posBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  posText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  devChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  devText: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
  },
  // Name
  playerName: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#F9FAFB",
    letterSpacing: -0.3,
    marginTop: 1,
  },
  metaRow: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "#9CA3AF",
  },
  // Injury
  injuryBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F8717120",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  injuryText: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    color: "#F87171",
  },
  // Rating bars
  bars: {
    marginTop: 2,
  },
  // Contract
  contractRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexWrap: "wrap",
    marginTop: 2,
  },
  contractChip: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  contractLabel: {
    fontSize: 7,
    fontFamily: "Inter_700Bold",
    color: "#6B7280",
    letterSpacing: 0.4,
  },
  contractVal: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#F9FAFB",
  },
  statusChip: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  // Corner gloss sheen
  sheen: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 60,
    height: 60,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderBottomRightRadius: 60,
  },
});
