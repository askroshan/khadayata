
-- Hall bookings table
CREATE TABLE public.hall_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID REFERENCES public.chapters(id),
  member_id UUID NOT NULL REFERENCES public.members(id),
  hall_name TEXT NOT NULL,
  purpose TEXT,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  guests INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  approved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hall_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read bookings" ON public.hall_bookings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Members can create bookings" ON public.hall_bookings FOR INSERT TO authenticated WITH CHECK (member_id IN (SELECT id FROM members WHERE user_id = auth.uid()));
CREATE POLICY "Members can update own bookings" ON public.hall_bookings FOR UPDATE TO authenticated USING (member_id IN (SELECT id FROM members WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage bookings" ON public.hall_bookings FOR ALL TO authenticated USING (has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Chapter Admin'));

-- Medical aid requests
CREATE TABLE public.medical_aid_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id),
  chapter_id UUID REFERENCES public.chapters(id),
  patient_name TEXT NOT NULL,
  relation TEXT NOT NULL DEFAULT 'self',
  condition_summary TEXT,
  amount_needed NUMERIC,
  currency TEXT NOT NULL DEFAULT 'INR',
  documents JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by UUID,
  approved_amount NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.medical_aid_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read own medical aid" ON public.medical_aid_requests FOR SELECT TO authenticated USING (member_id IN (SELECT id FROM members WHERE user_id = auth.uid()) OR has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Chapter Admin'));
CREATE POLICY "Members can request medical aid" ON public.medical_aid_requests FOR INSERT TO authenticated WITH CHECK (member_id IN (SELECT id FROM members WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage medical aid" ON public.medical_aid_requests FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Chapter Admin'));

-- Oral history recordings
CREATE TABLE public.oral_histories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  narrator_name TEXT,
  narrator_member_id UUID REFERENCES public.members(id),
  recorded_date DATE,
  media_url TEXT,
  media_type TEXT NOT NULL DEFAULT 'audio',
  duration_seconds INTEGER,
  transcript TEXT,
  tags TEXT[] DEFAULT '{}'::text[],
  status TEXT NOT NULL DEFAULT 'draft',
  uploaded_by UUID REFERENCES public.members(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.oral_histories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published oral histories" ON public.oral_histories FOR SELECT TO authenticated USING (status = 'published' OR uploaded_by IN (SELECT id FROM members WHERE user_id = auth.uid()));
CREATE POLICY "Members can upload oral histories" ON public.oral_histories FOR INSERT TO authenticated WITH CHECK (uploaded_by IN (SELECT id FROM members WHERE user_id = auth.uid()));
CREATE POLICY "Uploaders can update" ON public.oral_histories FOR UPDATE TO authenticated USING (uploaded_by IN (SELECT id FROM members WHERE user_id = auth.uid()));

-- Heritage tags (crowdsourced)
CREATE TABLE public.heritage_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  tag TEXT NOT NULL,
  tagged_by UUID REFERENCES public.members(id),
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.heritage_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read approved tags" ON public.heritage_tags FOR SELECT TO authenticated USING (approved = true OR tagged_by IN (SELECT id FROM members WHERE user_id = auth.uid()));
CREATE POLICY "Members can add tags" ON public.heritage_tags FOR INSERT TO authenticated WITH CHECK (tagged_by IN (SELECT id FROM members WHERE user_id = auth.uid()));

-- WhatsApp templates
CREATE TABLE public.whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  language TEXT NOT NULL DEFAULT 'en',
  category TEXT NOT NULL DEFAULT 'UTILITY',
  header_text TEXT,
  body_text TEXT NOT NULL,
  footer_text TEXT,
  buttons JSONB DEFAULT '[]'::jsonb,
  meta_template_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage templates" ON public.whatsapp_templates FOR ALL TO authenticated USING (has_role(auth.uid(), 'Global Admin'));
CREATE POLICY "Authenticated can read templates" ON public.whatsapp_templates FOR SELECT TO authenticated USING (true);

-- WhatsApp message log
CREATE TABLE public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.whatsapp_templates(id),
  recipient_phone TEXT NOT NULL,
  recipient_member_id UUID REFERENCES public.members(id),
  parameters JSONB DEFAULT '{}'::jsonb,
  meta_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage messages" ON public.whatsapp_messages FOR ALL TO authenticated USING (has_role(auth.uid(), 'Global Admin'));

-- Oral history storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('oral-histories', 'oral-histories', true);

CREATE POLICY "Members can upload oral history media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'oral-histories');
CREATE POLICY "Anyone can read oral history media" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'oral-histories');

-- Enable realtime for hall bookings
ALTER PUBLICATION supabase_realtime ADD TABLE public.hall_bookings;
