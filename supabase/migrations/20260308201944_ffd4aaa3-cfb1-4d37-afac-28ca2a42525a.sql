-- Fix event_checkins overly permissive insert
DROP POLICY "Authenticated can create checkins" ON public.event_checkins;
CREATE POLICY "Event managers can create checkins" ON public.event_checkins FOR INSERT TO authenticated
  WITH CHECK (
    scanned_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.created_by = auth.uid())
  );