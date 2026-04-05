import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import Svg, { Rect, Line, G } from "react-native-svg";
import { useColors } from "@/hooks/useColors";
import type { DraftProspect, NFLPosition, CombineMeasurables } from "@/context/types";
import { POS_RATING_KEYS, POS_RATING_LABELS } from "@/context/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const POS_COLOR: Record<NFLPosition, string> = {
  QB:"#E31837", RB:"#FB4F14", WR:"#FFC20E", TE:"#00B5E2", OL:"#8B949E",
  DE:"#3FB950", DT:"#26A69A", LB:"#1F6FEB", CB:"#6E40C9", S:"#9C27B0",
  K:"#FF7043", P:"#795548",
};

const GRADE_COLORS: Record<string, string> = {
  "1st":"#FFD700","2nd":"#FF6B35","3rd":"#3FB950","4th":"#00B5E2",
  "5th":"#8B949E","6th":"#795548","7th":"#525252","UDFA":"#333",
};

const DEV_COLORS: Record<string, string> = {
  "X-Factor":"#FFD700", Superstar:"#FF6B35", Star:"#3FB950", Normal:"#8B949E", "Late Bloomer":"#00B5E2",
};
const DEV_ICONS: Record<string, string> = {
  "X-Factor":"zap", Superstar:"star", Star:"award", Normal:"user", "Late Bloomer":"trending-up",
};

function formatHeight(inches: number) {
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}

