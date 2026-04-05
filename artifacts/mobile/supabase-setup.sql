-- =====================================================
-- FootballSim Co-GM: Supabase Setup SQL
-- Run this entire script in your Supabase SQL Editor
-- =====================================================

-- 1. FRANCHISES TABLE
CREATE TABLE IF NOT EXISTS franchises (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  team_id     TEXT NOT NULL,
  join_code   TEXT UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  created_by  UUID REFERENCES auth.users(id)
);

-- 2. FRANCHISE MEMBERS TABLE (roles: GM, Coach, Scout)
CREATE TABLE IF NOT EXISTS franchise_members (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE NOT NULL,
  user_id      UUID REFERENCES auth.users(id) NOT NULL,
  display_name TEXT NOT NULL,
  role         TEXT CHECK (role IN ('GM', 'Coach', 'Scout')) NOT NULL DEFAULT 'Scout',
  joined_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (franchise_id, user_id)
);

-- 3. FRANCHISE STATE TABLE (full JSON game state)
CREATE TABLE IF NOT EXISTS franchise_state (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE UNIQUE NOT NULL,
  state_json   JSONB NOT NULL,
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_by   UUID REFERENCES auth.users(id)
);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE franchises         ENABLE ROW LEVEL SECURITY;
ALTER TABLE franchise_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE franchise_state    ENABLE ROW LEVEL SECURITY;

-- FRANCHISES: anyone authenticated can create; members can read; creator can delete
CREATE POLICY "auth_create_franchise" ON franchises
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "member_read_franchise" ON franchises
  FOR SELECT USING (
    id IN (SELECT franchise_id FROM franchise_members WHERE user_id = auth.uid())
  );

CREATE POLICY "creator_delete_franchise" ON franchises
  FOR DELETE USING (created_by = auth.uid());

-- FRANCHISE MEMBERS: members can read own franchise's members; anyone can join; owner can manage
CREATE POLICY "member_read_members" ON franchise_members
  FOR SELECT USING (
    franchise_id IN (SELECT franchise_id FROM franchise_members WHERE user_id = auth.uid())
  );

CREATE POLICY "auth_join_franchise" ON franchise_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "member_leave_franchise" ON franchise_members
  FOR DELETE USING (user_id = auth.uid());

-- FRANCHISE STATE: members can read; GM/Coach can write
CREATE POLICY "member_read_state" ON franchise_state
  FOR SELECT USING (
    franchise_id IN (
      SELECT franchise_id FROM franchise_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "gmcoach_write_state" ON franchise_state
  FOR INSERT WITH CHECK (
    franchise_id IN (
      SELECT franchise_id FROM franchise_members
      WHERE user_id = auth.uid() AND role IN ('GM', 'Coach')
    )
  );

CREATE POLICY "gmcoach_update_state" ON franchise_state
  FOR UPDATE USING (
    franchise_id IN (
      SELECT franchise_id FROM franchise_members
      WHERE user_id = auth.uid() AND role IN ('GM', 'Coach')
    )
  );

-- =====================================================
-- ENABLE REALTIME
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE franchise_state;
ALTER PUBLICATION supabase_realtime ADD TABLE franchise_members;

-- =====================================================
-- HELPER: auto-update updated_at on franchise_state
-- =====================================================

CREATE OR REPLACE FUNCTION update_franchise_state_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER franchise_state_updated
  BEFORE UPDATE ON franchise_state
  FOR EACH ROW EXECUTE FUNCTION update_franchise_state_timestamp();
