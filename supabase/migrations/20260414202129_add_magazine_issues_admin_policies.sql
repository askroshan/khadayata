/*
  # Add magazine_issues admin management policies

  ## Summary
  Allow Global Admin and Data Steward roles to insert and update magazine issues.
  Currently magazine_issues only has SELECT policy, blocking admins from uploading.

  ## Changes
  - Add INSERT policy for Data Steward and Global Admin
  - Add UPDATE policy for Data Steward and Global Admin
  - Add DELETE policy for Data Steward and Global Admin
*/

DROP POLICY IF EXISTS "Admins can insert magazine issues" ON public.magazine_issues;
DROP POLICY IF EXISTS "Admins can update magazine issues" ON public.magazine_issues;
DROP POLICY IF EXISTS "Admins can delete magazine issues" ON public.magazine_issues;

CREATE POLICY "Admins can insert magazine issues" ON public.magazine_issues FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'Global Admin') OR public.has_role(auth.uid(), 'Data Steward'));

CREATE POLICY "Admins can update magazine issues" ON public.magazine_issues FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'Global Admin') OR public.has_role(auth.uid(), 'Data Steward'))
WITH CHECK (public.has_role(auth.uid(), 'Global Admin') OR public.has_role(auth.uid(), 'Data Steward'));

CREATE POLICY "Admins can delete magazine issues" ON public.magazine_issues FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'Global Admin') OR public.has_role(auth.uid(), 'Data Steward'));
