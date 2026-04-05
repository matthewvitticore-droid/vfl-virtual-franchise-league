import React from "react";
import Svg, {
  Defs, LinearGradient, RadialGradient, Stop,
  Path, Rect, Ellipse, Line,
  Text as SvgText, G,
} from "react-native-svg";
import type { NFLPosition, UniformSet, EthnicityCode, FaceVariant } from "@/context/types";

// ─── Body type by position ────────────────────────────────────────────────────

type BodyClass = "skill" | "lb" | "lineman";

function bodyClass(pos: NFLPosition): BodyClass {
  if (["OL", "DE", "DT"].includes(pos)) return "lineman";
  if (pos === "LB") return "lb";
  return "skill";
}

function scaleW(cls: BodyClass): number {
  if (cls === "lineman") return 1.30;
  if (cls === "lb") return 1.15;
  return 1.0;
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

function lighten(h: string, amt: number): string {
  return darken(h, Math.abs(amt));
}

function withAlpha(h: string, a: number): string {
  const [r, g, b] = hexToRgb(h);
  const alpha = Math.round(a * 255).toString(16).padStart(2, "0");
  return `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}${alpha}`;
}

// ─── Main component ───────────────────────────────────────────────────────────

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

// ─── Skin & face data by ethnicity ────────────────────────────────────────────

const SKIN_TONES: Record<EthnicityCode, { skin: string; skinDk: string; eyeColor: string; eyeHighlight: string }> = {
  0: { skin: "#7B4A2D", skinDk: "#5A3320", eyeColor: "#2C1810", eyeHighlight: "#8B5E3C" },  // Black
  1: { skin: "#F0C9A0", skinDk: "#D4A57A", eyeColor: "#4A7DA8", eyeHighlight: "#7AABCE" },  // White
  2: { skin: "#C18A50", skinDk: "#9A6A35", eyeColor: "#3D2014", eyeHighlight: "#7A4F26" },  // Hispanic
  3: { skin: "#8B5E3C", skinDk: "#6A4228", eyeColor: "#1A0E07", eyeHighlight: "#5A3820" },  // Polynesian
  4: { skin: "#B07840", skinDk: "#8A5A28", eyeColor: "#3A2010", eyeHighlight: "#7A5030" },  // Mixed
};

// viewBox: 0 0 120 300
const VB_W = 120;
const VB_H = 300;

export function PlayerFigure({
  uniform,
  position,
  number = "00",
  playerName,
  width = 120,
  height = 280,
  ethnicityCode = 0,
  faceVariant = 0,
}: Props) {
  const cls   = bodyClass(position);
  const sw    = scaleW(cls);
  const cx    = 60;

  // ── Colors from uniform ──────────────────────────────────────────────────
  const helmetC   = uniform.helmetColor        || "#1E3A8A";
  const helmetHi  = lighten(helmetC, 40);
  const helmetDk  = darken(helmetC, -40);
  const jerseyC   = uniform.jerseyColor        || "#1E3A8A";
  const jerseyDk  = darken(jerseyC, -30);
  const jerseyHi  = lighten(jerseyC, 20);
  const accentC   = uniform.jerseyAccentColor  || "#ffffff";
  const numC      = uniform.numberColor        || "#ffffff";
  const numOut    = uniform.numberOutlineColor || "#000000";
  const pantC     = uniform.pantColor          || "#1E3A8A";
  const pantDk    = darken(pantC, -35);
  const pantHi    = lighten(pantC, 15);
  const stripeC   = uniform.pantStripeColor    || "#ffffff";
  const sockC     = uniform.sockColor          || "#ffffff";
  const sockAcc   = uniform.sockAccentColor    || jerseyC;
  const maskC     = "#B0BEC5";
  const maskDk    = "#78909C";
  const faceData  = SKIN_TONES[ethnicityCode];
  const skinC     = faceData.skin;
  const skinDk    = faceData.skinDk;
  const eyeC      = faceData.eyeColor;
  const eyeHi     = faceData.eyeHighlight;
  // Face variant-based offsets (0–3): vary brow thickness, nose width
  const browsThick = 1.8 + (faceVariant % 2) * 0.7;
  const noseW     = 3.5 + (faceVariant % 3) * 0.8;
  const cleatC    = "#1A1A2E";
  const cleatSole = "#2D2D40";
  const gloveC    = darken(jerseyC, -45);

  // ── Geometry ─────────────────────────────────────────────────────────────
  // Key x-coords (all scaled by sw from center)
  const sL   = cx - 44 * sw;  // shoulder tip left (slightly wider)
  const sR   = cx + 44 * sw;  // shoulder tip right (slightly wider)
  const tL   = cx - 24 * sw;  // torso/chest left
  const tR   = cx + 24 * sw;  // torso/chest right
  const wL   = cx - 18 * sw;  // waist left (narrower for V-taper)
  const wR   = cx + 18 * sw;  // waist right (narrower for V-taper)
  const hL   = cx - 26 * sw;  // hip left
  const hR   = cx + 26 * sw;  // hip right

  // Leg columns
  const llL  = cx - 27 * sw;  // left leg outside
  const llR  = cx - 3  * sw;  // left leg inside
  const rlL  = cx + 3  * sw;  // right leg inside
  const rlR  = cx + 27 * sw;  // right leg outside

  // Arm anchor from shoulder
  const armW = 10 * sw;

  // ── Vertical anchors ─────────────────────────────────────────────────────
  const helmetTop   = 6;
  const helmetMid   = 30;
  const helmetBrim  = 52;
  const chinY       = 72;   // chin / bottom of facemask
  const neckT       = 56;
  const neckB       = 69;
  const padTop      = 70;   // shoulder pad top
  const padBot      = 96;   // shoulder pad bottom
  const torsoT      = padBot;
  const torsoB      = 168;
  const beltT       = torsoB;
  const beltB       = 183;
  const thighT      = beltB;
  const legB        = 258;
  const sockT       = legB;
  const sockB       = 273;
  const cleatT      = sockB;
  const cleatB      = 289;

  // ── Arm pose (elbows bent outward, forearms down) ──────────────────────
  // Upper arm: shoulder → elbow
  const lElbowX = sL - 8 * sw;
  const lElbowY = padBot + 44;
  const lHandX  = sL - 2 * sw;
  const lHandY  = padBot + 88;
  const rElbowX = sR + 8 * sw;
  const rElbowY = padBot + 44;
  const rHandX  = sR + 2 * sw;
  const rHandY  = padBot + 88;

  const lastName = playerName ? playerName.split(" ").pop()!.toUpperCase() : "";

  // ── Pant stripes ──────────────────────────────────────────────────────
  function pantStripes(x1: number, x2: number) {
    const midX = (x1 + x2) / 2;
    const style = uniform.pantStripeStyle;
    const yT = thighT + 6;
    const yB = legB - 4;
    if (!style || style === "none") return null;
    if (style === "single")
      return <Line x1={midX} y1={yT} x2={midX} y2={yB} stroke={stripeC} strokeWidth={4} strokeLinecap="round" />;
    if (style === "double")
      return (<G>
        <Line x1={midX-5} y1={yT} x2={midX-5} y2={yB} stroke={stripeC} strokeWidth={2.5} strokeLinecap="round" />
        <Line x1={midX+5} y1={yT} x2={midX+5} y2={yB} stroke={stripeC} strokeWidth={2.5} strokeLinecap="round" />
      </G>);
    if (style === "triple")
      return (<G>
        <Line x1={midX-7} y1={yT} x2={midX-7} y2={yB} stroke={stripeC} strokeWidth={2} strokeLinecap="round" />
        <Line x1={midX}   y1={yT} x2={midX}   y2={yB} stroke={stripeC} strokeWidth={2} strokeLinecap="round" />
        <Line x1={midX+7} y1={yT} x2={midX+7} y2={yB} stroke={stripeC} strokeWidth={2} strokeLinecap="round" />
      </G>);
    if (style === "lightning") {
      const ym = (yT + yB) / 2;
      return (
        <Path
          d={`M${midX+7} ${yT} L${midX-5} ${ym-6} L${midX+3} ${ym} L${midX-7} ${yB}`}
          stroke={stripeC} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round"
        />
      );
    }
    return null;
  }

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`}>
      <Defs>
        {/* Jersey body */}
        <LinearGradient id="jGrad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0"   stopColor={jerseyHi} />
          <Stop offset="0.4" stopColor={jerseyC} />
          <Stop offset="1"   stopColor={jerseyDk} />
        </LinearGradient>
        {/* Shoulder pad */}
        <LinearGradient id="spGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0"   stopColor={lighten(jerseyC, 30)} />
          <Stop offset="0.5" stopColor={jerseyC} />
          <Stop offset="1"   stopColor={jerseyDk} />
        </LinearGradient>
        {/* Helmet dome */}
        <LinearGradient id="hGrad" x1="0.25" y1="0" x2="0.85" y2="1">
          <Stop offset="0"    stopColor={helmetHi} />
          <Stop offset="0.45" stopColor={helmetC} />
          <Stop offset="1"    stopColor={helmetDk} />
        </LinearGradient>
        {/* Pants */}
        <LinearGradient id="pGrad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0"   stopColor={pantHi} />
          <Stop offset="0.5" stopColor={pantC} />
          <Stop offset="1"   stopColor={pantDk} />
        </LinearGradient>
        {/* Arm / sleeve */}
        <LinearGradient id="aGrad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0"   stopColor={lighten(jerseyC, 15)} />
          <Stop offset="1"   stopColor={jerseyDk} />
        </LinearGradient>
        {/* Ground shadow */}
        <RadialGradient id="gShadow" cx="50%" cy="50%" r="50%">
          <Stop offset="0"   stopColor="#000000" stopOpacity="0.50" />
          <Stop offset="1"   stopColor="#000000" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* ── GROUND SHADOW ──────────────────────────────────────── */}
      <Ellipse cx={cx} cy={cleatB + 2} rx={38 * sw} ry={5} fill="url(#gShadow)" />

      {/* ══════════════ LEFT ARM ═══════════════════════════════ */}
      {/* Upper arm */}
      <Path
        d={`M ${tL} ${padBot-2}
            Q ${sL+2} ${padBot+4} ${lElbowX+4} ${lElbowY}
            Q ${lElbowX-2} ${lElbowY+4} ${lElbowX-armW+2} ${lElbowY}
            Q ${sL-8} ${padBot+4} ${tL-8} ${padBot+8} Z`}
        fill="url(#aGrad)"
      />
      {/* Sleeve accent stripe */}
      <Path
        d={`M ${tL-2} ${padBot+16}
            Q ${sL} ${padBot+22} ${lElbowX+2} ${lElbowY-8}
            L ${lElbowX-1} ${lElbowY-5}
            Q ${sL-4} ${padBot+24} ${tL-5} ${padBot+20} Z`}
        fill={accentC} fillOpacity={0.65}
      />
      {/* Forearm */}
      <Path
        d={`M ${lElbowX+4} ${lElbowY}
            Q ${lElbowX+6} ${lElbowY+28} ${lHandX+6} ${lHandY-2}
            L ${lHandX-4} ${lHandY}
            Q ${lElbowX-6} ${lElbowY+26} ${lElbowX-armW+2} ${lElbowY} Z`}
        fill={skinC}
      />
      {/* Forearm tape / arm sleeve */}
      <Path
        d={`M ${lElbowX+4} ${lElbowY+2}
            L ${lElbowX+3} ${lElbowY+9}
            L ${lElbowX-armW+3} ${lElbowY+7}
            L ${lElbowX-armW+2} ${lElbowY} Z`}
        fill={accentC} fillOpacity={0.5}
      />
      {/* Glove */}
      <Ellipse cx={lHandX+1} cy={lHandY+4} rx={8*sw} ry={7} fill={gloveC} />
      <Line x1={lHandX-4} y1={lHandY+2} x2={lHandX+6} y2={lHandY+2} stroke={darken(gloveC,15)} strokeWidth={1} />

      {/* ══════════════ RIGHT ARM ══════════════════════════════ */}
      <Path
        d={`M ${tR} ${padBot-2}
            Q ${sR-2} ${padBot+4} ${rElbowX-4} ${rElbowY}
            Q ${rElbowX+2} ${rElbowY+4} ${rElbowX+armW-2} ${rElbowY}
            Q ${sR+8} ${padBot+4} ${tR+8} ${padBot+8} Z`}
        fill="url(#aGrad)"
      />
      <Path
        d={`M ${tR+2} ${padBot+16}
            Q ${sR} ${padBot+22} ${rElbowX-2} ${rElbowY-8}
            L ${rElbowX+1} ${rElbowY-5}
            Q ${sR+4} ${padBot+24} ${tR+5} ${padBot+20} Z`}
        fill={accentC} fillOpacity={0.65}
      />
      <Path
        d={`M ${rElbowX-4} ${rElbowY}
            Q ${rElbowX-6} ${rElbowY+28} ${rHandX-6} ${rHandY-2}
            L ${rHandX+4} ${rHandY}
            Q ${rElbowX+6} ${rElbowY+26} ${rElbowX+armW-2} ${rElbowY} Z`}
        fill={skinC}
      />
      <Path
        d={`M ${rElbowX-4} ${rElbowY+2}
            L ${rElbowX-3} ${rElbowY+9}
            L ${rElbowX+armW-3} ${rElbowY+7}
            L ${rElbowX+armW-2} ${rElbowY} Z`}
        fill={accentC} fillOpacity={0.5}
      />
      <Ellipse cx={rHandX-1} cy={rHandY+4} rx={8*sw} ry={7} fill={gloveC} />
      <Line x1={rHandX+4} y1={rHandY+2} x2={rHandX-6} y2={rHandY+2} stroke={darken(gloveC,15)} strokeWidth={1} />

      {/* ══════════════ SHOULDER PADS ═══════════════════════════ */}
      {/* Drop shadow */}
      <Path
        d={`M ${sL+4} ${padTop+8} Q ${cx} ${padTop-3} ${sR-4} ${padTop+8} L ${tR+4} ${padBot+4} L ${tL-4} ${padBot+4} Z`}
        fill={darken(jerseyC, -50)} fillOpacity={0.45}
      />
      {/* Main pad — arched top for realistic shoulder pad shape */}
      <Path
        d={`M ${sL} ${padTop+7} Q ${cx} ${padTop-12} ${sR} ${padTop+7} L ${tR+2} ${padBot} L ${tL-2} ${padBot} Z`}
        fill="url(#spGrad)"
      />
      {/* Shoulder cap epaulettes — left */}
      <Path
        d={`M ${sL} ${padTop+7} Q ${sL-4} ${padTop+16} ${sL+2} ${padTop+24}
            L ${tL+2} ${padBot} L ${tL-6} ${padBot}
            Q ${sL-10} ${padTop+20} ${sL-6} ${padTop+8} Z`}
        fill={lighten(jerseyC, 12)} fillOpacity={0.85}
      />
      {/* Shoulder cap epaulettes — right */}
      <Path
        d={`M ${sR} ${padTop+7} Q ${sR+4} ${padTop+16} ${sR-2} ${padTop+24}
            L ${tR-2} ${padBot} L ${tR+6} ${padBot}
            Q ${sR+10} ${padTop+20} ${sR+6} ${padTop+8} Z`}
        fill={lighten(jerseyC, 12)} fillOpacity={0.85}
      />
      {/* Shoulder pad collar ridge lines */}
      <Path
        d={`M ${sL+8} ${padTop+5} L ${tL+5} ${padBot}
            L ${tL+11} ${padBot} L ${sL+16} ${padTop+7} Z`}
        fill={darken(jerseyC, -45)}
      />
      <Path
        d={`M ${sR-8} ${padTop+5} L ${tR-5} ${padBot}
            L ${tR-11} ${padBot} L ${sR-16} ${padTop+7} Z`}
        fill={darken(jerseyC, -45)}
      />
      {/* Accent color shoulder stripes */}
      <Path
        d={`M ${sL+16} ${padTop+5} L ${sL+26} ${padTop+7} L ${tL+13} ${padBot} L ${tL+5} ${padBot} Z`}
        fill={accentC} fillOpacity={0.6}
      />
      <Path
        d={`M ${sR-16} ${padTop+5} L ${sR-26} ${padTop+7} L ${tR-13} ${padBot} L ${tR-5} ${padBot} Z`}
        fill={accentC} fillOpacity={0.6}
      />
      {/* Arch highlight (sheen at top) */}
      <Path
        d={`M ${cx-28*sw} ${padTop+4} Q ${cx} ${padTop-8} ${cx+28*sw} ${padTop+4}
            Q ${cx} ${padTop-2} ${cx-28*sw} ${padTop+4} Z`}
        fill="#ffffff" fillOpacity={0.18}
      />
      {/* Pad bolts */}
      <Ellipse cx={cx - 20*sw} cy={padTop + 10} rx={3} ry={2.5} fill={lighten(jerseyC,40)} fillOpacity={0.8} />
      <Ellipse cx={cx + 20*sw} cy={padTop + 10} rx={3} ry={2.5} fill={lighten(jerseyC,40)} fillOpacity={0.8} />

      {/* ══════════════ JERSEY BODY ═════════════════════════════ */}
      <Path
        d={`M ${tL-2} ${torsoT} L ${tR+2} ${torsoT}
            L ${wR+2} ${torsoB} L ${wL-2} ${torsoB} Z`}
        fill="url(#jGrad)"
      />
      {/* Side panels */}
      <Path
        d={`M ${tL-2} ${torsoT} L ${tL+6} ${torsoT}
            L ${wL+4} ${torsoB} L ${wL-2} ${torsoB} Z`}
        fill={accentC} fillOpacity={0.35}
      />
      <Path
        d={`M ${tR+2} ${torsoT} L ${tR-6} ${torsoT}
            L ${wR-4} ${torsoB} L ${wR+2} ${torsoB} Z`}
        fill={accentC} fillOpacity={0.35}
      />
      {/* Jersey front seam */}
      <Line x1={cx} y1={torsoT+4} x2={cx} y2={torsoB-6} stroke={darken(jerseyC,-35)} strokeWidth={0.75} />

      {/* ── JERSEY NUMBER ──────────────────────────────────────── */}
      <SvgText
        x={cx}
        y={torsoB - 50}
        fontSize={cls === "lineman" ? 34 : 38}
        fontWeight="900"
        fill={numC}
        stroke={numOut}
        strokeWidth={cls === "lineman" ? 2 : 2.5}
        textAnchor="middle"
        fontFamily="System"
        letterSpacing={-1}
      >
        {number}
      </SvgText>

      {/* ── NAME PLATE ─────────────────────────────────────────── */}
      {lastName.length > 0 && (
        <>
          <Rect
            x={wL - 2} y={torsoB - 16}
            width={(wR - wL) + 4} height={13}
            fill={darken(jerseyC, -45)} rx={2}
          />
          <SvgText
            x={cx} y={torsoB - 7}
            fontSize={6.5} fontWeight="bold"
            fill={numC} textAnchor="middle" fontFamily="System"
            letterSpacing={0.5}
          >
            {lastName.length > 9 ? lastName.slice(0, 9) : lastName}
          </SvgText>
        </>
      )}

      {/* ── JERSEY COLLAR ──────────────────────────────────────── */}
      <Path
        d={`M ${cx-10} ${neckB} Q ${cx} ${torsoT+6} ${cx+10} ${neckB} L ${cx+7} ${torsoT+2} Q ${cx} ${neckB-4} ${cx-7} ${torsoT+2} Z`}
        fill={darken(jerseyC,-30)}
      />
      <Path
        d={`M ${cx-8} ${neckB-1} Q ${cx} ${torsoT+7} ${cx+8} ${neckB-1}`}
        stroke={accentC} strokeWidth={1.5} fill="none" strokeLinecap="round"
      />

      {/* ══════════════ BELT ═════════════════════════════════════ */}
      <Path
        d={`M ${hL} ${beltT} L ${hR} ${beltT} L ${hR+2} ${beltB} L ${hL-2} ${beltB} Z`}
        fill={darken(pantC, -20)}
      />
      {/* Belt buckle */}
      <Rect x={cx-8} y={beltT+3} width={16} height={9} fill={darken(pantC,-55)} rx={2} />
      <Rect x={cx-5} y={beltT+5} width={10} height={5} fill={darken(pantC,-35)} rx={1} />

      {/* ══════════════ PANTS / THIGHS ═══════════════════════════ */}
      {/* Left leg */}
      <Path
        d={`M ${llL-1} ${thighT} L ${llR+1} ${thighT}
            L ${llR} ${legB} L ${llL-2} ${legB} Z`}
        fill="url(#pGrad)"
      />
      {/* Right leg */}
      <Path
        d={`M ${rlL-1} ${thighT} L ${rlR+1} ${thighT}
            L ${rlR+2} ${legB} L ${rlL} ${legB} Z`}
        fill="url(#pGrad)"
      />
      {/* Inner seam shadow */}
      <Line x1={cx} y1={thighT} x2={cx} y2={legB} stroke={darken(pantC,-45)} strokeWidth={2} />

      {/* Thigh pads (bumps on front of each thigh) */}
      <Ellipse cx={(llL+llR)/2} cy={thighT+18} rx={(llR-llL)/2 - 3} ry={8} fill={lighten(pantC,10)} />
      <Ellipse cx={(rlL+rlR)/2} cy={thighT+18} rx={(rlR-rlL)/2 - 3} ry={8} fill={lighten(pantC,10)} />
      {/* Knee pads */}
      <Ellipse cx={(llL+llR)/2} cy={thighT+60} rx={(llR-llL)/2 - 6} ry={7} fill={lighten(pantC,8)} />
      <Ellipse cx={(rlL+rlR)/2} cy={thighT+60} rx={(rlR-rlL)/2 - 6} ry={7} fill={lighten(pantC,8)} />

      {/* Pant stripes */}
      {pantStripes(llL, llR)}
      {pantStripes(rlL, rlR)}

      {/* ══════════════ SOCKS ════════════════════════════════════ */}
      {/* Left */}
      <Rect x={llL-2} y={sockT} width={llR-llL+4} height={sockB-sockT} fill={sockC} />
      <Rect x={llL-2} y={sockT+4} width={llR-llL+4} height={3} fill={sockAcc} />
      <Rect x={llL-2} y={sockT+9} width={llR-llL+4} height={2} fill={sockAcc} fillOpacity={0.6} />
      {/* Right */}
      <Rect x={rlL-2} y={sockT} width={rlR-rlL+4} height={sockB-sockT} fill={sockC} />
      <Rect x={rlL-2} y={sockT+4} width={rlR-rlL+4} height={3} fill={sockAcc} />
      <Rect x={rlL-2} y={sockT+9} width={rlR-rlL+4} height={2} fill={sockAcc} fillOpacity={0.6} />

      {/* ══════════════ CLEATS ═══════════════════════════════════ */}
      {/* Left cleat: upper */}
      <Path
        d={`M ${llL-5} ${cleatT+1}
            L ${llR+4} ${cleatT}
            Q ${llR+8} ${cleatT+4} ${llR+6} ${cleatB-6}
            Q ${llL-4} ${cleatB-4} ${llL-8} ${cleatB-8} Z`}
        fill={cleatC}
      />
      {/* Left sole */}
      <Path
        d={`M ${llL-8} ${cleatB-8}
            Q ${llR+6} ${cleatB-4} ${llR+6} ${cleatB-4}
            L ${llR+4} ${cleatB}
            L ${llL-10} ${cleatB} Z`}
        fill={cleatSole}
      />
      {/* Right cleat */}
      <Path
        d={`M ${rlL-4} ${cleatT}
            L ${rlR+5} ${cleatT+1}
            Q ${rlR+8} ${cleatT+4} ${rlR+8} ${cleatB-8}
            Q ${rlL+4} ${cleatB-4} ${rlL-6} ${cleatB-6} Z`}
        fill={cleatC}
      />
      <Path
        d={`M ${rlL-6} ${cleatB-4}
            Q ${rlR+8} ${cleatB-4} ${rlR+8} ${cleatB-8}
            L ${rlR+10} ${cleatB}
            L ${rlL-6} ${cleatB} Z`}
        fill={cleatSole}
      />
      {/* Cleat team color accent on sole */}
      <Line x1={llL-9} y1={cleatB-2} x2={llR+5} y2={cleatB-2} stroke={jerseyC} strokeWidth={2} strokeLinecap="round" />
      <Line x1={rlL-6} y1={cleatB-2} x2={rlR+9} y2={cleatB-2} stroke={jerseyC} strokeWidth={2} strokeLinecap="round" />

      {/* ══════════════ NECK ═════════════════════════════════════ */}
      <Rect x={cx-7} y={neckT} width={14} height={neckB-neckT} fill={skinC} rx={3} />
      {/* Neck shadow */}
      <Rect x={cx-7} y={neckT} width={3} height={neckB-neckT} fill={skinDk} rx={2} />

      {/* ══════════════ HELMET ═══════════════════════════════════ */}
      {/* Helmet back shadow */}
      <Path
        d={`M ${cx-36} ${helmetBrim}
            A 36 ${helmetBrim - helmetTop} 0 1 1 ${cx+40} ${helmetBrim}
            L ${cx+38} ${helmetBrim+5} A 38 ${helmetBrim-helmetTop+6} 0 1 0 ${cx-38} ${helmetBrim+5} Z`}
        fill={helmetDk}
      />
      {/* Main dome */}
      <Path
        d={`M ${cx-36} ${helmetBrim}
            A 36 ${helmetBrim - helmetTop} 0 1 1 ${cx+36} ${helmetBrim} Z`}
        fill="url(#hGrad)"
      />
      {/* Helmet back extension (back of helmet) */}
      <Path
        d={`M ${cx+20} ${helmetTop+4}
            Q ${cx+44} ${helmetTop+8} ${cx+40} ${helmetBrim-4}
            L ${cx+36} ${helmetBrim} A 36 ${helmetBrim-helmetTop} 0 0 0 ${cx+20} ${helmetTop+4} Z`}
        fill={helmetDk} fillOpacity={0.5}
      />
      {/* Helmet ear flap (left) */}
      <Path
        d={`M ${cx-34} ${helmetBrim-8}
            Q ${cx-40} ${helmetBrim+2} ${cx-36} ${helmetBrim+16}
            Q ${cx-30} ${helmetBrim+20} ${cx-26} ${helmetBrim+10}
            Q ${cx-28} ${helmetBrim+2} ${cx-30} ${helmetBrim-2} Z`}
        fill={helmetDk}
      />
      {/* Ear hole */}
      <Ellipse cx={cx-31} cy={helmetBrim+2} rx={5} ry={6} fill={darken(helmetC,-55)} />
      {/* Helmet brim / visor rim */}
      <Path
        d={`M ${cx-36} ${helmetBrim-2}
            L ${cx+36} ${helmetBrim-2}
            L ${cx+34} ${helmetBrim+5}
            L ${cx-34} ${helmetBrim+5} Z`}
        fill={helmetDk}
      />
      {/* Center ridge / mohawk */}
      <Path
        d={`M ${cx-3} ${helmetTop+2}
            A 3 3 0 0 1 ${cx+3} ${helmetTop+2}
            L ${cx+2.5} ${helmetBrim-3}
            L ${cx-2.5} ${helmetBrim-3} Z`}
        fill={lighten(helmetC, 25)}
      />
      {/* Team accent stripe on center ridge */}
      <Path
        d={`M ${cx-1.5} ${helmetTop+5}
            A 1.5 1.5 0 0 1 ${cx+1.5} ${helmetTop+5}
            L ${cx+1} ${helmetBrim-4}
            L ${cx-1} ${helmetBrim-4} Z`}
        fill={accentC === "#ffffff" ? numC : accentC}
        fillOpacity={0.85}
      />
      {/* Helmet team stripe (side - left of center) */}
      <Path
        d={`M ${cx-12} ${helmetTop+3}
            Q ${cx-18} ${helmetTop+18} ${cx-20} ${helmetBrim-4}
            L ${cx-15} ${helmetBrim-4}
            Q ${cx-12} ${helmetTop+18} ${cx-6} ${helmetTop+4} Z`}
        fill={accentC} fillOpacity={0.5}
      />
      {/* Helmet highlight shine */}
      <Ellipse
        cx={cx-10} cy={helmetTop+13}
        rx={10} ry={7}
        fill="#ffffff" fillOpacity={0.20}
        transform={`rotate(-20, ${cx-10}, ${helmetTop+13})`}
      />
      {/* Face opening (dark recessed area) */}
      <Path
        d={`M ${cx-24} ${helmetBrim-18}
            A 14 20 0 0 1 ${cx+24} ${helmetBrim-18}
            L ${cx+22} ${helmetBrim+3}
            L ${cx-22} ${helmetBrim+3} Z`}
        fill={darken(skinDk, -25)}
        fillOpacity={0.92}
      />
      {/* ── FACE (visible under facemask) ───────────────────── */}
      {/* Skin fill — lower face visible */}
      <Path
        d={`M ${cx-18} ${helmetBrim-12}
            Q ${cx} ${helmetBrim-16} ${cx+18} ${helmetBrim-12}
            L ${cx+16} ${helmetBrim+2}
            Q ${cx} ${helmetBrim+5} ${cx-16} ${helmetBrim+2} Z`}
        fill={skinC}
      />
      {/* Cheek shading */}
      <Ellipse cx={cx-10} cy={helmetBrim-5} rx={6} ry={5} fill={skinDk} fillOpacity={0.35} />
      <Ellipse cx={cx+10} cy={helmetBrim-5} rx={6} ry={5} fill={skinDk} fillOpacity={0.35} />
      {/* Eyebrows */}
      <Path
        d={`M ${cx-15} ${helmetBrim-11} Q ${cx-10} ${helmetBrim-13} ${cx-4} ${helmetBrim-11}`}
        stroke={darken(skinDk, -15)} strokeWidth={browsThick} fill="none" strokeLinecap="round"
      />
      <Path
        d={`M ${cx+4} ${helmetBrim-11} Q ${cx+10} ${helmetBrim-13} ${cx+15} ${helmetBrim-11}`}
        stroke={darken(skinDk, -15)} strokeWidth={browsThick} fill="none" strokeLinecap="round"
      />
      {/* Eyes — left */}
      <Ellipse cx={cx-9} cy={helmetBrim-8} rx={5} ry={3.5} fill="#111" />
      <Ellipse cx={cx-9} cy={helmetBrim-8} rx={3.5} ry={2.5} fill={eyeC} />
      <Ellipse cx={cx-7} cy={helmetBrim-9} rx={1.5} ry={1.5} fill="#fff" fillOpacity={0.7} />
      <Ellipse cx={cx-9} cy={helmetBrim-8} rx={1.2} ry={1.2} fill="#000" />
      {/* Eyes — right */}
      <Ellipse cx={cx+9} cy={helmetBrim-8} rx={5} ry={3.5} fill="#111" />
      <Ellipse cx={cx+9} cy={helmetBrim-8} rx={3.5} ry={2.5} fill={eyeC} />
      <Ellipse cx={cx+11} cy={helmetBrim-9} rx={1.5} ry={1.5} fill="#fff" fillOpacity={0.7} />
      <Ellipse cx={cx+9} cy={helmetBrim-8} rx={1.2} ry={1.2} fill="#000" />
      {/* Nose */}
      <Path
        d={`M ${cx} ${helmetBrim-7} Q ${cx-noseW} ${helmetBrim-2} ${cx-noseW+1} ${helmetBrim-1}
            Q ${cx} ${helmetBrim} ${cx+noseW-1} ${helmetBrim-1}
            Q ${cx+noseW} ${helmetBrim-2} ${cx} ${helmetBrim-7}`}
        stroke={skinDk} strokeWidth={1.2} fill="none" strokeLinecap="round"
      />
      {/* Mouth line — subtle */}
      <Path
        d={`M ${cx-5} ${helmetBrim+1} Q ${cx} ${helmetBrim+3} ${cx+5} ${helmetBrim+1}`}
        stroke={skinDk} strokeWidth={1.5} fill="none" strokeLinecap="round" strokeOpacity={0.6}
      />

      {/* Visor tint */}
      <Path
        d={`M ${cx-21} ${helmetBrim-16}
            A 12 16 0 0 1 ${cx+21} ${helmetBrim-16}
            L ${cx+19} ${helmetBrim+1}
            L ${cx-19} ${helmetBrim+1} Z`}
        fill={jerseyC}
        fillOpacity={0.15}
      />

      {/* ══════════════ FACEMASK (cage) ══════════════════════════ */}
      {/* Outer rails */}
      <Path
        d={`M ${cx-25} ${helmetBrim+1} Q ${cx-29} ${helmetBrim+12} ${cx-28} ${chinY}`}
        stroke={maskC} strokeWidth={2.8} fill="none" strokeLinecap="round"
      />
      <Path
        d={`M ${cx+25} ${helmetBrim+1} Q ${cx+29} ${helmetBrim+12} ${cx+28} ${chinY}`}
        stroke={maskC} strokeWidth={2.8} fill="none" strokeLinecap="round"
      />
      {/* Bottom rail */}
      <Path
        d={`M ${cx-28} ${chinY} Q ${cx} ${chinY+5} ${cx+28} ${chinY}`}
        stroke={maskC} strokeWidth={2.8} fill="none" strokeLinecap="round"
      />
      {/* Horizontal bars */}
      <Path
        d={`M ${cx-26} ${helmetBrim+7} Q ${cx} ${helmetBrim+11} ${cx+26} ${helmetBrim+7}`}
        stroke={maskC} strokeWidth={2.5} fill="none" strokeLinecap="round"
      />
      <Path
        d={`M ${cx-27} ${helmetBrim+16} Q ${cx} ${helmetBrim+20} ${cx+27} ${helmetBrim+16}`}
        stroke={maskC} strokeWidth={2.5} fill="none" strokeLinecap="round"
      />
      <Path
        d={`M ${cx-27} ${helmetBrim+25} Q ${cx} ${helmetBrim+29} ${cx+27} ${helmetBrim+25}`}
        stroke={maskC} strokeWidth={2} fill="none" strokeLinecap="round"
      />
      {/* Center vertical bars */}
      <Path
        d={`M ${cx-5} ${helmetBrim+6} L ${cx-5} ${chinY}
            M ${cx+5} ${helmetBrim+6} L ${cx+5} ${chinY}`}
        stroke={maskDk} strokeWidth={2} strokeLinecap="round"
      />
      {/* Chin cup */}
      <Path
        d={`M ${cx-12} ${chinY-2} Q ${cx} ${chinY+8} ${cx+12} ${chinY-2}`}
        stroke={darken(helmetC,-20)} strokeWidth={3} fill="none" strokeLinecap="round"
      />
    </Svg>
  );
}
