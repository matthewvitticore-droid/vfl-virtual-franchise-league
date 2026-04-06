/**
 * Helmet.jsx
 *
 * Clean, symmetrical front-facing Schutt-style football helmet.
 * Treated as a vector logo / sports-game UI asset.
 *
 * Layout (512 × 512, symmetric around x = 256):
 *
 *   y  36  ──── shell crown
 *   y 205  ──── brow attachment edge  (dome arc ends here)
 *   y 196  ──── brow mount bar top
 *   y 232  ──── brow mount bar bottom / cage top
 *   y 232  ──── visor + cage uprights + centre bar begin
 *   y 418  ──── J-bar 1
 *   y 444  ──── J-bar 2
 *   y 464  ──── chin bar / cage bottom
 *   y 470  ──── chin cup
 *
 * Props
 *   size           rendered square size (px)
 *   shellColor     dome colour
 *   facemaskColor  all cage bar / brow-bar colour
 *   visorColor     dark visor panel colour
 *   chinstrapColor chin cup colour
 *   stripeColor    crown stripe colour
 *   visorText      optional text rendered on visor
 */

import React from "react";
import Svg, {
  Defs, RadialGradient, LinearGradient, Stop,
  Path, Rect, Text as SvgText,
} from "react-native-svg";

export default function Helmet({
  size           = 220,
  shellColor     = "#ECEEF2",
  facemaskColor  = "#C4CAD6",
  visorColor     = "#080C14",
  chinstrapColor = "#ECEEF2",
  stripeColor    = "#CC2020",
  visorText      = "",
}) {
  /* ── constants ──────────────────────────────────────────────── */
  const INK     = "#12161F";        // universal outline / stroke colour
  const SW      = 7;                // standard shell stroke-width
  const TUBE_W  = 20;               // cage bar tube diameter
  const TUBE_SW = 4;                // cage bar ink outline

  /* ── tube bar helper ────────────────────────────────────────── */
  /* Each bar is rendered as:
       1. Wider dark ring  (shadow / depth)
       2. Main colour fill
       3. Thin ink outline
  */
  const Bar = ({ d, w = TUBE_W }) => (
    <>
      <Path d={d} stroke="rgba(0,0,0,0.28)" strokeWidth={w + 7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d={d} stroke={facemaskColor}     strokeWidth={w}     fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d={d} stroke="rgba(255,255,255,0.25)" strokeWidth={w * 0.25} fill="none" strokeLinecap="round" />
      <Path d={d} stroke={INK}               strokeWidth={TUBE_SW} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  );

  return (
    <Svg width={size} height={size} viewBox="0 0 512 512">

      {/* ── gradient definitions ─────────────────────────────── */}
      <Defs>
        {/* Dome gloss — upper-left highlight */}
        <RadialGradient id="g_shell_gloss" cx="34%" cy="20%" r="60%">
          <Stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.36" />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0"    />
        </RadialGradient>

        {/* Dome shadow — left ambient */}
        <RadialGradient id="g_shell_shad" cx="8%" cy="62%" r="50%">
          <Stop offset="0%"   stopColor="#000000" stopOpacity="0.22" />
          <Stop offset="100%" stopColor="#000000" stopOpacity="0"    />
        </RadialGradient>

        {/* Visor — mirror-tinted top-lit effect */}
        <LinearGradient id="g_visor" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%"   stopColor={visorColor} stopOpacity="0.82" />
          <Stop offset="30%"  stopColor={visorColor} stopOpacity="0.72" />
          <Stop offset="36%"  stopColor="#FFFFFF"    stopOpacity="0.10" />
          <Stop offset="42%"  stopColor={visorColor} stopOpacity="0.76" />
          <Stop offset="100%" stopColor={visorColor} stopOpacity="1"    />
        </LinearGradient>
      </Defs>

      {/* ═══════════════════════════════════════════════════════
          1.  SHELL  —  small arc dome visible above facemask
          ═══════════════════════════════════════════════════════
          Arc from left-brow (148, 205) → crown (256, 36) → right-brow (364, 205).
          Straight closing edge at y=205 is hidden behind the brow mount bar.
      */}
      {/* base fill */}
      <Path
        fill={shellColor} stroke={INK} strokeWidth={SW} strokeLinejoin="round"
        d="
          M 148 205
          C 116 205, 72 188, 54 156
          C 36 122, 48 72, 92 48
          C 140 24, 196 20, 256 20
          C 316 20, 372 24, 420 48
          C 464 72, 476 122, 458 156
          C 440 188, 396 205, 364 205
          L 148 205 Z
        "
      />
      {/* gloss overlay */}
      <Path
        fill="url(#g_shell_gloss)"
        d="
          M 148 205 C 116 205, 72 188, 54 156
          C 36 122, 48 72, 92 48 C 140 24, 196 20, 256 20
          C 316 20, 372 24, 420 48 C 464 72, 476 122, 458 156
          C 440 188, 396 205, 364 205 L 148 205 Z
        "
      />
      {/* shadow overlay */}
      <Path
        fill="url(#g_shell_shad)"
        d="
          M 148 205 C 116 205, 72 188, 54 156
          C 36 122, 48 72, 92 48 C 140 24, 196 20, 256 20
          C 316 20, 372 24, 420 48 C 464 72, 476 122, 458 156
          C 440 188, 396 205, 364 205 L 148 205 Z
        "
      />

      {/* Top gloss streak */}
      <Path
        d="M 206 48 C 230 36, 282 36, 306 48"
        stroke="#FFFFFF" strokeWidth="11" strokeLinecap="round" fill="none" opacity="0.45"
      />

      {/* Crown stripe */}
      <Path
        fill={stripeColor} stroke={INK} strokeWidth="2.5" strokeLinejoin="round"
        d="M 249 22 Q 256 17, 263 22 L 264 203 L 248 203 Z"
      />

      {/* ═══════════════════════════════════════════════════════
          2.  BROW MOUNT BAR  —  shelf connecting dome to cage
          ═══════════════════════════════════════════════════════ */}
      <Path
        fill={facemaskColor} stroke={INK} strokeWidth="5" strokeLinejoin="round"
        d="
          M 150 196 C 150 184, 157 178, 168 178
          L 344 178 C 355 178, 362 184, 362 196
          L 362 228 C 362 240, 355 246, 344 246
          L 168 246 C 157 246, 150 240, 150 228 Z
        "
      />
      {/* brow bar top highlight */}
      <Path
        d="M 156 185 L 356 185"
        stroke="rgba(255,255,255,0.32)" strokeWidth="6" strokeLinecap="round" fill="none"
      />

      {/* T-clip hardware — left */}
      <Rect x="196" y="170" width="30" height="13" rx="4" fill="#D4DAE6" stroke={INK} strokeWidth="3" opacity="0.95" />
      <Rect x="202" y="180" width="18" height="17" rx="3" fill="#C2C8D4" stroke={INK} strokeWidth="3" opacity="0.95" />

      {/* T-clip hardware — right */}
      <Rect x="286" y="170" width="30" height="13" rx="4" fill="#D4DAE6" stroke={INK} strokeWidth="3" opacity="0.95" />
      <Rect x="292" y="180" width="18" height="17" rx="3" fill="#C2C8D4" stroke={INK} strokeWidth="3" opacity="0.95" />

      {/* ═══════════════════════════════════════════════════════
          3.  VISOR  —  full-width dark panel behind cage bars
          ═══════════════════════════════════════════════════════
          Spans x 128–384, from brow bar bottom (y 248) to
          just above chin bar (y 448), with rounded lower corners.
      */}
      <Path
        fill="url(#g_visor)" stroke="none"
        d="
          M 128 248 L 384 248
          L 384 440
          C 370 458, 318 468, 256 468
          C 194 468, 142 458, 128 440
          L 128 248 Z
        "
      />
      {/* visor top edge highlight */}
      <Path
        d="M 130 253 L 382 253"
        stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.20"
      />
      {/* visor reflective band */}
      <Path
        d="M 134 306 C 196 296, 316 296, 378 306"
        stroke="#FFFFFF" strokeWidth="18" strokeLinecap="round" fill="none" opacity="0.07"
      />

      {/* Optional visor text */}
      {!!visorText && (
        <SvgText
          x="256" y="372" textAnchor="middle"
          fontSize="70" fontWeight="bold"
          fill="#FFFFFF" letterSpacing="2" opacity="0.90"
        >
          {visorText}
        </SvgText>
      )}

      {/* ═══════════════════════════════════════════════════════
          4.  CAGE BARS
          ═══════════════════════════════════════════════════════
          Draw order: uprights first (widest), then horizontal
          bars on top, then centre vertical on top of those.
      */}

      {/* Left upright — bows gently outward */}
      <Bar d="M 148 246 C 104 272, 84 358, 102 464" w={22} />

      {/* Right upright */}
      <Bar d="M 364 246 C 408 272, 428 358, 410 464" w={22} />

      {/* Top horizontal bar — spans across just below brow (= visible top of cage frame) */}
      <Bar d="M 130 270 L 382 270" w={20} />

      {/* Centre vertical divider — runs full height of cage */}
      <Bar d="M 256 248 L 256 464" w={18} />

      {/* J-bar 1 */}
      <Bar d="M 106 418 L 406 418" w={20} />

      {/* J-bar 2 */}
      <Bar d="M 102 446 L 410 446" w={20} />

      {/* Chin bar — curved bottom of cage */}
      <Bar d="M 102 464 Q 256 498, 410 464" w={22} />

      {/* ═══════════════════════════════════════════════════════
          5.  CHINSTRAP / CHIN CUP
          ═══════════════════════════════════════════════════════ */}

      {/* Strap — left */}
      <Path
        d="M 110 420 C 106 444, 152 468, 200 478"
        stroke={chinstrapColor} strokeWidth="8" strokeLinecap="round" fill="none" opacity="0.82"
      />
      <Path
        d="M 110 420 C 106 444, 152 468, 200 478"
        stroke={INK} strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.35"
      />

      {/* Strap — right */}
      <Path
        d="M 402 420 C 406 444, 360 468, 312 478"
        stroke={chinstrapColor} strokeWidth="8" strokeLinecap="round" fill="none" opacity="0.82"
      />
      <Path
        d="M 402 420 C 406 444, 360 468, 312 478"
        stroke={INK} strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.35"
      />

      {/* Chin cup — oval pad centred below chin bar */}
      <Path
        fill={chinstrapColor} stroke={INK} strokeWidth="5.5" strokeLinejoin="round"
        d="
          M 200 476 C 182 476, 170 488, 170 502
          L 170 510 C 170 512, 186 512, 212 512
          L 300 512 C 326 512, 342 512, 342 510
          L 342 502 C 342 488, 330 476, 312 476 Z
        "
      />
      {/* Chin cup gloss crease */}
      <Path
        d="M 204 487 C 228 479, 284 479, 308 487"
        stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.25"
      />
      <Path
        d="M 206 500 C 228 494, 284 494, 306 500"
        stroke={INK} strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.14"
      />

    </Svg>
  );
}
