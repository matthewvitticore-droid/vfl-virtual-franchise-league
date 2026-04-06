/**
 * HelmetSVG – pure SVG football helmet component (React Native)
 *
 * Modelled after the cartoon/illustration style: ¾ front-left view.
 * Four independently-colorable groups:
 *   1. Shell     (shellColor  / helmetColor)
 *   2. Visor     (dark tinted glass – visorColor, default near-black)
 *   3. Facemask  (facemaskColor)
 *   4. Chinstrap (chinstrapColor)
 *
 * ViewBox: 0 0 420 380
 * All paths were hand-traced to match the reference illustration.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, {
  Circle, Defs, Ellipse, G, Path, RadialGradient, Rect, Stop,
} from "react-native-svg";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HelmetProps {
  /** Main dome color */
  helmetColor?:    string;
  shellColor?:     string;    // alias
  /** Cage / facemask color */
  facemaskColor?:  string;
  /** Chinstrap clips + strap color */
  chinstrapColor?: string;
  /** Team initials color on dome */
  logoColor?:      string;
  /** Tinted visor color (defaults to near-black) */
  visorColor?:     string;
  /** Team abbreviation shown on dome */
  abbreviation?:   string;
  width?:          number;
  height?:         number;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function HelmetSVGWithLogo({
  helmetColor,
  shellColor,
  facemaskColor  = "#aaaaaa",
  chinstrapColor = "#888888",
  logoColor      = "#ffffff",
  visorColor     = "#111827",
  abbreviation   = "VFL",
  width          = 300,
  height,
}: HelmetProps) {
  const shell  = helmetColor ?? shellColor ?? "#4F46E5";
  const shell2 = lighten(shell, 0.22);   // highlight for dome gloss
  const shell3 = darken(shell, 0.18);    // shadow for depth
  const abbr   = abbreviation.slice(0, 3).toUpperCase();

  // Scale to requested display size (viewBox is 420×380)
  const vw = 420, vh = 380;
  const displayW = width;
  const displayH = height ?? Math.round(width * vh / vw);

  const logoFS = abbr.length > 2 ? 30 : 38;
  // Logo position on dome (left side, centre of visible shell)
  const LOGO_X = 148, LOGO_Y = 178;

  return (
    <View style={{ width: displayW, height: displayH }}>
      <Svg
        width={displayW}
        height={displayH}
        viewBox={`0 0 ${vw} ${vh}`}
      >
        <Defs>
          {/* Radial gradient for dome gloss */}
          <RadialGradient id="domeGloss" cx="38%" cy="30%" r="60%">
            <Stop offset="0%"   stopColor={shell2} stopOpacity="1" />
            <Stop offset="55%"  stopColor={shell}  stopOpacity="1" />
            <Stop offset="100%" stopColor={shell3} stopOpacity="1" />
          </RadialGradient>
        </Defs>

        {/* ─── GROUP 1: HELMET SHELL ─────────────────────────────────────── */}
        {/*
          The dome is a large rounded shape, left-facing.
          The face opening on the right is cut out by drawing a dark overlay.
        */}
        <G id="shell">
          {/* Main dome body */}
          <Path
            d="M 50 268
               C 18 248 12 166 16 106
               C 20 38 102 4 195 4
               C 280 4 352 46 364 132
               C 376 200 356 258 322 283
               C 290 302 245 308 195 308
               C 148 308 100 296 68 278
               Z"
            fill="url(#domeGloss)"
            stroke="#111"
            strokeWidth="6"
            strokeLinejoin="round"
          />

          {/* Neck/chin roll — bottom rim */}
          <Path
            d="M 50 268 C 68 282 128 312 195 312 C 260 312 300 300 322 283"
            fill="none"
            stroke={shell3}
            strokeWidth="10"
            strokeLinecap="round"
          />

          {/* Ear hole */}
          <Ellipse cx="72" cy="226" rx="16" ry="20" fill={shell3} stroke="#111" strokeWidth="4" />
          <Ellipse cx="72" cy="226" rx="9"  ry="12" fill="#111" />

          {/* Snap / vent on back dome */}
          <Circle cx="55" cy="155" r="6" fill={shell3} stroke="#111" strokeWidth="3" />

          {/* Dome gloss highlight */}
          <Ellipse cx="148" cy="68" rx="45" ry="28" fill="rgba(255,255,255,0.16)" transform="rotate(-15 148 68)" />
        </G>

        {/* ─── FACE OPENING (dark void) ──────────────────────────────────── */}
        {/* Overlaid on dome to create the face area */}
        <Path
          d="M 275 52
             C 336 82 364 158 360 218
             C 356 272 328 298 298 302
             C 285 302 274 296 266 286
             C 248 268 240 222 240 168
             C 240 110 254 68 275 52
             Z"
          fill="#0d0d18"
          stroke="#111"
          strokeWidth="5"
        />

        {/* ─── GROUP 2: VISOR ───────────────────────────────────────────── */}
        {/* Tinted glass sits inside the face opening */}
        <G id="visor">
          <Path
            d="M 280 62
               C 334 92 358 164 354 220
               C 350 268 324 292 298 294
               C 274 276 256 230 254 174
               C 252 116 264 74 280 62
               Z"
            fill={visorColor}
            opacity="0.88"
          />
          {/* Visor gloss streak */}
          <Path
            d="M 290 75 C 330 104 348 162 345 210"
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="18"
            strokeLinecap="round"
          />
        </G>

        {/* ─── GROUP 3: FACEMASK ────────────────────────────────────────── */}
        {/*
          Cage structure: left rail, right rail, top brim,
          2 horizontal bars, 1 centre vertical, bottom chin guard.
          All paths use facemaskColor.
        */}
        <G id="facemask" fill={facemaskColor} stroke="#111" strokeWidth="3.5" strokeLinejoin="round">

          {/* Top mounting brim (the bracket connecting cage to shell crown) */}
          <Path
            d="M 258 52
               C 270 42 295 38 318 46
               C 328 50 336 60 332 70
               L 320 76
               C 316 68 306 62 295 58
               C 278 54 265 60 260 66
               Z"
          />

          {/* Top snap bolts */}
          <Circle cx="280" cy="47" r="7" fill={darken(facemaskColor, 0.2)} stroke="#111" strokeWidth="3" />
          <Circle cx="316" cy="50" r="7" fill={darken(facemaskColor, 0.2)} stroke="#111" strokeWidth="3" />

          {/* LEFT vertical rail (runs along inner face opening edge) */}
          <Rect x="248" y="62" width="16" height="228" rx="8" />

          {/* RIGHT vertical rail (outer edge of cage) */}
          <Rect x="356" y="98" width="16" height="196" rx="8" />

          {/* Horizontal bar 1 */}
          <Rect x="248" y="155" width="124" height="13" rx="6" />

          {/* Horizontal bar 2 */}
          <Rect x="248" y="205" width="124" height="13" rx="6" />

          {/* Centre vertical bar */}
          <Rect x="304" y="62" width="14" height="228" rx="7" />

          {/* Bottom chin guard */}
          <Path
            d="M 248 268
               C 248 292 268 308 312 308
               C 356 308 374 292 374 268
               L 374 280
               C 374 308 355 322 312 322
               C 266 322 248 308 248 282
               Z"
          />
          {/* Chin guard horizontal lip */}
          <Rect x="248" y="265" width="126" height="14" rx="7" />
        </G>

        {/* Clip mount screw at lower-left of cage */}
        <Circle cx="258" cy="256" r="6" fill={darken(facemaskColor, 0.25)} stroke="#111" strokeWidth="3" />
        <Circle cx="366" cy="256" r="6" fill={darken(facemaskColor, 0.25)} stroke="#111" strokeWidth="3" />

        {/* ─── GROUP 4: CHINSTRAP ───────────────────────────────────────── */}
        {/*
          Left snap buckle clip (visible on the helmet left side, just above neck roll)
          Strap/chin pad below the chin guard
        */}
        <G id="chinstrap" fill={chinstrapColor} stroke="#111" strokeWidth="3.5" strokeLinejoin="round">
          {/* Left buckle clip (rectangular snap on the helmet side) */}
          <Rect x="94"  y="246" width="30" height="18" rx="6" />
          <Rect x="101" y="240" width="16" height="10" rx="3" fill={darken(chinstrapColor, 0.2)} />

          {/* Second left clip (lower, just above neck) */}
          <Rect x="88"  y="278" width="28" height="16" rx="5" />
          <Rect x="95"  y="272" width="14" height="10" rx="3" fill={darken(chinstrapColor, 0.2)} />

          {/* Chin pad strap below chin guard */}
          <Path
            d="M 260 316 C 260 334 280 344 312 344 C 342 344 362 334 362 316"
            fill="none"
            stroke={chinstrapColor}
            strokeWidth="14"
            strokeLinecap="round"
          />
          {/* Chin pad oval */}
          <Ellipse cx="312" cy="344" rx="38" ry="16" />
        </G>

      </Svg>

      {/* Team initials on dome — rendered as RN Text for font access */}
      <Text
        style={[
          styles.logo,
          {
            color:    logoColor,
            fontSize: logoFS * (displayW / vw),
            left:     LOGO_X * (displayW / vw) - logoFS * abbr.length * 0.3 * (displayW / vw),
            top:      LOGO_Y * (displayH / vh) - logoFS * 0.55 * (displayH / vh),
          },
        ]}
        numberOfLines={1}
      >
        {abbr}
      </Text>
    </View>
  );
}

// Keep alias for backwards compat
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
function lighten(hex: string, t: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t);
}
function darken(hex: string, t: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * (1 - t), g * (1 - t), b * (1 - t));
}

const styles = StyleSheet.create({
  logo: {
    position:      "absolute",
    fontFamily:    "Inter_700Bold",
    letterSpacing: -0.5,
    textShadowColor:  "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
  },
});
