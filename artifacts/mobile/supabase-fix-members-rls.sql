-- =====================================================
-- VFL RLS Fix #2 — franchise_members SELECT policy
-- Run in Supabase SQL Editor
--
-- The franchise_members SELECT policy was self-referential
-- (it queried franchise_members to check if you can read
-- franchise_members), causing infinite recursion and
-- making membership look null for all users.
--
-- Fix: use the is_franchise_member() SECURITY DEFINER
-- function (created in the previous fix) which bypasses
-- RLS, breaking the loop. Also allow users to always
-- see their own row directly.
-- =====================================================

DROP POLICY IF EXISTS "members_select" ON franchise_members;

CREATE POLICY "members_select" ON franchise_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR is_franchise_member(franchise_id)
  );
