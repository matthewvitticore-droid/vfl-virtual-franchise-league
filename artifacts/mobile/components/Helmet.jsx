import React from "react";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";

/**
 * Helmet – flat cartoon SVG football helmet (React Native / react-native-svg)
 *
 * Side view, helmet faces RIGHT. ViewBox 0 0 560 512.
 * The facemask projects further right than the shell (x up to ~492).
 *
 * Four colour-controlled groups:
 *   shell / visor / facemask / chinstrap
 */
export default function Helmet({
  shellColor     = "#E5E7EB",
  facemaskColor  = "#DC2828",
  chinstrapColor = "#DC2828",
  visorColor     = "#0F172A",
  outlineColor   = "#111827",
  width          = 320,
  height         = 293,   // keeps 560:512 ratio
}) {
  const OL  = outlineColor;
  const sw  = 10;   // main outline stroke
  const sw2 = 7;    // secondary outline stroke

  return (
    <Svg width={width} height={height} viewBox="0 0 560 512">

      {/* ── GROUP 1: SHELL ─────────────────────────────────────────────────── */}
      <G id="shell">

        {/*
          Main dome — the outer silhouette of the helmet.
          Back (left) is fully rounded; front (right) has the projecting brow/bill
          that sweeps from the crown forward then down toward the cheekpad area.
          Face opening is a SEPARATE dark overlay (see below).
        */}
        <Path
          fill={shellColor} stroke={OL} strokeWidth={sw} strokeLinejoin="round"
          d={
            "M 86 440 " +                          // back-bottom
            "C 48 436 24 396 20 344 " +             // back lower
            "C 12 268 20 176 50 110 " +             // back upper
            "C 82 34 176 2 278 2 " +                // crown-back
            "C 368 2 440 46 466 128 " +             // crown sweeps forward to bill
            "C 480 174 478 228 462 274 " +          // bill curves down
            "C 444 324 408 360 366 384 " +          // front face edge (outer shell)
            "C 324 408 248 442 86 440 Z"            // jaw → bottom → back
          }
        />

        {/*
          Face opening — dark void that sits on the right side of the dome.
          The concave edge runs from the brow (y≈42) down to the jaw (y≈424),
          forming the opening the player looks through.
        */}
        <Path
          fill="#0b0b14" stroke={OL} strokeWidth={sw2} strokeLinejoin="round"
          d={
            "M 326 42 " +                           // face-opening top (near brow)
            "C 386 74 438 162 452 244 " +            // top-right arc
            "C 462 308 450 370 418 408 " +           // right arc down
            "C 394 434 364 444 336 436 " +           // lower-right
            "C 306 426 284 404 272 370 " +           // lower face edge
            "C 256 328 252 278 258 232 " +           // inner-left going up
            "C 268 176 298 124 336 90 " +            // upper inner face edge
            "C 344 82 332 62 326 42 Z"              // back to brow
          }
        />

        {/* Ear hole — lower-left of dome */}
        <Ellipse cx="88" cy="318" rx="22" ry="26"
          fill={shellColor} stroke={OL} strokeWidth={sw2} />
        <Ellipse cx="88" cy="318" rx="12" ry="15" fill="#0b0b14" />

        {/* Back vent dot */}
        <Circle cx="46" cy="228" r="9"
          fill={shellColor} stroke={OL} strokeWidth="5" />

      </G>

      {/* ── GROUP 2: VISOR ─────────────────────────────────────────────────── */}
      <G id="visor">
        {/*
          Tinted eye-shield. Fills the face opening, following its contour exactly.
          The right edge bows outward (matching the face opening arc).
        */}
        <Path
          fill={visorColor} opacity="0.96"
          d={
            "M 330 54 " +                           // top (brow)
            "C 386 86 434 168 448 248 " +            // top-right arc
            "C 458 308 446 364 416 398 " +           // right arc down
            "C 396 418 372 422 354 412 " +           // lower-right
            "C 334 398 318 372 310 338 " +           // lower-left
            "C 298 298 296 252 302 212 " +           // inner left going up
            "C 312 166 330 112 330 54 Z"             // back to top
          }
        />

        {/* Gloss highlight — diagonal streak across the upper visor */}
        <Path
          fill="none"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth="22"
          strokeLinecap="round"
          d="M 352 70 C 402 118 428 190 430 262"
        />
      </G>

      {/* ── GROUP 3: FACEMASK — Schutt/F7 style, all curved stroke tubes ──── */}
      {/*
        Every bar is drawn TWICE: a wider outlineColor stroke behind, then a
        narrower facemaskColor stroke on top — giving the "thick outlined tube"
        look of the reference illustration.
        No filled rectangles. All strokeLinecap="round".
      */}
      <G id="facemask">

        {/* ─ OUTLINE LAYER (drawn first, sits behind) ─ */}
        <G fill="none" stroke={OL} strokeLinecap="round" strokeLinejoin="round">

          {/* Top brim — sweeps from shell crown outward and forward */}
          <Path strokeWidth="22"
            d="M 296 60 C 346 36 412 34 458 68 C 476 82 484 110 482 138" />

          {/* Snap bolt outlines */}
          <Circle cx="346" cy="44" r="13" fill={OL} />
          <Circle cx="408" cy="38" r="13" fill={OL} />

          {/* Inner (left) rail — angles slightly inward top to bottom */}
          <Path strokeWidth="20"
            d="M 270 90 C 264 170 260 270 268 390" />

          {/* Outer (right) rail — bows outward (peak ~x=496) then angles in */}
          <Path strokeWidth="20"
            d="M 480 138 C 498 190 500 262 492 330 C 486 374 472 400 456 414" />

          {/* Upper eye bar — curves forward (bows toward viewer at mid-x) */}
          <Path strokeWidth="20"
            d="M 268 218 C 336 196 420 196 484 224" />

          {/* Lower bar */}
          <Path strokeWidth="18"
            d="M 266 316 C 334 296 416 296 482 320" />

          {/* Center nose guard — drops from eye bar to chin, slight forward bow */}
          <Path strokeWidth="20"
            d="M 372 208 C 378 256 376 308 366 378" />

          {/* Bottom chin connecting bar */}
          <Path strokeWidth="20"
            d="M 266 390 C 328 408 408 410 456 414" />
        </G>

        {/* ─ COLOR LAYER (drawn on top) ─ */}
        <G fill="none" stroke={facemaskColor} strokeLinecap="round" strokeLinejoin="round">

          {/* Top brim */}
          <Path strokeWidth="12"
            d="M 296 60 C 346 36 412 34 458 68 C 476 82 484 110 482 138" />

          {/* Snap bolts */}
          <Circle cx="346" cy="44" r="9" fill={facemaskColor} />
          <Circle cx="408" cy="38" r="9" fill={facemaskColor} />

          {/* Inner (left) rail */}
          <Path strokeWidth="11"
            d="M 270 90 C 264 170 260 270 268 390" />

          {/* Outer (right) rail */}
          <Path strokeWidth="11"
            d="M 480 138 C 498 190 500 262 492 330 C 486 374 472 400 456 414" />

          {/* Upper eye bar */}
          <Path strokeWidth="11"
            d="M 268 218 C 336 196 420 196 484 224" />

          {/* Lower bar */}
          <Path strokeWidth="10"
            d="M 266 316 C 334 296 416 296 482 320" />

          {/* Center nose guard */}
          <Path strokeWidth="11"
            d="M 372 208 C 378 256 376 308 366 378" />

          {/* Bottom chin bar */}
          <Path strokeWidth="11"
            d="M 266 390 C 328 408 408 410 456 414" />
        </G>

      </G>

      {/* ── GROUP 4: CHINSTRAP ─────────────────────────────────────────────── */}
      <G id="chinstrap" fill={chinstrapColor} stroke={OL}
        strokeWidth="5" strokeLinejoin="round">

        {/* Upper buckle clip (on lower-left of dome) */}
        <Rect x="92" y="274" width="36" height="21" rx="7" />
        <Rect x="102" y="266" width="17" height="13" rx="4"
          fill={chinstrapColor} stroke={OL} strokeWidth="4" />

        {/* Lower buckle clip */}
        <Rect x="86" y="336" width="34" height="20" rx="6" />
        <Rect x="96" y="328" width="15" height="12" rx="3"
          fill={chinstrapColor} stroke={OL} strokeWidth="4" />

        {/* Chin strap arc connecting the two clips */}
        <Path
          fill="none"
          stroke={chinstrapColor}
          strokeWidth="12"
          strokeLinecap="round"
          d="M 126 284 C 170 302 215 315 244 322"
        />

        {/* Under-jaw strap arc */}
        <Path
          fill="none"
          stroke={chinstrapColor}
          strokeWidth="20"
          strokeLinecap="round"
          d="M 246 440 C 246 468 278 482 344 482 C 410 482 444 468 444 440"
        />

        {/* Chin pad */}
        <Ellipse cx="344" cy="480" rx="54" ry="22"
          fill={chinstrapColor} stroke={OL} strokeWidth="5" />

      </G>

    </Svg>
  );
}
