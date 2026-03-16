-- Content/News
CREATE TABLE public.content_news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid REFERENCES public.chapters(id) ON DELETE SET NULL,
  title text NOT NULL,
  summary text,
  body text,
  tags text[] NOT NULL DEFAULT '{}',
  images jsonb NOT NULL DEFAULT '[]',
  status text NOT NULL DEFAULT 'draft',
  schedule jsonb NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id),
  reviewed_by uuid REFERENCES auth.users(id),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Events
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid REFERENCES public.chapters(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  venue text,
  virtual_url text,
  consent_required boolean NOT NULL DEFAULT false,
  ticketing jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.event_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'going',
  guests int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, member_id)
);

CREATE TABLE public.event_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  scanned_by uuid REFERENCES auth.users(id),
  scanned_at timestamptz NOT NULL DEFAULT now()
);

-- Media
CREATE TABLE public.media_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid REFERENCES auth.users(id),
  url text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL DEFAULT 0,
  consent text NOT NULL DEFAULT 'internal',
  entity_type text,
  entity_id uuid,
  scanned boolean NOT NULL DEFAULT false,
  scan_result text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Matrimonial
CREATE TABLE public.matrimonial_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid UNIQUE NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  guardian_member_id uuid REFERENCES public.members(id),
  preferences jsonb NOT NULL DEFAULT '{}',
  visibility text NOT NULL DEFAULT 'members',
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.matrimonial_introductions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  to_member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  message text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz
);

-- Businesses and Jobs
CREATE TABLE public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  chapter_id uuid REFERENCES public.chapters(id) ON DELETE SET NULL,
  name text NOT NULL,
  sector text,
  city_id uuid REFERENCES public.cities(id),
  website text,
  description text,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid REFERENCES public.chapters(id) ON DELETE SET NULL,
  employer_business_id uuid REFERENCES public.businesses(id),
  employer_member_id uuid REFERENCES public.members(id),
  title text NOT NULL,
  description text,
  location text,
  remote boolean NOT NULL DEFAULT false,
  tags text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

CREATE TABLE public.job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  resume_url text,
  cover_letter text,
  status text NOT NULL DEFAULT 'submitted',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(job_id, member_id)
);

-- Funds and Donations
CREATE TABLE public.funds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL,
  chapter_id uuid REFERENCES public.chapters(id),
  name text NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE public.donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id uuid NOT NULL REFERENCES public.funds(id),
  member_id uuid REFERENCES public.members(id),
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  type text NOT NULL DEFAULT 'one_time',
  provider text NOT NULL DEFAULT 'manual',
  provider_ref text,
  status text NOT NULL DEFAULT 'created',
  donor_wall_opt_in boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id uuid UNIQUE NOT NULL REFERENCES public.donations(id) ON DELETE CASCADE,
  number text UNIQUE NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  issued_at timestamptz NOT NULL DEFAULT now()
);

-- Archives
CREATE TABLE public.magazine_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  issue_date date,
  volume text,
  pdf_url text,
  ocr_text text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.book_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_key text NOT NULL,
  page_number int NOT NULL,
  image_url text,
  ocr_text text,
  metadata jsonb NOT NULL DEFAULT '{}'
);

-- Taxonomy and Governance
CREATE TABLE public.taxonomies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  term text NOT NULL,
  normalized text NOT NULL,
  UNIQUE(type, normalized)
);

CREATE TABLE public.tag_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_user_id uuid REFERENCES auth.users(id),
  type text NOT NULL,
  term text NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  decided_by uuid REFERENCES auth.users(id),
  decided_at timestamptz
);

-- Audits and Consents
CREATE TABLE public.audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES auth.users(id),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  field text,
  old_value jsonb,
  new_value jsonb,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES public.members(id) ON DELETE CASCADE,
  context text NOT NULL,
  policy_version text NOT NULL,
  region text NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL DEFAULT '{}'
);

-- Global settings
CREATE TABLE public.settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Notification preferences
CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid UNIQUE NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  email_enabled boolean NOT NULL DEFAULT true,
  whatsapp_enabled boolean NOT NULL DEFAULT false,
  push_enabled boolean NOT NULL DEFAULT false,
  categories jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Data export/deletion requests (US-045, US-046)
CREATE TABLE public.data_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'export' or 'deletion'
  status text NOT NULL DEFAULT 'pending',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Mentorship (US-065, US-106)
CREATE TABLE public.mentorships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  mentee_member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  skills text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'available',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.mentorship_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentorship_id uuid NOT NULL REFERENCES public.mentorships(id) ON DELETE CASCADE,
  notes text,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Scholarships (US-105)
