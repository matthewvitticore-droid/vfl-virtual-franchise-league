/**
 * useTeamTheme
 *
 * Returns the active team colour palette derived from the featured uniform kit.
 * Pages that should be "team-themed" use these values instead of raw team colors.
 * Neutral pages (standings, stats, free agency, draft) ignore this hook.
 */
import { useNFL } from "@/context/NFLContext";

export interface TeamTheme {
  primary:      string;   // jersey / shell primary
  secondary:    string;   // jersey accent / facemask
  helmet:       string;   // helmet shell
  facemask:     string;   // facemask colour
  kitName:      "home" | "away" | "alternate";
}

const FALLBACK_PRIMARY   = "#4F46E5";
const FALLBACK_SECONDARY = "#0D9488";

export function useTeamTheme(): TeamTheme {
  const { teamCustomization, season } = useNFL();

  const team     = season?.teams.find(t => t.id === season?.playerTeamId);
  const kitName  = (teamCustomization?.featuredUniformSet ?? "home") as TeamTheme["kitName"];
  const uniform  = teamCustomization?.uniforms?.[kitName];

  const primary   = uniform?.jerseyColor       ?? team?.primaryColor   ?? FALLBACK_PRIMARY;
  const secondary = uniform?.jerseyAccentColor ?? team?.secondaryColor ?? FALLBACK_SECONDARY;
  const helmet    = uniform?.helmetColor        ?? primary;
  const facemask  = uniform?.helmetFacemaskColor ?? secondary;

  return { primary, secondary, helmet, facemask, kitName };
}