function ovrColor(v: number) {
  if (v >= 90) return "#FFD700";
  if (v >= 80) return "#3FB950";
  if (v >= 70) return "#FFC107";
  return "#E31837";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function GradeBar({ label, value, fill, max = 100, labelWidth }: { label: string; value: number; fill: string; max?: number; labelWidth?: number }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const valCol = value >= 85 ? ovrColor(value) : "#CBD5E1";
  return (
    <View style={pm.ratingRow}>
      <Text style={[pm.ratingLabel, labelWidth ? { width: labelWidth } : undefined]}>{label}</Text>
      <View style={pm.ratingTrack}>
        <View style={[pm.ratingFill, { width: `${pct}%` as any, backgroundColor: fill }]} />
      </View>
      <Text style={[pm.ratingVal, { color: valCol }]}>{value}</Text>
    </View>
  );
}

function CombineBar({ label, value, best, invert = false }: { label: string; value: number; best: number; invert?: boolean }) {
  if (value === 0) return null;
  const pct = invert ? (1 - (value - best * 0.9) / (best * 0.2)) * 100 : ((value - best * 0.8) / (best * 0.3)) * 100;
  const clamped = Math.min(100, Math.max(5, pct));
  const isGood = invert ? value <= best * 1.02 : value >= best * 0.97;
  return (
    <View style={pm.combineBarRow}>
      <Text style={pm.combineBarLabel}>{label}</Text>
      <View style={pm.combineBarTrack}>
        <View style={[pm.combineBarFill, { width: `${clamped}%` as any, backgroundColor: isGood ? "#3FB950" : "#4F46E5" }]} />
      </View>
      <Text style={[pm.combineBarVal, { color: isGood ? "#3FB950" : "#CBD5E1" }]}>
        {typeof value === "number" && value % 1 !== 0 ? value.toFixed(2) : value}
      </Text>
    </View>
  );
}

function CollegeStat({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={pm.cStat}>
      <Text style={pm.cStatVal}>{value}</Text>
      <Text style={pm.cStatLbl}>{label}</Text>
    </View>
  );
}

// ─── Derived combine-based ratings ────────────────────────────────────────────
// Approximate position-specific ratings from combine measurables

function deriveCombineRatings(pos: NFLPosition, c: CombineMeasurables, grade: number): Record<string, number> {
  if (c.didNotParticipate) return {};
  const q = grade / 100;
  // Tape/IQ component — same player quality scale used everywhere
  const base = Math.round(Math.max(40, Math.min(99, 50 + q * 45)));

  // ── Exact same formulas as the combine table ──────────────────────────────
  // SPD: 40-yard dash, 4.30s = 99
  const spd = Math.round(Math.max(40, Math.min(99, 99 - (c.fortyYardDash - 4.3) * 65)));
  // ACC: 3-cone, ≤6.50s = 99, <7.00s = 90s
  const acc = Math.round(Math.max(40, Math.min(99, 99 - (c.threeCone - 6.5) * 18)));
  // AGI: shuttle + 3-cone average, shuttle <4.0 = 99
  const shutRtg = Math.max(40, Math.min(99, 99 - (c.shuttleRun - 4.0) * 58));
  const coneRtg = Math.max(40, Math.min(99, 99 - (c.threeCone - 6.5) * 18));
  const agi = Math.round((shutRtg + coneRtg) / 2);
  // EXP: vert + broad, 40" vert = 99, 120" broad = 99
  const vertRtg  = Math.max(40, Math.min(99, 40 + (c.verticalJump - 22) * 3.278));
  const broadRtg = Math.max(40, Math.min(99, 40 + (c.broadJump - 90) * 1.967));
  const exp = Math.round((vertRtg + broadRtg) / 2);
  // STR: bench press reps
  const str = Math.round(Math.max(40, Math.min(99, c.benchPress * 1.6 + 22)));
  // HANDS: larger hands = better catcher (8.5" = 40, 11.5" = 99)
  const handRtg = Math.max(40, Math.min(99, 40 + (c.handSize - 8.5) * 19.67));
  // CTH: 30% hands + 45% tape/IQ + 25% agility (independently variable)
  const cth = Math.round(Math.max(40, Math.min(99, handRtg * 0.30 + base * 0.45 + agi * 0.25)));
  // QCK: shuttle-only (for release quickness off the line)
  const qck = Math.round(Math.max(40, Math.min(99, 99 - (c.shuttleRun - 4.0) * 58)));

  const ratings: Record<string, number> = {};
  const keys = POS_RATING_KEYS[pos] ?? [];
  keys.forEach(key => {
    switch (key) {
      // QB
      case "throwPower":        ratings[key] = str;                              break;
      case "throwAccShort":
      case "throwAccMid":       ratings[key] = base;                             break;
      case "throwAccDeep":      ratings[key] = Math.round((base + spd) / 2);    break;
      case "throwOnRun":        ratings[key] = Math.round((base + agi) / 2);    break;
      case "mobility":          ratings[key] = spd;                              break;
      // Ball carrier
      case "ballCarrierVision": ratings[key] = base;                             break;
      case "breakTackle":       ratings[key] = str;                              break;
      // Receiving — CTH now driven by hand size + grade
      case "catching":          ratings[key] = cth;                              break;
      case "routeRunning":      ratings[key] = Math.round((base + agi) / 2);    break;
      case "catchInTraffic":    ratings[key] = Math.round((cth + str) / 2);     break;
      case "release":           ratings[key] = qck;                              break;
      // Blocking
      case "passBlock":
      case "runBlock":          ratings[key] = str;                              break;
      // D-Line
      case "powerMoves":        ratings[key] = str;                              break;
      case "finesseMoves":      ratings[key] = agi;                              break;
      case "blockShedding":
      case "tackle":            ratings[key] = Math.round((str + agi) / 2);     break;
      case "pursuit":           ratings[key] = spd;                              break;
      // Coverage
      case "manCoverage":
      case "zoneCoverage":      ratings[key] = base;                             break;
      case "press":             ratings[key] = Math.round((str + base) / 2);    break;
      // Athletic — now exactly matching combine table values
      case "acceleration":      ratings[key] = acc;                              break;
      case "agility":           ratings[key] = agi;                              break;
      // K/P
      case "kickPower":         ratings[key] = Math.round((str + exp) / 2);     break;
      case "kickAccuracy":      ratings[key] = base;                             break;
      default:                  ratings[key] = base;
    }
  });
  return ratings;
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

interface Props {
  prospect: DraftProspect | null;
  visible: boolean;
  onClose: () => void;
  onDraft?: () => void;
  isUserTurn?: boolean;
  isGM?: boolean;
  teamColor?: string;
}

export function ProspectModal({ prospect: p, visible, onClose, onDraft, isUserTurn, isGM, teamColor = "#4F46E5" }: Props) {
  const colors = useColors();
  const [ratingTab, setRatingTab] = useState<"combine" | "ratings">("ratings");

  if (!p) return null;

  const pc = POS_COLOR[p.position];
  const gc = GRADE_COLORS[p.grade] ?? "#525252";
  const devColor = DEV_COLORS[p.developmentTrait] ?? "#8B949E";
  const devIcon  = (DEV_ICONS[p.developmentTrait]  ?? "user") as any;
  const derivedRatings = p.scoutingUnlocked ? deriveCombineRatings(p.position, p.combine, p.overallGrade) : {};
  const ratingKeys = POS_RATING_KEYS[p.position] ?? [];

  // Core athletic ratings — same formulas as combine table, shown as badge strip
  const athleticRatings: { label: string; val: number; color: string }[] | null =
    (p.scoutingUnlocked && !p.combine.didNotParticipate) ? (() => {
      const c = p.combine;
      const base = Math.max(40, Math.min(99, 50 + (p.overallGrade / 100) * 45));
      const spd  = Math.round(Math.max(40, Math.min(99, 99 - (c.fortyYardDash - 4.3) * 65)));
      const coneR = Math.max(40, Math.min(99, 99 - (c.threeCone - 6.5) * 18));
      const shutR = Math.max(40, Math.min(99, 99 - (c.shuttleRun - 4.0) * 58));
      const acc   = Math.round(coneR);
      const agi   = Math.round((shutR + coneR) / 2);
      const vertR = Math.max(40, Math.min(99, 40 + (c.verticalJump - 22) * 3.278));
      const broadR= Math.max(40, Math.min(99, 40 + (c.broadJump - 90) * 1.967));
      const exp   = Math.round((vertR + broadR) / 2);
      const str   = Math.round(Math.max(40, Math.min(99, c.benchPress * 1.6 + 22)));
      const handR = Math.max(40, Math.min(99, 40 + (c.handSize - 8.5) * 19.67));
      const cth   = Math.round(Math.max(40, Math.min(99, handR * 0.30 + base * 0.45 + agi * 0.25)));
      const col = (v: number) => v >= 90 ? "#FFD700" : v >= 80 ? "#3FB950" : v >= 70 ? "#4F46E5" : v >= 60 ? "#FB4F14" : "#E31837";
      return [
        { label:"SPD", val:spd,  color:col(spd)  },
        { label:"ACC", val:acc,  color:col(acc)  },
        { label:"AGI", val:agi,  color:col(agi)  },
        { label:"EXP", val:exp,  color:col(exp)  },
        { label:"STR", val:str,  color:col(str)  },
        { label:"CTH", val:cth,  color:col(cth)  },
      ];
    })() : null;

  const cs = p.collegeStats;
  const collegeItems: { label: string; value: string }[] = [];
  if (cs.completionPct != null) collegeItems.push({ label:"CMP%",  value:`${cs.completionPct}%` });
  if (cs.passingYards != null)  collegeItems.push({ label:"P YDS", value:cs.passingYards.toLocaleString() });
  if (cs.passingTDs != null)    collegeItems.push({ label:"P TD",  value:String(cs.passingTDs) });
  if (cs.interceptions != null) collegeItems.push({ label:"INT",   value:String(cs.interceptions) });
  if (cs.rushingYards != null)  collegeItems.push({ label:"R YDS", value:cs.rushingYards.toLocaleString() });
  if (cs.rushingTDs != null)    collegeItems.push({ label:"R TD",  value:String(cs.rushingTDs) });
  if (cs.yardsPerCarry != null) collegeItems.push({ label:"YPC",   value:cs.yardsPerCarry.toFixed(1) });
  if (cs.receptions != null)    collegeItems.push({ label:"REC",   value:String(cs.receptions) });
  if (cs.receivingYards != null)collegeItems.push({ label:"RE YDS",value:cs.receivingYards.toLocaleString() });
  if (cs.receivingTDs != null)  collegeItems.push({ label:"RE TD", value:String(cs.receivingTDs) });
  if (cs.tackles != null)       collegeItems.push({ label:"TKL",   value:String(cs.tackles) });
  if (cs.sacks != null)         collegeItems.push({ label:"SCK",   value:cs.sacks.toFixed(1) });
  if (cs.interceptionsDef != null)collegeItems.push({ label:"INT", value:String(cs.interceptionsDef) });
  if (cs.passDeflections != null) collegeItems.push({ label:"PD",  value:String(cs.passDeflections) });
  if (cs.gamesStarted != null)  collegeItems.push({ label:"GS",   value:String(cs.gamesStarted) });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={pm.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[pm.sheet, { backgroundColor: colors.background }]}>
          {/* Handle */}
          <View style={[pm.handle, { backgroundColor: colors.border }]} />
          <TouchableOpacity onPress={onClose} style={pm.closeBtn}>
            <Feather name="x" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
            {/* ── Hero Header ── */}
            <View style={[pm.hero, { backgroundColor: pc + "12" }]}>
              {/* Grade badge + OVR */}
              <View style={pm.heroTop}>
                <View style={[pm.gradePill, { backgroundColor: gc + "25", borderColor: gc + "60" }]}>
                  <Text style={[pm.gradeText, { color: gc }]}>{p.grade} Round</Text>
                </View>
                <View style={[pm.posBadge, { backgroundColor: pc + "22", borderColor: pc + "50" }]}>
                  <Text style={[pm.posText, { color: pc }]}>{p.position}</Text>
                </View>
                {p.scoutingUnlocked && (
                  <View style={[pm.ovrBig, { borderColor: ovrColor(p.overallGrade) + "70", backgroundColor: ovrColor(p.overallGrade) + "18" }]}>
                    <Text style={[pm.ovrNum, { color: ovrColor(p.overallGrade) }]}>{p.overallGrade}</Text>
                    <Text style={[pm.ovrLbl, { color: ovrColor(p.overallGrade) + "AA" }]}>OVR</Text>
                  </View>
                )}
              </View>

              {/* Name */}
              <Text style={[pm.heroName, { color: colors.foreground }]}>{p.name}</Text>
              <Text style={[pm.heroSub, { color: colors.mutedForeground }]}>
                {p.college} · {p.archetype}
              </Text>

              {/* Dev trait */}
              <View style={pm.devRow}>
                <View style={[pm.devChip, { backgroundColor: devColor + "20", borderColor: devColor + "50" }]}>
                  <Feather name={devIcon} size={11} color={devColor} />
                  <Text style={[pm.devText, { color: devColor }]}>{p.developmentTrait}</Text>
                </View>
                {p.scoutingUnlocked && (
                  <View style={[pm.potentialChip, { backgroundColor: colors.secondary }]}>
                    <Text style={[pm.potentialText, { color: colors.mutedForeground }]}>POT </Text>
                    <Text style={[pm.potentialVal, { color: ovrColor(p.potential) }]}>{p.potential}</Text>
                  </View>
                )}
              </View>

              {/* Accolades */}
              {(p.accolades ?? []).length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingTop: 8 }}>
                  {p.accolades.map((a, i) => (
                    <View key={i} style={[pm.accoladePill, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <Feather name="award" size={9} color="#D97706" />
                      <Text style={[pm.accoladeText, { color: colors.foreground }]}>{a}</Text>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* ── Physical / Combine measurables ── */}
            {!p.combine.didNotParticipate && (
              <View style={[pm.section, { borderColor: colors.border }]}>
                <Text style={[pm.sectionTitle, { color: colors.mutedForeground }]}>PHYSICAL PROFILE</Text>
                {/* Height / Weight / Arms */}
                <View style={pm.physRow}>
                  <PhysCell label="HT" value={formatHeight(p.combine.height)} colors={colors} />
                  <PhysCell label="WT" value={`${p.combine.weight} lbs`} colors={colors} />
                  <PhysCell label="ARM" value={`${p.combine.armLength}"`} colors={colors} />
                  <PhysCell label="HAND" value={`${p.combine.handSize}"`} colors={colors} />
                </View>
                {/* Combine drill bars */}
                <View style={pm.drillsBlock}>
                  <CombineBar label="40-YD DASH" value={p.combine.fortyYardDash} best={4.35} invert />
                  <CombineBar label="BENCH PRESS" value={p.combine.benchPress} best={32} />
                  <CombineBar label="VERT JUMP" value={p.combine.verticalJump} best={44} />
                  <CombineBar label="BROAD JUMP" value={p.combine.broadJump} best={135} />
                  <CombineBar label="3-CONE" value={p.combine.threeCone} best={6.50} invert />
                  <CombineBar label="20-YD SHUTTLE" value={p.combine.shuttleRun} best={3.98} invert />
                </View>
              </View>
            )}
            {p.combine.didNotParticipate && (
              <View style={[pm.section, { borderColor: colors.border }]}>
                <Text style={[pm.sectionTitle, { color: colors.mutedForeground }]}>PHYSICAL PROFILE</Text>
                <View style={pm.physRow}>
                  <PhysCell label="HT" value={formatHeight(p.combine.height)} colors={colors} />
                  <PhysCell label="WT" value={`${p.combine.weight} lbs`} colors={colors} />
                  <PhysCell label="ARM" value="N/A" colors={colors} />
                  <PhysCell label="HAND" value="N/A" colors={colors} />
                </View>
                <Text style={[pm.dnpText, { color: colors.mutedForeground }]}>Did not participate in combine drills</Text>
              </View>
            )}

            {/* ── Position Ratings / College Stats tabs ── */}
            {p.scoutingUnlocked && (
              <View style={[pm.section, { borderColor: colors.border }]}>
                <View style={[pm.ratingTabBar, { backgroundColor: colors.secondary }]}>
                  {(["ratings","combine"] as const).map(t => (
                    <TouchableOpacity key={t} onPress={() => setRatingTab(t)}
                      style={[pm.ratingTabBtn, { backgroundColor: ratingTab === t ? teamColor : "transparent" }]}>
                      <Text style={[pm.ratingTabText, { color: ratingTab === t ? "#fff" : colors.mutedForeground }]}>
                        {t === "ratings" ? "Position Ratings" : "Derived"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {/* ── Combine Ratings Badge Strip (always visible) ── */}
                {athleticRatings && (
                  <View style={pm.athBadgeRow}>
                    {athleticRatings.map(({ label, val, color }) => (
                      <View key={label} style={[pm.athBadge, { borderColor: color + "55", backgroundColor: color + "18" }]}>
                        <Text style={[pm.athBadgeVal, { color }]}>{val}</Text>
                        <Text style={[pm.athBadgeLbl, { color: color + "BB" }]}>{label}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {ratingTab === "ratings" ? (
                  <View style={{ paddingTop: 8 }}>
                    <GradeBar label="OVR" value={p.overallGrade} fill={pc} />
                    <GradeBar label="POT" value={p.potential} fill={ovrColor(p.potential)} />
                    {ratingKeys.map(key => {
                      const v = derivedRatings[key];
                      if (v == null) return null;
                      return <GradeBar key={key} label={POS_RATING_LABELS[key]} value={v} fill={pc} />;
                    })}
                  </View>
                ) : (
                  <View style={{ paddingTop: 8 }}>
                    {athleticRatings ? (
                      <>
                        <GradeBar label="SPEED  (40-YD)"      value={athleticRatings[0].val} fill="#E31837" labelWidth={140} />
                        <GradeBar label="ACCEL  (3-CONE)"     value={athleticRatings[1].val} fill="#FB4F14" labelWidth={140} />
                        <GradeBar label="AGILITY (SHUT+CONE)" value={athleticRatings[2].val} fill="#00B5E2" labelWidth={140} />
                        <GradeBar label="EXPLOS (VERT+BROAD)" value={athleticRatings[3].val} fill="#3FB950" labelWidth={140} />
                        <GradeBar label="STRENGTH (BENCH)"    value={athleticRatings[4].val} fill="#FFC20E" labelWidth={140} />
                        <GradeBar label="CATCHING (HANDS)"    value={athleticRatings[5].val} fill="#9C27B0" labelWidth={140} />
                      </>
                    ) : (
                      <Text style={[pm.dnpText, { color: colors.mutedForeground }]}>No combine data available</Text>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* ── Not scouted ── */}
            {!p.scoutingUnlocked && (
              <View style={[pm.section, { borderColor: colors.border, alignItems:"center", gap:8, paddingVertical:20 }]}>
                <Feather name="lock" size={24} color={colors.mutedForeground} />
                <Text style={[pm.sectionTitle, { color: colors.mutedForeground }]}>Scout this prospect to unlock ratings & full report</Text>
              </View>
            )}

            {/* ── College Stats ── */}
            {p.scoutingUnlocked && collegeItems.length > 0 && (
              <View style={[pm.section, { borderColor: colors.border }]}>
                <Text style={[pm.sectionTitle, { color: colors.mutedForeground }]}>
                  COLLEGE STATS ({cs.gamesPlayed ?? 12} GP)
                </Text>
                <View style={pm.collegeGrid}>
                  {collegeItems.map((item, i) => (
                    <CollegeStat key={i} label={item.label} value={item.value} />
                  ))}
                </View>
              </View>
            )}

            {/* ── Strengths & Weaknesses ── */}
            {p.scoutingUnlocked && (
              <View style={[pm.section, { borderColor: colors.border }]}>
                <View style={pm.swRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[pm.swTitle, { color: "#3FB950" }]}>STRENGTHS</Text>
                    {p.strengths.map((s, i) => (
                      <Text key={i} style={[pm.swItem, { color: "#CBD5E1" }]}>• {s}</Text>
                    ))}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[pm.swTitle, { color: "#E11D48" }]}>WEAKNESSES</Text>
                    {p.weaknesses.map((w, i) => (
                      <Text key={i} style={[pm.swItem, { color: "#CBD5E1" }]}>• {w}</Text>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* ── Draft Button ── */}
            {isGM && isUserTurn && onDraft && (
              <TouchableOpacity onPress={onDraft}
                style={[pm.draftBtn, { backgroundColor: teamColor, marginHorizontal: 16, marginTop: 8 }]}>
                <Feather name="award" size={16} color="#fff" />
                <Text style={pm.draftBtnText}>Draft {p.name.split(" ")[1]}</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function PhysCell({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={[pm.physCell, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[pm.physVal, { color: colors.foreground }]}>{value}</Text>
      <Text style={[pm.physLbl, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const pm = StyleSheet.create({
  overlay:        { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.75)" },
  sheet:          { borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: "95%", paddingTop: 12 },
  handle:         { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  closeBtn:       { position: "absolute", right: 16, top: 14, zIndex: 10 },

  hero:           { padding: 16, paddingBottom: 20 },
  heroTop:        { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  gradePill:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  gradeText:      { fontSize: 12, fontFamily: "Inter_700Bold" },
  posBadge:       { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  posText:        { fontSize: 12, fontFamily: "Inter_700Bold" },
  ovrBig:         { marginLeft: "auto" as any, flexDirection: "row", alignItems: "baseline", gap: 3,
                    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1.5 },
  ovrNum:         { fontSize: 22, fontFamily: "Inter_700Bold" },
  ovrLbl:         { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  heroName:       { fontSize: 26, fontFamily: "Inter_700Bold", marginBottom: 3 },
  heroSub:        { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 10 },
  devRow:         { flexDirection: "row", alignItems: "center", gap: 8 },
  devChip:        { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  devText:        { fontSize: 12, fontFamily: "Inter_700Bold" },
  potentialChip:  { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  potentialText:  { fontSize: 11, fontFamily: "Inter_400Regular" },
  potentialVal:   { fontSize: 14, fontFamily: "Inter_700Bold" },
  accoladePill:   { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  accoladeText:   { fontSize: 11, fontFamily: "Inter_500Medium" },

  section:        { marginHorizontal: 16, marginTop: 14, padding: 14, borderRadius: 14, borderWidth: 1 },
  sectionTitle:   { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.8, marginBottom: 10 },

  physRow:        { flexDirection: "row", gap: 8, marginBottom: 14 },
  physCell:       { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  physVal:        { fontSize: 16, fontFamily: "Inter_700Bold" },
  physLbl:        { fontSize: 9, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  dnpText:        { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: 8 },

  drillsBlock:    { gap: 6 },
  combineBarRow:  { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  combineBarLabel:{ width: 100, fontSize: 10, fontFamily: "Inter_600SemiBold", color: "#6060A0" },
  combineBarTrack:{ flex: 1, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" },
  combineBarFill: { height: 6, borderRadius: 3 },
  combineBarVal:  { width: 38, textAlign: "right", fontSize: 11, fontFamily: "Inter_700Bold" },

  ratingTabBar:   { flexDirection: "row", borderRadius: 8, padding: 3 },
  ratingTabBtn:   { flex: 1, alignItems: "center", paddingVertical: 7, borderRadius: 6 },
  ratingTabText:  { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  athBadgeRow:    { flexDirection: "row", justifyContent: "space-between", marginTop: 10, marginBottom: 4, gap: 5 },
  athBadge:       { flex: 1, alignItems: "center", paddingVertical: 7, borderRadius: 9, borderWidth: 1 },
  athBadgeVal:    { fontSize: 15, fontFamily: "Inter_700Bold" },
  athBadgeLbl:    { fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 0.5, marginTop: 1 },

  ratingRow:      { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 5 },
  ratingLabel:    { width: 30, fontSize: 9, fontFamily: "Inter_700Bold", color: "rgba(255,255,255,0.45)", letterSpacing: 0.4 },
  ratingTrack:    { flex: 1, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.10)", overflow: "hidden" },
  ratingFill:     { height: 5, borderRadius: 3 },
  ratingVal:      { width: 24, textAlign: "right", fontSize: 11, fontFamily: "Inter_700Bold" },

  collegeGrid:    { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  cStat:          { width: "30%", alignItems: "center", backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 8, paddingVertical: 8 },
  cStatVal:       { fontSize: 18, fontFamily: "Inter_700Bold", color: "#EEEEF8" },
  cStatLbl:       { fontSize: 9, fontFamily: "Inter_600SemiBold", color: "#6060A0", marginTop: 2, letterSpacing: 0.4 },

  swRow:          { flexDirection: "row", gap: 14 },
  swTitle:        { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5, marginBottom: 6 },
  swItem:         { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },

  draftBtn:       { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
                    paddingVertical: 14, borderRadius: 12 },
  draftBtnText:   { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
});
