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

  return (
    <Svg width={width} height={height} viewBox="0 0 200 320">
      <Defs>
        <ClipPath id="hc">
          <Path d="M 30 96 Q 30 14 100 7 Q 170 14 170 96 Z" />
        </ClipPath>
      </Defs>

      {/* ──────────── HELMET ──────────── */}

      {/* Dome */}
      <Path d="M 30 96 Q 30 14 100 7 Q 170 14 170 96 Z" fill={helmetColor} />

      {/* Center stripe — clipped to dome */}
      {helmetLogoPlacement !== "none" && (
        <G clipPath="url(#hc)">
          <Rect x={92} y={4} width={16} height={95} fill={jerseyAccentColor} opacity={0.85} />
        </G>
      )}

      {/* Ear hole */}
      <Circle cx={33} cy={73} r={13} fill="#07070F" />
      <Circle cx={33} cy={73} r={8} fill={helmetColor} />

      {/* Face mask bars */}
      <Rect x={150} y={48} width={6} height={44} rx={3} fill="#9CA3AF" />
      <Rect x={150} y={48} width={40} height={7} rx={3} fill="#9CA3AF" />
      <Rect x={150} y={63} width={40} height={7} rx={3} fill="#9CA3AF" />
      <Rect x={150} y={78} width={35} height={7} rx={3} fill="#9CA3AF" />

      {/* Chin guard */}
      <Path d="M 52 89 Q 100 104 148 89 Q 154 99 100 107 Q 46 99 52 89 Z" fill={helmetColor} />

      {/* Helmet abbreviation mark */}
      {helmetLogoPlacement === "both" && (
        <SvgText x={68} y={72} textAnchor="middle" fontSize={10} fontWeight="700" fill={numberColor} opacity={0.9}>
          {abbr3}
        </SvgText>
      )}
      {helmetLogoPlacement === "left" && (
        <SvgText x={68} y={72} textAnchor="middle" fontSize={10} fontWeight="700" fill={numberColor} opacity={0.9}>
          {abbr3}
        </SvgText>
      )}

      {/* ──────────── JERSEY ──────────── */}

      {/* Left sleeve */}
      <Path d="M 40 103 L 2 150 L 12 168 L 40 168 Z" fill={jerseyColor} />
      {/* Right sleeve */}
      <Path d="M 160 103 L 198 150 L 188 168 L 160 168 Z" fill={jerseyColor} />
      {/* Body */}
      <Path d="M 40 103 L 160 103 L 163 197 L 37 197 Z" fill={jerseyColor} />

      {/* V-collar cutout */}
      <Path d="M 76 103 Q 100 83 124 103 L 116 103 Q 100 92 84 103 Z" fill="#07070F" />

      {/* Sleeve accent stripe */}
      <Path d="M 10 138 L 22 155 L 22 167 L 10 150 Z" fill={jerseyAccentColor} opacity={0.8} />
      <Path d="M 190 138 L 178 155 L 178 167 L 190 150 Z" fill={jerseyAccentColor} opacity={0.8} />

      {/* Style extras */}
      {jerseyStyle === "retro" && (
        <>
          <Rect x={37} y={158} width={126} height={9} fill={jerseyAccentColor} opacity={0.5} />
          <Rect x={37} y={170} width={126} height={5} fill={jerseyAccentColor} opacity={0.3} />
        </>
      )}
      {jerseyStyle === "modern" && (
        <>
          <Path d="M 40 103 L 82 103 L 78 132 L 40 132 Z" fill={jerseyAccentColor} opacity={0.28} />
          <Path d="M 118 103 L 160 103 L 160 132 L 122 132 Z" fill={jerseyAccentColor} opacity={0.28} />
        </>
      )}
      {jerseyStyle === "sleek" && (
        <>
          <Rect x={40} y={118} width={5} height={77} fill={jerseyAccentColor} opacity={0.55} />
          <Rect x={155} y={118} width={5} height={77} fill={jerseyAccentColor} opacity={0.55} />
        </>
      )}

      {/* Number shadow/outline */}
      <SvgText
        x={100} y={173} textAnchor="middle"
        fontSize={50} fontWeight={nf.fontWeight} fontStyle={nf.fontStyle}
        fill={numberOutlineColor} letterSpacing={nf.letterSpacing}
        stroke={numberOutlineColor} strokeWidth={5}
      >
        {number}
      </SvgText>
      {/* Number fill */}
      <SvgText
        x={100} y={173} textAnchor="middle"
        fontSize={50} fontWeight={nf.fontWeight} fontStyle={nf.fontStyle}
        fill={numberColor} letterSpacing={nf.letterSpacing}
      >
        {number}
      </SvgText>

      {/* ──────────── PANTS ──────────── */}

      <Rect x={40} y={202} width={53} height={63} rx={5} fill={pantColor} />
      <Rect x={107} y={202} width={53} height={63} rx={5} fill={pantColor} />

      {/* Stripes */}
      {pantStripeStyle === "single" && (
        <>
          <Rect x={63} y={204} width={7} height={59} rx={2} fill={pantStripeColor} opacity={0.85} />
          <Rect x={130} y={204} width={7} height={59} rx={2} fill={pantStripeColor} opacity={0.85} />
        </>
      )}
      {pantStripeStyle === "double" && (
        <>
          <Rect x={56} y={204} width={5} height={59} rx={2} fill={pantStripeColor} opacity={0.85} />
          <Rect x={65} y={204} width={5} height={59} rx={2} fill={pantStripeColor} opacity={0.85} />
          <Rect x={123} y={204} width={5} height={59} rx={2} fill={pantStripeColor} opacity={0.85} />
          <Rect x={132} y={204} width={5} height={59} rx={2} fill={pantStripeColor} opacity={0.85} />
        </>
      )}
      {pantStripeStyle === "triple" && (
        <>
          <Rect x={51} y={204} width={4} height={59} rx={2} fill={pantStripeColor} opacity={0.85} />
          <Rect x={59} y={204} width={4} height={59} rx={2} fill={pantStripeColor} opacity={0.85} />
          <Rect x={67} y={204} width={4} height={59} rx={2} fill={pantStripeColor} opacity={0.85} />
          <Rect x={118} y={204} width={4} height={59} rx={2} fill={pantStripeColor} opacity={0.85} />
          <Rect x={126} y={204} width={4} height={59} rx={2} fill={pantStripeColor} opacity={0.85} />
          <Rect x={134} y={204} width={4} height={59} rx={2} fill={pantStripeColor} opacity={0.85} />
        </>
      )}
      {pantStripeStyle === "lightning" && (
        <>
          <Polygon points="62,204 70,204 58,232 67,232 52,263 60,263" fill={pantStripeColor} opacity={0.85} />
          <Polygon points="129,204 137,204 125,232 134,232 119,263 127,263" fill={pantStripeColor} opacity={0.85} />
        </>
      )}

      {/* ──────────── SOCKS ──────────── */}

      <Rect x={42} y={267} width={49} height={30} rx={5} fill={sockColor} />
      <Rect x={42} y={278} width={49} height={9} fill={sockAccentColor} opacity={0.75} />
      <Rect x={109} y={267} width={49} height={30} rx={5} fill={sockColor} />
      <Rect x={109} y={278} width={49} height={9} fill={sockAccentColor} opacity={0.75} />
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
