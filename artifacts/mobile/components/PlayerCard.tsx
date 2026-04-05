import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { POS_RATING_KEYS, POS_RATING_LABELS } from "@/context/types";
import type { NFLPosition, Player, PosRatings } from "@/context/types";

// ─── Position meta ────────────────────────────────────────────────────────────

export const POS_COLOR: Record<NFLPosition, string> = {
  QB: "#E31837", RB: "#FB4F14", WR: "#FFC20E", TE: "#00B5E2",
  OL: "#8B949E", DE: "#3FB950", DT: "#26A69A", LB: "#1F6FEB",
  CB: "#6E40C9", S:  "#9C27B0", K:  "#FF7043", P:  "#795548",
};

const DEV_COLOR: Record<string, string> = {
  "X-Factor": "#FFD700", Superstar: "#FF6B35", Star: "#3FB950",
  Normal: "#8B949E", "Late Bloomer": "#00B5E2",
};
const DEV_ICON: Record<string, any> = {
  "X-Factor": "zap", Superstar: "star", Star: "award",
  Normal: "user", "Late Bloomer": "trending-up",
};

// ─── OVR color ────────────────────────────────────────────────────────────────

function ovrColor(ovr: number): string {
  if (ovr >= 90) return "#FFD700";
  if (ovr >= 80) return "#3FB950";
  if (ovr >= 70) return "#FFC107";
  return "#E31837";
}

// ─── Role label (computed from ratings, no combine needed) ────────────────────

function computeRole(pos: NFLPosition, r: PosRatings, overall: number): string | null {
  if (pos === "QB") {
    if (overall >= 88 && r.throwPower >= 88 && r.throwAccShort >= 86) return "Face of Franchise";
    if (r.mobility >= 80)       return "Scrambler";
    if (r.throwPower >= 84)     return "Strong Arm";
    if (r.throwAccShort >= 82)  return "Accurate";
    return "Pocket Passer";
  }
  if (pos === "RB") {
    if (r.breakTackle >= 82)                         return "Power Back";
    if (r.acceleration >= 82 && r.catching >= 76)    return "Receiving Back";
    if (r.acceleration >= 80 && r.agility >= 78)     return "Elusive Back";
    return "Balanced Back";
  }
  if (pos === "WR") {
    if (overall >= 88 && r.acceleration >= 90 && r.catching >= 80) return "All-Pro Potential";
    if (r.acceleration >= 90)   return "Deep Threat";
    if (r.catching >= 80)       return "Possession Receiver";
    return "Balanced Receiver";
  }
  return null;
}

// ─── Rating bar ───────────────────────────────────────────────────────────────

