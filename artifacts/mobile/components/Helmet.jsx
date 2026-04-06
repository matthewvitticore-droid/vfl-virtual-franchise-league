import React from "react";
import Svg, { Path, Ellipse, G } from "react-native-svg";

/**
 * Front-facing cartoon football helmet.
 * Props:
 *   shellColor    – main dome color
 *   facemaskColor – cage / rail color
 *   visorColor    – dark face-opening color
 *   chinstrapColor– center crown stripe color
 */
export default function Helmet({
  size = 220,
  shellColor    = "#ECEEF2",
  facemaskColor = "#B5BCC8",
  visorColor    = "#0D1117",
  chinstrapColor = "#CC2200",
}) {
  const ink = "#1C2030"; // universal dark outline

  return (
    <Svg width={size} height={size} viewBox="0 0 512 512">

      {/* ════════════════ SHELL ════════════════ */}

      {/* Main dome — wide, squat, rounded */}
      <Path
        d="
          M 256 46
          C 148 46, 60 118, 60 214
          C 60 276, 92 316, 152 330
          L 360 330
          C 420 316, 452 276, 452 214
          C 452 118, 364 46, 256 46 Z
        "
        fill={shellColor}
        stroke={ink}
        strokeWidth="7"
      />

      {/* Left shading strip — blue-gray depth */}
      <Path
        d="
          M 60 214
          C 60 276, 92 316, 152 330
          L 166 330
          C 112 316, 84 276, 84 214
          C 84 150, 118 102, 174 72
          C 120 95, 78 148, 60 214 Z
        "
        fill="#00000016"
      />

      {/* Right shading strip */}
      <Path
        d="
          M 452 214
          C 452 276, 420 316, 360 330
          L 346 330
          C 400 316, 428 276, 428 214
          C 428 150, 394 102, 338 72
          C 392 95, 434 148, 452 214 Z
        "
        fill="#00000016"
      />

      {/* Top-center gloss highlight */}
      <Path
        d="M 210 66 C 232 56, 280 56, 302 66 C 282 60, 256 58, 210 66 Z"
        fill="#FFFFFF"
        opacity="0.5"
      />

      {/* ════════════════ CROWN STRIPE ════════════════ */}
      {/* Vertical stripe from top of dome down to brow */}
      <Path
        d="
          M 240 46
          C 244 44, 268 44, 272 46
          L 272 200
          L 240 200 Z
        "
        fill={chinstrapColor}
        stroke={ink}
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* ════════════════ BROW GUARD ════════════════ */}
      {/* White bar bridging top of face opening — rounded pill shape */}
      <Path
        d="
          M 170 192
          C 170 184, 176 178, 184 178
          L 328 178
          C 336 178, 342 184, 342 192
          L 342 216
          C 342 224, 336 230, 328 230
          L 184 230
          C 176 230, 170 224, 170 216 Z
        "
        fill={shellColor}
        stroke={ink}
        strokeWidth="6"
      />

      {/* Brow screw — left */}
      <Ellipse cx="198" cy="204" rx="10" ry="10" fill="#A0A8B4" stroke={ink} strokeWidth="3" />
      <Ellipse cx="198" cy="204" rx="5"  ry="5"  fill="#6A7280" />

      {/* Brow screw — right */}
      <Ellipse cx="314" cy="204" rx="10" ry="10" fill="#A0A8B4" stroke={ink} strokeWidth="3" />
      <Ellipse cx="314" cy="204" rx="5"  ry="5"  fill="#6A7280" />

      {/* ════════════════ FACE OPENING ════════════════ */}
      {/* Large dark visor/face-opening window */}
      <Path
        d="
          M 256 226
          C 196 226, 158 252, 158 292
          L 158 382
          C 158 406, 176 420, 200 420
          L 312 420
          C 336 420, 354 406, 354 382
          L 354 292
          C 354 252, 316 226, 256 226 Z
        "
        fill={visorColor}
      />

      {/* Subtle visor shine at top */}
      <Path
        d="M 192 244 C 218 234, 294 234, 320 244"
        stroke="#FFFFFF"
        strokeWidth="5"
        fill="none"
        opacity="0.12"
        strokeLinecap="round"
      />

      {/* ════════════════ CAGE / FACEMASK ════════════════ */}

      {/* Outer cage frame — single continuous rounded-rectangle loop */}
      {/* This is drawn as a filled rounded-rect outline (stroke) */}
      <Path
        d="
          M 256 222
          C 160 222, 88 258, 88 312
          L 88 400
          C 88 444, 116 472, 156 472
          L 356 472
          C 396 472, 424 444, 424 400
          L 424 312
          C 424 258, 352 222, 256 222 Z
        "
        fill="none"
        stroke={facemaskColor}
        strokeWidth="26"
      />

      {/* Cage frame dark outline (thinner, sits on top) */}
      <Path
        d="
          M 256 222
          C 160 222, 88 258, 88 312
          L 88 400
          C 88 444, 116 472, 156 472
          L 356 472
          C 396 472, 424 444, 424 400
          L 424 312
          C 424 258, 352 222, 256 222 Z
        "
        fill="none"
        stroke={ink}
        strokeWidth="6"
      />

      {/* Cage horizontal crossbar — upper */}
      <Path
        d="M 88 318 C 160 308, 352 308, 424 318"
        stroke={facemaskColor}
        strokeWidth="18"
        fill="none"
        strokeLinecap="round"
      />
      <Path
        d="M 88 318 C 160 308, 352 308, 424 318"
        stroke={ink}
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />

      {/* Cage horizontal crossbar — middle */}
      <Path
        d="M 88 368 C 158 360, 354 360, 424 368"
        stroke={facemaskColor}
        strokeWidth="18"
        fill="none"
        strokeLinecap="round"
      />
      <Path
        d="M 88 368 C 158 360, 354 360, 424 368"
        stroke={ink}
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />

      {/* Cage horizontal crossbar — lower */}
      <Path
        d="M 98 416 C 162 410, 350 410, 414 416"
        stroke={facemaskColor}
        strokeWidth="18"
        fill="none"
        strokeLinecap="round"
      />
      <Path
        d="M 98 416 C 162 410, 350 410, 414 416"
        stroke={ink}
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />

      {/* ════════════════ CHIN CUP ════════════════ */}
      {/* White rounded chin pad at the bottom inside the cage */}
      <Path
        d="
          M 192 424
          C 178 424, 168 434, 168 448
          L 168 460
          C 168 470, 178 476, 192 476
          L 320 476
          C 334 476, 344 470, 344 460
          L 344 448
          C 344 434, 334 424, 320 424 Z
        "
        fill={shellColor}
        stroke={ink}
        strokeWidth="5"
      />

      {/* Chin cup crease lines */}
      <Path
        d="M 200 442 C 224 436, 288 436, 312 442"
        stroke={ink}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        opacity="0.25"
      />
      <Path
        d="M 204 454 C 226 449, 286 449, 308 454"
        stroke={ink}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        opacity="0.18"
      />

      {/* ════════════════ SHADOW ════════════════ */}
      <Ellipse
        cx="256" cy="496"
        rx="140" ry="12"
        fill="#000"
        opacity="0.10"
      />

    </Svg>
  );
}
