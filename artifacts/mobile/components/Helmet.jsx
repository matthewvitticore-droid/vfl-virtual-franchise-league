import React from "react";
import Svg, { Path, Ellipse } from "react-native-svg";

/**
 * Front-facing cartoon NFL helmet — matches reference artwork exactly.
 *
 *   shellColor     – dome & chin-cup color
 *   facemaskColor  – cage rails & crossbars
 *   visorColor     – dark face-opening tint
 *   stripeColor    – crown stripe on top of dome
 *   chinstrapColor – chin cup pad at bottom of cage (user calls this "chinstrap")
 */
export default function Helmet({
  size          = 220,
  shellColor    = "#ECEEF2",
  facemaskColor = "#C0C6D0",
  visorColor    = "#080C14",
  stripeColor   = "#CC2020",
  chinstrapColor = "#ECEEF2",
}) {
  const ink = "#1A1E2C";

  return (
    <Svg width={size} height={size} viewBox="0 0 512 512">

      {/* ╔══════════════════════════════════════════╗
          ║  1. SHELL — wide, squat cartoon dome     ║
          ╚══════════════════════════════════════════╝ */}

      {/* Main dome */}
      <Path
        d="
          M 256 52
          C 146 52, 60 126, 60 222
          C 60 292, 96 338, 166 352
          L 346 352
          C 416 338, 452 292, 452 222
          C 452 126, 366 52, 256 52 Z
        "
        fill={shellColor}
        stroke={ink}
        strokeWidth="8"
        strokeLinejoin="round"
      />

      {/* Left blue-gray shadow band */}
      <Path
        d="
          M 60 222
          C 60 292, 96 338, 166 352
          L 186 352
          C 122 338, 88 292, 88 222
          C 88 154, 132 100, 196 70
          C 138 92, 86 152, 60 222 Z
        "
        fill="#00000022"
      />

      {/* Right subtle gloss */}
      <Path
        d="
          M 452 222
          C 452 190, 444 158, 428 130
          C 438 158, 444 190, 444 222 Z
        "
        fill="#FFFFFF22"
      />

      {/* Top-center gloss highlight streak */}
      <Path
        d="M 210 72 C 232 62, 280 62, 302 72"
        stroke="#FFFFFF"
        strokeWidth="10"
        fill="none"
        opacity="0.38"
        strokeLinecap="round"
      />

      {/* ╔══════════════════════════════════════════╗
          ║  2. CROWN STRIPE                         ║
          ╚══════════════════════════════════════════╝ */}
      <Path
        d="
          M 242 52
          C 247 50, 265 50, 270 52
          L 270 226
          L 242 226 Z
        "
        fill={stripeColor}
        stroke={ink}
        strokeWidth="4"
        strokeLinejoin="round"
      />

      {/* ╔══════════════════════════════════════════╗
          ║  3. BROW GUARD — pill with two rivets    ║
          ╚══════════════════════════════════════════╝ */}
      <Path
        d="
          M 164 228
          C 164 220, 170 214, 178 214
          L 334 214
          C 342 214, 348 220, 348 228
          L 348 250
          C 348 260, 340 266, 330 266
          L 182 266
          C 172 266, 164 260, 164 250 Z
        "
        fill={shellColor}
        stroke={ink}
        strokeWidth="7"
        strokeLinejoin="round"
      />

      {/* Rivet — left */}
      <Ellipse cx="202" cy="238" rx="12" ry="12" fill="#9AA2AE" stroke={ink} strokeWidth="3.5" />
      <Ellipse cx="202" cy="238" rx="6"  ry="6"  fill="#525A68" />

      {/* Rivet — right */}
      <Ellipse cx="310" cy="238" rx="12" ry="12" fill="#9AA2AE" stroke={ink} strokeWidth="3.5" />
      <Ellipse cx="310" cy="238" rx="6"  ry="6"  fill="#525A68" />

      {/* ╔══════════════════════════════════════════╗
          ║  4. CHEEK GUARDS — teal behind cage      ║
          ╚══════════════════════════════════════════╝ */}
      {/* Left cheek */}
      <Path
        d="
          M 152 268
          L 104 290
          C 80 322, 78 372, 94 418
          L 152 418 Z
        "
        fill="#2A7A6C"
        opacity="0.72"
      />
      {/* Right cheek */}
      <Path
        d="
          M 360 268
          L 408 290
          C 432 322, 434 372, 418 418
          L 360 418 Z
        "
        fill="#2A7A6C"
        opacity="0.72"
      />

      {/* ╔══════════════════════════════════════════╗
          ║  5. FACE OPENING — large dark visor      ║
          ╚══════════════════════════════════════════╝ */}
      <Path
        d="
          M 256 264
          C 194 264, 154 288, 154 326
          L 154 412
          C 154 434, 176 448, 206 448
          L 306 448
          C 336 448, 358 434, 358 412
          L 358 326
          C 358 288, 318 264, 256 264 Z
        "
        fill={visorColor}
      />

      {/* Visor top gloss line */}
      <Path
        d="M 196 282 C 220 272, 292 272, 316 282"
        stroke="#FFFFFF"
        strokeWidth="5"
        fill="none"
        opacity="0.16"
        strokeLinecap="round"
      />

      {/* ╔══════════════════════════════════════════╗
          ║  6. CAGE FRAME — bowing rounded-oval     ║
          ╚══════════════════════════════════════════╝ */}

      {/* Color fill layer (thick stroke traces centerline of frame) */}
      <Path
        d="
          M 256 258
          C 186 258, 126 278, 100 320
          C 78 358, 78 406, 96 446
          C 112 480, 142 496, 180 496
          L 332 496
          C 370 496, 400 480, 416 446
          C 434 406, 434 358, 412 320
          C 386 278, 326 258, 256 258 Z
        "
        fill="none"
        stroke={facemaskColor}
        strokeWidth="30"
        strokeLinejoin="round"
      />

      {/* Dark ink outline on top of cage */}
      <Path
        d="
          M 256 258
          C 186 258, 126 278, 100 320
          C 78 358, 78 406, 96 446
          C 112 480, 142 496, 180 496
          L 332 496
          C 370 496, 400 480, 416 446
          C 434 406, 434 358, 412 320
          C 386 278, 326 258, 256 258 Z
        "
        fill="none"
        stroke={ink}
        strokeWidth="6"
        strokeLinejoin="round"
      />

      {/* ╔══════════════════════════════════════════╗
          ║  7. CAGE CROSSBARS — 3 curved bars       ║
          ╚══════════════════════════════════════════╝ */}

      {/* Upper crossbar */}
      <Path d="M 96 334 C 158 325, 354 325, 416 334"
        stroke={facemaskColor} strokeWidth="24" fill="none" strokeLinecap="round" />
      <Path d="M 96 334 C 158 325, 354 325, 416 334"
        stroke={ink} strokeWidth="5" fill="none" strokeLinecap="round" />

      {/* Middle crossbar */}
      <Path d="M 82 384 C 152 375, 360 375, 430 384"
        stroke={facemaskColor} strokeWidth="24" fill="none" strokeLinecap="round" />
      <Path d="M 82 384 C 152 375, 360 375, 430 384"
        stroke={ink} strokeWidth="5" fill="none" strokeLinecap="round" />

      {/* Lower crossbar */}
      <Path d="M 88 432 C 154 424, 358 424, 424 432"
        stroke={facemaskColor} strokeWidth="24" fill="none" strokeLinecap="round" />
      <Path d="M 88 432 C 154 424, 358 424, 424 432"
        stroke={ink} strokeWidth="5" fill="none" strokeLinecap="round" />

      {/* ╔══════════════════════════════════════════╗
          ║  8. CHIN CUP (chinstrap)                 ║
          ╚══════════════════════════════════════════╝ */}
      <Path
        d="
          M 192 450
          C 176 450, 164 460, 164 474
          L 164 484
          C 164 496, 176 502, 196 502
          L 316 502
          C 336 502, 348 496, 348 484
          L 348 474
          C 348 460, 336 450, 320 450 Z
        "
        fill={chinstrapColor}
        stroke={ink}
        strokeWidth="6"
        strokeLinejoin="round"
      />

      {/* Chin cup crease lines */}
      <Path d="M 200 468 C 222 460, 290 460, 312 468"
        stroke={ink} strokeWidth="3.5" fill="none" strokeLinecap="round" opacity="0.22" />
      <Path d="M 204 482 C 224 476, 288 476, 308 482"
        stroke={ink} strokeWidth="3"   fill="none" strokeLinecap="round" opacity="0.15" />

    </Svg>
  );
}
