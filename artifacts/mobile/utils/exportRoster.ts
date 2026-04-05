/**
 * Roster export → .xlsx workbook (SheetJS)
 * Sheet 1 – Roster (grouped by position, all key ratings)
 * Sheet 2 – Season Stats
 */
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform, Alert } from "react-native";
import * as XLSX from "xlsx";
import { POS_RATING_KEYS, POS_RATING_LABELS } from "@/context/types";
import type { NFLTeam, NFLPosition } from "@/context/types";

const ALL_POS: NFLPosition[] = [
  "QB","RB","WR","TE","OL","DE","DT","LB","CB","S","K","P",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ovrGrade(ovr: number): string {
  if (ovr >= 90) return "🟡";  // gold tier
  if (ovr >= 80) return "🟢";  // green
  if (ovr >= 70) return "⬜";  // solid
  return "🔴";                  // below avg
}

// ─── Build workbook ───────────────────────────────────────────────────────────
export async function exportRosterXLSX(team: NFLTeam, seasonYear: number) {
  const wb = XLSX.utils.book_new();

  // ──────────────────────────────────────────────────
  // SHEET 1 — ROSTER
  // ──────────────────────────────────────────────────
  const rosterRows: (string | number)[][] = [];

  // Workbook title row
  rosterRows.push([`VFL — ${team.city} ${team.name.toUpperCase()} · ${seasonYear} ROSTER`]);
  rosterRows.push([]); // blank

  // Column header legend
  rosterRows.push(["🟡 = 90+ ELITE", "🟢 = 80–89 STARTER", "⬜ = 70–79 SOLID", "🔴 = <70 BACKUP"]);
  rosterRows.push([]); // blank

  ALL_POS.forEach(pos => {
    const players = team.roster
      .filter(p => p.position === pos)
      .sort((a, b) => a.depthOrder - b.depthOrder || b.overall - a.overall);

    if (players.length === 0) return;

    const ratingKeys = POS_RATING_KEYS[pos];

    // Position section header
    rosterRows.push([`── ${pos} ──`]);

    // Column headers
    const colHeaders = [
      "#", "PLAYER", "OVR", "GRADE", "DEV", "AGE", "EXP",
      "SALARY($M)", "YRS LEFT",
      "SPD", "STR", "AWR",
      ...ratingKeys.map(k => POS_RATING_LABELS[k]),
      "COLLEGE", "STATUS",
    ];
    rosterRows.push(colHeaders);

    // Player rows
    players.forEach((p, idx) => {
      const ratingVals = ratingKeys.map(k => p.posRatings[k] ?? 0);
      rosterRows.push([
        idx + 1,
        p.name,
        p.overall,
        ovrGrade(p.overall),
        p.developmentTrait,
        p.age,
        p.yearsExperience,
        p.salary.toFixed(1),
        p.contractYears,
        p.speed,
        p.strength,
        p.awareness,
        ...ratingVals,
        p.college ?? "—",
        p.status,
      ]);
    });

    rosterRows.push([]); // blank between groups
  });

  const ws1 = XLSX.utils.aoa_to_sheet(rosterRows);

  // Column widths
  ws1["!cols"] = [
    { wch: 4 },  // #
    { wch: 22 }, // player name
    { wch: 5 },  // OVR
    { wch: 6 },  // grade emoji
    { wch: 12 }, // dev
    { wch: 4 },  // age
    { wch: 4 },  // exp
    { wch: 10 }, // salary
    { wch: 6 },  // yrs
    { wch: 4 },  // spd
    { wch: 4 },  // str
    { wch: 4 },  // awr
    ...Array(6).fill({ wch: 4 }), // pos ratings
    { wch: 14 }, // college
    { wch: 12 }, // status
  ];

  XLSX.utils.book_append_sheet(wb, ws1, "Roster");

  // ──────────────────────────────────────────────────
  // SHEET 2 — SEASON STATS
  // ──────────────────────────────────────────────────
  const statsRows: (string | number)[][] = [];
  statsRows.push([`VFL — ${team.city} ${team.name.toUpperCase()} · ${seasonYear} SEASON STATS`]);
  statsRows.push([]);
  statsRows.push([
    "PLAYER","POS","GP",
    "PASS YDS","PASS TD","INT","CMP%","QBR",
    "RUSH YDS","RUSH TD","CAR","YPC",
    "REC YDS","REC TD","REC","TGT","YPR",
    "TCK","SACK","DEF INT","PD","FF",
    "FGM","FGA","FG%",
    "PUNT AVG",
  ]);

  [...team.roster]
    .sort((a, b) => a.position.localeCompare(b.position) || b.overall - a.overall)
    .forEach(p => {
      const s  = p.stats;
      const cmpPct = s.attempts > 0
        ? `${((s.completions / s.attempts) * 100).toFixed(1)}%` : "—";
      const ypc = s.carries > 0
        ? (s.rushingYards / s.carries).toFixed(1) : "—";
      const ypr = s.receptions > 0
        ? (s.receivingYards / s.receptions).toFixed(1) : "—";
      const fgPct = s.fieldGoalsAttempted > 0
        ? `${((s.fieldGoalsMade / s.fieldGoalsAttempted) * 100).toFixed(1)}%` : "—";

      statsRows.push([
        p.name, p.position, s.gamesPlayed,
        s.passingYards, s.passingTDs, s.interceptions, cmpPct,
        s.qbRating > 0 ? s.qbRating.toFixed(1) : "—",
        s.rushingYards, s.rushingTDs, s.carries, ypc,
        s.receivingYards, s.receivingTDs, s.receptions, s.targets, ypr,
        s.tackles, s.sacks.toFixed(1), s.defensiveINTs, s.passDeflections, s.forcedFumbles,
        s.fieldGoalsMade, s.fieldGoalsAttempted, fgPct,
        s.puntsAverage > 0 ? s.puntsAverage.toFixed(1) : "—",
      ]);
    });

  const ws2 = XLSX.utils.aoa_to_sheet(statsRows);
  ws2["!cols"] = [
    { wch: 22 }, { wch: 4 }, { wch: 4 },
    { wch: 8 }, { wch: 7 }, { wch: 4 }, { wch: 6 }, { wch: 6 },
    { wch: 8 }, { wch: 7 }, { wch: 4 }, { wch: 5 },
    { wch: 8 }, { wch: 7 }, { wch: 4 }, { wch: 4 }, { wch: 5 },
    { wch: 4 }, { wch: 5 }, { wch: 7 }, { wch: 4 }, { wch: 4 },
    { wch: 4 }, { wch: 4 }, { wch: 6 }, { wch: 8 },
  ];

  XLSX.utils.book_append_sheet(wb, ws2, "Season Stats");

  // ──────────────────────────────────────────────────
  // Write & share
  // ──────────────────────────────────────────────────
  const filename = `${team.city}_${team.name}_${seasonYear}_roster`.replace(/\s+/g, "_");

  if (Platform.OS === "web") {
    XLSX.writeFile(wb, `${filename}.xlsx`);
  } else {
    try {
      const b64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
      const uri  = FileSystem.cacheDirectory + `${filename}.xlsx`;
      await FileSystem.writeAsStringAsync(uri, b64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          dialogTitle: `${team.city} ${team.name} Roster`,
          UTI: "com.microsoft.excel.xlsx",
        });
      } else {
        Alert.alert("Sharing not available", "Please use the web version to download the file.");
      }
    } catch (err: any) {
      Alert.alert("Export failed", err?.message ?? "Unknown error");
    }
  }
}
