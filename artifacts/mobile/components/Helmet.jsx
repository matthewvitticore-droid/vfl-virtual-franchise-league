import React from "react";
import Svg, { Path, Ellipse, Rect, Text as SvgText } from "react-native-svg";

/**
 * Front-facing cartoon Schutt-style helmet.
 *
 *   shellColor     – dome & chin-cup colour
 *   facemaskColor  – cage bars / uprights (Schutt ROPO style)
 *   visorColor     – dark face-opening tint
 *   stripeColor    – crown stripe
 *   chinstrapColor – chin cup pad at bottom
 *   visorText      – optional text rendered on visor (e.g. "+VFL")
 */
export default function Helmet({
  size           = 220,
  shellColor     = "#ECEEF2",
  facemaskColor  = "#C0C6D0",
  visorColor     = "#080C14",
  stripeColor    = "#CC2020",
  chinstrapColor = "#ECEEF2",
  visorText      = "",
}) {
  const ink = "#1A1E2C";

  return (
    <Svg width={size} height={size} viewBox="0 0 512 512">

      {/* ── 1. SHELL ─────────────────────────────────────────────── */}

      {/* Main dome */}
      <Path
        d="
          M 256 46
          C 140 46, 58 122, 58 222
          C 58 296, 92 344, 164 360
          L 348 360
          C 420 344, 454 296, 454 222
          C 454 122, 372 46, 256 46 Z
        "
        fill={shellColor}
        stroke={ink}
        strokeWidth="8"
        strokeLinejoin="round"
      />

      {/* Left shadow band */}
      <Path
        d="
          M 58 222
          C 58 296, 92 344, 164 360
          L 186 360
          C 120 344, 88 296, 88 222
          C 88 148, 132 92, 206 66
          C 138 90, 84 148, 58 222 Z
        "
        fill="#00000030"
      />

      {/* Right gloss */}
      <Path
        d="
          M 454 222 C 454 188, 444 154, 424 126
          C 436 154, 446 188, 446 222 Z
        "
        fill="#FFFFFF25"
      />

      {/* Top-center gloss streak */}
      <Path
        d="M 208 68 C 232 56, 280 56, 304 68"
        stroke="#FFFFFF"
        strokeWidth="11"
        fill="none"
        opacity="0.40"
        strokeLinecap="round"
      />

      {/* ── 2. CROWN STRIPE ──────────────────────────────────────── */}
      <Path
        d="
          M 244 48
          Q 256 44, 268 48
          L 270 234
          L 242 234 Z
        "
        fill={stripeColor}
        stroke={ink}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />

      {/* ── 3. EARHOLE PANELS (dark cut-outs each side) ──────────── */}
      {/* Left earhole shadow */}
      <Path
        d="
          M 68 238 C 58 270, 62 318, 80 354
          L 108 354 C 90 318, 86 270, 96 238 Z
        "
        fill="#00000030"
      />
      {/* Right earhole shadow */}
      <Path
        d="
          M 444 238 C 454 270, 450 318, 432 354
          L 404 354 C 422 318, 426 270, 416 238 Z
        "
        fill="#00000030"
      />

      {/* ── 4. BROW GUARD ────────────────────────────────────────── */}
      {/* Flat rectangular brow bar */}
      <Path
        d="
          M 170 232
          C 170 222, 176 216, 186 216
          L 326 216
          C 336 216, 342 222, 342 232
          L 342 252
          C 342 262, 336 268, 326 268
          L 186 268
          C 176 268, 170 262, 170 252 Z
        "
        fill={shellColor}
        stroke={ink}
        strokeWidth="7"
        strokeLinejoin="round"
      />

      {/* ── 5. HARDWARE CLIPS — clear Schutt T-clips ─────────────── */}
      {/* Left clip body */}
      <Rect x="195" y="228" width="28" height="30" rx="5" ry="5"
        fill="#D0D8E8" stroke={ink} strokeWidth="3.5" opacity="0.92" />
      {/* Left clip tab (top flange) */}
      <Rect x="188" y="218" width="42" height="14" rx="5" ry="5"
        fill="#E0E6F0" stroke={ink} strokeWidth="3" opacity="0.88" />

      {/* Right clip body */}
      <Rect x="289" y="228" width="28" height="30" rx="5" ry="5"
        fill="#D0D8E8" stroke={ink} strokeWidth="3.5" opacity="0.92" />
      {/* Right clip tab (top flange) */}
      <Rect x="282" y="218" width="42" height="14" rx="5" ry="5"
        fill="#E0E6F0" stroke={ink} strokeWidth="3" opacity="0.88" />

      {/* ── 6. CHEEK GUARDS ──────────────────────────────────────── */}
      {/* Left cheek */}
      <Path
        d="
          M 162 270 L 110 294
          C 84 326, 82 378, 100 422
          L 160 422 Z
        "
        fill="#2A7A6C"
        opacity="0.70"
      />
      {/* Right cheek */}
      <Path
        d="
          M 350 270 L 402 294
          C 428 326, 430 378, 412 422
          L 352 422 Z
        "
        fill="#2A7A6C"
        opacity="0.70"
      />

      {/* ── 7. FACE OPENING ──────────────────────────────────────── */}
      <Path
        d="
          M 170 270
          L 170 454
          Q 185 470, 256 476
          Q 327 470, 342 454
          L 342 270
          C 308 258, 204 258, 170 270 Z
        "
        fill={visorColor}
      />

      {/* Visor gloss */}
      <Path
        d="M 200 278 C 224 268, 288 268, 312 278"
        stroke="#FFFFFF"
        strokeWidth="5"
        fill="none"
        opacity="0.15"
        strokeLinecap="round"
      />

      {/* Optional visor text */}
      {!!visorText && (
        <SvgText
          x="256"
          y="382"
          textAnchor="middle"
          fontSize="72"
          fontWeight="bold"
          fill="#FFFFFF"
          letterSpacing="3"
          opacity="0.88"
        >
          {visorText}
        </SvgText>
      )}

      {/* ── 8. CAGE — Schutt ROPO open-face style ────────────────── */}
      {/*
          Structure (front view):
          - Left & right uprights bow gently outward
          - Two close J-bars just below brow (the Schutt signature)
          - Center vertical divider from J-bar 2 → chin bar
          - Chin bar closing the bottom
          All bars: thick facemaskColor fill + thin ink outline
      */}

      {/* --- LEFT UPRIGHT --- */}
      <Path
        d="M 168 268 C 126 295, 108 366, 124 462"
        stroke={facemaskColor}
        strokeWidth="26"
        fill="none"
        strokeLinecap="round"
      />
      <Path
        d="M 168 268 C 126 295, 108 366, 124 462"
        stroke={ink}
        strokeWidth="5.5"
        fill="none"
        strokeLinecap="round"
      />

      {/* --- RIGHT UPRIGHT --- */}
      <Path
        d="M 344 268 C 386 295, 404 366, 388 462"
        stroke={facemaskColor}
        strokeWidth="26"
        fill="none"
        strokeLinecap="round"
      />
      <Path
        d="M 344 268 C 386 295, 404 366, 388 462"
        stroke={ink}
        strokeWidth="5.5"
        fill="none"
        strokeLinecap="round"
      />

      {/* --- J-BAR 1 (first horizontal, close to brow) --- */}
      <Path
        d="M 140 296 L 372 296"
        stroke={facemaskColor}
        strokeWidth="22"
        fill="none"
        strokeLinecap="round"
      />
      <Path
        d="M 140 296 L 372 296"
        stroke={ink}
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />

      {/* --- J-BAR 2 (second horizontal, ~24 px below J-bar 1) --- */}
      <Path
        d="M 136 324 L 376 324"
        stroke={facemaskColor}
        strokeWidth="22"
        fill="none"
        strokeLinecap="round"
      />
      <Path
        d="M 136 324 L 376 324"
        stroke={ink}
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />

      {/* --- CENTER VERTICAL DIVIDER --- */}
      <Path
        d="M 256 324 L 256 462"
        stroke={facemaskColor}
        strokeWidth="22"
        fill="none"
        strokeLinecap="round"
      />
      <Path
        d="M 256 324 L 256 462"
        stroke={ink}
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />

      {/* --- CHIN BAR (bottom connector) --- */}
      <Path
        d="M 124 462 Q 256 488, 388 462"
        stroke={facemaskColor}
        strokeWidth="26"
        fill="none"
        strokeLinecap="round"
      />
      <Path
        d="M 124 462 Q 256 488, 388 462"
        stroke={ink}
        strokeWidth="5.5"
        fill="none"
        strokeLinecap="round"
      />

      {/* ── 9. CHIN CUP ──────────────────────────────────────────── */}
      <Path
        d="
          M 196 462
          C 178 462, 166 472, 166 486
          L 166 496
          C 166 508, 178 514, 200 514
          L 312 514
          C 334 514, 346 508, 346 496
          L 346 486
          C 346 472, 334 462, 316 462 Z
        "
        fill={chinstrapColor}
        stroke={ink}
        strokeWidth="6"
        strokeLinejoin="round"
      />

      {/* Chin cup crease lines */}
      <Path
        d="M 202 479 C 224 471, 288 471, 310 479"
        stroke={ink}
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
        opacity="0.22"
      />
      <Path
        d="M 206 493 C 226 487, 286 487, 306 493"
        stroke={ink}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        opacity="0.15"
      />

    </Svg>
  );
}
