/**
 * Helmet – SVG football helmet component for React Native (react-native-svg)
 *
 * ¾ front-left view matching the reference illustration.
 * Four independently-colorable groups:
 *   1. shell      (shellColor / helmetColor)
 *   2. visor      (visorColor)
 *   3. facemask   (facemaskColor)
 *   4. chinstrap  (chinstrapColor)
 *
 * ViewBox: 0 0 520 480
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, {
  Circle, Defs, Ellipse, G, Path, RadialGradient, Rect, Stop,
} from "react-native-svg";

// ─── Props ────────────────────────────────────────────────────────────────────

interface HelmetProps {
  /** Shell / dome color */
  shellColor?:     string;
  helmetColor?:    string;   // alias kept for callers
  /** Tinted visor / eye-shield color */
  visorColor?:     string;
  /** Facemask cage color */
  facemaskColor?:  string;
  /** Chinstrap hardware color */
  chinstrapColor?: string;
  /** Team initials rendered on dome */
  logoColor?:      string;
  abbreviation?:   string;
  width?:          number;
  height?:         number;
}

// ─── Geometry constants (all in 0 0 520 480 coordinate space) ─────────────────

// ── DOME ──
// Large rounded dome occupying the left/centre. The dome's face-opening edge
// is on the right side (x ≈ 300-420).
const DOME =
  "M 44 380 " +
  "C 12 356 8 268 12 190 " +
  "C 16 88 106 14 220 10 " +
  "C 328 6 415 62 424 178 " +
  "C 432 268 410 344 376 374 " +
  "C 355 384 318 390 278 390 " +
  "C 200 390 106 370 44 380 Z";

// ── FACE OPENING ──
// Dark region cut out of the dome face. Drawn ON TOP of the dome in dark colour.
// Runs from the top of the face (y≈55) down to the bottom chin area (y≈382).
const FACE_OPEN =
  "M 318 52 " +
  "C 370 80 410 155 418 228 " +
  "C 426 300 406 365 372 385 " +
  "C 345 384 318 374 298 358 " +
  "C 274 326 258 278 256 226 " +
  "C 254 166 272 100 318 52 Z";

// ── VISOR ──
// The tinted glass shield. Fills the upper portion of the face opening.
const VISOR =
  "M 322 62 " +
  "C 368 90 404 160 412 228 " +
  "C 418 290 400 350 368 372 " +
  "C 347 372 324 362 306 346 " +
  "C 288 316 276 276 274 230 " +
  "C 272 170 288 106 322 62 Z";

// ── FACEMASK PATHS ──
// Left vertical rail (runs along the inner-left edge of the face opening)
const FM_RAIL_L =
  "M 252 60 " +
  "C 248 56 244 55 242 56 " +
  "L 240 390 " +
  "C 244 392 250 392 255 390 " +
  "L 258 60 Z";

// Right outer frame rail
const FM_RAIL_R =
  "M 414 95 " +
  "C 418 100 420 108 420 118 " +
  "L 418 390 " +
  "C 414 395 406 395 402 390 " +
  "L 400 118 " +
  "C 400 110 404 100 408 95 Z";

// Top brim — connects the two rails at the top with a curved bar
const FM_TOP =
  "M 242 56 " +
  "C 260 44 310 38 360 46 " +
  "C 390 52 412 72 414 95 " +
  "L 402 100 " +
  "C 400 82 378 64 350 58 " +
  "C 305 50 262 54 255 66 Z";

// Horizontal bar 1 (across the mid-face area, below the visor)
const FM_BAR1 =
  "M 244 256 L 410 256 L 410 268 L 244 268 Z";

// Centre vertical bar (from top to bottom chin guard)
const FM_CENTER =
  "M 322 56 L 330 56 L 332 390 L 324 390 Z";

// Bottom chin guard — the flat horizontal tab at the bottom of the cage
const FM_CHIN =
  "M 244 382 " +
  "C 244 395 262 402 326 402 " +
  "C 388 402 412 395 412 382 " +
  "L 412 394 " +
  "C 412 410 386 416 326 416 " +
  "C 264 416 242 410 242 394 Z";

// ─── Component ───────────────────────────────────────────────────────────────

