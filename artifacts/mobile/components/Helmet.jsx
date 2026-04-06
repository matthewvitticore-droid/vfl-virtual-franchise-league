import React from "react";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";

export default function Helmet({
  shellColor     = "#E5E7EB",
  facemaskColor  = "#DC2828",
  chinstrapColor = "#DC2828",
  visorColor     = "#0F172A",
  outlineColor   = "#111827",
  width          = 320,
  height         = 320,
}) {
  const sw = 10;  // standard stroke width
  const sw2 = 7;  // thinner stroke

  return (
    <Svg width={width} height={height} viewBox="0 0 512 512">

      {/* ── GROUP 1: SHELL ─────────────────────────────────────────────────── */}
      <G id="shell">
        {/* Main dome — right-facing side profile */}
        <Path
          d={[
            "M 88 432",
            "C 52 430 30 394 26 348",
            "C 20 286 26 200 52 136",
            "C 80 64 162 22 262 20",
            "C 354 18 424 62 448 138",
            "C 462 184 458 238 440 284",
            "C 420 332 386 364 348 386",
            "C 310 408 240 436 88 432 Z",
          ].join(" ")}
          fill={shellColor}
          stroke={outlineColor}
          strokeWidth={sw}
          strokeLinejoin="round"
        />

        {/* Face-opening cutout (dark void on the right side) */}
        <Path
          d={[
            "M 318 40",
            "C 374 68 420 150 434 230",
            "C 444 292 434 352 404 388",
            "C 382 412 354 422 328 416",
            "C 302 410 282 390 270 360",
            "C 256 324 252 278 258 234",
            "C 266 180 292 130 330 100",
            "C 336 94 326 64 318 40 Z",
          ].join(" ")}
          fill="#0d0d18"
          stroke={outlineColor}
          strokeWidth={sw2}
          strokeLinejoin="round"
        />

        {/* Ear hole */}
        <Ellipse
          cx="88" cy="310" rx="20" ry="24"
          fill={shellColor}
          stroke={outlineColor}
          strokeWidth={sw2}
        />
        <Ellipse cx="88" cy="310" rx="11" ry="14" fill="#0d0d18" />

        {/* Back ventilation dot */}
        <Circle
          cx="50" cy="220" r="8"
          fill={shellColor}
          stroke={outlineColor}
          strokeWidth="5"
        />
      </G>

      {/* ── GROUP 2: VISOR ─────────────────────────────────────────────────── */}
      <G id="visor">
        <Path
          d={[
            "M 326 52",
            "C 376 80 418 158 430 234",
            "C 438 290 428 346 400 380",
            "C 382 400 362 408 344 402",
            "C 322 394 306 372 296 342",
            "C 284 306 282 264 290 226",
            "C 300 178 322 128 326 52 Z",
          ].join(" ")}
          fill={visorColor}
          opacity="0.95"
        />
        {/* Visor gloss line */}
        <Path
          d="M 348 68 C 394 108 420 178 424 248"
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="20"
          strokeLinecap="round"
        />
      </G>

      {/* ── GROUP 3: FACEMASK ──────────────────────────────────────────────── */}
      <G
        id="facemask"
        fill={facemaskColor}
        stroke={outlineColor}
        strokeWidth={sw2}
        strokeLinejoin="round"
      >
        {/* Top brim — attaches facemask to shell crown */}
        <Path
          d={[
            "M 316 36",
            "C 340 26 375 34 404 58",
            "C 418 70 428 86 428 104",
            "L 414 106",
            "C 414 92 406 78 394 68",
            "C 368 48 340 42 320 50 Z",
          ].join(" ")}
        />

        {/* Snap bolts on top brim */}
        <Circle cx="348" cy="46" r="10"
          fill={facemaskColor} stroke={outlineColor} strokeWidth="5" />
        <Circle cx="396" cy="66" r="10"
          fill={facemaskColor} stroke={outlineColor} strokeWidth="5" />

        {/* Left inner vertical rail */}
        <Path
          d={[
            "M 262 52 C 256 52 250 55 248 60",
            "L 246 408",
            "C 250 414 258 414 264 408",
            "L 266 60 Z",
          ].join(" ")}
        />

        {/* Right outer frame rail */}
        <Path
          d={[
            "M 426 104 C 432 112 434 124 432 136",
            "L 430 396",
            "C 426 404 416 404 412 396",
            "L 414 136 C 416 124 418 112 420 104 Z",
          ].join(" ")}
        />

        {/* Horizontal bar — upper */}
        <Rect x="248" y="202" width="184" height="20" rx="10" />

        {/* Horizontal bar — lower */}
        <Rect x="248" y="316" width="184" height="20" rx="10" />

        {/* Centre vertical bar */}
        <Rect x="330" y="36" width="18" height="376" rx="9" />

        {/* Bottom chin guard */}
        <Path
          d={[
            "M 248 388 C 248 404 272 414 338 414",
            "C 406 414 432 404 432 388",
            "L 432 400 C 432 418 406 428 338 428",
            "C 272 428 248 418 248 400 Z",
          ].join(" ")}
        />

        {/* Rivet at lower rail junctions */}
        <Circle cx="258" cy="384" r="8"
          fill={facemaskColor} stroke={outlineColor} strokeWidth="5" />
        <Circle cx="422" cy="384" r="8"
          fill={facemaskColor} stroke={outlineColor} strokeWidth="5" />
      </G>

      {/* ── GROUP 4: CHINSTRAP ─────────────────────────────────────────────── */}
      <G
        id="chinstrap"
        fill={chinstrapColor}
        stroke={outlineColor}
        strokeWidth="5"
        strokeLinejoin="round"
      >
        {/* Upper buckle clip */}
        <Rect x="96" y="268" width="34" height="20" rx="7" />
        <Rect x="105" y="260" width="16" height="12" rx="4"
          fill={chinstrapColor} stroke={outlineColor} strokeWidth="4" />

        {/* Lower buckle clip */}
        <Rect x="90" y="326" width="32" height="19" rx="6" />
        <Rect x="99" y="318" width="14" height="11" rx="3"
          fill={chinstrapColor} stroke={outlineColor} strokeWidth="4" />

        {/* Chin pad strap arc */}
        <Path
          d="M 252 422 C 252 450 282 464 338 464 C 394 464 424 450 424 422"
          fill="none"
          stroke={chinstrapColor}
          strokeWidth="18"
          strokeLinecap="round"
        />

        {/* Chin pad */}
        <Ellipse
          cx="338" cy="462" rx="50" ry="20"
          fill={chinstrapColor}
          stroke={outlineColor}
          strokeWidth="5"
        />
      </G>

    </Svg>
  );
}
