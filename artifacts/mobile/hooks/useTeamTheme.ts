/**
 * useTeamTheme
 *
 * Returns the active team colour palette for the UI chrome.
 *
 * `primary` / `secondary` are the team's BRAND colours (set in Team Identity),
 * NOT the kit's jersey colour. This ensures the hero, tiles, nav bar, and other
 * themed elements always use a real brand colour regardless of which kit is active
 * (away jerseys are often white/cream and would make the entire UI unreadable).
 *
 * `kitJerseyColor` is the active kit's jersey colour — used only for the active
 * kit-toggle pill fill so the user can see what colour that kit is.
 *
 * Pages that should be "team-themed" use this hook.
 * Neutral pages (standings, stats, free agency, draft) use useColors() only.
 */
import { useNFL } from "@/context/NFLContext";

export interface TeamTheme {
  primary:        string;   // team BRAND primary  (always a proper color)
  secondary:      string;   // team BRAND secondary (always a proper color)
  helmet:         string;   // active kit helmet shell
  facemask:       string;   // active kit facemask
  kitName:        "home" | "away" | "alternate";
  kitJerseyColor: string;   // active kit jersey color (for kit-toggle pill only)
}

const FALLBACK_PRIMARY   = "#4F46E5";
const FALLBACK_SECONDARY = "#0D9488";

export function useTeamTheme(): TeamTheme {
  const { teamCustomization, season } = useNFL();

  const team    = season?.teams.find(t => t.id === season?.playerTeamId);
  const kitName = (teamCustomization?.featuredUniformSet ?? "home") as TeamTheme["kitName"];
  const uniform = teamCustomization?.uniforms?.[kitName];

  // Brand colors — driven by Team Identity, never by kit jersey colors
  const primary   = teamCustomization?.primaryColor   ?? team?.primaryColor   ?? FALLBACK_PRIMARY;
  const secondary = teamCustomization?.secondaryColor ?? team?.secondaryColor ?? FALLBACK_SECONDARY;

  // Kit-specific colors — only for the robot preview and kit-toggle pill
  const helmet         = uniform?.helmetColor         ?? primary;
  const facemask       = uniform?.helmetFacemaskColor ?? secondary;
  const kitJerseyColor = uniform?.jerseyColor         ?? primary;

  return { primary, secondary, helmet, facemask, kitName, kitJerseyColor };
}
