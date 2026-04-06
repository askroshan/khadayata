/*
  # Add Committee Role Definitions

  1. New Roles
    - Committee Chair: Head of the chapter committee
    - Committee Secretary: Secretary of the chapter committee
    - Committee Treasurer: Treasurer of the chapter committee
    - Committee Member: General committee member

  2. Changes
    - Inserts committee-specific roles into roles table for each existing chapter
    - Scoped to 'chapter' scope
    - Allows Chapter Admins to manage committee assignments

  3. Security
    - Uses existing role_assignments table with RLS
    - Chapter Admins can only assign roles within their chapter
    - No new RLS policies required - existing framework handles scoping

  4. Notes
    - Committee roles follow existing pattern of chapter-scoped roles
    - Administrators can assign these via RolesTab when myChapterId is set
    - Future UI can add specialized committee management interface
*/

DO $$
BEGIN
  INSERT INTO public.roles (chapter_id, name, scope)
  SELECT id, 'Committee Chair', 'chapter'
  FROM public.chapters
  WHERE NOT EXISTS (
    SELECT 1 FROM public.roles WHERE chapter_id = chapters.id AND name = 'Committee Chair'
  );

  INSERT INTO public.roles (chapter_id, name, scope)
  SELECT id, 'Committee Secretary', 'chapter'
  FROM public.chapters
  WHERE NOT EXISTS (
    SELECT 1 FROM public.roles WHERE chapter_id = chapters.id AND name = 'Committee Secretary'
  );

  INSERT INTO public.roles (chapter_id, name, scope)
  SELECT id, 'Committee Treasurer', 'chapter'
  FROM public.chapters
  WHERE NOT EXISTS (
    SELECT 1 FROM public.roles WHERE chapter_id = chapters.id AND name = 'Committee Treasurer'
  );

  INSERT INTO public.roles (chapter_id, name, scope)
  SELECT id, 'Committee Member', 'chapter'
  FROM public.chapters
  WHERE NOT EXISTS (
    SELECT 1 FROM public.roles WHERE chapter_id = chapters.id AND name = 'Committee Member'
  );
END $$;