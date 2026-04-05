import React from "react";
import Svg, {
  Defs, LinearGradient, Stop,
  Path, Rect, Ellipse, Line, Text as SvgText, G,
} from "react-native-svg";
import type { NFLPosition, UniformSet } from "@/context/types";

// ─── Body type by position ────────────────────────────────────────────────────

type BodyClass = "skill" | "lb" | "lineman";

function bodyClass(pos: NFLPosition): BodyClass {
  if (["OL", "DE", "DT"].includes(pos)) return "lineman";
  if (pos === "LB") return "lb";
  return "skill";
}

// Width scale: linemen are 35% wider, LBs 18% wider
function scaleW(cls: BodyClass): number {
  if (cls === "lineman") return 1.35;
  if (cls === "lb") return 1.18;
  return 1.0;
}

// ─── Color helpers ────────────────────────────────────────────────────────────

function hex(h: string): [number, number, number] {
  const n = parseInt(h.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function darken(h: string, amt: number): string {
  const [r, g, b] = hex(h);
  const c = (v: number) => Math.max(0, Math.min(255, v + amt)).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

// ─── Position-specific label ──────────────────────────────────────────────────

const POS_LABEL: Record<NFLPosition, string> = {
  QB: "THP", RB: "BTK", WR: "CTH", TE: "CTH",
  OL: "RBK", DE: "FSN", DT: "BTK", LB: "TAK",
  CB: "MAN", S: "ZON", K: "KPW", P: "KPW",
};

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  uniform: UniformSet;
  position: NFLPosition;
  number?: string;
  playerName?: string;
  width?: number;
  height?: number;
}

export function PlayerFigure({
  uniform,
  position,
  number = "00",
  playerName,
  width = 120,
  height = 280,
}: Props) {
  const cls = bodyClass(position);
  const sw = scaleW(cls);
  const cx = 60;

  // Pull colors from the uniform set
  const helmetColor   = uniform.helmetColor   || "#1E3A8A";
  const helmetDark    = darken(helmetColor, -30);
  const jerseyColor   = uniform.jerseyColor   || "#1E3A8A";
  const jerseyDark    = darken(jerseyColor, -25);
  const jerseyAccent  = uniform.jerseyAccentColor || "#ffffff";
  const numberColor   = uniform.numberColor   || "#ffffff";
  const numberOutline = uniform.numberOutlineColor || "#000000";
  const pantColor     = uniform.pantColor     || "#1E3A8A";
  const pantDark      = darken(pantColor, -30);
  const stripeColor   = uniform.pantStripeColor   || "#ffffff";
  const sockColor     = uniform.sockColor     || "#ffffff";
  const sockAccent    = uniform.sockAccentColor   || jerseyColor;
  const facemaskColor = "#8A9BB0";
  const skinColor     = "#C09070";
  const cleatColor    = "#1A1A2E";

  // Body geometry (all relative to cx=60, viewBox 0 0 120 280)
  const sL  = cx - 44 * sw;   // shoulder outer left
  const sR  = cx + 44 * sw;   // shoulder outer right
  const tL  = cx - 26 * sw;   // torso left
  const tR  = cx + 26 * sw;   // torso right
  const hL  = cx - 30 * sw;   // hip left
  const hR  = cx + 30 * sw;   // hip right
  const lLL = cx - 30 * sw;   // left leg left edge
  const lLR = cx - 4  * sw;   // left leg right edge (inner)
  const rLL = cx + 4  * sw;   // right leg left edge (inner)
  const rLR = cx + 30 * sw;   // right leg right edge

  // Vertical anchor points
  const helmetTop    = 8;
  const helmetBrim   = 55;
  const neckTop      = 60;
  const neckBot      = 73;
  const shoulderTop  = 75;
  const shoulderBot  = 98;
  const torsoBot     = 170;
  const beltBot      = 188;
  const legBot       = 262;
  const sockBot      = 276;
  const cleatBot     = 288;

  // Last name for name plate
  const lastName = playerName ? playerName.split(" ").pop()!.toUpperCase() : "";

  // Stripe rendering for pants
  function pantStripes(legX1: number, legX2: number) {
    const legCx = (legX1 + legX2) / 2;
    const style = uniform.pantStripeStyle;
    if (style === "none") return null;
    const yTop = shoulderBot + (beltBot - shoulderBot);
    const yBot = legBot;
    if (style === "single") {
      return <Line x1={legCx} y1={yTop} x2={legCx} y2={yBot} stroke={stripeColor} strokeWidth={3.5} />;
    }
    if (style === "double") {
      return (<>
        <Line x1={legCx - 4} y1={yTop} x2={legCx - 4} y2={yBot} stroke={stripeColor} strokeWidth={2.5} />
        <Line x1={legCx + 4} y1={yTop} x2={legCx + 4} y2={yBot} stroke={stripeColor} strokeWidth={2.5} />
      </>);
    }
    if (style === "triple") {
      return (<>
        <Line x1={legCx - 7} y1={yTop} x2={legCx - 7} y2={yBot} stroke={stripeColor} strokeWidth={2} />
        <Line x1={legCx}     y1={yTop} x2={legCx}     y2={yBot} stroke={stripeColor} strokeWidth={2} />
        <Line x1={legCx + 7} y1={yTop} x2={legCx + 7} y2={yBot} stroke={stripeColor} strokeWidth={2} />
      </>);
    }
    if (style === "lightning") {
      const mid = (yTop + yBot) / 2;
      return (
        <Path
          d={`M ${legCx + 6} ${yTop} L ${legCx - 6} ${mid} L ${legCx + 2} ${mid} L ${legCx - 6} ${yBot}`}
          stroke={stripeColor} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round"
        />
      );
    }
    return null;
  }

  const vb = `0 0 120 ${cleatBot + 4}`;

  return (
    <Svg width={width} height={height} viewBox={vb}>
      <Defs>
        {/* Jersey gradient for depth */}
        <LinearGradient id="jerseyGrad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={darken(jerseyColor, 10)} stopOpacity="1" />
          <Stop offset="0.5" stopColor={jerseyColor} stopOpacity="1" />
          <Stop offset="1" stopColor={darken(jerseyColor, -20)} stopOpacity="1" />
        </LinearGradient>
        {/* Helmet gradient for 3D look */}
        <LinearGradient id="helmetGrad" x1="0.2" y1="0" x2="0.8" y2="1">
          <Stop offset="0" stopColor={darken(helmetColor, 25)} stopOpacity="1" />
          <Stop offset="0.55" stopColor={helmetColor} stopOpacity="1" />
          <Stop offset="1" stopColor={helmetDark} stopOpacity="1" />
        </LinearGradient>
        {/* Pant gradient */}
        <LinearGradient id="pantGrad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={darken(pantColor, 8)} stopOpacity="1" />
          <Stop offset="1" stopColor={pantDark} stopOpacity="1" />
        </LinearGradient>
      </Defs>

      {/* ── LEFT ARM (drawn behind torso) ──────────────────────── */}
      {/* Upper arm */}
      <Path
        d={`M ${sL + 6} ${shoulderTop + 4} Q ${sL - 14} ${shoulderBot + 16} ${sL - 8} ${shoulderBot + 30} Q ${sL + 2} ${shoulderBot + 34} ${sL + 12} ${shoulderBot + 24} Q ${sL + 4} ${shoulderBot + 8} ${tL - 2} ${shoulderBot - 4} Z`}
        fill="url(#jerseyGrad)"
      />
      {/* Forearm */}
      <Path
        d={`M ${sL - 8} ${shoulderBot + 30} Q ${sL - 18} ${shoulderBot + 48} ${sL - 10} ${shoulderBot + 62} Q ${sL + 2} ${shoulderBot + 66} ${sL + 10} ${shoulderBot + 54} Q ${sL + 2} ${shoulderBot + 38} ${sL + 12} ${shoulderBot + 24} Z`}
        fill={jerseyAccent === "#ffffff" ? darken(jerseyColor, -10) : jerseyAccent}
      />
      {/* Glove / hand */}
      <Ellipse
        cx={sL - 5}
        cy={shoulderBot + 67}
        rx={8}
        ry={6}
        fill={cls === "lineman" ? "#222" : darken(jerseyColor, -40)}
      />

      {/* ── RIGHT ARM (drawn behind torso) ─────────────────────── */}
      <Path
        d={`M ${sR - 6} ${shoulderTop + 4} Q ${sR + 14} ${shoulderBot + 16} ${sR + 8} ${shoulderBot + 30} Q ${sR - 2} ${shoulderBot + 34} ${sR - 12} ${shoulderBot + 24} Q ${sR - 4} ${shoulderBot + 8} ${tR + 2} ${shoulderBot - 4} Z`}
        fill="url(#jerseyGrad)"
      />
      <Path
        d={`M ${sR + 8} ${shoulderBot + 30} Q ${sR + 18} ${shoulderBot + 48} ${sR + 10} ${shoulderBot + 62} Q ${sR - 2} ${shoulderBot + 66} ${sR - 10} ${shoulderBot + 54} Q ${sR - 2} ${shoulderBot + 38} ${sR - 12} ${shoulderBot + 24} Z`}
        fill={jerseyAccent === "#ffffff" ? darken(jerseyColor, -10) : jerseyAccent}
      />
      <Ellipse
        cx={sR + 5}
        cy={shoulderBot + 67}
        rx={8}
        ry={6}
        fill={cls === "lineman" ? "#222" : darken(jerseyColor, -40)}
      />

      {/* ── SHOULDER PADS ─────────────────────────────────────────── */}
      {/* Left cap shadow */}
      <Path
        d={`M ${sL} ${shoulderTop + 2} L ${tL - 2} ${shoulderTop + 2} L ${tL} ${shoulderBot} L ${sL} ${shoulderBot - 10} Z`}
        fill={darken(jerseyColor, -35)}
      />
      {/* Right cap shadow */}
      <Path
        d={`M ${sR} ${shoulderTop + 2} L ${tR + 2} ${shoulderTop + 2} L ${tR} ${shoulderBot} L ${sR} ${shoulderBot - 10} Z`}
        fill={darken(jerseyColor, -35)}
      />
      {/* Main pad (trapezoid) */}
      <Path
        d={`M ${sL} ${shoulderTop} L ${sR} ${shoulderTop} L ${tR} ${shoulderBot} L ${tL} ${shoulderBot} Z`}
        fill="url(#jerseyGrad)"
      />
      {/* Shoulder pad seam line */}
      <Line x1={sL + 4} y1={shoulderTop} x2={tL + 2} y2={shoulderBot} stroke={darken(jerseyColor, -40)} strokeWidth={1} />
      <Line x1={sR - 4} y1={shoulderTop} x2={tR - 2} y2={shoulderBot} stroke={darken(jerseyColor, -40)} strokeWidth={1} />
      {/* Shoulder accent stripe (team color) */}
      {jerseyAccent !== "#ffffff" && (
        <>
          <Path
            d={`M ${sL + 8} ${shoulderTop} L ${sL + 16} ${shoulderTop} L ${tL + 6} ${shoulderBot} L ${tL - 2} ${shoulderBot} Z`}
            fill={jerseyAccent}
            fillOpacity={0.6}
          />
          <Path
            d={`M ${sR - 8} ${shoulderTop} L ${sR - 16} ${shoulderTop} L ${tR - 6} ${shoulderBot} L ${tR + 2} ${shoulderBot} Z`}
            fill={jerseyAccent}
            fillOpacity={0.6}
          />
        </>
      )}

      {/* ── TORSO / JERSEY BODY ───────────────────────────────────── */}
      <Path
        d={`M ${tL} ${shoulderBot} L ${tR} ${shoulderBot} L ${tR - 4} ${torsoBot} L ${tL + 4} ${torsoBot} Z`}
        fill="url(#jerseyGrad)"
      />
      {/* Jersey side accent panels */}
      {jerseyAccent !== "#ffffff" && (
        <>
          <Path
            d={`M ${tL} ${shoulderBot} L ${tL + 8} ${shoulderBot} L ${tL + 6} ${torsoBot} L ${tL + 4} ${torsoBot} Z`}
            fill={jerseyAccent} fillOpacity={0.5}
          />
          <Path
            d={`M ${tR} ${shoulderBot} L ${tR - 8} ${shoulderBot} L ${tR - 6} ${torsoBot} L ${tR - 4} ${torsoBot} Z`}
            fill={jerseyAccent} fillOpacity={0.5}
          />
        </>
      )}

      {/* ── PLAYER NUMBER ─────────────────────────────────────────── */}
      <SvgText
        x={cx}
        y={torsoBot - 46}
        fontSize={cls === "lineman" ? 34 : 38}
        fontWeight="bold"
        fill={numberColor}
        stroke={numberOutline}
        strokeWidth={cls === "lineman" ? 1.5 : 2}
        textAnchor="middle"
        fontFamily="System"
      >
        {number}
      </SvgText>

      {/* ── NAME PLATE ────────────────────────────────────────────── */}
      {lastName.length > 0 && (
        <>
          <Rect
            x={tL + 4}
            y={torsoBot - 18}
            width={(tR - tL) - 8}
            height={14}
            fill={darken(jerseyColor, -40)}
            rx={2}
          />
          <SvgText
            x={cx}
            y={torsoBot - 8}
            fontSize={7}
            fontWeight="bold"
            fill={numberColor}
            textAnchor="middle"
            fontFamily="System"
          >
            {lastName.length > 9 ? lastName.slice(0, 9) : lastName}
          </SvgText>
        </>
      )}

      {/* ── BELT / PANT TOP ───────────────────────────────────────── */}
      <Path
        d={`M ${hL - 2} ${torsoBot} L ${hR + 2} ${torsoBot} L ${hR + 4} ${beltBot} L ${hL - 4} ${beltBot} Z`}
        fill={darken(pantColor, -10)}
      />
      {/* Belt buckle */}
      <Rect
        x={cx - 6}
        y={torsoBot + 3}
        width={12}
        height={8}
        fill={darken(pantColor, -50)}
        rx={2}
      />

      {/* ── PANTS LEGS ────────────────────────────────────────────── */}
      {/* Left leg */}
      <Path
        d={`M ${lLL} ${beltBot} L ${lLR + 2} ${beltBot} L ${lLR} ${legBot} L ${lLL - 2} ${legBot} Z`}
        fill="url(#pantGrad)"
      />
      {/* Right leg */}
      <Path
        d={`M ${rLL - 2} ${beltBot} L ${rLR} ${beltBot} L ${rLR + 2} ${legBot} L ${rLL} ${legBot} Z`}
        fill="url(#pantGrad)"
      />
      {/* Pant stripe separating legs (inner seam shadow) */}
      <Line x1={cx} y1={beltBot} x2={cx} y2={legBot} stroke={darken(pantColor, -40)} strokeWidth={2} />

      {/* ── PANT STRIPES ──────────────────────────────────────────── */}
      {pantStripes(lLL, lLR)}
      {pantStripes(rLL, rLR)}

      {/* ── SOCKS ─────────────────────────────────────────────────── */}
      {/* Left sock */}
      <Rect x={lLL - 2} y={legBot} width={lLR - lLL + 4} height={14} fill={sockColor} />
      <Line x1={lLL - 2} y1={legBot + 5} x2={lLR + 2} y2={legBot + 5} stroke={sockAccent} strokeWidth={2.5} />
      <Line x1={lLL - 2} y1={legBot + 9} x2={lLR + 2} y2={legBot + 9} stroke={sockAccent} strokeWidth={1.5} />
      {/* Right sock */}
      <Rect x={rLL - 2} y={legBot} width={rLR - rLL + 4} height={14} fill={sockColor} />
      <Line x1={rLL - 2} y1={legBot + 5} x2={rLR + 2} y2={legBot + 5} stroke={sockAccent} strokeWidth={2.5} />
      <Line x1={rLL - 2} y1={legBot + 9} x2={rLR + 2} y2={legBot + 9} stroke={sockAccent} strokeWidth={1.5} />

      {/* ── CLEATS ────────────────────────────────────────────────── */}
      {/* Left cleat */}
      <Path
        d={`M ${lLL - 6} ${sockBot} L ${lLR + 4} ${sockBot} L ${lLR + 6} ${cleatBot} L ${lLL - 8} ${cleatBot} Z`}
        fill={cleatColor}
      />
      {/* Right cleat */}
      <Path
        d={`M ${rLL - 4} ${sockBot} L ${rLR + 6} ${sockBot} L ${rLR + 8} ${cleatBot} L ${rLL - 6} ${cleatBot} Z`}
        fill={cleatColor}
      />
      {/* Cleat sole accent */}
      <Line x1={lLL - 8} y1={cleatBot - 3} x2={lLR + 6} y2={cleatBot - 3} stroke={jerseyColor} strokeWidth={2} />
      <Line x1={rLL - 6} y1={cleatBot - 3} x2={rLR + 8} y2={cleatBot - 3} stroke={jerseyColor} strokeWidth={2} />

      {/* ── HELMET ────────────────────────────────────────────────── */}
      {/* Dome (main shape) */}
      <Path
        d={`M ${cx - 37} ${helmetBrim} A 37 ${helmetBrim - helmetTop} 0 1 1 ${cx + 37} ${helmetBrim} Z`}
        fill="url(#helmetGrad)"
      />
      {/* Helmet brim/earhole ridge */}
      <Path
        d={`M ${cx - 38} ${helmetBrim - 2} L ${cx + 38} ${helmetBrim - 2} L ${cx + 36} ${helmetBrim + 4} L ${cx - 36} ${helmetBrim + 4} Z`}
        fill={helmetDark}
      />
      {/* Ear hole (left) */}
      <Ellipse
        cx={cx - 32}
        cy={helmetBrim - 4}
        rx={6}
        ry={8}
        fill={darken(helmetColor, -50)}
      />
      {/* Ear hole (right) */}
      <Ellipse
        cx={cx + 32}
        cy={helmetBrim - 4}
        rx={6}
        ry={8}
        fill={darken(helmetColor, -50)}
      />
      {/* Helmet center ridge */}
      <Path
        d={`M ${cx - 3} ${helmetTop + 2} A 3 3 0 0 1 ${cx + 3} ${helmetTop + 2} L ${cx + 3} ${helmetBrim - 2} L ${cx - 3} ${helmetBrim - 2} Z`}
        fill={darken(helmetColor, 15)}
      />
      {/* Team stripe on center ridge */}
      <Path
        d={`M ${cx - 1.5} ${helmetTop + 4} A 1.5 1.5 0 0 1 ${cx + 1.5} ${helmetTop + 4} L ${cx + 1.5} ${helmetBrim - 3} L ${cx - 1.5} ${helmetBrim - 3} Z`}
        fill={jerseyAccent === "#ffffff" ? numberColor : jerseyAccent}
        fillOpacity={0.8}
      />
      {/* Helmet highlight (shine) */}
      <Ellipse
        cx={cx - 10}
        cy={helmetTop + 14}
        rx={8}
        ry={6}
        fill="#ffffff"
        fillOpacity={0.18}
      />
      {/* Face opening (dark) */}
      <Path
        d={`M ${cx - 24} ${helmetBrim - 18} A 14 22 0 0 1 ${cx + 24} ${helmetBrim - 18} L ${cx + 22} ${helmetBrim} L ${cx - 22} ${helmetBrim} Z`}
        fill="#0D0D1A"
        fillOpacity={0.85}
      />
      {/* Visor tint (slight team color) */}
      <Path
        d={`M ${cx - 22} ${helmetBrim - 16} A 12 18 0 0 1 ${cx + 22} ${helmetBrim - 16} L ${cx + 20} ${helmetBrim - 2} L ${cx - 20} ${helmetBrim - 2} Z`}
        fill={jerseyColor}
        fillOpacity={0.15}
      />

      {/* ── FACEMASK ──────────────────────────────────────────────── */}
      {/* Outer cage rails */}
      <Path
        d={`M ${cx - 26} ${helmetBrim - 4} L ${cx - 28} ${helmetBrim + 20}`}
        stroke={facemaskColor} strokeWidth={2.5} strokeLinecap="round"
      />
      <Path
        d={`M ${cx + 26} ${helmetBrim - 4} L ${cx + 28} ${helmetBrim + 20}`}
        stroke={facemaskColor} strokeWidth={2.5} strokeLinecap="round"
      />
      {/* Horizontal bars */}
      <Path
        d={`M ${cx - 27} ${helmetBrim + 4} Q ${cx} ${helmetBrim + 7} ${cx + 27} ${helmetBrim + 4}`}
        stroke={facemaskColor} strokeWidth={2.5} fill="none" strokeLinecap="round"
      />
      <Path
        d={`M ${cx - 27} ${helmetBrim + 12} Q ${cx} ${helmetBrim + 15} ${cx + 27} ${helmetBrim + 12}`}
        stroke={facemaskColor} strokeWidth={2.5} fill="none" strokeLinecap="round"
      />
      {/* Center bar */}
      <Path
        d={`M ${cx - 4} ${helmetBrim + 4} L ${cx - 4} ${helmetBrim + 20} M ${cx + 4} ${helmetBrim + 4} L ${cx + 4} ${helmetBrim + 20}`}
        stroke={facemaskColor} strokeWidth={2} strokeLinecap="round"
      />
      {/* Chin strap */}
      <Path
        d={`M ${cx - 24} ${helmetBrim + 2} Q ${cx} ${helmetBrim + 24} ${cx + 24} ${helmetBrim + 2}`}
        stroke={darken(helmetColor, -20)} strokeWidth={2.5} fill="none"
      />

      {/* ── NECK ──────────────────────────────────────────────────── */}
      <Rect
        x={cx - 8}
        y={neckTop}
        width={16}
        height={neckBot - neckTop}
        fill={skinColor}
        rx={3}
      />
      {/* Neck collar */}
      <Rect
        x={cx - 10}
        y={neckBot - 4}
        width={20}
        height={8}
        fill={jerseyColor}
        rx={2}
      />
    </Svg>
  );
}
