import React from "react";
import Svg, {
  Circle, ClipPath, Defs, G, Path, Polygon, Rect, Text as SvgText,
} from "react-native-svg";
import type { NumberFont, PantStripeStyle, UniformSet } from "@/context/types";

interface Props {
  uniform: UniformSet;
  abbreviation?: string;
  number?: string;
  width?: number;
  height?: number;
}

export function UniformPreview({
  uniform,
  abbreviation = "VFL",
  number = "00",
  width = 200,
  height = 320,
}: Props) {
  const {
    helmetColor, helmetLogoPlacement,
    jerseyStyle, jerseyColor, jerseyAccentColor,
    numberFont, numberColor, numberOutlineColor,
    pantColor, pantStripeStyle, pantStripeColor,
    sockColor, sockAccentColor,
  } = uniform;

  const nf = numFontAttrs(numberFont);
  const abbr3 = abbreviation.slice(0, 3).toUpperCase();

  // Facemask color — slightly lighter than charcoal so it reads clearly
  const fmColor = "#B0BEC5";

  return (
    <Svg width={width} height={height} viewBox="0 0 200 320">
      <Defs>
        {/* Clip to the helmet shell outline */}
        <ClipPath id="helmetShell">
          <Path d="M 32 90 Q 28 48 30 26 Q 42 4 100 3 Q 158 4 170 26 Q 172 48 168 90 Q 148 106 100 108 Q 52 106 32 90 Z" />
        </ClipPath>
      </Defs>

      {/* ──────────── HELMET (front-facing Schutt/Riddell style) ──────────── */}

      {/* Outer shell */}
      <Path
        d="M 32 90 Q 28 48 30 26 Q 42 4 100 3 Q 158 4 170 26 Q 172 48 168 90 Q 148 106 100 108 Q 52 106 32 90 Z"
        fill={helmetColor}
      />

      {/* Dome highlight sheen */}
      <Path
        d="M 70 10 Q 100 4 130 10 Q 130 30 100 32 Q 70 30 70 10 Z"
        fill="rgba(255,255,255,0.10)"
      />

      {/* Shadow under dome / above face opening */}
      <Path
        d="M 60 44 Q 60 38 100 36 Q 140 38 140 44 Q 120 40 100 40 Q 80 40 60 44 Z"
        fill="rgba(0,0,0,0.18)"
      />

      {/* Ear hole — left */}
      <Circle cx={32} cy={68} r={15} fill="#06060F" />
      <Circle cx={32} cy={68} r={9}  fill={helmetColor} />

      {/* Ear hole — right */}
      <Circle cx={168} cy={68} r={15} fill="#06060F" />
      <Circle cx={168} cy={68} r={9}  fill={helmetColor} />

      {/* Center crown stripe (clipped to shell, runs from top down to brow bar) */}
      {helmetLogoPlacement !== "none" && (
        <G clipPath="url(#helmetShell)">
          <Rect x={94} y={3} width={12} height={36} fill={jerseyAccentColor} opacity={0.82} />
        </G>
      )}

      {/* Team abbreviation on dome forehead (above face opening) */}
      {helmetLogoPlacement !== "none" && (
        <SvgText
          x={100} y={28}
          textAnchor="middle"
          fontSize={12} fontWeight="800"
          fill={numberColor} opacity={0.88}
        >
          {abbr3}
        </SvgText>
      )}

      {/* ── Dark face opening ── */}
      <Path
        d="M 62 46 Q 60 38 100 36 Q 140 38 138 46 L 138 92 Q 138 100 100 101 Q 62 100 62 92 Z"
        fill="#05050D"
      />

      {/* ── FACEMASK (Schutt/Riddell cage) ── */}

      {/* Brow bar — top horizontal */}
      <Rect x={56} y={32} width={88} height={8} rx={4} fill={fmColor} />

      {/* Left J-bar side rail */}
      <Path
        d="M 60 36 Q 53 42 51 55 L 51 93 Q 51 101 58 102 L 64 102 L 64 98 L 59 98 Q 55 98 55 93 L 55 57 Q 56 48 62 42 Z"
        fill={fmColor}
      />

      {/* Right J-bar side rail */}
      <Path
        d="M 140 36 Q 147 42 149 55 L 149 93 Q 149 101 142 102 L 136 102 L 136 98 L 141 98 Q 145 98 145 93 L 145 57 Q 144 48 138 42 Z"
        fill={fmColor}
      />

      {/* Eye bar (upper cross-bar) */}
      <Rect x={51} y={56} width={98} height={7} rx={3.5} fill={fmColor} />

      {/* Nose bar (mid cross-bar) */}
      <Rect x={51} y={72} width={98} height={7} rx={3.5} fill={fmColor} />

      {/* Chin bar (lower cross-bar) */}
      <Rect x={51} y={87} width={98} height={7} rx={3.5} fill={fmColor} />

      {/* Center nose-bridge (thin vertical Y-bar) */}
      <Rect x={97} y={32} width={6} height={63} rx={3} fill={fmColor} opacity={0.55} />

      {/* Facemask mounting screws / clips */}
      <Circle cx={58}  cy={45} r={3.5} fill="#546E7A" />
      <Circle cx={142} cy={45} r={3.5} fill="#546E7A" />

      {/* ──────────── JERSEY ──────────── */}

      {/* Left sleeve */}
      <Path d="M 40 108 L 2 155 L 12 173 L 40 173 Z" fill={jerseyColor} />
      {/* Right sleeve */}
      <Path d="M 160 108 L 198 155 L 188 173 L 160 173 Z" fill={jerseyColor} />
      {/* Body */}
      <Path d="M 40 108 L 160 108 L 163 200 L 37 200 Z" fill={jerseyColor} />

      {/* V-collar cutout */}
      <Path d="M 76 108 Q 100 88 124 108 L 116 108 Q 100 96 84 108 Z" fill="#06060F" />

      {/* Sleeve accent stripe */}
      <Path d="M 10 143 L 22 160 L 22 172 L 10 155 Z" fill={jerseyAccentColor} opacity={0.8} />
      <Path d="M 190 143 L 178 160 L 178 172 L 190 155 Z" fill={jerseyAccentColor} opacity={0.8} />

      {/* Style extras */}
      {jerseyStyle === "retro" && (
        <>
          <Rect x={37} y={161} width={126} height={9}  fill={jerseyAccentColor} opacity={0.50} />
          <Rect x={37} y={173} width={126} height={5}  fill={jerseyAccentColor} opacity={0.30} />
        </>
      )}
      {jerseyStyle === "modern" && (
        <>
          <Path d="M 40 108 L 82 108 L 78 137 L 40 137 Z" fill={jerseyAccentColor} opacity={0.28} />
          <Path d="M 118 108 L 160 108 L 160 137 L 122 137 Z" fill={jerseyAccentColor} opacity={0.28} />
        </>
      )}
      {jerseyStyle === "sleek" && (
        <>
          <Rect x={40} y={122} width={5} height={76} fill={jerseyAccentColor} opacity={0.55} />
          <Rect x={155} y={122} width={5} height={76} fill={jerseyAccentColor} opacity={0.55} />
        </>
      )}

      {/* Number shadow / outline */}
      <SvgText
        x={100} y={178} textAnchor="middle"
        fontSize={50} fontWeight={nf.fontWeight} fontStyle={nf.fontStyle}
        fill={numberOutlineColor} letterSpacing={nf.letterSpacing}
        stroke={numberOutlineColor} strokeWidth={5}
      >
        {number}
      </SvgText>
      {/* Number fill */}
      <SvgText
        x={100} y={178} textAnchor="middle"
        fontSize={50} fontWeight={nf.fontWeight} fontStyle={nf.fontStyle}
        fill={numberColor} letterSpacing={nf.letterSpacing}
      >
        {number}
      </SvgText>

      {/* ──────────── PANTS ──────────── */}

      <Rect x={40}  y={205} width={53} height={63} rx={5} fill={pantColor} />
      <Rect x={107} y={205} width={53} height={63} rx={5} fill={pantColor} />

      {/* Stripes */}
      {pantStripeStyle === "single" && (
        <>
          <Rect x={63}  y={207} width={7} height={59} rx={2} fill={pantStripeColor} opacity={0.85} />
          <Rect x={130} y={207} width={7} height={59} rx={2} fill={pantStripeColor} opacity={0.85} />
        </>
      )}
      {pantStripeStyle === "double" && (
        <>
          <Rect x={56} y={207} width={5} height={59} rx={2} fill={pantStripeColor} opacity={0.85} />
          <Rect x={65} y={207} width={5} height={59} rx={2} fill={pantStripeColor} opacity={0.85} />
          <Rect x={123} y={207} width={5} height={59} rx={2} fill={pantStripeColor} opacity={0.85} />
          <Rect x={132} y={207} width={5} height={59} rx={2} fill={pantStripeColor} opacity={0.85} />
        </>
      )}
      {pantStripeStyle === "triple" && (
        <>
          <Rect x={51} y={207} width={4} height={59} rx={2} fill={pantStripeColor} opacity={0.85} />
          <Rect x={59} y={207} width={4} height={59} rx={2} fill={pantStripeColor} opacity={0.85} />
          <Rect x={67} y={207} width={4} height={59} rx={2} fill={pantStripeColor} opacity={0.85} />
          <Rect x={118} y={207} width={4} height={59} rx={2} fill={pantStripeColor} opacity={0.85} />
          <Rect x={126} y={207} width={4} height={59} rx={2} fill={pantStripeColor} opacity={0.85} />
          <Rect x={134} y={207} width={4} height={59} rx={2} fill={pantStripeColor} opacity={0.85} />
        </>
      )}
      {pantStripeStyle === "lightning" && (
        <>
          <Polygon points="62,205 70,205 58,233 67,233 52,266 60,266" fill={pantStripeColor} opacity={0.85} />
          <Polygon points="129,205 137,205 125,233 134,233 119,266 127,266" fill={pantStripeColor} opacity={0.85} />
        </>
      )}

      {/* ──────────── SOCKS ──────────── */}

      <Rect x={42}  y={270} width={49} height={30} rx={5} fill={sockColor} />
      <Rect x={42}  y={281} width={49} height={9}  fill={sockAccentColor} opacity={0.75} />
      <Rect x={109} y={270} width={49} height={30} rx={5} fill={sockColor} />
      <Rect x={109} y={281} width={49} height={9}  fill={sockAccentColor} opacity={0.75} />
    </Svg>
  );
}

function numFontAttrs(font: NumberFont) {
  switch (font) {
    case "block":       return { fontWeight: "900" as const, fontStyle: "normal" as const, letterSpacing: 2 };
    case "serif":       return { fontWeight: "700" as const, fontStyle: "normal" as const, letterSpacing: 1 };
    case "collegiate":  return { fontWeight: "900" as const, fontStyle: "italic" as const, letterSpacing: 1 };
    case "futuristic":  return { fontWeight: "300" as const, fontStyle: "normal" as const, letterSpacing: 6 };
    case "slab":        return { fontWeight: "800" as const, fontStyle: "normal" as const, letterSpacing: 0 };
    default:            return { fontWeight: "700" as const, fontStyle: "normal" as const, letterSpacing: 1 };
  }
}
