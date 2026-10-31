-- Role platform wiring: Finance Admin approve paths, Chapter Admin / Moderator
-- event management, obituaries role names, announcements chapter_id (BUG-028 / US-131).

-- ─── Announcements: chapter scope ────────────────────────────────────────────
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS chapter_id uuid REFERENCES public.chapters(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_announcements_chapter_id ON public.announcements(chapter_id);

-- ─── Hall bookings: Finance Admin approve / read ─────────────────────────────
DROP POLICY IF EXISTS "Members can read own and admins can read all bookings" ON public.hall_bookings;
CREATE POLICY "Members can read own and admins can read all bookings"
  ON public.hall_bookings FOR SELECT TO authenticated
  USING (
    member_id IN (SELECT id FROM public.members WHERE user_id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'Global Admin')
    OR has_role((SELECT auth.uid()), 'Chapter Admin')
    OR has_role((SELECT auth.uid()), 'Finance Admin')
  );

DROP POLICY IF EXISTS "Members can update own and admins can update all bookings" ON public.hall_bookings;
CREATE POLICY "Members can update own and admins can update all bookings"
  ON public.hall_bookings FOR UPDATE TO authenticated
  USING (
    member_id IN (SELECT id FROM public.members WHERE user_id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'Global Admin')
    OR has_role((SELECT auth.uid()), 'Chapter Admin')
    OR has_role((SELECT auth.uid()), 'Finance Admin')
  )
  WITH CHECK (
    member_id IN (SELECT id FROM public.members WHERE user_id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'Global Admin')
    OR has_role((SELECT auth.uid()), 'Chapter Admin')
    OR has_role((SELECT auth.uid()), 'Finance Admin')
  );

-- ─── Medical aid: Finance Admin approve / read ───────────────────────────────
DROP POLICY IF EXISTS "Members read own medical aid" ON public.medical_aid_requests;
CREATE POLICY "Members read own medical aid"
  ON public.medical_aid_requests FOR SELECT TO authenticated
  USING (
    member_id IN (SELECT id FROM public.members WHERE user_id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'Global Admin')
    OR has_role((SELECT auth.uid()), 'Chapter Admin')
    OR has_role((SELECT auth.uid()), 'Finance Admin')
  );

DROP POLICY IF EXISTS "Admins can manage medical aid" ON public.medical_aid_requests;
CREATE POLICY "Admins can manage medical aid"
  ON public.medical_aid_requests FOR UPDATE TO authenticated
  USING (
    has_role((SELECT auth.uid()), 'Global Admin')
    OR has_role((SELECT auth.uid()), 'Chapter Admin')
    OR has_role((SELECT auth.uid()), 'Finance Admin')
  );

-- ─── Scholarship applications: Finance Admin review ──────────────────────────
DROP POLICY IF EXISTS "Global Admin can read all scholarship applications" ON public.scholarship_applications;
CREATE POLICY "Global Admin can read all scholarship applications"
  ON public.scholarship_applications FOR SELECT TO authenticated
  USING (
    has_role((SELECT auth.uid()), 'Global Admin')
    OR has_role((SELECT auth.uid()), 'Finance Admin')
    OR member_id IN (SELECT id FROM public.members WHERE user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Global Admin can update scholarship applications" ON public.scholarship_applications;
CREATE POLICY "Global Admin can update scholarship applications"
  ON public.scholarship_applications FOR UPDATE TO authenticated
  USING (
    has_role((SELECT auth.uid()), 'Global Admin')
    OR has_role((SELECT auth.uid()), 'Finance Admin')
  );

-- ─── Events: Chapter Admin + Moderator can manage (match canManageEvents) ────
DROP POLICY IF EXISTS "Admins can delete events" ON public.events;
CREATE POLICY "Admins can delete events"
  ON public.events FOR DELETE TO authenticated
  USING (
    has_role((SELECT auth.uid()), 'Global Admin')
    OR has_role((SELECT auth.uid()), 'Event Manager')
    OR has_role((SELECT auth.uid()), 'Chapter Admin')
    OR has_role((SELECT auth.uid()), 'Moderator')
  );

DROP POLICY IF EXISTS "Creators and managers can update events" ON public.events;
CREATE POLICY "Creators and managers can update events"
  ON public.events FOR UPDATE TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR has_role((SELECT auth.uid()), 'Global Admin')
    OR has_role((SELECT auth.uid()), 'Event Manager')
    OR has_role((SELECT auth.uid()), 'Chapter Admin')
    OR has_role((SELECT auth.uid()), 'Moderator')
  );

-- ─── Obituaries: fix nonexistent 'News Publisher' role name ──────────────────
DROP POLICY IF EXISTS "Authorized roles can insert obituaries" ON public.obituaries;
CREATE POLICY "Authorized roles can insert obituaries"
  ON public.obituaries FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.role_assignments ra
      JOIN public.roles r ON r.id = ra.role_id
      JOIN public.members m ON m.id = ra.member_id
      WHERE m.user_id = (SELECT auth.uid())
        AND (ra.end_date IS NULL OR ra.end_date >= CURRENT_DATE)
        AND r.name = ANY (ARRAY[
          'Global Admin',
          'Chapter Admin',
          'Global Publisher',
          'Publisher',
          'Moderator'
        ])
    )
  );

DROP POLICY IF EXISTS "Authorized roles can update obituaries" ON public.obituaries;
CREATE POLICY "Authorized roles can update obituaries"
  ON public.obituaries FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.role_assignments ra
      JOIN public.roles r ON r.id = ra.role_id
      JOIN public.members m ON m.id = ra.member_id
      WHERE m.user_id = (SELECT auth.uid())
        AND (ra.end_date IS NULL OR ra.end_date >= CURRENT_DATE)
        AND r.name = ANY (ARRAY[
          'Global Admin',
          'Chapter Admin',
          'Global Publisher',
          'Publisher',
          'Moderator'
        ])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.role_assignments ra
      JOIN public.roles r ON r.id = ra.role_id
      JOIN public.members m ON m.id = ra.member_id
      WHERE m.user_id = (SELECT auth.uid())
        AND (ra.end_date IS NULL OR ra.end_date >= CURRENT_DATE)
        AND r.name = ANY (ARRAY[
          'Global Admin',
          'Chapter Admin',
          'Global Publisher',
          'Publisher',
          'Moderator'
        ])
    )
  );