export function HelmetSVGWithLogo({
  shellColor,
  helmetColor,
  visorColor     = "#0d1117",
  facemaskColor  = "#aaaaaa",
  chinstrapColor = "#888888",
  logoColor      = "#ffffff",
  abbreviation   = "VFL",
  width          = 300,
  height,
}: HelmetProps) {
  const shell  = helmetColor ?? shellColor ?? "#4F46E5";
  const hi     = lighten(shell, 0.26);   // gloss highlight
  const sh     = darken(shell, 0.20);    // shadow / depth
  const abbr   = (abbreviation ?? "VFL").slice(0, 3).toUpperCase();

  const VW = 520, VH = 480;
  const displayW = width;
  const displayH = height ?? Math.round(width * VH / VW);
  const scaleW   = displayW / VW;
  const scaleH   = displayH / VH;

  // Logo placement: centre-left of dome
  const LOGO_X  = 158;
  const LOGO_Y  = 215;
  const LOGO_FS = abbr.length > 2 ? 42 : 54;

  return (
    <View style={{ width: displayW, height: displayH }}>
      <Svg width={displayW} height={displayH} viewBox={`0 0 ${VW} ${VH}`}>
        <Defs>
          <RadialGradient id="domeGrad" cx="35%" cy="28%" r="62%">
            <Stop offset="0%"   stopColor={hi}   stopOpacity="1" />
            <Stop offset="52%"  stopColor={shell} stopOpacity="1" />
            <Stop offset="100%" stopColor={sh}    stopOpacity="1" />
          </RadialGradient>
        </Defs>

        {/* ── GROUP 1: SHELL ──────────────────────────────────────────────── */}
        <G id="shell">
          {/* Main dome */}
          <Path
            d={DOME}
            fill="url(#domeGrad)"
            stroke="#111"
            strokeWidth="6"
            strokeLinejoin="round"
          />

          {/* Neck / bottom rim edge */}
          <Path
            d="M 44 380 C 120 415 200 424 278 420 C 340 416 390 400 420 380"
            fill="none"
            stroke={sh}
            strokeWidth="12"
            strokeLinecap="round"
          />

          {/* Ear hole (left side of dome) */}
          <Ellipse cx="76" cy="302" rx="18" ry="22"
            fill={sh} stroke="#111" strokeWidth="4" />
          <Ellipse cx="76" cy="302" rx="10" ry="13" fill="#0d0d18" />

          {/* Back vent dot */}
          <Circle cx="52" cy="210" r="7"
            fill={sh} stroke="#111" strokeWidth="3" />

          {/* Gloss highlight on dome */}
          <Ellipse cx="158" cy="88" rx="52" ry="32"
            fill="rgba(255,255,255,0.17)"
            transform="rotate(-12 158 88)"
          />
        </G>

        {/* ── FACE OPENING (dark void) ────────────────────────────────────── */}
        <Path
          d={FACE_OPEN}
          fill="#0d0d18"
          stroke="#111"
          strokeWidth="5"
          strokeLinejoin="round"
        />

        {/* ── GROUP 2: VISOR ──────────────────────────────────────────────── */}
        <G id="visor">
          <Path
            d={VISOR}
            fill={visorColor}
            opacity="0.92"
          />
          {/* Visor gloss streak */}
          <Path
            d="M 332 76 C 374 108 400 170 404 234"
            fill="none"
            stroke="rgba(255,255,255,0.13)"
            strokeWidth="22"
            strokeLinecap="round"
          />
        </G>

        {/* ── GROUP 3: FACEMASK ───────────────────────────────────────────── */}
        <G id="facemask"
          fill={facemaskColor}
          stroke="#111"
          strokeWidth="4"
          strokeLinejoin="round"
        >
          {/* Top brim */}
          <Path d={FM_TOP} />

          {/* Mounting bolts on top brim */}
          <Circle cx="288" cy="48" r="9"
            fill={darken(facemaskColor, 0.22)} stroke="#111" strokeWidth="3.5" />
          <Circle cx="356" cy="50" r="9"
            fill={darken(facemaskColor, 0.22)} stroke="#111" strokeWidth="3.5" />

          {/* Left vertical rail */}
          <Path d={FM_RAIL_L} />

          {/* Right outer frame */}
          <Path d={FM_RAIL_R} />

          {/* Horizontal bar */}
          <Path d={FM_BAR1} />

          {/* Centre vertical bar */}
          <Path d={FM_CENTER} />

          {/* Bottom chin guard */}
          <Path d={FM_CHIN} />

          {/* Chin guard horizontal lip */}
          <Rect x="240" y="380" width="174" height="14" rx="7" />
        </G>

        {/* Cage screw/rivet at lower clips */}
        <Circle cx="252" cy="374" r="7"
          fill={darken(facemaskColor, 0.28)} stroke="#111" strokeWidth="3" />
        <Circle cx="408" cy="374" r="7"
          fill={darken(facemaskColor, 0.28)} stroke="#111" strokeWidth="3" />

        {/* ── GROUP 4: CHINSTRAP ──────────────────────────────────────────── */}
        <G id="chinstrap"
          fill={chinstrapColor}
          stroke="#111"
          strokeWidth="3.5"
          strokeLinejoin="round"
        >
          {/* Upper clip (left side, above ear hole) */}
          <Rect x="100" y="262" width="32" height="18" rx="6" />
          <Rect x="108" y="255" width="16" height="10" rx="3"
            fill={darken(chinstrapColor, 0.22)} />

          {/* Lower clip (below ear hole) */}
          <Rect x="92"  y="318" width="30" height="17" rx="5" />
          <Rect x="100" y="311" width="14" height="9"  rx="3"
            fill={darken(chinstrapColor, 0.22)} />

          {/* Chin pad strap arc */}
          <Path
            d="M 252 408 C 252 434 276 446 326 446 C 374 446 400 434 400 408"
            fill="none"
            stroke={chinstrapColor}
            strokeWidth="16"
            strokeLinecap="round"
          />

          {/* Chin pad oval */}
          <Ellipse cx="326" cy="446" rx="44" ry="18" />
        </G>
      </Svg>

      {/* Team initials — React Native Text for font access */}
      <Text
        style={[
          styles.logo,
          {
            color:    logoColor,
            fontSize: LOGO_FS * scaleW,
            left:     (LOGO_X - LOGO_FS * abbr.length * 0.35) * scaleW,
            top:      (LOGO_Y - LOGO_FS * 0.55) * scaleH,
          },
        ]}
        numberOfLines={1}
      >
        {abbr}
      </Text>
    </View>
  );
}

export { HelmetSVGWithLogo as HelmetSVG };

// ─── Color utilities ───────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace("#", "").padEnd(6, "0").slice(0, 6);
  const n = parseInt(c, 16);
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
    textShadowColor:  "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 5,
  },
});
