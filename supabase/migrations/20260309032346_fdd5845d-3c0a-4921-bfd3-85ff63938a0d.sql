
-- Event galleries / photos table
CREATE TABLE public.event_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES public.members(id),
  url text NOT NULL,
  caption text,
  consent text NOT NULL DEFAULT 'internal',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.event_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read event photos" ON public.event_photos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Members can upload photos" ON public.event_photos
  FOR INSERT TO authenticated
  WITH CHECK (uploaded_by IN (SELECT id FROM public.members WHERE user_id = auth.uid()));

CREATE POLICY "Uploaders can delete own photos" ON public.event_photos
  FOR DELETE TO authenticated
  USING (uploaded_by IN (SELECT id FROM public.members WHERE user_id = auth.uid()));

-- Photo tags (member tagging in photos)
CREATE TABLE public.photo_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id uuid NOT NULL REFERENCES public.event_photos(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  tagged_by uuid REFERENCES public.members(id),
  consent_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(photo_id, member_id)
);

ALTER TABLE public.photo_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read photo tags" ON public.photo_tags
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Members can tag" ON public.photo_tags
  FOR INSERT TO authenticated
  WITH CHECK (tagged_by IN (SELECT id FROM public.members WHERE user_id = auth.uid()));

CREATE POLICY "Tagged members can update consent" ON public.photo_tags
  FOR UPDATE TO authenticated
  USING (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));

CREATE POLICY "Taggers can delete tags" ON public.photo_tags
  FOR DELETE TO authenticated
  USING (tagged_by IN (SELECT id FROM public.members WHERE user_id = auth.uid()));
