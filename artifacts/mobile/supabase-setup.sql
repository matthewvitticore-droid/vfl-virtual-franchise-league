-- =====================================================
-- VFL (Virtual Franchise League) — Canonical Supabase Schema
-- Run this in the Supabase SQL Editor for a fresh setup.
-- For existing installs that have the v1 schema, run
-- supabase-migration-v2.sql instead.
-- =====================================================


-- ── 1. franchises ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS franchises (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  team_id     TEXT NOT NULL,
  join_code   TEXT UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  created_by  UUID REFERENCES auth.users(id)
);

-- ── 2. franchise_members ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS franchise_members (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE NOT NULL,
  user_id      UUID REFERENCES auth.users(id) NOT NULL,
  display_name TEXT NOT NULL,
  role         TEXT CHECK (role IN ('GM', 'Coach', 'Scout')) NOT NULL DEFAULT 'Scout',
  joined_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (franchise_id, user_id)
);

-- ── 3. franchise_seasons ──────────────────────────────────────────────────────
-- Structured replacement for franchise_state (v1 blob).
-- sim_state JSONB carries the full game-engine snapshot;
-- phase/week/record are promoted columns for fast queries.
CREATE TABLE IF NOT EXISTS franchise_seasons (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id UUID        NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
  year         INTEGER     NOT NULL DEFAULT 2026,
  phase        TEXT        NOT NULL DEFAULT 'regular',
  week         INTEGER     NOT NULL DEFAULT 1,
  record       JSONB       NOT NULL DEFAULT '{"wins":0,"losses":0,"ties":0}',
  sim_state    JSONB,
  updated_by   UUID        REFERENCES auth.users(id),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(franchise_id)          -- one active season per franchise
);

-- ── 4. franchise_proposals ────────────────────────────────────────────────────
-- One row per co-GM proposal (FA signing, trade, draft pick, phase advance).
-- No longer embedded in the season JSON blob.
CREATE TABLE IF NOT EXISTS franchise_proposals (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id    UUID        NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
  type            TEXT        NOT NULL,
  description     TEXT        NOT NULL,
  payload         JSONB       NOT NULL DEFAULT '{}',
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','approved','rejected')),
  required_votes  INTEGER     NOT NULL DEFAULT 2,
  created_by      UUID        REFERENCES auth.users(id),
  created_by_name TEXT        NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ
);

-- ── 5. franchise_votes ────────────────────────────────────────────────────────
-- One row per user per proposal. UNIQUE prevents double-voting.
CREATE TABLE IF NOT EXISTS franchise_votes (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id  UUID        NOT NULL REFERENCES franchise_proposals(id) ON DELETE CASCADE,
  franchise_id UUID        NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES auth.users(id),
  vote         TEXT        NOT NULL CHECK (vote IN ('yes','no')),
  display_name TEXT        NOT NULL,
  voted_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(proposal_id, user_id)
);


-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE franchises          ENABLE ROW LEVEL SECURITY;
ALTER TABLE franchise_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE franchise_seasons   ENABLE ROW LEVEL SECURITY;
ALTER TABLE franchise_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE franchise_votes     ENABLE ROW LEVEL SECURITY;

-- franchises: any authenticated user can create or read (needed for join-by-code)
CREATE POLICY "auth_create_franchise"  ON franchises FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_read_franchise"    ON franchises FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "creator_delete_franchise" ON franchises FOR DELETE USING (created_by = auth.uid());

-- franchise_members
CREATE POLICY "member_read_members"    ON franchise_members FOR SELECT USING (
  franchise_id IN (SELECT franchise_id FROM franchise_members WHERE user_id = auth.uid())
);
CREATE POLICY "auth_join_franchise"    ON franchise_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "member_leave_franchise" ON franchise_members FOR DELETE USING (user_id = auth.uid());

-- franchise_seasons (any member can read/write their franchise row)
CREATE POLICY "seasons_select" ON franchise_seasons FOR SELECT USING (
  franchise_id IN (SELECT franchise_id FROM franchise_members WHERE user_id = auth.uid())
);
CREATE POLICY "seasons_insert" ON franchise_seasons FOR INSERT WITH CHECK (
  franchise_id IN (SELECT franchise_id FROM franchise_members WHERE user_id = auth.uid())
);
CREATE POLICY "seasons_update" ON franchise_seasons FOR UPDATE USING (
  franchise_id IN (SELECT franchise_id FROM franchise_members WHERE user_id = auth.uid())
);

-- franchise_proposals
CREATE POLICY "proposals_select" ON franchise_proposals FOR SELECT USING (
  franchise_id IN (SELECT franchise_id FROM franchise_members WHERE user_id = auth.uid())
);
CREATE POLICY "proposals_insert" ON franchise_proposals FOR INSERT WITH CHECK (
  franchise_id IN (SELECT franchise_id FROM franchise_members WHERE user_id = auth.uid())
);
CREATE POLICY "proposals_update" ON franchise_proposals FOR UPDATE USING (
  franchise_id IN (SELECT franchise_id FROM franchise_members WHERE user_id = auth.uid())
);

-- franchise_votes
CREATE POLICY "votes_select" ON franchise_votes FOR SELECT USING (
  franchise_id IN (SELECT franchise_id FROM franchise_members WHERE user_id = auth.uid())
);
CREATE POLICY "votes_insert" ON franchise_votes FOR INSERT WITH CHECK (
  franchise_id IN (SELECT franchise_id FROM franchise_members WHERE user_id = auth.uid())
  AND user_id = auth.uid()
);


-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS franchise_seasons_updated ON franchise_seasons;
CREATE TRIGGER franchise_seasons_updated
  BEFORE UPDATE ON franchise_seasons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- =====================================================
-- REALTIME
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE franchise_members;
ALTER PUBLICATION supabase_realtime ADD TABLE franchise_seasons;
ALTER PUBLICATION supabase_realtime ADD TABLE franchise_proposals;
ALTER PUBLICATION supabase_realtime ADD TABLE franchise_votes;
