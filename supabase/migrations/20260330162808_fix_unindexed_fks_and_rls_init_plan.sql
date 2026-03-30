/*
  # Fix Unindexed Foreign Keys and RLS Auth Init Plan Issues

  ## Summary
  Addresses all security/performance advisories:

  1. **Unindexed Foreign Keys** — 9 FK columns missing covering indexes
  2. **RLS Auth Init Plan** — policies calling auth.uid() inline (re-evaluated per row).
     Fixed by wrapping all auth calls in (select auth.uid()) subqueries, evaluated once per statement.
  3. **Multiple Permissive Policies** — duplicate INSERT/SELECT/UPDATE policies on rishta_requests consolidated
  4. **RLS Policy Always True** — chapter_transfer_history INSERT policy restricted to admins only

  Tables: banned_keywords, chapter_transfer_history, council_replies, council_threads,
          council_votes, obituaries, rishta_requests, sms_messages, vouch_requests
*/

-- ============================================================
-- PART 1: ADD MISSING FK INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_banned_keywords_added_by
  ON public.banned_keywords (added_by);

CREATE INDEX IF NOT EXISTS idx_cth_approved_by
  ON public.chapter_transfer_history (approved_by);

CREATE INDEX IF NOT EXISTS idx_cth_initiated_by
  ON public.chapter_transfer_history (initiated_by);

CREATE INDEX IF NOT EXISTS idx_council_replies_author_id
  ON public.council_replies (author_id);

CREATE INDEX IF NOT EXISTS idx_council_votes_member_id
  ON public.council_votes (member_id);

CREATE INDEX IF NOT EXISTS idx_donor_wall_chapter_id
  ON public.donor_wall (chapter_id);

CREATE INDEX IF NOT EXISTS idx_samiti_groups_chapter_id
  ON public.samiti_groups (chapter_id);

CREATE INDEX IF NOT EXISTS idx_sms_messages_recipient_member_id
  ON public.sms_messages (recipient_member_id);

CREATE INDEX IF NOT EXISTS idx_sms_messages_sent_by
  ON public.sms_messages (sent_by);

-- ============================================================
-- PART 2: FIX RLS AUTH INIT PLAN + ALWAYS TRUE INSERT — chapter_transfer_history
-- ============================================================

DROP POLICY IF EXISTS "Chapter admins view their chapter history" ON public.chapter_transfer_history;
DROP POLICY IF EXISTS "Global admins view all chapter history" ON public.chapter_transfer_history;
DROP POLICY IF EXISTS "Members view own chapter history" ON public.chapter_transfer_history;
DROP POLICY IF EXISTS "Authenticated users can insert transfer history" ON public.chapter_transfer_history;

CREATE POLICY "Chapter admins view their chapter history"
  ON public.chapter_transfer_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.role_assignments ra
      JOIN public.roles r ON r.id = ra.role_id
      WHERE ra.member_id = (
        SELECT id FROM public.members WHERE user_id = (select auth.uid()) LIMIT 1
      )
      AND r.name = 'Chapter Admin'
      AND r.chapter_id = ANY (ARRAY[from_chapter_id, to_chapter_id])
      AND (ra.end_date IS NULL OR ra.end_date > now())
    )
  );

CREATE POLICY "Global admins view all chapter history"
  ON public.chapter_transfer_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.role_assignments ra
      JOIN public.roles r ON r.id = ra.role_id
      WHERE ra.member_id = (
        SELECT id FROM public.members WHERE user_id = (select auth.uid()) LIMIT 1
      )
      AND r.name = ANY (ARRAY['Global Admin', 'Data Steward'])
      AND (ra.end_date IS NULL OR ra.end_date > now())
    )
  );

CREATE POLICY "Members view own chapter history"
  ON public.chapter_transfer_history FOR SELECT
  TO authenticated
  USING (
    member_id = (
      SELECT id FROM public.members WHERE user_id = (select auth.uid()) LIMIT 1
    )
  );

