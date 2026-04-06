import React from "react";
import Svg, {
  Path, Ellipse, Rect, Defs, RadialGradient, Stop,
  Text as SvgText,
} from "react-native-svg";

/**
 * Modern front-facing Schutt-style football helmet.
 *
 * THREE distinct parts:
 *   1. Shell     – rounded dome, gloss, shadow, crown stripe, ear holes
 *   2. Facemask  – Schutt ROPO-DW: brow mount bar, dimensional tube uprights,
 *                  2 J-bars, center divider, curved chin bar, dark visor
 *   3. Chinstrap – strap curves + oval chin cup pad
 *
 * Props: size | shellColor | facemaskColor | visorColor | chinstrapColor
 *        stripeColor (crown) | visorText (optional overlay text)
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

  /**
   * Dimensional tube bar:
   *   outer dark ring → main colour → bright center highlight → ink outline
   *   Creates the appearance of a round-cross-section tube from the front.
   */
  const Tube = ({ d, w = 22 }) => (
    <>
      <Path d={d} stroke="rgba(0,0,0,0.22)" strokeWidth={w + 5} fill="none" strokeLinecap="round" />
      <Path d={d} stroke={facemaskColor}     strokeWidth={w}     fill="none" strokeLinecap="round" />
      <Path d={d} stroke="rgba(255,255,255,0.28)" strokeWidth={w * 0.28} fill="none" strokeLinecap="round" />
      <Path d={d} stroke={ink}               strokeWidth={3.5}   fill="none" strokeLinecap="round" />
    </>
  );

  return (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      <Defs>
        <RadialGradient id="hGloss" cx="38%" cy="26%" r="52%">
          <Stop offset="0%"  stopColor="#FFFFFF" stopOpacity="0.30" />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.00" />
        </RadialGradient>
        <RadialGradient id="hShadow" cx="14%" cy="60%" r="44%">
          <Stop offset="0%"  stopColor="#000000" stopOpacity="0.24" />
          <Stop offset="100%" stopColor="#000000" stopOpacity="0.00" />
        </RadialGradient>
      </Defs>

      {/* ════════════════════════════════
          PART 1 — SHELL
          ════════════════════════════════ */}

      {/* Main dome */}
      <Path
        d="
          M 256 40
          C 148 40, 54 116, 48 220
          C 42 320, 82 384, 160 408
          Q 208 422, 256 424
          Q 304 422, 352 408
          C 430 384, 470 320, 464 220
          C 458 116, 364 40, 256 40 Z
        "
        fill={shellColor}
        stroke={ink}
        strokeWidth="7"
        strokeLinejoin="round"
      />

      {/* Gloss overlay */}
      <Path
        d="
          M 256 40 C 148 40, 54 116, 48 220
          C 42 320, 82 384, 160 408
          Q 208 422, 256 424 Q 304 422, 352 408
          C 430 384, 470 320, 464 220
          C 458 116, 364 40, 256 40 Z
        "
        fill="url(#hGloss)"
      />

      {/* Shadow overlay */}
      <Path
        d="
          M 256 40 C 148 40, 54 116, 48 220
          C 42 320, 82 384, 160 408
          Q 208 422, 256 424 Q 304 422, 352 408
          C 430 384, 470 320, 464 220
          C 458 116, 364 40, 256 40 Z
        "
        fill="url(#hShadow)"
      />

      {/* Top gloss streak */}
      <Path
        d="M 198 64 C 228 52, 284 52, 314 64"
        stroke="#FFFFFF"
        strokeWidth="13"
        fill="none"
        opacity="0.44"
        strokeLinecap="round"
      />

      {/* Crown stripe */}
      <Path
        d="
          M 247 42 Q 256 37, 265 42
          L 266 232 L 246 232 Z
        "
        fill={stripeColor}
        stroke={ink}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* Earhole — left shadow */}
      <Path
        d="
          M 63 252 C 52 284, 54 328, 72 362
          C 84 382, 106 394, 130 398
          C 108 386, 92 362, 84 334
          C 74 304, 74 268, 86 248
          C 76 248, 68 250, 63 252 Z
        "
        fill={ink}
        opacity="0.26"
      />

      {/* Earhole — right shadow */}
      <Path
        d="
          M 449 252 C 460 284, 458 328, 440 362
          C 428 382, 406 394, 382 398
          C 404 386, 420 362, 428 334
          C 438 304, 438 268, 426 248
          C 436 248, 444 250, 449 252 Z
        "
        fill={ink}
        opacity="0.26"
      />

      {/* ════════════════════════════════
          PART 2 — FACEMASK
          ════════════════════════════════

          Draw order (back → front):
            brow mount bar
            → visor (dark)
            → cheek guards
            → uprights (tube)
            → J-bar 1  (tube)
            → J-bar 2  (tube)
            → center divider (tube)
            → chin bar (tube)
      */}

      {/* Brow mount bar — flat shelf that attaches cage to shell */}
      <Path
        d="
          M 176 234 C 176 222, 182 216, 194 216
          L 318 216 C 330 216, 336 222, 336 234
          L 336 258 C 336 270, 330 276, 318 276
          L 194 276 C 182 276, 176 270, 176 258 Z
        "
        fill={facemaskColor}
        stroke={ink}
        strokeWidth="5"
        strokeLinejoin="round"
      />
      {/* Brow bar highlight */}
      <Path d="M 182 222 L 330 222"
        stroke="rgba(255,255,255,0.30)"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />

      {/* Hardware T-clips — left */}
      <Rect x="200" y="210" width="34" height="16" rx="4" ry="4"
        fill="#D8DDE8" stroke={ink} strokeWidth="3" opacity="0.92" />
      <Rect x="206" y="220" width="22" height="20" rx="3" ry="3"
        fill="#C8CDD8" stroke={ink} strokeWidth="3" opacity="0.92" />

      {/* Hardware T-clips — right */}
      <Rect x="278" y="210" width="34" height="16" rx="4" ry="4"
        fill="#D8DDE8" stroke={ink} strokeWidth="3" opacity="0.92" />
      <Rect x="284" y="220" width="22" height="20" rx="3" ry="3"
        fill="#C8CDD8" stroke={ink} strokeWidth="3" opacity="0.92" />

      {/* Visor — dark tinted area behind bars */}
      <Path
        d="
          M 178 277
          L 178 422
          Q 195 440, 256 446
          Q 317 440, 334 422
          L 334 277
          C 306 262, 206 262, 178 277 Z
        "
        fill={visorColor}
      />
      {/* Visor gloss line */}
      <Path
        d="M 204 285 C 228 273, 284 273, 308 285"
        stroke="#FFFFFF"
        strokeWidth="5"
        fill="none"
        opacity="0.13"
        strokeLinecap="round"
      />

      {/* Optional visor text */}
      {!!visorText && (
        <SvgText
          x="256"
          y="380"
          textAnchor="middle"
          fontSize="68"
          fontWeight="bold"
          fill="#FFFFFF"
          letterSpacing="3"
          opacity="0.88"
        >
          {visorText}
        </SvgText>
      )}

      {/* Cheek guards */}
      <Path
        d="M 176 280 L 120 306 C 90 340, 88 394, 108 438 L 168 438 Z"
        fill="#2A7A6C"
        opacity="0.62"
      />
      <Path
        d="M 336 280 L 392 306 C 422 340, 424 394, 404 438 L 344 438 Z"
        fill="#2A7A6C"
        opacity="0.62"
      />

      {/* Left upright — bows outward */}
      <Tube d="M 174 276 C 128 302, 106 372, 122 458" w={24} />

      {/* Right upright */}
      <Tube d="M 338 276 C 384 302, 406 372, 390 458" w={24} />

      {/* J-bar 1 (upper of the two chin-area bars) */}
      <Tube d="M 128 414 L 384 414" w={22} />

      {/* J-bar 2 (lower, Schutt double-bar signature near chin) */}
      <Tube d="M 124 442 L 388 442" w={22} />

      {/* Chin bar — curved bottom connector */}
      <Tube d="M 122 458 Q 256 488, 390 458" w={24} />

      {/* ════════════════════════════════
          PART 3 — CHINSTRAP & CHIN CUP
          ════════════════════════════════ */}

      {/* Strap curve — left */}
      <Path
        d="M 130 404 C 126 428, 168 460, 206 470"
        stroke={chinstrapColor}
        strokeWidth="9"
        fill="none"
        strokeLinecap="round"
        opacity="0.80"
      />
      <Path
        d="M 130 404 C 126 428, 168 460, 206 470"
        stroke={ink}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        opacity="0.40"
      />

      {/* Strap curve — right */}
      <Path
        d="M 382 404 C 386 428, 344 460, 306 470"
        stroke={chinstrapColor}
        strokeWidth="9"
        fill="none"
        strokeLinecap="round"
        opacity="0.80"
      />
      <Path
        d="M 382 404 C 386 428, 344 460, 306 470"
        stroke={ink}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        opacity="0.40"
      />

      {/* Chin cup outer body */}
      <Path
        d="
          M 200 464
          C 182 464, 170 476, 170 490
          L 170 500
          C 170 512, 184 520, 208 520
          L 304 520
          C 328 520, 342 512, 342 500
          L 342 490
          C 342 476, 330 464, 312 464 Z
        "
        fill={chinstrapColor}
        stroke={ink}
        strokeWidth="6"
        strokeLinejoin="round"
      />
      {/* Chin cup gloss */}
      <Path
        d="M 207 474 C 230 466, 282 466, 305 474"
        stroke="#FFFFFF"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
        opacity="0.26"
      />
      {/* Chin cup crease 1 */}
      <Path
        d="M 205 484 C 228 476, 284 476, 307 484"
        stroke={ink}
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        opacity="0.16"
      />
      {/* Chin cup crease 2 */}
      <Path
        d="M 208 498 C 229 492, 283 492, 304 498"
        stroke={ink}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        opacity="0.12"
      />

    </Svg>
  );
}