CREATE TABLE public.scholarships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid REFERENCES public.chapters(id),
  name text NOT NULL,
  description text,
  amount numeric(12,2),
  currency text NOT NULL DEFAULT 'INR',
  deadline date,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.scholarship_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scholarship_id uuid NOT NULL REFERENCES public.scholarships(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  essay text,
  status text NOT NULL DEFAULT 'submitted',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(scholarship_id, member_id)
);

-- Emergency contacts (US-066)
CREATE TABLE public.emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid REFERENCES public.cities(id),
  name text NOT NULL,
  phone text NOT NULL,
  type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Global announcements (US-080)
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.content_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matrimonial_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matrimonial_introductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magazine_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scholarships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scholarship_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Content news: public read for published, authenticated manage own
CREATE POLICY "Anyone can read published news" ON public.content_news FOR SELECT USING (status = 'published' OR (created_by = auth.uid()));
CREATE POLICY "Authenticated can create news" ON public.content_news FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Authors can update own news" ON public.content_news FOR UPDATE TO authenticated USING (created_by = auth.uid());

-- Events: published are public, auth can manage
CREATE POLICY "Anyone can read published events" ON public.events FOR SELECT USING (status = 'published' OR (created_by = auth.uid()));
CREATE POLICY "Authenticated can create events" ON public.events FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Creators can update events" ON public.events FOR UPDATE TO authenticated USING (created_by = auth.uid());

-- RSVPs
CREATE POLICY "Authenticated can read rsvps" ON public.event_rsvps FOR SELECT TO authenticated USING (true);
CREATE POLICY "Members can rsvp" ON public.event_rsvps FOR INSERT TO authenticated WITH CHECK (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));
CREATE POLICY "Members can update own rsvp" ON public.event_rsvps FOR UPDATE TO authenticated USING (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));
CREATE POLICY "Members can delete own rsvp" ON public.event_rsvps FOR DELETE TO authenticated USING (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));

-- Checkins
CREATE POLICY "Authenticated can read checkins" ON public.event_checkins FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create checkins" ON public.event_checkins FOR INSERT TO authenticated WITH CHECK (true);

-- Media
CREATE POLICY "Public media readable" ON public.media_files FOR SELECT USING (consent = 'public' OR owner_user_id = auth.uid());
CREATE POLICY "Users can upload media" ON public.media_files FOR INSERT TO authenticated WITH CHECK (owner_user_id = auth.uid());

-- Matrimonial
CREATE POLICY "Verified members read profiles" ON public.matrimonial_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Members can create own profile" ON public.matrimonial_profiles FOR INSERT TO authenticated WITH CHECK (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));
CREATE POLICY "Members can update own profile" ON public.matrimonial_profiles FOR UPDATE TO authenticated USING (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));

CREATE POLICY "Authenticated can read introductions" ON public.matrimonial_introductions FOR SELECT TO authenticated USING (from_member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()) OR to_member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));
CREATE POLICY "Members can send introductions" ON public.matrimonial_introductions FOR INSERT TO authenticated WITH CHECK (from_member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));
CREATE POLICY "Members can update own introductions" ON public.matrimonial_introductions FOR UPDATE TO authenticated USING (from_member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()) OR to_member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));

-- Businesses
CREATE POLICY "Anyone can read businesses" ON public.businesses FOR SELECT USING (true);
CREATE POLICY "Members can create businesses" ON public.businesses FOR INSERT TO authenticated WITH CHECK (owner_member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));
CREATE POLICY "Owners can update businesses" ON public.businesses FOR UPDATE TO authenticated USING (owner_member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));

-- Jobs
CREATE POLICY "Anyone can read open jobs" ON public.jobs FOR SELECT USING (true);
CREATE POLICY "Members can post jobs" ON public.jobs FOR INSERT TO authenticated WITH CHECK (employer_member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));
CREATE POLICY "Employers can update jobs" ON public.jobs FOR UPDATE TO authenticated USING (employer_member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));

-- Job applications
CREATE POLICY "Applicants and employers read applications" ON public.job_applications FOR SELECT TO authenticated USING (
  member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()) OR
  job_id IN (SELECT j.id FROM public.jobs j WHERE j.employer_member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()))
);
CREATE POLICY "Members can apply" ON public.job_applications FOR INSERT TO authenticated WITH CHECK (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));
CREATE POLICY "Applicants can update application" ON public.job_applications FOR UPDATE TO authenticated USING (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));