CREATE POLICY "Authenticated users can insert transfer history"
  ON public.chapter_transfer_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.role_assignments ra
      JOIN public.roles r ON r.id = ra.role_id
      WHERE ra.member_id = (
        SELECT id FROM public.members WHERE user_id = (select auth.uid()) LIMIT 1
      )
      AND r.name = ANY (ARRAY['Global Admin', 'Chapter Admin'])
      AND (ra.end_date IS NULL OR ra.end_date > now())
    )
  );

-- ============================================================
-- PART 3: FIX RLS AUTH INIT PLAN + MULTIPLE PERMISSIVE POLICIES — rishta_requests
-- ============================================================

DROP POLICY IF EXISTS "Members can create rishta requests from their own profile" ON public.rishta_requests;
DROP POLICY IF EXISTS "Members can create rishta requests" ON public.rishta_requests;
DROP POLICY IF EXISTS "Members can update rishta requests they are party to" ON public.rishta_requests;
DROP POLICY IF EXISTS "Members can update their received rishta requests" ON public.rishta_requests;
DROP POLICY IF EXISTS "Members can view rishta requests for their profile" ON public.rishta_requests;
DROP POLICY IF EXISTS "Members can view their own rishta requests" ON public.rishta_requests;

CREATE POLICY "Members can create rishta requests from their own profile"
  ON public.rishta_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    from_profile_id IN (
      SELECT mp.id FROM public.matrimonial_profiles mp
      JOIN public.members m ON m.id = mp.member_id
      WHERE m.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Members can update rishta requests they are party to"
  ON public.rishta_requests FOR UPDATE
  TO authenticated
  USING (
    from_profile_id IN (
      SELECT mp.id FROM public.matrimonial_profiles mp
      JOIN public.members m ON m.id = mp.member_id
      WHERE m.user_id = (select auth.uid())
    )
    OR to_profile_id IN (
      SELECT mp.id FROM public.matrimonial_profiles mp
      JOIN public.members m ON m.id = mp.member_id
      WHERE m.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    from_profile_id IN (
      SELECT mp.id FROM public.matrimonial_profiles mp
      JOIN public.members m ON m.id = mp.member_id
      WHERE m.user_id = (select auth.uid())
    )
    OR to_profile_id IN (
      SELECT mp.id FROM public.matrimonial_profiles mp
      JOIN public.members m ON m.id = mp.member_id
      WHERE m.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Members can view rishta requests for their profile"
  ON public.rishta_requests FOR SELECT
  TO authenticated
  USING (
    from_profile_id IN (
      SELECT mp.id FROM public.matrimonial_profiles mp
      JOIN public.members m ON m.id = mp.member_id
      WHERE m.user_id = (select auth.uid())
    )
    OR to_profile_id IN (
      SELECT mp.id FROM public.matrimonial_profiles mp
      JOIN public.members m ON m.id = mp.member_id
      WHERE m.user_id = (select auth.uid())
    )
  );

-- ============================================================
-- PART 4: FIX RLS AUTH INIT PLAN — council_replies
-- ============================================================

DROP POLICY IF EXISTS "L1+ verified members can post council replies" ON public.council_replies;
DROP POLICY IF EXISTS "Reply author can delete own council reply" ON public.council_replies;

CREATE POLICY "L1+ verified members can post council replies"
  ON public.council_replies FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id IN (
      SELECT id FROM public.members
      WHERE user_id = (select auth.uid())
        AND verification_level >= 1
    )
  );

CREATE POLICY "Reply author can delete own council reply"
  ON public.council_replies FOR DELETE
  TO authenticated
  USING (
    author_id IN (
      SELECT id FROM public.members WHERE user_id = (select auth.uid())
    )
  );

-- ============================================================
-- PART 5: FIX RLS AUTH INIT PLAN — council_threads
-- ============================================================

DROP POLICY IF EXISTS "L3+ members can create council threads" ON public.council_threads;
DROP POLICY IF EXISTS "Thread author or Global Admin can delete thread" ON public.council_threads;
DROP POLICY IF EXISTS "Thread author or Global Admin can update thread" ON public.council_threads;

CREATE POLICY "L3+ members can create council threads"
  ON public.council_threads FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id IN (
      SELECT id FROM public.members
      WHERE user_id = (select auth.uid())
        AND verification_level >= 3
    )
  );

CREATE POLICY "Thread author or Global Admin can delete thread"
  ON public.council_threads FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE user_id = (select auth.uid()) AND id = council_threads.author_id
    )
    OR EXISTS (
      SELECT 1 FROM public.role_assignments ra
      JOIN public.roles r ON r.id = ra.role_id
      WHERE ra.member_id = (
        SELECT id FROM public.members WHERE user_id = (select auth.uid()) LIMIT 1
      )
      AND r.name = 'Global Admin'
    )
  );

