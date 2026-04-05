import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { PlayerFigure } from "@/components/PlayerFigure";
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

// ─── Color helpers ────────────────────────────────────────────────────────────

function hexRgb(h: string): [number, number, number] {
  const n = parseInt(h.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function darken(h: string, amt: number): string {
  const [r, g, b] = hexRgb(h);
  const c = (v: number) => Math.max(0, Math.min(255, v + amt)).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

// ─── OVR color ────────────────────────────────────────────────────────────────

function ovrColor(ovr: number): string {
  if (ovr >= 90) return "#FFD700";
  if (ovr >= 80) return "#3FB950";
  if (ovr >= 70) return "#FFC107";
  return "#E31837";
}

// ─── Default uniform ─────────────────────────────────────────────────────────

function defaultUniform(primary: string, secondary: string): UniformSet {
  return {
    helmetColor: primary,
    helmetLogoPlacement: "both",
    jerseyStyle: "traditional",
    jerseyColor: primary,
    jerseyAccentColor: secondary,
    numberFont: "block",
    numberColor: "#ffffff",
    numberOutlineColor: "#000000",
    pantColor: primary,
    pantStripeStyle: "single",
    pantStripeColor: secondary,
    sockColor: secondary,
    sockAccentColor: primary,
  };
}

// ─── Rating bar ───────────────────────────────────────────────────────────────

function RatingBar({ label, value, fill }: { label: string; value: number; fill: string }) {
  const pct = `${Math.min(100, Math.max(0, value))}%` as any;
  const valColor = value >= 85 ? ovrColor(value) : "#E5E7EB";
  return (
    <View style={rb.row}>
      <Text style={rb.label}>{label}</Text>
      <View style={rb.track}>
        <View style={[rb.fill, { width: pct, backgroundColor: fill }]} />
      </View>
      <Text style={[rb.val, { color: valColor }]}>{value}</Text>
    </View>
  );
}
const rb = StyleSheet.create({
  row:   { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 3.5 },
  label: { fontSize: 8.5, fontFamily: "Inter_700Bold", color: "rgba(255,255,255,0.45)", width: 27, letterSpacing: 0.4 },
  track: { flex: 1, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.10)", overflow: "hidden" },
  fill:  { height: 5, borderRadius: 3 },
  val:   { fontSize: 10, fontFamily: "Inter_700Bold", width: 21, textAlign: "right" },
});

// ─── Main PlayerCard ──────────────────────────────────────────────────────────

interface Props {
  player: Player;
  teamPrimaryColor?: string;
  teamSecondaryColor?: string;
  expanded?: boolean;
  showInjury?: boolean;
}

export function PlayerCard({
  player,
  teamPrimaryColor,
  teamSecondaryColor,
  expanded = false,
  showInjury = true,
}: Props) {
  const { teamCustomization } = useNFL();

  const primary   = teamPrimaryColor   ?? teamCustomization?.primaryColor   ?? "#1E3A8A";
  const secondary = teamSecondaryColor ?? teamCustomization?.secondaryColor ?? "#C0A030";
  const uniform: UniformSet = teamCustomization?.uniforms?.home ?? defaultUniform(primary, secondary);

  const primaryDk  = darken(primary,  -52);
  const primaryMid = darken(primary,  -26);
  const secDk      = darken(secondary, -40);

  const posColor = POS_COLOR[player.position];
  const posLabel = POS_SPECIFIC_LABEL[player.position];
  const devColor = DEV_COLOR[player.developmentTrait] ?? "#8B949E";
  const devIcon  = DEV_ICON[player.developmentTrait]  ?? "user";
  const ovrC     = ovrColor(player.overall);

  const figW = expanded ? 108 : 94;
  const figH = expanded ? 240 : 206;

  return (
    // Outer chrome border container
    <View style={[card.chrome, { borderColor: secondary + "90" }]}>
      {/* Foil border gradient overlay */}
      <LinearGradient
        colors={[secondary + "CC", primary + "88", secDk + "AA", primaryDk + "CC"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={card.borderGlow}
      />
      {/* Inner card surface */}
      <View style={card.inner}>

        {/* ── Background: rich team-color atmosphere ──── */}
        <LinearGradient
          colors={[primaryDk, primaryMid + "CC", "#08081A", "#08081A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.75 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Secondary haze on far right */}
        <LinearGradient
          colors={["transparent", secondary + "20"]}
          start={{ x: 0.4, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Decorative diagonal slash lines */}
        <View style={[card.slash, { left: "34%", backgroundColor: secondary + "18" }]} />
        <View style={[card.slash, { left: "55%", backgroundColor: primary   + "14" }]} />
        <View style={[card.slash, { left: "72%", backgroundColor: secondary + "0C" }]} />

        {/* ── Left: full-bleed player figure ─────────── */}
        <View style={[card.figureCol, { width: figW + 4 }]}>
          {/* Team-color spotlight column */}
          <LinearGradient
            colors={[primary + "50", primary + "20", "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Ground glow at player feet */}
          <LinearGradient
            colors={[primary + "60", "transparent"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={card.footGlow}
          />
          {/* OVR watermark number behind figure */}
          <View style={card.ovrWater}>
            <Text style={[card.ovrWaterText, { color: primary + "38" }]}>{player.overall}</Text>
          </View>
          {/* Player figure — overflows top intentionally */}
          <View style={card.figureFrame}>
            <PlayerFigure
              uniform={uniform}
              position={player.position}
              number={player.jerseyNumber != null ? String(player.jerseyNumber) : "00"}
              playerName={player.name}
              width={figW}
              height={figH}
            />
          </View>
        </View>

        {/* Thin glowing separator */}
        <LinearGradient
          colors={["transparent", secondary + "55", secondary + "88", secondary + "55", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={card.sep}
        />

        {/* ── Right: stats & info ────────────────────── */}
        <View style={card.infoCol}>

          {/* Row 1: POS + OVR + DEV */}
          <View style={card.topRow}>
            <View style={[card.posBadge, { backgroundColor: posColor + "22", borderColor: posColor + "70" }]}>
              <Text style={[card.posText, { color: posColor }]}>{player.position}</Text>
            </View>
            {/* OVR badge */}
            <View style={[card.ovrBadge, { borderColor: ovrC + "80", backgroundColor: ovrC + "18" }]}>
              <Text style={[card.ovrNum, { color: ovrC }]}>{player.overall}</Text>
              <Text style={[card.ovrLbl, { color: ovrC + "AA" }]}>OVR</Text>
            </View>
            <View style={card.devRow}>
              <Feather name={devIcon} size={8} color={devColor} />
              <Text style={[card.devText, { color: devColor }]}>{player.developmentTrait}</Text>
            </View>
          </View>

          {/* Name */}
          <Text style={card.playerName} numberOfLines={1}>{player.name.toUpperCase()}</Text>

          {/* Accent underline */}
          <LinearGradient
            colors={[secondary, primary, "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={card.nameBar}
          />

          {/* Meta */}
          <Text style={card.meta} numberOfLines={1}>
            {player.age}yo · {player.yearsExperience}yr
            {player.college ? ` · ${player.college}` : ""}
          </Text>

          {/* Injury */}
          {showInjury && player.injury && (
            <View style={card.injBanner}>
              <Feather name="alert-circle" size={8} color="#F87171" />
              <Text style={card.injText}>
                {player.injury.location} · {player.injury.severity} · {player.injury.weeksRemaining}wk
              </Text>
            </View>
          )}

          {/* Rating bars */}
          <View style={card.bars}>
            <RatingBar label="SPD" value={player.speed}    fill={primary} />
            <RatingBar label="STR" value={player.strength} fill={primary} />
            <RatingBar label="AWR" value={player.awareness} fill={primary} />
            <RatingBar label={posLabel} value={player.specific} fill={ovrC} />
          </View>

          {/* Contract chips */}
          <View style={card.chipRow}>
            <View style={card.chip}>
              <Text style={card.chipLbl}>APY</Text>
              <Text style={card.chipVal}>${player.salary.toFixed(1)}M</Text>
            </View>
            <View style={card.chip}>
              <Text style={card.chipLbl}>YRS</Text>
              <Text style={card.chipVal}>{player.contractYears}</Text>
            </View>
            {expanded && (
              <View style={card.chip}>
                <Text style={card.chipLbl}>GTD</Text>
                <Text style={card.chipVal}>${player.guaranteedMoney.toFixed(1)}M</Text>
              </View>
            )}
            <View style={[card.statusChip, {
              backgroundColor:
                player.status === "Starter"        ? "#3FB95022" :
                player.status === "Practice Squad" ? "#FFC10722" : "#8B949E22",
            }]}>
              <Text style={[card.statusText, {
                color:
                  player.status === "Starter"        ? "#3FB950" :
                  player.status === "Practice Squad" ? "#FFC107" : "#8B949E",
              }]}>{player.status}</Text>
            </View>
          </View>

        </View>

        {/* ── Corner chrome brackets ─────────────────── */}
        <View style={[card.corner, card.cTL, { borderColor: secondary + "99" }]} />
        <View style={[card.corner, card.cTR, { borderColor: secondary + "99" }]} />
        <View style={[card.corner, card.cBL, { borderColor: secondary + "99" }]} />
        <View style={[card.corner, card.cBR, { borderColor: secondary + "99" }]} />

        {/* Top-left gloss sheen */}
        <LinearGradient
          colors={["rgba(255,255,255,0.10)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.55, y: 0.55 }}
          style={card.sheen}
        />

      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CRN = 8;

const card = StyleSheet.create({
  chrome: {
    borderRadius: 17,
    borderWidth: 1.5,
    marginHorizontal: 12,
    marginVertical: 5,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: 10,
    position: "relative",
  },
  borderGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
  },
  inner: {
    borderRadius: 15.5,
    overflow: "hidden",
    flexDirection: "row",
    minHeight: 160,
    position: "relative",
  },
  slash: {
    position: "absolute",
    top: -40, bottom: -10,
    width: 2,
    transform: [{ rotate: "22deg" }],
  },
  figureCol: {
    alignItems: "center",
    justifyContent: "flex-end",
    overflow: "hidden",
    position: "relative",
  },
  footGlow: {
    position: "absolute",
    bottom: 0,
    left: 0, right: 0,
    height: 80,
    borderRadius: 999,
    transform: [{ scaleX: 1.8 }],
  },
  ovrWater: {
    position: "absolute",
    bottom: 0,
    left: 0, right: 0,
    alignItems: "center",
  },
  ovrWaterText: {
    fontSize: 74,
    fontFamily: "Inter_700Bold",
    letterSpacing: -4,
  },
  figureFrame: {
    zIndex: 2,
    marginBottom: -4,
    marginTop: -20,
  },
  sep: {
    width: 1,
    alignSelf: "stretch",
  },
  infoCol: {
    flex: 1,
    paddingVertical: 10,
    paddingRight: 11,
    paddingLeft: 8,
    gap: 3,
    justifyContent: "center",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexWrap: "wrap",
    marginBottom: 1,
  },
  posBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
  },
  posText: {
    fontSize: 9.5,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  ovrBadge: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
    borderWidth: 1.5,
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ovrNum: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    lineHeight: 21,
  },
  ovrLbl: {
    fontSize: 7,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
    marginBottom: 1,
  },
  devRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  devText: {
    fontSize: 8,
    fontFamily: "Inter_500Medium",
  },
  playerName: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: -0.2,
    lineHeight: 17,
  },
  nameBar: {
    height: 1.5,
    borderRadius: 1,
    marginBottom: 1,
    width: "80%",
  },
  meta: {
    fontSize: 9,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.42)",
    marginBottom: 1,
  },
  injBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(248,113,113,0.12)",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
    borderWidth: 0.5,
    borderColor: "rgba(248,113,113,0.3)",
  },
  injText: {
    fontSize: 8,
    fontFamily: "Inter_600SemiBold",
    color: "#F87171",
  },
  bars: {
    marginTop: 1,
  },
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
    marginTop: 2,
  },
  chip: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 5,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.12)",
  },
  chipLbl: {
    fontSize: 6.5,
    fontFamily: "Inter_700Bold",
    color: "rgba(255,255,255,0.38)",
    letterSpacing: 0.5,
  },
  chipVal: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#F9FAFB",
  },
  statusChip: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 7.5,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  // Corner chrome brackets
  corner: {
    position: "absolute",
    width: CRN,
    height: CRN,
    borderWidth: 1.5,
  },
  cTL: { top: 5,    left: 5,  borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 3 },
  cTR: { top: 5,    right: 5, borderLeftWidth: 0,  borderBottomWidth: 0, borderTopRightRadius: 3 },
  cBL: { bottom: 5, left: 5,  borderRightWidth: 0, borderTopWidth: 0,    borderBottomLeftRadius: 3 },
  cBR: { bottom: 5, right: 5, borderLeftWidth: 0,  borderTopWidth: 0,    borderBottomRightRadius: 3 },
  sheen: {
    position: "absolute",
    top: 0, left: 0,
    width: 80, height: 80,
    borderBottomRightRadius: 80,
  },
});
