-- =====================================================
-- VFL Multiplayer Schema — Migration v2
-- Run in your Supabase SQL Editor
--
-- What changes:
--   • franchise_state (one JSON blob) is replaced by
--     franchise_seasons (structured columns + sim_state)
--   • proposals/votes move out of the blob into their
--     own tables with proper rows, RLS, and realtime
--   • franchise_state is LEFT in place (not dropped)
--     so you can backfill if needed, then drop manually
-- =====================================================

-- ── 1. franchise_seasons ─────────────────────────────────────────────────────
-- Structured replacement for franchise_state.
-- sim_state JSONB still carries the full game-engine
-- snapshot; phase/week/record are promoted to columns
-- so queries don't have to parse the blob.

CREATE TABLE IF NOT EXISTS franchise_seasons (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id uuid        NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
  year         integer     NOT NULL DEFAULT 2026,
  phase        text        NOT NULL DEFAULT 'regular',
  week         integer     NOT NULL DEFAULT 1,
  record       jsonb       NOT NULL DEFAULT '{"wins":0,"losses":0,"ties":0}',
  sim_state    jsonb,
  updated_by   uuid        REFERENCES auth.users(id),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE(franchise_id)           -- one active season per franchise
);

ALTER TABLE franchise_seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seasons_select" ON franchise_seasons
  FOR SELECT USING (
    franchise_id IN (
      SELECT franchise_id FROM franchise_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "seasons_insert" ON franchise_seasons
  FOR INSERT WITH CHECK (
    franchise_id IN (
      SELECT franchise_id FROM franchise_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "seasons_update" ON franchise_seasons
  FOR UPDATE USING (
    franchise_id IN (
      SELECT franchise_id FROM franchise_members WHERE user_id = auth.uid()
    )
  );


-- ── 2. franchise_proposals ───────────────────────────────────────────────────
-- Each row is one co-GM proposal (FA signing, trade,
-- draft pick, phase advance).  No longer embedded in JSON.

CREATE TABLE IF NOT EXISTS franchise_proposals (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id    uuid        NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
  type            text        NOT NULL,
  description     text        NOT NULL,
  payload         jsonb       NOT NULL DEFAULT '{}',
  status          text        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','approved','rejected')),
  required_votes  integer     NOT NULL DEFAULT 2,
  created_by      uuid        REFERENCES auth.users(id),
  created_by_name text        NOT NULL,
  created_at      timestamptz DEFAULT now(),
  resolved_at     timestamptz
);

ALTER TABLE franchise_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proposals_select" ON franchise_proposals
  FOR SELECT USING (
    franchise_id IN (
      SELECT franchise_id FROM franchise_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "proposals_insert" ON franchise_proposals
  FOR INSERT WITH CHECK (
    franchise_id IN (
      SELECT franchise_id FROM franchise_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "proposals_update" ON franchise_proposals
  FOR UPDATE USING (
    franchise_id IN (
      SELECT franchise_id FROM franchise_members WHERE user_id = auth.uid()
    )
  );


-- ── 3. franchise_votes ───────────────────────────────────────────────────────
-- One row per user per proposal.
-- UNIQUE(proposal_id, user_id) prevents double-voting.

CREATE TABLE IF NOT EXISTS franchise_votes (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id  uuid        NOT NULL REFERENCES franchise_proposals(id) ON DELETE CASCADE,
  franchise_id uuid        NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES auth.users(id),
  vote         text        NOT NULL CHECK (vote IN ('yes','no')),
  display_name text        NOT NULL,
  voted_at     timestamptz DEFAULT now(),
  UNIQUE(proposal_id, user_id)
);

ALTER TABLE franchise_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "votes_select" ON franchise_votes
  FOR SELECT USING (
    franchise_id IN (
      SELECT franchise_id FROM franchise_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "votes_insert" ON franchise_votes
  FOR INSERT WITH CHECK (
    franchise_id IN (
      SELECT franchise_id FROM franchise_members WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );


-- ── 4. Auto-update timestamp on franchise_seasons ─────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS franchise_seasons_updated ON franchise_seasons;
CREATE TRIGGER franchise_seasons_updated
  BEFORE UPDATE ON franchise_seasons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── 5. Enable realtime for all three new tables ───────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE franchise_seasons;
ALTER PUBLICATION supabase_realtime ADD TABLE franchise_proposals;
ALTER PUBLICATION supabase_realtime ADD TABLE franchise_votes;
