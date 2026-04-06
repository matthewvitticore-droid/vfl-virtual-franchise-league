/**
 * HelmetPhotoCustomizer
 *
 * Renders the real helmet photo (transparent-background PNG) tinted to helmetColor,
 * then overlays SVG shapes — precisely matched to the photo geometry — for:
 *   • Facemask cage bars   → facemaskColor
 *   • Chinstrap hardware   → chinstrapColor
 *   • Team initials        → logoColor (on dome side)
 *
 * Internally always renders at INTERNAL_SIZE × INTERNAL_SIZE (square = matches photo).
 * Scale the outer View to display at any size.
 */

import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Svg, { Ellipse, G, Line, Path, Rect } from "react-native-svg";

// The internal working size (matches the square photo source)
const S = 300;

interface HelmetSVGProps {
  helmetColor:     string;
  facemaskColor?:  string;
  chinstrapColor?: string;
  logoColor?:      string;
  abbreviation?:   string;
  /** Display width in points. Height auto-equals width (square). */
  width?:          number;
  /** If provided, aspect is width × height; image is letterboxed. Pass equal values to keep square. */
  height?:         number;
}

export function HelmetSVGWithLogo({
  helmetColor,
  facemaskColor  = "#aaaaaa",
  chinstrapColor = "#888888",
  logoColor      = "#ffffff",
  abbreviation   = "VFL",
  width          = S,
  height,
}: HelmetSVGProps) {
  // Always keep square so photo geometry stays correct
  const size   = height ? Math.min(width, height) : width;
  const abbr   = abbreviation.slice(0, 3).toUpperCase();
  const scale  = size / S;

  // ── Photo geometry (all in S×S = 300 coordinates) ──────────────────────────
  //
  // Source photo: 1024×1024 white helmet, right-facing ¾ view.
  // Helmet fills ~85% of the image with about 7% margin on each side.
  // After bg-removal, still 1024×1024. Displayed with resizeMode="stretch"
  // so every coordinate below maps directly to the same fraction of the container.
  //
  // Reference points (as % of 1024, then × 300 / 1 = direct in S coords):

  // ── Facemask cage ──────────────────────────────────────────────────────────
  const FM_L  = 0.490 * S;   // left vertical bar X
  const FM_R  = 0.835 * S;   // right vertical bar X
  const FM_T  = 0.215 * S;   // top bar Y
  const FM_B  = 0.790 * S;   // bottom bar Y
  const FM_M1 = 0.420 * S;   // middle bar 1 Y
  const FM_M2 = 0.590 * S;   // middle bar 2 Y
  const FM_CV = 0.655 * S;   // center vertical bar X
  const FM_SW = 10;           // stroke width (thick enough to cover photo bars)
  const BOLT  = 6;            // bolt circle radius

  // ── Chinstrap / snap clips ────────────────────────────────────────────────
  // Left clip (rear of helmet chin area)
  const CS_L_X = 0.190 * S;
  const CS_L_Y = 0.750 * S;
  const CS_W   = 0.065 * S;
  const CS_H   = 0.055 * S;
  // Right clip (front chin)
  const CS_R_X = 0.430 * S;
  const CS_R_Y = 0.760 * S;
  // Chin pad oval
  const CHIN_X = 0.310 * S;
  const CHIN_Y = 0.840 * S;
  const CHIN_W = 0.070 * S;
  const CHIN_H = 0.030 * S;
  const STRAP_W = 6;

  // ── Logo on dome side ─────────────────────────────────────────────────────
  const LOGO_X  = 0.270 * S;
  const LOGO_Y  = 0.450 * S;
  const LOGO_FS = abbr.length > 2 ? 22 : 28;

  // When rendering inside a non-square container, center the square content
  const containerW = width;
  const containerH = height ?? width;
  const offsetX = (containerW - size) / 2;
  const offsetY = (containerH - size) / 2;

  return (
    <View style={{ width: containerW, height: containerH }}>

      {/* ── Base helmet photo, tinted to helmetColor ──────────────────────── */}
      <Image
        source={require("@/assets/helmet_photo.png")}
        style={{
          position: "absolute",
          left:   offsetX,
          top:    offsetY,
          width:  size,
          height: size,
        }}
        tintColor={helmetColor}
        resizeMode="stretch"
      />

      {/* ── SVG overlay (facemask + chinstrap) ────────────────────────────── */}
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${S} ${S}`}
        style={{ position: "absolute", left: offsetX, top: offsetY }}
      >
        {/* Facemask cage */}
        <G>
          <Line x1={FM_L} y1={FM_T} x2={FM_L} y2={FM_B}
            stroke={facemaskColor} strokeWidth={FM_SW} strokeLinecap="round" />
          <Line x1={FM_R} y1={FM_T} x2={FM_R} y2={FM_B}
            stroke={facemaskColor} strokeWidth={FM_SW} strokeLinecap="round" />
          <Line x1={FM_L} y1={FM_T} x2={FM_R} y2={FM_T}
            stroke={facemaskColor} strokeWidth={FM_SW} strokeLinecap="round" />
          <Line x1={FM_L} y1={FM_B} x2={FM_R} y2={FM_B}
            stroke={facemaskColor} strokeWidth={FM_SW} strokeLinecap="round" />
          <Line x1={FM_L} y1={FM_M1} x2={FM_R} y2={FM_M1}
            stroke={facemaskColor} strokeWidth={FM_SW} strokeLinecap="round" />
          <Line x1={FM_L} y1={FM_M2} x2={FM_R} y2={FM_M2}
            stroke={facemaskColor} strokeWidth={FM_SW} strokeLinecap="round" />
          <Line x1={FM_CV} y1={FM_T} x2={FM_CV} y2={FM_B}
            stroke={facemaskColor} strokeWidth={FM_SW} strokeLinecap="round" />
          {/* Mount bolts */}
          <Ellipse cx={FM_L} cy={FM_T + BOLT * 2.5} rx={BOLT} ry={BOLT}
            fill={darken(facemaskColor, 0.3)} />
          <Ellipse cx={FM_L} cy={FM_B - BOLT * 2.5} rx={BOLT} ry={BOLT}
            fill={darken(facemaskColor, 0.3)} />
          <Ellipse cx={FM_R - BOLT * 1.5} cy={FM_T + BOLT * 2} rx={BOLT * 0.8} ry={BOLT * 0.8}
            fill={darken(facemaskColor, 0.3)} />
        </G>

        {/* Chinstrap clips */}
        <G>
          <Rect x={CS_L_X - CS_W / 2} y={CS_L_Y} width={CS_W} height={CS_H}
            rx={CS_H * 0.3} fill={chinstrapColor} />
          <Rect x={CS_R_X - CS_W / 2} y={CS_R_Y} width={CS_W} height={CS_H}
            rx={CS_H * 0.3} fill={chinstrapColor} />
          <Ellipse cx={CHIN_X} cy={CHIN_Y} rx={CHIN_W} ry={CHIN_H}
            fill={chinstrapColor} />
          <Path
            d={`M ${CS_L_X} ${CS_L_Y + CS_H} Q ${CS_L_X + 15} ${CHIN_Y} ${CHIN_X - CHIN_W} ${CHIN_Y}`}
            fill="none" stroke={chinstrapColor}
            strokeWidth={STRAP_W} strokeLinecap="round" />
          <Path
            d={`M ${CS_R_X} ${CS_R_Y + CS_H} Q ${CS_R_X - 10} ${CHIN_Y} ${CHIN_X + CHIN_W} ${CHIN_Y}`}
            fill="none" stroke={chinstrapColor}
            strokeWidth={STRAP_W} strokeLinecap="round" />
        </G>
      </Svg>

      {/* ── Team initials (React Native Text for font support) ────────────── */}
      <Text
        style={[
          styles.logo,
          {
            color:    logoColor,
            fontSize: LOGO_FS * scale,
            left:     offsetX + (LOGO_X - LOGO_FS * abbr.length * 0.38) * scale,
            top:      offsetY + (LOGO_Y - LOGO_FS * 0.55) * scale,
          },
        ]}
        numberOfLines={1}
      >
        {abbr}
      </Text>
    </View>
  );
}

// Keep old alias
export { HelmetSVGWithLogo as HelmetSVG };

// ─── Color helpers ─────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "").padEnd(6, "0").slice(0, 6);
  const n = parseInt(clean, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b]
    .map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
    .join("");
}

function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

const styles = StyleSheet.create({
  logo: {
    position:   "absolute",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
    textShadowColor:  "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
});
