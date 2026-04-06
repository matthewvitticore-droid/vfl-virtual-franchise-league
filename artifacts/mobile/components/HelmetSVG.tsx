import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, {
  Path, Ellipse, Rect, Line, G, Defs, RadialGradient, Stop,
} from "react-native-svg";

interface HelmetSVGProps {
  helmetColor: string;
  facemaskColor?: string;
  chinstrapColor?: string;
  logoColor?: string;
  abbreviation?: string;
  width?: number;
  height?: number;
}

/**
 * Vector football helmet drawn as SVG — side profile (facing right).
 * Each major part is independently colored.
 *
 * Coordinate space: 240 × 210
 */
export function HelmetSVG({
  helmetColor,
  facemaskColor  = "#aaaaaa",
  chinstrapColor = "#888888",
  logoColor      = "#ffffff",
  abbreviation   = "VFL",
  width          = 240,
  height         = 210,
}: HelmetSVGProps) {
  const abbr = abbreviation.slice(0, 3).toUpperCase();
  const highlight = lighten(helmetColor, 0.28);
  const shadow    = darken(helmetColor, 0.22);
  const rim       = darken(helmetColor, 0.14);

  return (
    <Svg width={width} height={height} viewBox="0 0 240 210">
      <Defs>
        <RadialGradient id="shine" cx="38%" cy="35%" r="55%">
          <Stop offset="0%"   stopColor={highlight} stopOpacity="0.85" />
          <Stop offset="60%"  stopColor={helmetColor} stopOpacity="1" />
          <Stop offset="100%" stopColor={shadow}    stopOpacity="1" />
        </RadialGradient>
      </Defs>

      {/* ── Helmet Shell ──────────────────────────────────────────────────────── */}
      {/* Main dome */}
      <Path
        d="M 68 162
           Q 24 158 16 112
           Q 10 58 72 22
           Q 120 4  158 28
           Q 196 52 198 102
           Q 200 148 170 160
           L 68 162 Z"
        fill="url(#shine)"
      />

      {/* Bottom rim / neck roll */}
      <Path
        d="M 68 162 Q 120 172 170 160"
        fill="none"
        stroke={rim}
        strokeWidth="8"
        strokeLinecap="round"
      />

      {/* ── Face Opening (dark void inside the face cutout) ─────────────────── */}
      <Path
        d="M 170 160
           Q 200 148 198 102
           Q 196 60 162 32
           Q 152 25 148 38
           Q 158 60 158 98
           Q 158 134 152 154
           Z"
        fill="#0d0d18"
      />

      {/* ── Inner padding line (shadow edge) ────────────────────────────────── */}
      <Path
        d="M 148 38 Q 144 70 144 98 Q 144 134 148 155"
        fill="none"
        stroke={shadow}
        strokeWidth="3"
        opacity="0.6"
      />

      {/* ── Logo on side of helmet ───────────────────────────────────────────── */}
      <Text
        style={[
          styles.logoText,
          { color: logoColor, fontSize: abbr.length > 2 ? 22 : 28 },
        ]}
        // SVG Text doesn't render well via Text; handled below with react-native Text overlay
      />

      {/* ── Facemask cage ───────────────────────────────────────────────────── */}
      {/* Outer frame */}
      <Path
        d="M 152 56
           L 220 56
           Q 232 56 232 68
           L 232 152
           Q 232 162 220 162
           L 152 162"
        fill="none"
        stroke={facemaskColor}
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Top horizontal bar */}
      <Line x1="152" y1="56" x2="232" y2="56"  stroke={facemaskColor} strokeWidth="8" strokeLinecap="round" />
      {/* Middle bar 1 */}
      <Line x1="152" y1="96" x2="232" y2="96"  stroke={facemaskColor} strokeWidth="7" strokeLinecap="round" />
      {/* Middle bar 2 */}
      <Line x1="152" y1="128" x2="232" y2="128" stroke={facemaskColor} strokeWidth="7" strokeLinecap="round" />
      {/* Center vertical bar */}
      <Line x1="192" y1="56" x2="192" y2="162" stroke={facemaskColor} strokeWidth="7" strokeLinecap="round" />

      {/* Facemask mount bolts */}
      <Ellipse cx="160" cy="56"  rx="5" ry="5" fill={darken(facemaskColor, 0.15)} />
      <Ellipse cx="160" cy="162" rx="5" ry="5" fill={darken(facemaskColor, 0.15)} />

      {/* ── Ear hole / snap clips ───────────────────────────────────────────── */}
      <Ellipse cx="46" cy="120" rx="12" ry="14" fill={darken(helmetColor, 0.3)} />
      <Ellipse cx="46" cy="120" rx="7"  ry="9"  fill="#0d0d18" />

      {/* ── Chinstrap clips ─────────────────────────────────────────────────── */}
      <Rect x="44" y="155" width="22" height="12" rx="4" fill={chinstrapColor} />
      <Rect x="136" y="156" width="22" height="12" rx="4" fill={chinstrapColor} />

      {/* Strap band */}
      <Path
        d="M 55 167 Q 55 182 90 190 Q 122 198 149 168"
        fill="none"
        stroke={chinstrapColor}
        strokeWidth="7"
        strokeLinecap="round"
      />
      {/* Strap center buckle */}
      <Rect x="84" y="186" width="22" height="10" rx="3" fill={darken(chinstrapColor, 0.2)} />
      <Line x1="95" y1="186" x2="95" y2="196" stroke={chinstrapColor} strokeWidth="2" />

      {/* ── Highlight gloss ─────────────────────────────────────────────────── */}
      <Ellipse
        cx="88"
        cy="62"
        rx="28"
        ry="18"
        fill="rgba(255,255,255,0.12)"
        transform="rotate(-25 88 62)"
      />
    </Svg>
  );
}

/** Lightweight logo text overlay positioned on the helmet side */
export function HelmetSVGWithLogo(props: HelmetSVGProps) {
  const { width = 240, height = 210, logoColor = "#ffffff", abbreviation = "VFL" } = props;
  const abbr = abbreviation.slice(0, 3).toUpperCase();
  const scale = width / 240;

  return (
    <View style={{ width, height }}>
      <HelmetSVG {...props} />
      {/* Logo text: positioned on the left dome area of the helmet */}
      <Text
        style={[
          styles.logoOverlay,
          {
            color: logoColor,
            fontSize: (abbr.length > 2 ? 22 : 28) * scale,
            left:  width * 0.29,
            top:   height * 0.41,
            textShadowColor: "rgba(0,0,0,0.45)",
          },
        ]}
        numberOfLines={1}
      >
        {abbr}
      </Text>
    </View>
  );
}

// ─── Color helpers ─────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "").padEnd(6, "0").slice(0, 6);
  const n = parseInt(clean, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}

function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
}

function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

const styles = StyleSheet.create({
  logoText:    { display: "none" },
  logoOverlay: {
    position:   "absolute",
    fontFamily: "Inter_700Bold",
    letterSpacing: -1,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});
