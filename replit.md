# FootballSim — Co-GM NFL Franchise Simulator

## Overview
An NFL franchise simulator built in Expo React Native where multiple users share a single franchise in real time via Supabase. All 32 real NFL teams with diverse fictional rosters, realistic ratings, and broadcast-style play-by-play simulation.

## Architecture

### Key Files
- `artifacts/mobile/` — Main Expo app
- `artifacts/mobile/context/NFLContext.tsx` — Entire NFL engine: teams, rosters, simulation, Supabase sync
- `artifacts/mobile/context/AuthContext.tsx` — Supabase Auth, franchise creation/joining, role management
- `artifacts/mobile/lib/supabase.ts` — Supabase JS client (reads from env secrets)
- `artifacts/mobile/supabase-setup.sql` — SQL schema to run in Supabase SQL Editor
- `artifacts/mobile/app/_layout.tsx` — Root layout with auth-gated routing
- `artifacts/mobile/app/auth/login.tsx` — Sign in screen
- `artifacts/mobile/app/auth/register.tsx` — Account creation
- `artifacts/mobile/app/franchise/index.tsx` — Create/Join franchise lobby
- `artifacts/mobile/app/(tabs)/index.tsx` — Home dashboard (role-aware)
- `artifacts/mobile/app/(tabs)/roster.tsx` — Roster + depth chart + game plan
- `artifacts/mobile/app/(tabs)/schedule.tsx` — Season schedule
- `artifacts/mobile/app/(tabs)/standings.tsx` — NFL standings
- `artifacts/mobile/app/game/[id].tsx` — Live play-by-play game simulation

### Supabase Schema (run supabase-setup.sql)
- `franchises` — franchise info + 6-char join code
- `franchise_members` — user roles per franchise (GM/Coach/Scout)
- `franchise_state` — full JSON season state, real-time synced via Supabase Realtime

## Co-GM Multiplayer
- **GM**: Full access — roster moves, free agency, trades, contracts, simulate games
- **Coach**: Game plan, depth chart, formations, schemes
- **Scout**: Read-only view of everything
- One GM and one Coach per franchise; unlimited Scouts
- Join code: 6-char alphanumeric (e.g. "KX7Q2M"), tap to copy on home screen
- Real-time sync via Supabase Postgres Changes; debounced save (800ms)
- Offline fallback: AsyncStorage with key `nfl_season_v3`

## Player & Rating System
- **Rating distribution**: Gaussian (Box-Muller transform)
  - Starters: `teamOverall ± 5` (realistic spread, not all 99s)
  - Backups: `teamOverall - 14 ± 5` (clearly weaker)
  - Elite stars (~40% chance for designated slots): `teamOverall + 6 ± 3`
- **Team overalls**: Range from 70 (Panthers) to 93 (Chiefs), based on 2024-25 performance
- **Salary scale**: $0.8M–$45M based on overall + position multiplier (QB=2.5x, K=0.5x)
- **Name pool**: 120+ first names (African-American, Hispanic, Irish, Italian, African, Scandinavian, classic American) × 150+ last names; no real NFL player names

## Simulation Engine
- Per-play simulation with configurable offense/defense schemes
- Sack rate, INT rate, completion rate all modified by team ratings + game plan
- Phrase pools for broadcast-style descriptions (5+ variants per play type)
- Overtime: sudden death, first score wins
- Stats accumulate on player objects for season totals
- 17-game regular season schedule (rounds to 18 weeks with bye)

## Env Secrets Required
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Design Tokens
- Background: `#0a0a0f`
- NFL Blue: `#013369`
- NFL Red: `#d50a0a`
- NFL Gold: `#ffd700`
- Card: `#13131a`
- Border: `#252535`

## Supabase Setup (one-time)
Run `supabase-setup.sql` in the Supabase SQL Editor before multiplayer works. Enables RLS, realtime, and all required tables.
