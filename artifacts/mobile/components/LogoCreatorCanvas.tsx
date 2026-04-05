import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, ClipPath, Defs, G, Path, Rect, Text as SvgText } from "react-native-svg";
import type { AnimalMascot, LogoFontStyle, ShieldStyle, TeamLogo } from "@/context/types";

// ─── Shield path pairs (outer, inner) ────────────────────────────────────────

const SHIELDS: Record<number, [string, string]> = {
  1: [
    "M 80 8 L 148 38 L 148 120 Q 148 164 80 182 Q 12 164 12 120 L 12 38 Z",
    "M 80 20 L 136 46 L 136 116 Q 136 155 80 170 Q 24 155 24 116 L 24 46 Z",
  ],
  2: [
    "M 80 8 L 154 40 L 154 126 L 80 176 L 6 126 L 6 40 Z",
    "M 80 22 L 141 50 L 141 120 L 80 164 L 19 120 L 19 50 Z",
  ],
  3: [
    "M 80 8 L 158 52 L 148 152 Q 120 178 80 188 Q 40 178 12 152 L 2 52 Z",
    "M 80 22 L 144 60 L 136 146 Q 113 168 80 177 Q 47 168 24 146 L 16 60 Z",
  ],
  4: [
    "M 80 6 L 152 44 L 138 160 Q 80 185 80 185 Q 80 185 22 160 L 8 44 Z",
    "M 80 20 L 139 52 L 126 152 Q 80 173 80 173 Q 80 173 34 152 L 21 52 Z",
  ],
};

// ─── Animal emoji map ──────────────────────────────────────────────────────────

const ANIMAL_EMOJI: Record<AnimalMascot, string> = {
  eagle: "🦅", wolf: "🐺", bear: "🐻", bull: "🐂",
  hawk: "🦅", fox: "🦊", raven: "🐦", stallion: "🐴",
  lion: "🦁", tiger: "🐯",
};

// ─── Font style map ───────────────────────────────────────────────────────────

function letterStyle(fs?: LogoFontStyle): { fontWeight: any; fontStyle: any; letterSpacing?: number } {
  switch (fs) {
    case "serif":   return { fontWeight: "700", fontStyle: "normal" };
    case "script":  return { fontWeight: "800", fontStyle: "italic" };
    case "stencil": return { fontWeight: "900", fontStyle: "normal", letterSpacing: 4 };
    default:        return { fontWeight: "900", fontStyle: "normal" };
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  logo: TeamLogo;
  size?: number;
}

export function LogoCreatorCanvas({ logo, size = 160 }: Props) {
  const { type, primaryColor, secondaryColor, accentColor } = logo;

  /* ── SHIELD ── */
  if (type === "shield") {
    const idx = (logo.shieldStyle ?? 1) as number;
    const [outerPath, innerPath] = SHIELDS[idx] ?? SHIELDS[1];
    const letter = (logo.letter || "V").toUpperCase().slice(0, 3);
    const fSize = letter.length > 2 ? 38 : letter.length === 2 ? 50 : 62;
    return (
      <View style={[st.wrap, { width: size, height: size }]}>
        <Svg width={size} height={size} viewBox="0 0 160 194">
          <Path d={outerPath} fill={secondaryColor} />
          <Path d={innerPath} fill={primaryColor} />
          <Path d={innerPath} fill="none" stroke={accentColor} strokeWidth={3.5} />
          <SvgText
            x={80} y={120}
            textAnchor="middle"
            fontSize={fSize}
            fontWeight="900"
            fill={accentColor}
          >
            {letter}
          </SvgText>
        </Svg>
      </View>
    );
  }

  /* ── ANIMAL ── */
  if (type === "animal") {
    const emoji = ANIMAL_EMOJI[logo.mascot ?? "eagle"] ?? "🦅";
    const r = size / 2;
    return (
      <View style={[st.wrap, { width: size, height: size }]}>
        <View style={[st.circle, { width: size, height: size, borderRadius: r, backgroundColor: primaryColor }]}>
          <View style={[st.circleInner, {
            width: size * 0.86, height: size * 0.86,
            borderRadius: r * 0.86,
            borderColor: accentColor,
          }]}>
            <Text style={{ fontSize: size * 0.38, textAlign: "center" }}>{emoji}</Text>
          </View>
        </View>
      </View>
    );
  }

  /* ── LETTERMARK ── */
  if (type === "lettermark") {
    const letter = (logo.letter || "V").toUpperCase().slice(0, 3);
    const fSize = letter.length > 2 ? size * 0.28 : letter.length === 2 ? size * 0.42 : size * 0.56;
    const fStyle = letterStyle(logo.fontStyle);
    return (
      <View style={[st.wrap, { width: size, height: size }]}>
        <View style={[st.letterBadge, {
          width: size, height: size, borderRadius: size * 0.12,
          backgroundColor: primaryColor, borderColor: accentColor,
        }]}>
          <Text style={[st.letterText, { color: accentColor, fontSize: fSize, ...fStyle }]}>
            {letter}
          </Text>
          <View style={[st.letterUnderline, { backgroundColor: secondaryColor }]} />
        </View>
      </View>
    );
  }

  /* ── HELMET ── */
  if (type === "helmet") {
    const letter = (logo.letter || "V").toUpperCase().slice(0, 2);
    return (
      <View style={[st.wrap, { width: size, height: size }]}>
        <Svg width={size} height={size} viewBox="0 0 160 160">
          <Defs>
            <ClipPath id="hc2">
              <Path d="M 18 130 Q 18 18 80 8 Q 142 18 142 130 Z" />
            </ClipPath>
          </Defs>
          {/* Dome */}
          <Path d="M 18 130 Q 18 18 80 8 Q 142 18 142 130 Z" fill={primaryColor} />
          {/* Center stripe */}
          <G clipPath="url(#hc2)">
            <Rect x={72} y={4} width={16} height={128} fill={accentColor} opacity={0.9} />
          </G>
          {/* Ear hole */}
          <Circle cx={21} cy={105} r={11} fill="#07070F" />
          <Circle cx={21} cy={105} r={7} fill={primaryColor} />
          {/* Face mask */}
          <Rect x={110} y={56} width={6} height={52} rx={3} fill="#9CA3AF" />
          <Rect x={110} y={56} width={40} height={7} rx={3} fill="#9CA3AF" />
          <Rect x={110} y={71} width={40} height={7} rx={3} fill="#9CA3AF" />
          <Rect x={110} y={86} width={34} height={7} rx={3} fill="#9CA3AF" />
          {/* Team letter */}
          <SvgText x={62} y={112} textAnchor="middle" fontSize={letter.length > 1 ? 26 : 34} fontWeight="900" fill={accentColor}>
            {letter}
          </SvgText>
        </Svg>
      </View>
    );
  }

  return <View style={[st.wrap, { width: size, height: size, backgroundColor: primaryColor }]} />;
}

const st = StyleSheet.create({
  wrap:         { overflow: "hidden" },
  circle:       { alignItems: "center", justifyContent: "center" },
  circleInner:  { alignItems: "center", justifyContent: "center", borderWidth: 3.5 },
  letterBadge:  { alignItems: "center", justifyContent: "center", borderWidth: 3, overflow: "hidden" },
  letterText:   { textAlign: "center" },
  letterUnderline: { position: "absolute", bottom: 0, left: 0, right: 0, height: 10 },
});
