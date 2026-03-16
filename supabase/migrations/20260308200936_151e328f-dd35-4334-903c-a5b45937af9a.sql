-- Fix overly permissive families insert policy
DROP POLICY "Users can create families" ON public.families;
CREATE POLICY "Authenticated users can create families" ON public.families FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.members WHERE user_id = auth.uid())
  );