CREATE POLICY "Thread author or Global Admin can update thread"
  ON public.council_threads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE user_id = (select auth.uid()) AND id = council_threads.author_id
    )
    OR EXISTS (
      SELECT 1 FROM public.role_assignments ra
      JOIN public.roles r ON r.id = ra.role_id
      WHERE ra.member_id = (
        SELECT id FROM public.members WHERE user_id = (select auth.uid()) LIMIT 1
      )
      AND r.name = 'Global Admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE user_id = (select auth.uid()) AND id = council_threads.author_id
    )
    OR EXISTS (
      SELECT 1 FROM public.role_assignments ra
      JOIN public.roles r ON r.id = ra.role_id
      WHERE ra.member_id = (
        SELECT id FROM public.members WHERE user_id = (select auth.uid()) LIMIT 1
      )
      AND r.name = 'Global Admin'
    )
  );

-- ============================================================
-- PART 6: FIX RLS AUTH INIT PLAN — council_votes
-- ============================================================

DROP POLICY IF EXISTS "Members can cast their own council vote" ON public.council_votes;
DROP POLICY IF EXISTS "Members can delete their own council vote" ON public.council_votes;

CREATE POLICY "Members can cast their own council vote"
  ON public.council_votes FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id IN (
      SELECT id FROM public.members WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Members can delete their own council vote"
  ON public.council_votes FOR DELETE
  TO authenticated
  USING (
    member_id IN (
      SELECT id FROM public.members WHERE user_id = (select auth.uid())
    )
  );

-- ============================================================
-- PART 7: FIX RLS AUTH INIT PLAN — banned_keywords
-- ============================================================

DROP POLICY IF EXISTS "Admins can read banned keywords" ON public.banned_keywords;
DROP POLICY IF EXISTS "Global Admin can delete banned keywords" ON public.banned_keywords;
DROP POLICY IF EXISTS "Global Admin can insert banned keywords" ON public.banned_keywords;
DROP POLICY IF EXISTS "Global Admin can update banned keywords" ON public.banned_keywords;

CREATE POLICY "Admins can read banned keywords"
  ON public.banned_keywords FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.role_assignments ra
      JOIN public.roles r ON r.id = ra.role_id
      WHERE ra.member_id = (
        SELECT id FROM public.members WHERE user_id = (select auth.uid()) LIMIT 1
      )
      AND r.name = ANY (ARRAY['Global Admin', 'Moderator', 'Data Steward'])
    )
  );

CREATE POLICY "Global Admin can insert banned keywords"
  ON public.banned_keywords FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.role_assignments ra
      JOIN public.roles r ON r.id = ra.role_id
      WHERE ra.member_id = (
        SELECT id FROM public.members WHERE user_id = (select auth.uid()) LIMIT 1
      )
      AND r.name = 'Global Admin'
    )
  );

CREATE POLICY "Global Admin can update banned keywords"
  ON public.banned_keywords FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.role_assignments ra
      JOIN public.roles r ON r.id = ra.role_id
      WHERE ra.member_id = (
        SELECT id FROM public.members WHERE user_id = (select auth.uid()) LIMIT 1
      )
      AND r.name = 'Global Admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.role_assignments ra
      JOIN public.roles r ON r.id = ra.role_id
      WHERE ra.member_id = (
        SELECT id FROM public.members WHERE user_id = (select auth.uid()) LIMIT 1
      )
      AND r.name = 'Global Admin'
    )
  );

CREATE POLICY "Global Admin can delete banned keywords"
  ON public.banned_keywords FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.role_assignments ra
      JOIN public.roles r ON r.id = ra.role_id
      WHERE ra.member_id = (
        SELECT id FROM public.members WHERE user_id = (select auth.uid()) LIMIT 1
      )
      AND r.name = 'Global Admin'
    )
  );