function RatingBar({ label, value, fill }: { label: string; value: number; fill: string }) {
  const pct = `${Math.min(100, Math.max(0, value))}%` as any;
  const valColor = value >= 85 ? ovrColor(value) : "#CBD5E1";
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
  const primary   = teamPrimaryColor   ?? "#1E3A8A";
  const secondary = teamSecondaryColor ?? "#C0A030";

  const darken = (h: string, amt: number) => {
    const n = parseInt(h.replace("#",""), 16);
    const c = (v: number) => Math.max(0, Math.min(255, ((n >> v) & 255) + amt)).toString(16).padStart(2,"0");
    return `#${c(16)}${c(8)}${c(0)}`;
  };

  const primaryDk  = darken(primary, -52);
  const primaryMid = darken(primary, -26);
  const secDk      = darken(secondary, -40);

  const posColor = POS_COLOR[player.position];
  const devColor = DEV_COLOR[player.developmentTrait] ?? "#8B949E";
  const devIcon  = DEV_ICON[player.developmentTrait]  ?? "user";
  const ovrC     = ovrColor(player.overall);
  const role     = computeRole(player.position, player.posRatings, player.overall);

  return (
    <View style={[card.chrome, { borderColor: secondary + "90" }]}>
      {/* Foil border gradient */}
      <LinearGradient
        colors={[secondary + "CC", primary + "88", secDk + "AA", primaryDk + "CC"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={card.borderGlow}
      />
      <View style={card.inner}>

        {/* ── Background atmosphere ── */}
        <LinearGradient
          colors={[primaryDk, primaryMid + "CC", "#08081A", "#08081A"]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.75 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={["transparent", secondary + "18"]}
          start={{ x: 0.4, y: 0 }} end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Decorative diagonal slashes */}
        <View style={[card.slash, { left: "28%", backgroundColor: secondary + "14" }]} />
        <View style={[card.slash, { left: "52%", backgroundColor: primary   + "10" }]} />
        <View style={[card.slash, { left: "72%", backgroundColor: secondary + "0C" }]} />

        {/* ── Left: OVR swatch ── */}
        <View style={card.ovrCol}>
          <LinearGradient
            colors={[posColor + "50", posColor + "22", "transparent"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Position color accent stripe */}
          <View style={[card.posStripe, { backgroundColor: posColor }]} />
          {/* OVR number */}
          <View style={card.ovrBlock}>
            <Text style={[card.ovrNum, { color: ovrC }]}>{player.overall}</Text>
            <Text style={[card.ovrLbl, { color: ovrC + "AA" }]}>OVR</Text>
          </View>
          {/* Position badge */}
          <View style={[card.posBadge, { backgroundColor: posColor + "30", borderColor: posColor + "80" }]}>
            <Text style={[card.posText, { color: posColor }]}>{player.position}</Text>
          </View>
        </View>

        {/* ── Right: info ── */}
        <View style={card.infoCol}>

          {/* Dev trait + status row */}
          <View style={card.topRow}>
            <View style={card.devRow}>
              <Feather name={devIcon} size={9} color={devColor} />
              <Text style={[card.devText, { color: devColor }]}>{player.developmentTrait}</Text>
            </View>
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

          {/* Player name + rookie badge */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={[card.playerName, { flex: 1 }]} numberOfLines={1}>{player.name.toUpperCase()}</Text>
            {player.yearsExperience === 0 && (
              <View style={card.rookieBadge}>
                <Text style={card.rookieTxt}>R</Text>
              </View>
            )}
          </View>

          {/* Accent underline */}
          <LinearGradient
            colors={[secondary, primary, "transparent"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={card.nameBar}
          />

          {/* Role + meta */}
          <Text style={card.meta} numberOfLines={1}>
            {player.age}yo · {player.yearsExperience}yr
            {role ? ` · ${role}` : player.college ? ` · ${player.college}` : ""}
          </Text>
          {/* Draft bio */}
          {!!player.draftYear && (
            <Text style={card.draftBio} numberOfLines={1}>
              {player.draftYear} · Rd {player.draftRound} · #{player.draftPick}
            </Text>
          )}

          {/* Injury banner */}
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
            {POS_RATING_KEYS[player.position]?.map((key, i) => {
              const val = player.posRatings?.[key] ?? player.specific;
              const isLast = i === (POS_RATING_KEYS[player.position].length - 1);
              return (
                <RatingBar key={key} label={POS_RATING_LABELS[key]} value={val}
                  fill={isLast ? ovrC : posColor} />
              );
            })}
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
          </View>

        </View>

        {/* Corner chrome brackets */}
        <View style={[card.corner, card.cTL, { borderColor: secondary + "99" }]} />
        <View style={[card.corner, card.cTR, { borderColor: secondary + "99" }]} />
        <View style={[card.corner, card.cBL, { borderColor: secondary + "99" }]} />
        <View style={[card.corner, card.cBR, { borderColor: secondary + "99" }]} />

        {/* Top-left gloss sheen */}
        <LinearGradient
          colors={["rgba(255,255,255,0.10)", "transparent"]}
          start={{ x: 0, y: 0 }} end={{ x: 0.55, y: 0.55 }}
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
    borderRadius: 17, borderWidth: 1.5,
    marginHorizontal: 12, marginVertical: 5,
    overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.55, shadowRadius: 12, elevation: 10,
    position: "relative",
  },
  borderGlow: { ...StyleSheet.absoluteFillObject, borderRadius: 16 },
  inner: {
    borderRadius: 15.5, overflow: "hidden",
    flexDirection: "row", minHeight: 152,
    position: "relative",
  },
  slash: {
    position: "absolute", top: -40, bottom: -10,
    width: 2, transform: [{ rotate: "22deg" }],
  },

  // ── Left OVR swatch ──────────────────────────────────────────────────────
  ovrCol: {
    width: 72,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    position: "relative",
    overflow: "hidden",
  },
  posStripe: {
    position: "absolute",
    left: 0, top: 0, bottom: 0,
    width: 3,
  },
  ovrBlock: {
    alignItems: "center",
  },
  ovrNum: {
    fontSize: 34,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1,
    lineHeight: 38,
  },
  ovrLbl: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
  },
  posBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  posText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.6,
  },

  // ── Right info ───────────────────────────────────────────────────────────
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
    justifyContent: "space-between",
    marginBottom: 1,
  },
  devRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  devText: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
  },
  statusChip: {
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5,
  },
  statusText: {
    fontSize: 7.5, fontFamily: "Inter_700Bold", letterSpacing: 0.3,
  },
  playerName: {
    fontSize: 14, fontFamily: "Inter_700Bold",
    color: "#FFFFFF", letterSpacing: -0.2, lineHeight: 17,
  },
  nameBar: {
    height: 1.5, borderRadius: 1, marginBottom: 1, width: "80%",
  },
  meta: {
    fontSize: 9, fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.42)", marginBottom: 1,
  },
  rookieBadge: {
    backgroundColor: "#FF6B35", paddingHorizontal: 5, paddingVertical: 2,
    borderRadius: 4, alignSelf: "flex-start",
  },
  rookieTxt: {
    fontSize: 9, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 0.5,
  },
  draftBio: {
    fontSize: 8.5, fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.38)", letterSpacing: 0.3, marginBottom: 1,
  },
  injBanner: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(248,113,113,0.12)",
    paddingHorizontal: 5, paddingVertical: 2,
    borderRadius: 4, alignSelf: "flex-start",
    borderWidth: 0.5, borderColor: "rgba(248,113,113,0.3)",
  },
  injText: { fontSize: 8, fontFamily: "Inter_600SemiBold", color: "#F87171" },
  bars: { marginTop: 1 },
  chipRow: {
    flexDirection: "row", alignItems: "center",
    gap: 4, flexWrap: "wrap", marginTop: 2,
  },
  chip: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    paddingHorizontal: 6, paddingVertical: 2.5,
    borderRadius: 5, borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.12)",
  },
  chipLbl: {
    fontSize: 6.5, fontFamily: "Inter_700Bold",
    color: "rgba(255,255,255,0.38)", letterSpacing: 0.5,
  },
  chipVal: {
    fontSize: 10, fontFamily: "Inter_700Bold", color: "#F9FAFB",
  },

  // ── Corner chrome brackets ────────────────────────────────────────────────
  corner: {
    position: "absolute", width: CRN, height: CRN, borderWidth: 1.5,
  },
  cTL: { top: 5,    left: 5,  borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 3 },
  cTR: { top: 5,    right: 5, borderLeftWidth: 0,  borderBottomWidth: 0, borderTopRightRadius: 3 },
  cBL: { bottom: 5, left: 5,  borderRightWidth: 0, borderTopWidth: 0,    borderBottomLeftRadius: 3 },
  cBR: { bottom: 5, right: 5, borderLeftWidth: 0,  borderTopWidth: 0,    borderBottomRightRadius: 3 },
  sheen: {
    position: "absolute", top: 0, left: 0,
    width: 80, height: 80, borderBottomRightRadius: 80,
  },
});
