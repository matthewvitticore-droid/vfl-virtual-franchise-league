import React from "react";
import Svg, { Path, Ellipse, G, Defs, RadialGradient, Stop } from "react-native-svg";

export default function Helmet({
  size = 220,
  shellColor = "#E5E7EB",
  facemaskColor = "#9CA3AF",
  visorColor = "#0F172A",
  chinstrapColor = "#1D4ED8",
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 512 512">

      {/* ── SHELL ── */}
      {/* Main dome — rounded top, tapers to face opening */}
      <Path
        d="
          M 256 42
          C 148 42, 68 118, 68 228
          C 68 306, 96 366, 148 400
          L 148 424
          L 364 424
          L 364 400
          C 416 366, 444 306, 444 228
          C 444 118, 364 42, 256 42
          Z
        "
        fill={shellColor}
      />

      {/* Shell shading — subtle inner shadow on lower half */}
      <Path
        d="
          M 256 42
          C 148 42, 68 118, 68 228
          C 68 306, 96 366, 148 400
          L 148 380
          C 104 348, 82 298, 82 228
          C 82 126, 156 56, 256 56
          C 356 56, 430 126, 430 228
          C 430 298, 408 348, 364 380
          L 364 400
          C 416 366, 444 306, 444 228
          C 444 118, 364 42, 256 42
          Z
        "
        fill="#00000018"
      />

      {/* Dome highlight — top-left gloss */}
      <Path
        d="
          M 180 80
          C 220 58, 290 58, 330 82
          C 310 70, 280 64, 256 64
          C 232 64, 202 70, 180 80
          Z
        "
        fill="#FFFFFF"
        opacity="0.35"
      />

      {/* Ear holes */}
      <Ellipse cx="96"  cy="268" rx="14" ry="18" fill="#00000040" />
      <Ellipse cx="416" cy="268" rx="14" ry="18" fill="#00000040" />

      {/* ── FACE OPENING ── */}
      {/* Dark inner oval — the opening where visor + facemask sit */}
      <Path
        d="
          M 256 142
          C 208 142, 168 162, 160 210
          L 158 358
          C 158 398, 202 422, 256 422
          C 310 422, 354 398, 354 358
          L 352 210
          C 344 162, 304 142, 256 142
          Z
        "
        fill="#111827"
      />

      {/* ── VISOR ── */}
      {/* Curved tinted shield — wider at top, narrows toward mid */}
      <Path
        d="
          M 172 210
          C 172 170, 210 150, 256 150
          C 302 150, 340 170, 340 210
          C 340 252, 336 284, 316 300
          C 296 316, 278 320, 256 320
          C 234 320, 216 316, 196 300
          C 176 284, 172 252, 172 210
          Z
        "
        fill={visorColor}
        opacity="0.92"
      />

      {/* Visor shine — subtle top reflection */}
      <Path
        d="
          M 200 174
          C 220 162, 250 158, 280 164
          C 264 158, 248 158, 232 162
        "
        stroke="#FFFFFF"
        strokeWidth="5"
        fill="none"
        opacity="0.25"
        strokeLinecap="round"
      />

      {/* ── FACEMASK ── */}
      {/*
          Schutt/Riddell style cage:
          - Two curved side bars (left & right)
          - Top crossbar arcing with the face opening
          - Middle crossbar
          - Lower crossbar near chin
          - Small nose bumper
      */}
      <G
        stroke={facemaskColor}
        strokeWidth="11"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Left vertical side bar — curves slightly inward */}
        <Path d="M 172 210 C 164 270, 164 330, 174 390" />

        {/* Right vertical side bar */}
        <Path d="M 340 210 C 348 270, 348 330, 338 390" />

        {/* Top crossbar — arcs along the top of the face opening */}
        <Path d="M 172 210 C 200 194, 228 188, 256 188 C 284 188, 312 194, 340 210" />

        {/* Upper-mid crossbar */}
        <Path d="M 166 298 C 196 286, 226 282, 256 282 C 286 282, 316 286, 346 298" />

        {/* Lower crossbar */}
        <Path d="M 168 356 C 198 346, 228 342, 256 342 C 284 342, 314 346, 344 356" />

        {/* Nose bumper — short center vertical between top and mid bars */}
        <Path d="M 256 210 C 256 230, 256 258, 256 282" />

        {/* Bottom cage extension — connects bars to chin area */}
        <Path d="M 174 390 C 198 406, 228 414, 256 414 C 284 414, 314 406, 338 390" />
      </G>

      {/* Facemask mounting screws (side attachment points) */}
      <Ellipse cx="160" cy="210" rx="7" ry="7" fill={facemaskColor} />
      <Ellipse cx="352" cy="210" rx="7" ry="7" fill={facemaskColor} />
      <Ellipse cx="157" cy="356" rx="7" ry="7" fill={facemaskColor} />
      <Ellipse cx="355" cy="356" rx="7" ry="7" fill={facemaskColor} />

      {/* ── CHINSTRAP ── */}
      {/* Curved strap bridging below the jaw */}
      <Path
        d="
          M 174 414
          C 200 438, 224 448, 256 448
          C 288 448, 312 438, 338 414
        "
        stroke={chinstrapColor}
        strokeWidth="13"
        fill="none"
        strokeLinecap="round"
      />

      {/* Chin cup — center oval */}
      <Ellipse
        cx="256"
        cy="444"
        rx="34"
        ry="16"
        fill={chinstrapColor}
      />

      {/* ── FOREHEAD BUMPER ── */}
      {/* Small pad at the very top center */}
      <Path
        d="M 234 68 C 234 60, 278 60, 278 68 L 278 82 C 278 88, 234 88, 234 82 Z"
        fill="#00000030"
        rx="4"
      />

      {/* ── GROUND SHADOW ── */}
      <Ellipse cx="256" cy="490" rx="130" ry="14" fill="#000" opacity="0.12" />

    </Svg>
  );
}
