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

      {/* ── GROUP 3: FACEMASK ──────────────────────────────────────────────── */}
      {/*
        The facemask projects FORWARD (further right) than the shell.
        Outer rail lives at x≈480–492. Inner rail follows the face opening edge.
        Horizontal bars use quadratic beziers so they bow outward (forward-projection).
        A nose-bridge bar runs between the two horizontal bars.
      */}
      <G id="facemask" fill={facemaskColor} stroke={OL} strokeWidth={sw2}
        strokeLinejoin="round">

        {/* ── Top brim: connects the shell brow to the outer rail at the top ── */}
        <Path
          d={
            "M 326 38 " +                           // inner attach (shell brow)
            "C 358 22 406 30 440 60 " +             // sweeps outward and forward
            "C 458 78 472 104 474 132 " +            // bends down to outer rail
            "L 460 136 " +                          // outer rail top
            "C 460 114 448 90 432 74 " +            // inner side of brim
            "C 400 46 358 38 330 50 Z"              // back to inner attach
          }
        />

        {/* Snap bolts at brim-to-shell attachment */}
        <Circle cx="356" cy="44" r="11" fill={facemaskColor} stroke={OL} strokeWidth="5" />
        <Circle cx="410" cy="68" r="11" fill={facemaskColor} stroke={OL} strokeWidth="5" />

        {/* ── Inner (left) vertical rail — follows face opening edge ── */}
        <Path
          d={
            "M 258 84 C 252 84 246 88 244 96 " +
            "L 242 422 " +
            "C 246 430 256 430 262 422 " +
            "L 264 96 Z"
          }
        />

        {/* ── Outer (right) vertical rail — projects well past the shell ── */}
        {/*
          Top is near the bill at (472,132); bottom curves in to (456,404).
          The rail bows outward in the middle (x≈492 at mid-height).
        */}
        <Path
          d={
            "M 472 132 " +                          // top (bill attachment)
            "C 492 168 494 226 490 278 " +           // bows outward — mid peak at x≈494
            "C 486 330 474 374 456 404 " +           // curves back in toward bottom
            "L 442 396 " +                          // inner edge bottom
            "C 460 368 472 326 476 278 " +           // inner edge going up
            "C 480 226 478 170 462 136 Z"            // back to top
          }
        />

        {/* ── Upper horizontal bar — curves forward (quadratic bezier bows right) ── */}
        <Path
          d={
            "M 244 210 " +
            "Q 368 192 480 214 " +                  // curves outward — peak at x≈480
            "L 480 234 " +
            "Q 368 212 244 230 Z"
          }
        />

        {/* ── Lower horizontal bar — same curve treatment ── */}
        <Path
          d={
            "M 244 326 " +
            "Q 368 308 480 330 " +
            "L 480 350 " +
            "Q 368 328 244 346 Z"
          }
        />

        {/* ── Nose-bridge bar — vertical centre bar, slight forward bow ── */}
        {/*
          Runs from the upper bar to the lower bar, bowing forward at x≈375.
          Represents the centre-vertical bar of a modern cage facemask.
        */}
        <Path
          d={
            "M 356 208 " +
            "Q 372 268 358 328 " +                  // bows right at mid-height
            "L 344 328 " +
            "Q 358 268 342 208 Z"
          }
        />

        {/* ── Bottom chin guard ── */}
        <Path
          d={
            "M 244 408 " +
            "C 244 426 270 436 344 436 " +
            "C 420 436 448 426 448 408 " +
            "L 448 422 " +
            "C 448 442 420 452 344 452 " +
            "C 270 452 244 442 244 422 Z"
          }
        />

        {/* Rivets at lower rail-to-chin-guard junctions */}
        <Circle cx="254" cy="400" r="9" fill={facemaskColor} stroke={OL} strokeWidth="5" />
        <Circle cx="448" cy="400" r="9" fill={facemaskColor} stroke={OL} strokeWidth="5" />

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
