import React from "react";
import Svg, {
  Defs, LinearGradient, RadialGradient, Stop,
  Path, Rect, Ellipse,
  Text as SvgText,
} from "react-native-svg";
import type { NFLPosition, UniformSet, EthnicityCode, FaceVariant } from "@/context/types";

// ─── Body / position classification ──────────────────────────────────────────

type BodyClass = "skill" | "lb" | "lineman";

function bodyClass(pos: NFLPosition): BodyClass {
  if (["OL", "DE", "DT"].includes(pos)) return "lineman";
  if (pos === "LB") return "lb";
  return "skill";
}

// ─── Color helpers ────────────────────────────────────────────────────────────

function hexToRgb(h: string): [number, number, number] {
  const n = parseInt(h.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function darken(h: string, amt: number): string {
  const [r, g, b] = hexToRgb(h);
  const c = (v: number) => Math.max(0, Math.min(255, v + amt)).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}
function lighten(h: string, amt: number): string { return darken(h, Math.abs(amt)); }

// ─── Skin tones by ethnicity ──────────────────────────────────────────────────

const SKIN_TONES: Record<EthnicityCode, {
  skin: string; skinDk: string; eyeColor: string; eyeHi: string;
}> = {
  0: { skin: "#7B4A2D", skinDk: "#5A3320", eyeColor: "#2C1810", eyeHi: "#8B5E3C" },
  1: { skin: "#F0C9A0", skinDk: "#D4A57A", eyeColor: "#4A7DA8", eyeHi: "#7AABCE" },
  2: { skin: "#C18A50", skinDk: "#9A6A35", eyeColor: "#3D2014", eyeHi: "#7A4F26" },
  3: { skin: "#8B5E3C", skinDk: "#6A4228", eyeColor: "#1A0E07", eyeHi: "#5A3820" },
  4: { skin: "#B07840", skinDk: "#8A5A28", eyeColor: "#3A2010", eyeHi: "#7A5030" },
};

// ─── Component interface ──────────────────────────────────────────────────────

interface Props {
  uniform: UniformSet;
  position: NFLPosition;
  number?: string;
  playerName?: string;
  width?: number;
  height?: number;
  ethnicityCode?: EthnicityCode;
  faceVariant?: FaceVariant;
}

// ─── Layout anchors (portrait helmet card, viewBox 0 0 120 160) ───────────────

const VB_W = 120;
const VB_H = 160;
const cx   = 60;  // horizontal center

// Vertical positions
const HT  = 9;    // helmet dome apex
const HE  = 50;   // ear-hole level (widest point of dome)
const FT  = 47;   // face opening top
const FB  = 87;   // face opening bottom
const CY  = 97;   // chin-cup center Y
const NT  = 90;   // neck top (visible below chin)
const NB  = 111;  // neck bottom → shoulder junction
const SHT = 108;  // jersey/shoulder top

// Half-widths from cx
const HWE = 44;   // helmet at ear level (widest)
const HWT = 22;   // helmet at apex
const HWB = 36;   // helmet at brim / jaw pad
const FW  = 19;   // face opening half-width (horizontal)
const MW  = 23;   // facemask outer rail distance from cx

// Facemask bar Y-positions
const BAR1 = FT + 13;   // just below helmet brim / eye level
const BAR2 = FT + 27;   // nose level
const BAR3 = FT + 41;   // mouth / chin level

// ─── Main component ───────────────────────────────────────────────────────────

export function PlayerFigure({
  uniform,
  position,
  number = "00",
  playerName,
  width  = 120,
  height = 160,
  ethnicityCode = 0,
  faceVariant   = 0,
}: Props) {
  const cls = bodyClass(position);

  // Uniform colors
  const helmetC  = uniform.helmetColor        || "#1E3A8A";
  const helmetHi = lighten(helmetC, 50);
  const helmetDk = darken(helmetC, -45);
  const helmetMd = darken(helmetC, -20);
  const jerseyC  = uniform.jerseyColor        || "#1E3A8A";
  const jerseyDk = darken(jerseyC, -35);
  const accentC  = uniform.jerseyAccentColor  || "#ffffff";
  const numC     = uniform.numberColor        || "#ffffff";
  const numOut   = uniform.numberOutlineColor || "#000000";

  // Face / skin
  const face       = SKIN_TONES[ethnicityCode];
  const skinC      = face.skin;
  const skinDk     = face.skinDk;
  const eyeC       = face.eyeColor;
  const browsW     = 1.6 + (faceVariant % 2) * 0.5;
  const noseW      = 3.0 + (faceVariant % 3) * 0.6;
  const hasEyeBlk  = faceVariant % 2 === 0;

  // Facemask chrome
  const maskC  = "#C2CDD6";
  const maskDk = "#8A9CA8";

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`}>
      <Defs>
        {/* Helmet — light top → dark bottom */}
        <LinearGradient id="hGrad" x1="0.1" y1="0" x2="0.2" y2="1">
          <Stop offset="0"   stopColor={helmetHi} />
          <Stop offset="0.4" stopColor={helmetC}  />
          <Stop offset="1"   stopColor={helmetDk} />
        </LinearGradient>
        {/* Jersey — horizontal warm/cool */}
        <LinearGradient id="jGrad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0"   stopColor={lighten(jerseyC, 14)} />
          <Stop offset="0.5" stopColor={jerseyC}              />
          <Stop offset="1"   stopColor={jerseyDk}             />
        </LinearGradient>
        {/* Face skin — top dark → mid light → bottom mid */}
        <LinearGradient id="fGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0"   stopColor={darken(skinC, -25)} />
          <Stop offset="0.5" stopColor={skinC}              />
          <Stop offset="1"   stopColor={darken(skinC, -12)} />
        </LinearGradient>
        {/* Team color background glow */}
        <RadialGradient id="bgGlow" cx="50%" cy="34%" r="55%">
          <Stop offset="0" stopColor={helmetC} stopOpacity="0.18" />
          <Stop offset="1" stopColor="#07070F" stopOpacity="0"    />
        </RadialGradient>
      </Defs>

      {/* ── Card background ─────────────────────────────────────── */}
      <Rect x={0} y={0} width={VB_W} height={VB_H} fill="#07070F" />
      <Rect x={0} y={0} width={VB_W} height={VB_H} fill="url(#bgGlow)" />

      {/* ════════════════════════════════════════════════════════════
          JERSEY / SHOULDERS   (drawn first — behind the helmet)
          ════════════════════════════════════════════════════════════ */}

      {/* Main jersey body */}
      <Path
        d={`M ${cx - 54} ${VB_H}
            L ${cx - 54} ${SHT + 14}
            Q ${cx - 49} ${SHT}      ${cx - 22} ${NB}
            L ${cx + 22} ${NB}
            Q ${cx + 49} ${SHT}      ${cx + 54} ${SHT + 14}
            L ${cx + 54} ${VB_H} Z`}
        fill="url(#jGrad)"
      />

      {/* Shoulder pad arch — left */}
      <Path
        d={`M ${cx - 54} ${SHT + 20}
            Q ${cx - 45} ${SHT - 5}  ${cx - 24} ${NB - 2}
            L ${cx - 20} ${NB + 2}
            Q ${cx - 43} ${SHT - 1}  ${cx - 54} ${SHT + 25} Z`}
        fill={lighten(jerseyC, 22)}
      />
      {/* Shoulder pad arch — right */}
      <Path
        d={`M ${cx + 54} ${SHT + 20}
            Q ${cx + 45} ${SHT - 5}  ${cx + 24} ${NB - 2}
            L ${cx + 20} ${NB + 2}
            Q ${cx + 43} ${SHT - 1}  ${cx + 54} ${SHT + 25} Z`}
        fill={lighten(jerseyC, 22)}
      />

      {/* Accent stripe — left */}
      <Path
        d={`M ${cx - 54} ${SHT + 11}
            Q ${cx - 47} ${SHT + 2}  ${cx - 31} ${NB}
            L ${cx - 35} ${NB + 1}
            Q ${cx - 49} ${SHT + 4}  ${cx - 54} ${SHT + 16} Z`}
        fill={accentC} fillOpacity={0.60}
      />
      {/* Accent stripe — right */}
      <Path
        d={`M ${cx + 54} ${SHT + 11}
            Q ${cx + 47} ${SHT + 2}  ${cx + 31} ${NB}
            L ${cx + 35} ${NB + 1}
            Q ${cx + 49} ${SHT + 4}  ${cx + 54} ${SHT + 16} Z`}
        fill={accentC} fillOpacity={0.60}
      />

      {/* Jersey number */}
      <SvgText
        x={cx}
        y={VB_H - 11}
        fontSize={cls === "lineman" ? 28 : 32}
        fontWeight="900"
        fill={numC}
        stroke={numOut}
        strokeWidth={2.2}
        textAnchor="middle"
        fontFamily="System"
        letterSpacing={-1}
      >{number}</SvgText>

      {/* ════════════════════════════════════════════════════════════
          NECK
          ════════════════════════════════════════════════════════════ */}
      <Path
        d={`M ${cx - 12} ${NT}
            Q ${cx - 10} ${NT - 3} ${cx + 10} ${NT - 3}
            Q ${cx + 12} ${NT}     ${cx + 13} ${NB - 5}
            Q ${cx}      ${NB + 4} ${cx - 13} ${NB - 5} Z`}
        fill={skinC}
      />
      {/* Neck shadow strip */}
      <Path
        d={`M ${cx - 12} ${NT + 6}
            L ${cx + 12} ${NT + 6}
            L ${cx + 13} ${NT + 14}
            L ${cx - 13} ${NT + 14} Z`}
        fill={skinDk} fillOpacity={0.35}
      />
      {/* Jersey collar / neck roll */}
      <Path
        d={`M ${cx - 14} ${NB - 7}
            Q ${cx}      ${NB + 5}  ${cx + 14} ${NB - 7}
            L ${cx + 12} ${NB - 1}
            Q ${cx}      ${NB + 8}  ${cx - 12} ${NB - 1} Z`}
        fill={darken(jerseyC, -28)}
      />
      <Path
        d={`M ${cx - 11} ${NB - 5} Q ${cx} ${NB + 3} ${cx + 11} ${NB - 5}`}
        stroke={accentC} strokeWidth={1.4} fill="none" strokeLinecap="round"
      />

      {/* ════════════════════════════════════════════════════════════
          HELMET BACK SHELL  (wider + darker — depth layer)
          ════════════════════════════════════════════════════════════ */}
      <Path
        d={`M ${cx - FW - 2} ${FT}
            Q ${cx - HWE - 5} ${FT - 16} ${cx - HWT - 4} ${HT + 8}
            Q ${cx}           ${HT - 5}  ${cx + HWT + 4} ${HT + 8}
            Q ${cx + HWE + 5} ${FT - 16} ${cx + FW + 2}  ${FT}
            L ${cx + HWB + 8} ${86}
            Q ${cx}           ${CY + 9}  ${cx - HWB - 8} ${86} Z`}
        fill={helmetDk}
      />

      {/* ════════════════════════════════════════════════════════════
          HELMET FRONT DOME  (team color with gradient)
          ════════════════════════════════════════════════════════════ */}
      <Path
        d={`M ${cx - FW}  ${FT}
            Q ${cx - HWE} ${FT - 14} ${cx - HWT} ${HT + 4}
            Q ${cx}       ${HT}      ${cx + HWT}  ${HT + 4}
            Q ${cx + HWE} ${FT - 14} ${cx + FW}   ${FT}
            L ${cx + FW}  ${FB}
            Q ${cx + HWB} ${FB + 5}  ${cx + MW + 7} ${CY - 3}
            Q ${cx}       ${CY + 5}  ${cx - MW - 7}  ${CY - 3}
            Q ${cx - HWB} ${FB + 5}  ${cx - FW}   ${FB} Z`}
        fill="url(#hGrad)"
      />

      {/* ════════════════════════════════════════════════════════════
          EAR HOLES
          ════════════════════════════════════════════════════════════ */}
      {/* Left ear hole */}
      <Ellipse cx={cx - HWE + 8} cy={HE} rx={10} ry={12} fill={helmetDk}  />
      <Ellipse cx={cx - HWE + 8} cy={HE} rx={6}  ry={8}  fill="#080810"   />
      {/* Right ear hole */}
      <Ellipse cx={cx + HWE - 8} cy={HE} rx={10} ry={12} fill={helmetDk}  />
      <Ellipse cx={cx + HWE - 8} cy={HE} rx={6}  ry={8}  fill="#080810"   />

      {/* ════════════════════════════════════════════════════════════
          HELMET STRIPES  (center mohawk + side stripes)
          ════════════════════════════════════════════════════════════ */}
      {/* Center mohawk */}
      <Path
        d={`M ${cx - 3.5} ${HT + 5}
            Q ${cx - 3}   ${HT + 2}  ${cx + 3}   ${HT + 2}
            L ${cx + 3}   ${FT - 3}
            L ${cx - 3}   ${FT - 3} Z`}
        fill={helmetHi} fillOpacity={0.45}
      />
      <Path
        d={`M ${cx - 1.5} ${HT + 6}
            L ${cx + 1.5} ${HT + 6}
            L ${cx + 1.5} ${FT - 4}
            L ${cx - 1.5} ${FT - 4} Z`}
        fill={accentC !== "#ffffff" ? accentC : numC}
        fillOpacity={0.80}
      />
      {/* Left side stripe */}
      <Path
        d={`M ${cx - 14} ${HT + 8}
            Q ${cx - 18} ${HT + 26} ${cx - 19} ${FT - 5}
            L ${cx - 15} ${FT - 4}
            Q ${cx - 13} ${HT + 25} ${cx - 10} ${HT + 10} Z`}
        fill={accentC} fillOpacity={0.45}
      />
      {/* Right side stripe */}
      <Path
        d={`M ${cx + 14} ${HT + 8}
            Q ${cx + 18} ${HT + 26} ${cx + 19} ${FT - 5}
            L ${cx + 15} ${FT - 4}
            Q ${cx + 13} ${HT + 25} ${cx + 10} ${HT + 10} Z`}
        fill={accentC} fillOpacity={0.45}
      />

      {/* ════════════════════════════════════════════════════════════
          FACE RECESS  (shadow visible behind face)
          ════════════════════════════════════════════════════════════ */}
      <Path
        d={`M ${cx - FW + 3} ${FT + 3}
            Q ${cx}           ${FT - 1}  ${cx + FW - 3} ${FT + 3}
            L ${cx + FW - 3}  ${FB - 3}
            Q ${cx}           ${FB + 1}  ${cx - FW + 3} ${FB - 3} Z`}
        fill={darken(skinC, -44)} fillOpacity={0.96}
      />

      {/* ════════════════════════════════════════════════════════════
          FACE  (skin, eyes, nose visible through bars)
          ════════════════════════════════════════════════════════════ */}
      {/* Skin base */}
      <Path
        d={`M ${cx - FW + 5} ${FT + 6}
            Q ${cx}           ${FT + 1}  ${cx + FW - 5} ${FT + 6}
            L ${cx + FW - 5}  ${FB - 5}
            Q ${cx}           ${FB - 1}  ${cx - FW + 5} ${FB - 5} Z`}
        fill="url(#fGrad)"
      />
      {/* Forehead shadow (just below helmet brim) */}
      <Path
        d={`M ${cx - FW + 5} ${FT + 6}
            Q ${cx}           ${FT + 1}  ${cx + FW - 5} ${FT + 6}
            L ${cx + FW - 6}  ${FT + 14}
            Q ${cx}           ${FT + 10} ${cx - FW + 6} ${FT + 14} Z`}
        fill={darken(skinC, -30)} fillOpacity={0.55}
      />
      {/* Cheek shading */}
      <Ellipse cx={cx - 10} cy={FT + 26} rx={7} ry={9}  fill={skinDk} fillOpacity={0.26} />
      <Ellipse cx={cx + 10} cy={FT + 26} rx={7} ry={9}  fill={skinDk} fillOpacity={0.26} />

      {/* Eyebrows */}
      <Path
        d={`M ${cx - 16} ${FT + 18} Q ${cx - 10} ${FT + 15} ${cx - 4} ${FT + 18}`}
        stroke={darken(eyeC, -10)} strokeWidth={browsW} fill="none" strokeLinecap="round"
      />
      <Path
        d={`M ${cx + 4}  ${FT + 18} Q ${cx + 10} ${FT + 15} ${cx + 16} ${FT + 18}`}
        stroke={darken(eyeC, -10)} strokeWidth={browsW} fill="none" strokeLinecap="round"
      />

      {/* Left eye */}
      <Ellipse cx={cx - 10} cy={FT + 24} rx={5.5} ry={4.0} fill="#0A0A0A" />
      <Ellipse cx={cx - 10} cy={FT + 24} rx={3.8} ry={2.8} fill={eyeC}    />
      <Ellipse cx={cx -  8} cy={FT + 23} rx={1.4} ry={1.4} fill="#FFFFFF" fillOpacity={0.55} />
      <Ellipse cx={cx - 10} cy={FT + 24} rx={1.4} ry={1.4} fill="#000000" />

      {/* Right eye */}
      <Ellipse cx={cx + 10} cy={FT + 24} rx={5.5} ry={4.0} fill="#0A0A0A" />
      <Ellipse cx={cx + 10} cy={FT + 24} rx={3.8} ry={2.8} fill={eyeC}    />
      <Ellipse cx={cx + 12} cy={FT + 23} rx={1.4} ry={1.4} fill="#FFFFFF" fillOpacity={0.55} />
      <Ellipse cx={cx + 10} cy={FT + 24} rx={1.4} ry={1.4} fill="#000000" />

      {/* Eye black (war paint) */}
      {hasEyeBlk && (
        <>
          <Path
            d={`M ${cx - 16} ${FT + 28} L ${cx - 5} ${FT + 28}`}
            stroke="#180800" strokeWidth={2.2} strokeLinecap="round" strokeOpacity={0.52}
          />
          <Path
            d={`M ${cx + 5} ${FT + 28} L ${cx + 16} ${FT + 28}`}
            stroke="#180800" strokeWidth={2.2} strokeLinecap="round" strokeOpacity={0.52}
          />
        </>
      )}

      {/* Nose */}
      <Path
        d={`M ${cx}         ${FT + 24}
            Q ${cx - noseW} ${FT + 32} ${cx - noseW + 1} ${FT + 34}
            Q ${cx}         ${FT + 36} ${cx + noseW - 1} ${FT + 34}
            Q ${cx + noseW} ${FT + 32} ${cx}             ${FT + 24}`}
        stroke={skinDk} strokeWidth={1.2} fill="none" strokeLinecap="round"
      />

      {/* Mouth (partially visible beneath bar 3) */}
      <Path
        d={`M ${cx - 5} ${FB - 13} Q ${cx} ${FB - 10} ${cx + 5} ${FB - 13}`}
        stroke={skinDk} strokeWidth={1.2} fill="none"
        strokeLinecap="round" strokeOpacity={0.48}
      />

      {/* Subtle visor tint */}
      <Path
        d={`M ${cx - FW + 4} ${FT + 4}
            Q ${cx}           ${FT}     ${cx + FW - 4} ${FT + 4}
            L ${cx + FW - 4}  ${FT + 15}
            Q ${cx}           ${FT + 11} ${cx - FW + 4} ${FT + 15} Z`}
        fill={jerseyC} fillOpacity={0.09}
      />

      {/* ════════════════════════════════════════════════════════════
          FACEMASK  (chrome bars + outer rails + chin cup)
          ════════════════════════════════════════════════════════════ */}

      {/* Left outer rail */}
      <Path
        d={`M ${cx - FW - 1} ${FT + 5}
            Q ${cx - MW - 2}  ${FT + 20} ${cx - MW}  ${CY - 5}`}
        stroke={maskC} strokeWidth={3.0} fill="none" strokeLinecap="round"
      />
      {/* Right outer rail */}
      <Path
        d={`M ${cx + FW + 1} ${FT + 5}
            Q ${cx + MW + 2}  ${FT + 20} ${cx + MW}  ${CY - 5}`}
        stroke={maskC} strokeWidth={3.0} fill="none" strokeLinecap="round"
      />
      {/* Bottom chin arc */}
      <Path
        d={`M ${cx - MW} ${CY - 5} Q ${cx} ${CY + 6} ${cx + MW} ${CY - 5}`}
        stroke={maskC} strokeWidth={3.0} fill="none" strokeLinecap="round"
      />

      {/* Bar 1 — eye-level */}
      <Path
        d={`M ${cx - FW}     ${BAR1} Q ${cx} ${BAR1 - 3} ${cx + FW}     ${BAR1}`}
        stroke={maskC} strokeWidth={2.7} fill="none" strokeLinecap="round"
      />
      {/* Bar 2 — nose level */}
      <Path
        d={`M ${cx - MW + 2} ${BAR2} Q ${cx} ${BAR2 - 2} ${cx + MW - 2} ${BAR2}`}
        stroke={maskC} strokeWidth={2.6} fill="none" strokeLinecap="round"
      />
      {/* Bar 3 — mouth level */}
      <Path
        d={`M ${cx - MW + 2} ${BAR3} Q ${cx} ${BAR3 - 2} ${cx + MW - 2} ${BAR3}`}
        stroke={maskC} strokeWidth={2.3} fill="none" strokeLinecap="round"
      />

      {/* Center vertical double-bars */}
      <Path
        d={`M ${cx - 5} ${BAR1} L ${cx - 5} ${CY - 5}
            M ${cx + 5} ${BAR1} L ${cx + 5} ${CY - 5}`}
        stroke={maskDk} strokeWidth={2.0} strokeLinecap="round"
      />

      {/* Rail connectors to helmet brim */}
      <Path
        d={`M ${cx - FW - 1} ${FT + 5} Q ${cx - FW - 2} ${FT + 1} ${cx - FW + 1} ${FT - 1}`}
        stroke={maskDk} strokeWidth={1.8} fill="none" strokeLinecap="round"
      />
      <Path
        d={`M ${cx + FW + 1} ${FT + 5} Q ${cx + FW + 2} ${FT + 1} ${cx + FW - 1} ${FT - 1}`}
        stroke={maskDk} strokeWidth={1.8} fill="none" strokeLinecap="round"
      />

      {/* ════════════════════════════════════════════════════════════
          CHIN STRAP
          ════════════════════════════════════════════════════════════ */}
      <Path
        d={`M ${cx - MW + 4} ${CY}
            Q ${cx - 18} ${CY + 5} ${cx - 14} ${NT + 6}`}
        stroke={darken(helmetC, -18)} strokeWidth={3.2} fill="none" strokeLinecap="round"
      />
      <Path
        d={`M ${cx + MW - 4} ${CY}
            Q ${cx + 18} ${CY + 5} ${cx + 14} ${NT + 6}`}
        stroke={darken(helmetC, -18)} strokeWidth={3.2} fill="none" strokeLinecap="round"
      />
      {/* Chin cup pad */}
      <Ellipse cx={cx} cy={CY + 3}  rx={13} ry={5.5} fill={darken(helmetC, -30)} />
      <Ellipse cx={cx} cy={CY + 2}  rx={9}  ry={3.5} fill={helmetMd}             />

      {/* ════════════════════════════════════════════════════════════
          HELMET SHINE / HIGHLIGHTS
          ════════════════════════════════════════════════════════════ */}
      {/* Main dome shine */}
      <Ellipse
        cx={cx - 8} cy={HT + 20} rx={14} ry={9}
        fill="#FFFFFF" fillOpacity={0.19}
        transform={`rotate(-22, ${cx - 8}, ${HT + 20})`}
      />
      {/* Secondary glint */}
      <Ellipse
        cx={cx + 11} cy={HT + 12} rx={6} ry={4}
        fill="#FFFFFF" fillOpacity={0.09}
        transform={`rotate(14, ${cx + 11}, ${HT + 12})`}
      />

      {/* ════════════════════════════════════════════════════════════
          SIDE PANEL SHADOW  (logo area depth)
          ════════════════════════════════════════════════════════════ */}
      <Path
        d={`M ${cx - HWE + 20} ${HT + 30}
            Q ${cx - HWE + 14} ${HT + 52} ${cx - FW - 10} ${FT - 3}
            L ${cx - FW - 6}   ${FT - 1}
            Q ${cx - HWE + 18} ${HT + 52} ${cx - HWE + 24} ${HT + 30} Z`}
        fill={helmetMd} fillOpacity={0.38}
      />
    </Svg>
  );
}