-- ============================================================
-- PART 8: FIX RLS AUTH INIT PLAN — sms_messages
-- ============================================================

DROP POLICY IF EXISTS "Global Admin can insert SMS messages" ON public.sms_messages;
DROP POLICY IF EXISTS "Global Admin can read SMS messages" ON public.sms_messages;

CREATE POLICY "Global Admin can insert SMS messages"
  ON public.sms_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.role_assignments ra
      JOIN public.roles r ON r.id = ra.role_id
      WHERE ra.member_id = (
        SELECT id FROM public.members WHERE user_id = (select auth.uid()) LIMIT 1
      )
      AND r.name = 'Global Admin'
    )
  );

CREATE POLICY "Global Admin can read SMS messages"
  ON public.sms_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.role_assignments ra
      JOIN public.roles r ON r.id = ra.role_id
      WHERE ra.member_id = (
        SELECT id FROM public.members WHERE user_id = (select auth.uid()) LIMIT 1
      )
      AND r.name = 'Global Admin'
    )
  );

-- ============================================================
-- PART 9: FIX RLS AUTH INIT PLAN — vouch_requests
-- ============================================================

DROP POLICY IF EXISTS "Requesters can insert own vouch requests" ON public.vouch_requests;
DROP POLICY IF EXISTS "Requesters can view own sent requests" ON public.vouch_requests;
DROP POLICY IF EXISTS "Targets can update request status" ON public.vouch_requests;

CREATE POLICY "Requesters can insert own vouch requests"
  ON public.vouch_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    requester_member_id IN (
      SELECT id FROM public.members WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Requesters can view own sent requests"
  ON public.vouch_requests FOR SELECT
  TO authenticated
  USING (
    requester_member_id IN (
      SELECT id FROM public.members WHERE user_id = (select auth.uid())
    )
    OR target_member_id IN (
      SELECT id FROM public.members WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Targets can update request status"
  ON public.vouch_requests FOR UPDATE
  TO authenticated
  USING (
    target_member_id IN (
      SELECT id FROM public.members WHERE user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    target_member_id IN (
      SELECT id FROM public.members WHERE user_id = (select auth.uid())
    )
  );

-- ============================================================
-- PART 10: FIX RLS AUTH INIT PLAN — obituaries
-- ============================================================

DROP POLICY IF EXISTS "Authorized roles can insert obituaries" ON public.obituaries;
DROP POLICY IF EXISTS "Authorized roles can update obituaries" ON public.obituaries;
DROP POLICY IF EXISTS "Global admins can delete obituaries" ON public.obituaries;

CREATE POLICY "Authorized roles can insert obituaries"
  ON public.obituaries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.role_assignments ra
      JOIN public.roles r ON r.id = ra.role_id
      WHERE ra.member_id = (
        SELECT id FROM public.members WHERE user_id = (select auth.uid()) LIMIT 1
      )
      AND r.name = ANY (ARRAY['Global Admin', 'Moderator', 'Chapter Admin', 'News Publisher'])
    )
  );

CREATE POLICY "Authorized roles can update obituaries"
  ON public.obituaries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.role_assignments ra
      JOIN public.roles r ON r.id = ra.role_id
      WHERE ra.member_id = (
        SELECT id FROM public.members WHERE user_id = (select auth.uid()) LIMIT 1
      )
      AND r.name = ANY (ARRAY['Global Admin', 'Moderator', 'Chapter Admin', 'News Publisher'])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.role_assignments ra
      JOIN public.roles r ON r.id = ra.role_id
      WHERE ra.member_id = (
        SELECT id FROM public.members WHERE user_id = (select auth.uid()) LIMIT 1
      )
      AND r.name = ANY (ARRAY['Global Admin', 'Moderator', 'Chapter Admin', 'News Publisher'])
    )
  );

CREATE POLICY "Global admins can delete obituaries"
  ON public.obituaries FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.role_assignments ra
      JOIN public.roles r ON r.id = ra.role_id
      WHERE ra.member_id = (
        SELECT id FROM public.members WHERE user_id = (select auth.uid()) LIMIT 1
      )
      AND r.name = 'Global Admin'
    )
  );
