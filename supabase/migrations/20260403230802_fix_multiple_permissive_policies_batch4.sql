/*
  # Fix Multiple Permissive Policies

  Consolidates multiple permissive SELECT policies on chapter_transfer_history
  and multiple permissive SELECT/UPDATE policies on family_invitations into
  single policies each, using OR conditions. This eliminates the security
  advisor warning about multiple permissive policies that can cause unexpected
  access behavior.

  ## Changes

  ### chapter_transfer_history
  - Drops 3 separate SELECT policies (members, chapter admins, global admins)
  - Replaces with 1 consolidated SELECT policy using OR logic

  ### family_invitations
  - Drops 2 separate SELECT policies (token lookup + own invitations)
  - Replaces with 1 consolidated SELECT policy
  - Drops 2 separate UPDATE policies (token acceptance + own invitations)
  - Replaces with 1 consolidated UPDATE policy
*/

-- ============================================================
-- chapter_transfer_history: consolidate 3 SELECT policies → 1
-- ============================================================
DROP POLICY IF EXISTS "Members view own chapter history" ON public.chapter_transfer_history;
DROP POLICY IF EXISTS "Chapter admins view their chapter history" ON public.chapter_transfer_history;
DROP POLICY IF EXISTS "Global admins view all chapter history" ON public.chapter_transfer_history;

CREATE POLICY "Members and admins view chapter transfer history"
  ON public.chapter_transfer_history
  FOR SELECT
  TO authenticated
  USING (
    -- own record
    member_id = (
      SELECT id FROM members WHERE user_id = (SELECT auth.uid()) LIMIT 1
    )
    OR
    -- chapter admin for the from/to chapter
    EXISTS (
      SELECT 1
      FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (
          SELECT id FROM members WHERE user_id = (SELECT auth.uid()) LIMIT 1
        )
        AND r.name = 'Chapter Admin'
        AND r.chapter_id = ANY(ARRAY[chapter_transfer_history.from_chapter_id, chapter_transfer_history.to_chapter_id])
        AND (ra.end_date IS NULL OR ra.end_date > now())
    )
    OR
    -- global admin / data steward
    EXISTS (
      SELECT 1
      FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (
          SELECT id FROM members WHERE user_id = (SELECT auth.uid()) LIMIT 1
        )
        AND r.name = ANY(ARRAY['Global Admin', 'Data Steward'])
        AND (ra.end_date IS NULL OR ra.end_date > now())
    )
  );

-- ============================================================
-- family_invitations: consolidate SELECT policies → 1
-- ============================================================
DROP POLICY IF EXISTS "Anyone can look up invitation by token" ON public.family_invitations;
DROP POLICY IF EXISTS "Members read own invitations" ON public.family_invitations;

CREATE POLICY "Members read own or token invitations"
  ON public.family_invitations
  FOR SELECT
  TO authenticated
  USING (
    -- own invitation
    inviter_member_id IN (
      SELECT id FROM members WHERE user_id = (SELECT auth.uid())
    )
    OR
    -- lookup by token (non-null token)
    acceptance_token IS NOT NULL
  );

-- anon still needs token lookup for the accept page
CREATE POLICY "Anon can look up invitation by token"
  ON public.family_invitations
  FOR SELECT
  TO anon
  USING (acceptance_token IS NOT NULL);

-- ============================================================
-- family_invitations: consolidate UPDATE policies → 1
-- ============================================================
DROP POLICY IF EXISTS "Authenticated member can accept invitation by token" ON public.family_invitations;
DROP POLICY IF EXISTS "Members can update own invitations" ON public.family_invitations;

CREATE POLICY "Members can update own or accept by token"
  ON public.family_invitations
  FOR UPDATE
  TO authenticated
  USING (
    -- own invitation (can manage it)
    inviter_member_id IN (
      SELECT id FROM members WHERE user_id = (SELECT auth.uid())
    )
    OR
    -- accepting via token
    acceptance_token IS NOT NULL
  )
  WITH CHECK (
    -- own invitation: any status allowed
    inviter_member_id IN (
      SELECT id FROM members WHERE user_id = (SELECT auth.uid())
    )
    OR
    -- token acceptance: only accepted/pending
    status = ANY(ARRAY['accepted', 'pending'])
  );