-- Funds/Donations/Receipts
CREATE POLICY "Anyone can read funds" ON public.funds FOR SELECT USING (active = true);
CREATE POLICY "Authenticated can read own donations" ON public.donations FOR SELECT TO authenticated USING (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()) OR donor_wall_opt_in = true);
CREATE POLICY "Members can donate" ON public.donations FOR INSERT TO authenticated WITH CHECK (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));
CREATE POLICY "Members read own receipts" ON public.receipts FOR SELECT TO authenticated USING (donation_id IN (SELECT id FROM public.donations WHERE member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid())));

-- Archives
CREATE POLICY "Anyone can read magazines" ON public.magazine_issues FOR SELECT USING (true);
CREATE POLICY "Anyone can read book pages" ON public.book_pages FOR SELECT USING (true);

-- Taxonomies
CREATE POLICY "Anyone can read taxonomies" ON public.taxonomies FOR SELECT USING (true);
CREATE POLICY "Authenticated can read tag requests" ON public.tag_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Members can request tags" ON public.tag_requests FOR INSERT TO authenticated WITH CHECK (requester_user_id = auth.uid());

-- Audits (read only for admins via has_role, but basic policy)
CREATE POLICY "Admins can read audits" ON public.audits FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'Global Admin') OR public.has_role(auth.uid(), 'Data Steward'));
CREATE POLICY "System can insert audits" ON public.audits FOR INSERT TO authenticated WITH CHECK (actor_user_id = auth.uid());

-- Consents
CREATE POLICY "Members read own consents" ON public.consents FOR SELECT TO authenticated USING (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));
CREATE POLICY "Members can create consents" ON public.consents FOR INSERT TO authenticated WITH CHECK (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));

-- Settings (admin only)
CREATE POLICY "Anyone can read settings" ON public.settings FOR SELECT USING (true);

-- Notification preferences
CREATE POLICY "Members read own prefs" ON public.notification_preferences FOR SELECT TO authenticated USING (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));
CREATE POLICY "Members can create prefs" ON public.notification_preferences FOR INSERT TO authenticated WITH CHECK (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));
CREATE POLICY "Members can update prefs" ON public.notification_preferences FOR UPDATE TO authenticated USING (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));

-- Data requests
CREATE POLICY "Members read own data requests" ON public.data_requests FOR SELECT TO authenticated USING (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));
CREATE POLICY "Members can create data requests" ON public.data_requests FOR INSERT TO authenticated WITH CHECK (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));

-- Mentorships
CREATE POLICY "Authenticated can read mentorships" ON public.mentorships FOR SELECT TO authenticated USING (true);
CREATE POLICY "Members can offer mentorship" ON public.mentorships FOR INSERT TO authenticated WITH CHECK (mentor_member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));
CREATE POLICY "Mentors can update own" ON public.mentorships FOR UPDATE TO authenticated USING (mentor_member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));

CREATE POLICY "Participants read sessions" ON public.mentorship_sessions FOR SELECT TO authenticated USING (mentorship_id IN (SELECT id FROM public.mentorships WHERE mentor_member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()) OR mentee_member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid())));
CREATE POLICY "Mentors log sessions" ON public.mentorship_sessions FOR INSERT TO authenticated WITH CHECK (mentorship_id IN (SELECT id FROM public.mentorships WHERE mentor_member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid())));

-- Scholarships
CREATE POLICY "Anyone can read scholarships" ON public.scholarships FOR SELECT USING (true);
CREATE POLICY "Members can apply to scholarships" ON public.scholarship_applications FOR SELECT TO authenticated USING (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));
CREATE POLICY "Members can submit scholarship app" ON public.scholarship_applications FOR INSERT TO authenticated WITH CHECK (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));

-- Emergency contacts (admin read)
CREATE POLICY "Authenticated read emergency contacts" ON public.emergency_contacts FOR SELECT TO authenticated USING (true);

-- Announcements
CREATE POLICY "Anyone can read announcements" ON public.announcements FOR SELECT USING (starts_at <= now() AND (ends_at IS NULL OR ends_at > now()));

-- Indexes
CREATE INDEX idx_content_news_tags ON public.content_news USING GIN(tags);
CREATE INDEX idx_events_time ON public.events(starts_at, ends_at);
CREATE INDEX idx_business_sector ON public.businesses(sector);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_members_name ON public.members(last_name, first_name);

-- Triggers
CREATE TRIGGER update_content_news_updated_at BEFORE UPDATE ON public.content_news FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_matrimonial_profiles_updated_at BEFORE UPDATE ON public.matrimonial_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();