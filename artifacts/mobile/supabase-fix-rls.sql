-- =====================================================
-- VFL RLS Fix — run in Supabase SQL Editor
-- Fixes "infinite recursion detected in policy for
-- relation franchise_members" by using a SECURITY
-- DEFINER function that bypasses RLS when checking
-- membership, breaking the recursive loop.
-- =====================================================

-- 1. Security-definer helper: checks membership without
--    triggering franchise_members' own RLS policy.
CREATE OR REPLACE FUNCTION is_franchise_member(fid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM franchise_members
    WHERE franchise_id = fid
      AND user_id = auth.uid()
  );
$$;

-- 2. franchise_seasons policies
DROP POLICY IF EXISTS "seasons_select" ON franchise_seasons;
DROP POLICY IF EXISTS "seasons_insert" ON franchise_seasons;
DROP POLICY IF EXISTS "seasons_update" ON franchise_seasons;

CREATE POLICY "seasons_select" ON franchise_seasons
  FOR SELECT USING (is_franchise_member(franchise_id));

CREATE POLICY "seasons_insert" ON franchise_seasons
  FOR INSERT WITH CHECK (is_franchise_member(franchise_id));

CREATE POLICY "seasons_update" ON franchise_seasons
  FOR UPDATE USING (is_franchise_member(franchise_id));

-- 3. franchise_proposals policies
DROP POLICY IF EXISTS "proposals_select" ON franchise_proposals;
DROP POLICY IF EXISTS "proposals_insert" ON franchise_proposals;
DROP POLICY IF EXISTS "proposals_update" ON franchise_proposals;

CREATE POLICY "proposals_select" ON franchise_proposals
  FOR SELECT USING (is_franchise_member(franchise_id));

CREATE POLICY "proposals_insert" ON franchise_proposals
  FOR INSERT WITH CHECK (is_franchise_member(franchise_id));

CREATE POLICY "proposals_update" ON franchise_proposals
  FOR UPDATE USING (is_franchise_member(franchise_id));

-- 4. franchise_votes policies
DROP POLICY IF EXISTS "votes_select" ON franchise_votes;
DROP POLICY IF EXISTS "votes_insert" ON franchise_votes;

CREATE POLICY "votes_select" ON franchise_votes
  FOR SELECT USING (is_franchise_member(franchise_id));

CREATE POLICY "votes_insert" ON franchise_votes
  FOR INSERT WITH CHECK (
    is_franchise_member(franchise_id)
    AND user_id = auth.uid()
  );
