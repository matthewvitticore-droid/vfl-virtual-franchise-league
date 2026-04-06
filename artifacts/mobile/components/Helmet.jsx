import React from "react";
import Svg, {
  Path, Rect, Defs, RadialGradient, LinearGradient, Stop,
  Text as SvgText,
} from "react-native-svg";

/**
 * Modern front-facing Schutt-style football helmet.
 *
 * Layout (top → bottom in 512×512 viewBox):
 *   ┌─────────────────────────────┐  y≈36
 *   │  DOME ARC  (small cap, ~28%)│  y≈36–210
 *   ├─────────────────────────────┤  y≈200
 *   │  brow mount bar + T-clips   │  y≈200–236
 *   │  VISOR — full width         │  y≈238–430
 *   │  cage uprights (bow out)    │
 *   │  J-bar 1                    │  y≈432
 *   │  J-bar 2                    │  y≈456
 *   │  chin bar                   │  y≈468
 *   │  chin cup                   │  y≈474–510
 *   └─────────────────────────────┘
 *
 * Props: size | shellColor | facemaskColor | visorColor
 *        chinstrapColor | stripeColor | visorText
 */
export default function Helmet({
  size           = 220,
  shellColor     = "#ECEEF2",
  facemaskColor  = "#C0C6D0",
  visorColor     = "#080C14",
  chinstrapColor = "#ECEEF2",
  stripeColor    = "#CC2020",
  visorText      = "",
}) {
  const ink = "#10141E";

  /* Tube bar: outer dark shadow ring → main colour → centre highlight → ink edge */
  const Tube = ({ d, w = 22 }) => (
    <>
      <Path d={d} stroke="rgba(0,0,0,0.24)" strokeWidth={w + 6} fill="none" strokeLinecap="round" />
      <Path d={d} stroke={facemaskColor}     strokeWidth={w}     fill="none" strokeLinecap="round" />
      <Path d={d} stroke="rgba(255,255,255,0.30)" strokeWidth={w * 0.28} fill="none" strokeLinecap="round" />
      <Path d={d} stroke={ink}               strokeWidth={3.5}   fill="none" strokeLinecap="round" />
    </>
  );

  return (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      <Defs>
        {/* Dome gloss — bright upper-left highlight */}
        <RadialGradient id="dGloss" cx="36%" cy="22%" r="54%">
          <Stop offset="0%"  stopColor="#FFFFFF" stopOpacity="0.34" />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.00" />
        </RadialGradient>
        {/* Dome shadow — left-side ambient shadow */}
        <RadialGradient id="dShadow" cx="12%" cy="58%" r="46%">
          <Stop offset="0%"  stopColor="#000000" stopOpacity="0.26" />
          <Stop offset="100%" stopColor="#000000" stopOpacity="0.00" />
        </RadialGradient>
        {/* Visor gradient — dark with subtle reflective band */}
        <LinearGradient id="visorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%"   stopColor={visorColor} stopOpacity="0.92" />
          <Stop offset="38%"  stopColor={visorColor} stopOpacity="0.80" />
          <Stop offset="42%"  stopColor="#FFFFFF"    stopOpacity="0.08" />
          <Stop offset="48%"  stopColor={visorColor} stopOpacity="0.82" />
          <Stop offset="100%" stopColor={visorColor} stopOpacity="1.00" />
        </LinearGradient>
      </Defs>

      {/* ══════════════════════════════════════════════
          PART 1 — SHELL  (small arc dome only)
          ══════════════════════════════════════════════
          Arc runs from left-brow (148,212) over crown (256,36)
          to right-brow (364,212). Bottom closed straight — hidden
          by the brow mount bar drawn on top.
      */}
      <Path
        d="
          M 148 212
          C 118 212, 78 196, 62 166
          C 46 134, 58 86, 98 62
          C 144 38, 198 34, 256 34
          C 314 34, 368 38, 414 62
          C 454 86, 466 134, 450 166
          C 434 196, 394 212, 364 212
          L 148 212 Z
        "
        fill={shellColor}
        stroke={ink}
        strokeWidth="7"
        strokeLinejoin="round"
      />
      {/* Gloss overlay */}
      <Path
        d="
          M 148 212 C 118 212, 78 196, 62 166
          C 46 134, 58 86, 98 62 C 144 38, 198 34, 256 34
          C 314 34, 368 38, 414 62 C 454 86, 466 134, 450 166
          C 434 196, 394 212, 364 212 L 148 212 Z
        "
        fill="url(#dGloss)"
      />
      {/* Shadow overlay */}
      <Path
        d="
          M 148 212 C 118 212, 78 196, 62 166
          C 46 134, 58 86, 98 62 C 144 38, 198 34, 256 34
          C 314 34, 368 38, 414 62 C 454 86, 466 134, 450 166
          C 434 196, 394 212, 364 212 L 148 212 Z
        "
        fill="url(#dShadow)"
      />

      {/* Top gloss streak */}
      <Path
        d="M 204 60 C 230 48, 282 48, 308 60"
        stroke="#FFFFFF" strokeWidth="12" fill="none"
        opacity="0.46" strokeLinecap="round"
      />

      {/* Crown stripe — runs from crown to brow */}
      <Path
        d="
          M 249 36 Q 256 30, 263 36
          L 264 210 L 248 210 Z
        "
        fill={stripeColor}
        stroke={ink}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* ══════════════════════════════════════════════
          PART 2 — FACEMASK
          ══════════════════════════════════════════════ */}

      {/* Brow mount bar */}
      <Path
        d="
          M 152 202 C 152 190, 158 184, 170 184
          L 342 184 C 354 184, 360 190, 360 202
          L 360 228 C 360 240, 354 246, 342 246
          L 170 246 C 158 246, 152 240, 152 228 Z
        "
        fill={facemaskColor}
        stroke={ink}
        strokeWidth="5"
        strokeLinejoin="round"
      />
      {/* Brow bar top highlight */}
      <Path d="M 158 190 L 354 190"
        stroke="rgba(255,255,255,0.32)" strokeWidth="6"
        strokeLinecap="round" fill="none"
      />

      {/* Hardware T-clips — left */}
      <Rect x="194" y="176" width="32" height="14" rx="4" ry="4"
        fill="#D6DCE8" stroke={ink} strokeWidth="3" opacity="0.92" />
      <Rect x="200" y="186" width="20" height="18" rx="3" ry="3"
        fill="#C4CAD6" stroke={ink} strokeWidth="3" opacity="0.92" />

      {/* Hardware T-clips — right */}
      <Rect x="286" y="176" width="32" height="14" rx="4" ry="4"
        fill="#D6DCE8" stroke={ink} strokeWidth="3" opacity="0.92" />
      <Rect x="292" y="186" width="20" height="18" rx="3" ry="3"
        fill="#C4CAD6" stroke={ink} strokeWidth="3" opacity="0.92" />

      {/* ── VISOR — spans full cage width ──────────── */}
      <Path
        d="
          M 132 248
          L 380 248
          L 380 432
          Q 356 450, 256 456
          Q 156 450, 132 432
          L 132 248 Z
        "
        fill="url(#visorGrad)"
        stroke={ink}
        strokeWidth="0"
      />
      {/* Visor top edge (thin highlight) */}
      <Path
        d="M 134 252 L 378 252"
        stroke="#FFFFFF" strokeWidth="5" fill="none"
        opacity="0.18" strokeLinecap="round"
      />
      {/* Visor reflective gloss band (horizontal streak) */}
      <Path
        d="M 138 298 C 200 290, 312 290, 374 298"
        stroke="#FFFFFF" strokeWidth="14" fill="none"
        opacity="0.09" strokeLinecap="round"
      />

      {/* Optional visor text */}
      {!!visorText && (
        <SvgText
          x="256" y="364"
          textAnchor="middle"
          fontSize="72" fontWeight="bold"
          fill="#FFFFFF" letterSpacing="3" opacity="0.88"
        >
          {visorText}
        </SvgText>
      )}

      {/* ── LEFT UPRIGHT (bows outward) ────────────── */}
      <Tube d="M 148 246 C 106 272, 84 358, 100 464" w={24} />

      {/* ── RIGHT UPRIGHT ──────────────────────────── */}
      <Tube d="M 364 246 C 406 272, 428 358, 412 464" w={24} />

      {/* ── J-BAR 1 (upper of chin-pair) ───────────── */}
      <Tube d="M 104 432 L 408 432" w={22} />

      {/* ── J-BAR 2 (lower, Schutt double-bar) ─────── */}
      <Tube d="M 100 458 L 412 458" w={22} />

      {/* ── CHIN BAR ───────────────────────────────── */}
      <Tube d="M 100 468 Q 256 498, 412 468" w={24} />

      {/* ══════════════════════════════════════════════
          PART 3 — CHINSTRAP & CHIN CUP
          ══════════════════════════════════════════════ */}

      {/* Strap — left */}
      <Path d="M 108 418 C 104 440, 148 468, 196 476"
        stroke={chinstrapColor} strokeWidth="9" fill="none"
        strokeLinecap="round" opacity="0.80"
      />
      <Path d="M 108 418 C 104 440, 148 468, 196 476"
        stroke={ink} strokeWidth="3" fill="none"
        strokeLinecap="round" opacity="0.38"
      />

      {/* Strap — right */}
      <Path d="M 404 418 C 408 440, 364 468, 316 476"
        stroke={chinstrapColor} strokeWidth="9" fill="none"
        strokeLinecap="round" opacity="0.80"
      />
      <Path d="M 404 418 C 408 440, 364 468, 316 476"
        stroke={ink} strokeWidth="3" fill="none"
        strokeLinecap="round" opacity="0.38"
      />

      {/* Chin cup body */}
      <Path
        d="
          M 198 476 C 180 476, 168 488, 168 502
          L 168 510 C 168 512, 182 512, 208 512
          L 304 512 C 330 512, 344 512, 344 510
          L 344 502 C 344 488, 332 476, 314 476 Z
        "
        fill={chinstrapColor}
        stroke={ink}
        strokeWidth="5.5"
        strokeLinejoin="round"
      />
      {/* Chin cup gloss */}
      <Path d="M 206 486 C 228 478, 284 478, 306 486"
        stroke="#FFFFFF" strokeWidth="4" fill="none"
        strokeLinecap="round" opacity="0.26"
      />
      <Path d="M 204 498 C 228 490, 284 490, 308 498"
        stroke={ink} strokeWidth="2.5" fill="none"
        strokeLinecap="round" opacity="0.14"
      />

    </Svg>
  );
}
