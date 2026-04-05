# FootballSim — Co-GM NFL Franchise Simulator

## Overview
An NFL franchise simulator built in Expo React Native where multiple users share a single franchise in real time via Supabase. All 32 real NFL teams with diverse fictional rosters, realistic ratings, and broadcast-style play-by-play simulation. Full Madden-depth franchise mode with free agency, draft war room, trade builder, injury system, and depth chart management.

## Architecture

### Engine Files
- `artifacts/mobile/context/types.ts` — Full type system: all interfaces (Player, Season, NFLGame, DraftState, PlayByPlayEvent, DriveEntry, etc.)
- `artifacts/mobile/context/SimEngine.ts` — Full play-by-play sim engine: weather, fatigue/momentum, sack/fumble/INT/TD resolution, clock, drive tracking, OT
- `artifacts/mobile/context/DraftEngine.ts` — 252-prospect draft class generator: combine measurables, college stats, archetypes, strengths/weaknesses, AI pick logic
- `artifacts/mobile/context/NFLContext.tsx` — Full NFL context: all 32 teams + realistic rosters, FA signing, releases, restructures, depth chart, game plan, sim week, draft, trades, phase advancement, Supabase sync (cache v8)
- `artifacts/mobile/context/AuthContext.tsx` — Supabase Auth, franchise creation/joining, role management

### App Files
- `artifacts/mobile/lib/supabase.ts` — Supabase JS client (reads from env secrets)
- `artifacts/mobile/supabase-setup.sql` — SQL schema to run in Supabase SQL Editor
- `artifacts/mobile/app/_layout.tsx` — Root layout with auth-gated routing
- `artifacts/mobile/app/auth/login.tsx` — Sign in screen
- `artifacts/mobile/app/auth/register.tsx` — Account creation
- `artifacts/mobile/app/franchise/index.tsx` — Create/Join franchise lobby

### Tab Screens
- `artifacts/mobile/app/(tabs)/index.tsx` — ESPN-style home: animated news ticker, team hero card (cap bar, stat chips), quick-action grid, weather game card, conference standings, recent news feed
- `artifacts/mobile/app/(tabs)/roster.tsx` — Depth chart by position + dev trait badges (X-Factor/Superstar/etc.), injury indicators, contract details, game plan / formation / scheme selectors, FA signing panel
- `artifacts/mobile/app/(tabs)/frontoffice.tsx` — Free Agency (interest meter, 1/2/3yr offers), Draft (Board/Combine/War Room sub-views, sortable combine table, scouting lock), Trades (player chip builder, AI value meter, incoming offer accept/decline)
- `artifacts/mobile/app/(tabs)/schedule.tsx` — Season schedule with week selector
- `artifacts/mobile/app/(tabs)/standings.tsx` — Full NFL standings by conference/division

### Game Screen
- `artifacts/mobile/app/game/[id].tsx` — Four tabs: Play-by-Play (live feed), Box Score, Drive Chart (field bar), Stats Sheet; weather banner; down/distance bar; momentum meter; injury callouts; speed control

## Supabase Schema (run supabase-setup.sql)
- `franchises` — franchise info + 6-char join code
- `franchise_members` — user roles per franchise (GM/Coach/Scout)
- `franchise_state` — full JSON season state, real-time synced via Supabase Realtime

## Co-GM Multiplayer
- **GM**: Full access — roster moves, free agency, trades, contracts, simulate games
- **Coach**: Game plan and formation access; no contract/FA/trade powers
- **Scout**: Read-only view of all data
- Real-time sync via Supabase Realtime websocket channel

## Key Design Decisions
- Cache key: `nfl_season_v8` (AsyncStorage fallback if Supabase disabled)
- Default player team: Kansas City Chiefs (index 13 in NFL_TEAMS)
- Theme: `#0a0a0f` background, `#013369` NFL blue, `#d50a0a` NFL red, `#ffd700` NFL gold. Team's primaryColor drives active UI.
- `simulateGame()` returns `void` — saves game internally; game screen reads back from season.games after simulate completes
- Elite player probability: ~15% of designated elite roster slots
- Season phase cycle: `regular → playoffs → offseason → freeAgency → draft → preseason → regular`
- Draft class: 252 prospects per year (7 rounds × 32 teams + some extra); sorted by grade descending

## Env Secrets Required
- `EXPO_PUBLIC_SUPABASE_URL` — Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `SESSION_SECRET` — API server session secret
