import React from "react";
import Svg, { Path, Ellipse } from "react-native-svg";

/**
 * Front-facing cartoon NFL-style football helmet.
 *
 *   shellColor     – main dome / chin-cup color (white in reference)
 *   facemaskColor  – cage rails & bars color (light gray in reference)
 *   visorColor     – dark face-opening fill
 *   chinstrapColor – crown stripe accent color (red in reference)
 */
export default function Helmet({
  size          = 220,
  shellColor    = "#ECEEF2",
  facemaskColor = "#B8BEC8",
  visorColor    = "#0A0E16",
  chinstrapColor = "#CC2020",
}) {
  const ink = "#1A1E2C"; // universal dark outline

  return (
    <Svg width={size} height={size} viewBox="0 0 512 512">

      {/* ══════════════════════════════════════════════
          1. SHELL — wide, squat dome
         ══════════════════════════════════════════════ */}

      {/* Main dome body */}
      <Path
        d="
          M 256 44
          C 145 44, 58 118, 58 218
          C 58 284, 94 328, 162 340
          L 350 340
          C 418 328, 454 284, 454 218
          C 454 118, 367 44, 256 44 Z
        "
        fill={shellColor}
        stroke={ink}
        strokeWidth="8"
        strokeLinejoin="round"
      />

      {/* Left shadow — large blue-gray shaded zone */}
      <Path
        d="
          M 58 218
          C 58 284, 94 328, 162 340
          L 180 340
          C 118 328, 84 284, 84 218
          C 84 152, 128 102, 190 72
          C 136 94, 84 150, 58 218 Z
        "
        fill="#00000022"
      />

      {/* Right gloss highlight */}
      <Path
        d="
          M 454 218
          C 454 180, 438 145, 408 116
          C 428 144, 440 182, 440 218 Z
        "
        fill="#FFFFFF28"
      />

      {/* Top-center gloss streak */}
      <Path
        d="M 208 64 C 230 54, 282 54, 304 64"
        stroke="#FFFFFF"
        strokeWidth="10"
        fill="none"
        opacity="0.35"
        strokeLinecap="round"
      />

      {/* ══════════════════════════════════════════════
          2. CROWN STRIPE — vertical accent down center
         ══════════════════════════════════════════════ */}
      <Path
        d="
          M 240 44
          C 246 42, 266 42, 272 44
          L 272 210
          L 240 210 Z
        "
        fill={chinstrapColor}
        stroke={ink}
        strokeWidth="4"
        strokeLinejoin="round"
      />

      {/* ══════════════════════════════════════════════
          3. BROW GUARD — pill bar with two rivets
         ══════════════════════════════════════════════ */}
      <Path
        d="
          M 164 208
          C 164 200, 170 194, 178 194
          L 334 194
          C 342 194, 348 200, 348 208
          L 348 228
          C 348 238, 340 244, 330 244
          L 182 244
          C 172 244, 164 238, 164 228 Z
        "
        fill={shellColor}
        stroke={ink}
        strokeWidth="7"
        strokeLinejoin="round"
      />

      {/* Rivet / screw — left */}
      <Ellipse cx="200" cy="216" rx="11" ry="11" fill="#9CA4B0" stroke={ink} strokeWidth="3.5" />
      <Ellipse cx="200" cy="216" rx="5"  ry="5"  fill="#505868" />

      {/* Rivet / screw — right */}
      <Ellipse cx="312" cy="216" rx="11" ry="11" fill="#9CA4B0" stroke={ink} strokeWidth="3.5" />
      <Ellipse cx="312" cy="216" rx="5"  ry="5"  fill="#505868" />

      {/* ══════════════════════════════════════════════
          4. CHEEK GUARDS — teal/mint panels behind cage
         ══════════════════════════════════════════════ */}
      {/* Left cheek — visible through cage side window */}
      <Path
        d="
          M 154 244
          L 106 268
          C 84 300, 80 348, 92 396
          L 152 396
          L 152 244 Z
        "
        fill="#9FD5C8"
        opacity="0.8"
      />
      {/* Right cheek */}
      <Path
        d="
          M 358 244
          L 406 268
          C 428 300, 432 348, 420 396
          L 360 396
          L 360 244 Z
        "
        fill="#9FD5C8"
        opacity="0.8"
      />

      {/* ══════════════════════════════════════════════
          5. FACE OPENING / VISOR — large dark oval
         ══════════════════════════════════════════════ */}
      <Path
        d="
          M 256 242
          C 194 242, 154 268, 154 306
          L 154 390
          C 154 412, 176 428, 206 428
          L 306 428
          C 336 428, 358 412, 358 390
          L 358 306
          C 358 268, 318 242, 256 242 Z
        "
        fill={visorColor}
      />

      {/* Visor shine line at top */}
      <Path
        d="M 192 260 C 220 250, 292 250, 320 260"
        stroke="#FFFFFF"
        strokeWidth="5"
        fill="none"
        opacity="0.14"
        strokeLinecap="round"
      />

      {/* ══════════════════════════════════════════════
          6. CAGE FRAME — single thick rounded-oval loop
             Bows outward at mid-face (wider in middle)
         ══════════════════════════════════════════════ */}
      {/* Cage fill color layer */}
      <Path
        d="
          M 256 238
          C 188 238, 130 260, 104 300
          C 82 336, 80 382, 94 422
          C 108 458, 138 474, 174 474
          L 338 474
          C 374 474, 404 458, 418 422
          C 432 382, 430 336, 408 300
          C 382 260, 324 238, 256 238 Z
        "
        fill="none"
        stroke={facemaskColor}
        strokeWidth="32"
        strokeLinejoin="round"
      />
      {/* Cage dark outline */}
      <Path
        d="
          M 256 238
          C 188 238, 130 260, 104 300
          C 82 336, 80 382, 94 422
          C 108 458, 138 474, 174 474
          L 338 474
          C 374 474, 404 458, 418 422
          C 432 382, 430 336, 408 300
          C 382 260, 324 238, 256 238 Z
        "
        fill="none"
        stroke={ink}
        strokeWidth="7"
        strokeLinejoin="round"
      />

      {/* ══════════════════════════════════════════════
          7. CAGE CROSSBARS — 3 horizontal bars
         ══════════════════════════════════════════════ */}
      {/* Upper bar */}
      <Path d="M 98 314 C 162 304, 350 304, 414 314"
        stroke={facemaskColor} strokeWidth="24" fill="none" strokeLinecap="round" />
      <Path d="M 98 314 C 162 304, 350 304, 414 314"
        stroke={ink} strokeWidth="5" fill="none" strokeLinecap="round" />

      {/* Middle bar */}
      <Path d="M 86 364 C 154 355, 358 355, 426 364"
        stroke={facemaskColor} strokeWidth="24" fill="none" strokeLinecap="round" />
      <Path d="M 86 364 C 154 355, 358 355, 426 364"
        stroke={ink} strokeWidth="5" fill="none" strokeLinecap="round" />

      {/* Lower bar */}
      <Path d="M 92 412 C 156 404, 356 404, 420 412"
        stroke={facemaskColor} strokeWidth="24" fill="none" strokeLinecap="round" />
      <Path d="M 92 412 C 156 404, 356 404, 420 412"
        stroke={ink} strokeWidth="5" fill="none" strokeLinecap="round" />

      {/* ══════════════════════════════════════════════
          8. CHIN CUP — white pad inside bottom of cage
         ══════════════════════════════════════════════ */}
      <Path
        d="
          M 192 430
          C 176 430, 164 440, 164 454
          L 164 462
          C 164 474, 176 480, 194 480
          L 318 480
          C 336 480, 348 474, 348 462
          L 348 454
          C 348 440, 336 430, 320 430 Z
        "
        fill={shellColor}
        stroke={ink}
        strokeWidth="6"
        strokeLinejoin="round"
      />

      {/* Chin cup crease lines */}
      <Path d="M 200 448 C 222 441, 290 441, 312 448"
        stroke={ink} strokeWidth="3.5" fill="none" strokeLinecap="round" opacity="0.22" />
      <Path d="M 204 462 C 224 457, 288 457, 308 462"
        stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.15" />

      {/* ══════════════════════════════════════════════
          9. GROUND SHADOW
         ══════════════════════════════════════════════ */}
      <Ellipse cx="256" cy="498" rx="130" ry="10" fill="#000" opacity="0.10" />

    </Svg>
  );
}
