import React from "react";
import Svg, { Path, G } from "react-native-svg";

export default function Helmet({
  size = 220,
  shellColor = "#E5E7EB",
  facemaskColor = "#FFFFFF",
  visorColor = "#0F172A",
  chinstrapColor = "#1D4ED8",
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 512 512">

      {/* SHELL */}
      <Path
        d="
          M80 300
          C70 200, 150 110, 280 110
          C360 110, 440 160, 460 230
          C470 270, 440 300, 380 310
          L200 320
          C140 320, 100 320, 80 300
          Z
        "
        fill={shellColor}
      />

      {/* BACK BOTTOM */}
      <Path
        d="M120 320 Q200 360 300 340"
        fill="#00000020"
      />

      {/* VISOR (curved) */}
      <Path
        d="
          M270 190
          Q360 180 420 230
          Q360 300 270 290
          Q240 260 240 230
          Q240 200 270 190
          Z
        "
        fill={visorColor}
      />

      {/* FACEMASK */}
      <G
        stroke={facemaskColor}
        strokeWidth="12"
        strokeLinecap="round"
        fill="none"
      >
        {/* top bar */}
        <Path d="M260 210 Q340 200 420 240" />

        {/* middle bar */}
        <Path d="M250 240 Q340 235 430 270" />

        {/* bottom bar */}
        <Path d="M250 270 Q340 275 420 300" />

        {/* vertical support */}
        <Path d="M360 200 L360 310" />

        {/* front curve */}
        <Path d="M420 240 Q450 270 420 300" />
      </G>

      {/* CHINSTRAP */}
      <Path
        d="M300 320 Q360 360 420 320"
        stroke={chinstrapColor}
        strokeWidth="14"
        fill="none"
        strokeLinecap="round"
      />

    </Svg>
  );
}