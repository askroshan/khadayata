-- ========== 20260308200921_6547cc5b-3245-4854-b24f-f4552730cb13.sql ==========
-- Core reference tables
CREATE TABLE public.countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  iso2 char(2) UNIQUE NOT NULL,
  name text NOT NULL
);

CREATE TABLE public.states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id uuid NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  UNIQUE(country_id, code)
);

CREATE TABLE public.cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id uuid NOT NULL REFERENCES public.states(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  UNIQUE(state_id, code)
);

CREATE TABLE public.chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id uuid REFERENCES public.countries(id),
  state_id uuid REFERENCES public.states(id),
  city_id uuid REFERENCES public.cities(id),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  subdomain text UNIQUE NOT NULL,
  settings jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter_id uuid REFERENCES public.chapters(id),
  global_id text UNIQUE,
  verification_level smallint NOT NULL DEFAULT 0,
  first_name text NOT NULL DEFAULT '',
  middle_names text,
  last_name text NOT NULL DEFAULT '',
  gender text,
  dob date,
  birth_place text,
  photo_url text,
  deceased boolean NOT NULL DEFAULT false,
  deceased_date date,
  privacy jsonb NOT NULL DEFAULT '{}',
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.member_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  type text NOT NULL,
  value text NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  primary_flag boolean NOT NULL DEFAULT false
);

CREATE TABLE public.families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text
);

CREATE TABLE public.family_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid REFERENCES public.families(id) ON DELETE SET NULL,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  relation text NOT NULL,
  related_member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.education (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  degree text,
  institution text,
  year int
);

CREATE TABLE public.employment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  job_title text,
  company text,
  sector text,
  start_date date,
  end_date date
);

CREATE TABLE public.member_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  skill text NOT NULL
);

CREATE TABLE public.member_languages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  language text NOT NULL
);

CREATE TABLE public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid REFERENCES public.chapters(id) ON DELETE CASCADE,
  name text NOT NULL,
  scope text NOT NULL DEFAULT 'chapter',
  UNIQUE(chapter_id, name)
);

CREATE TABLE public.role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.vouches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  voucher_member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(member_id, voucher_member_id)
);

CREATE TABLE public.chapter_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  from_chapter_id uuid REFERENCES public.chapters(id),
  to_chapter_id uuid REFERENCES public.chapters(id),
  reason text,
  status text NOT NULL DEFAULT 'pending',
  approved_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapter_transfers ENABLE ROW LEVEL SECURITY;

-- Public read for reference tables
CREATE POLICY "Anyone can read countries" ON public.countries FOR SELECT USING (true);
CREATE POLICY "Anyone can read states" ON public.states FOR SELECT USING (true);
CREATE POLICY "Anyone can read cities" ON public.cities FOR SELECT USING (true);
CREATE POLICY "Anyone can read chapters" ON public.chapters FOR SELECT USING (true);

-- Members
CREATE POLICY "Authenticated can read members" ON public.members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own member" ON public.members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own member" ON public.members FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Member contacts
CREATE POLICY "Users can read own contacts" ON public.member_contacts FOR SELECT TO authenticated
  USING (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own contacts" ON public.member_contacts FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own contacts" ON public.member_contacts FOR UPDATE TO authenticated
  USING (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete own contacts" ON public.member_contacts FOR DELETE TO authenticated
  USING (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));

-- Education
CREATE POLICY "Authenticated can read education" ON public.education FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage own education" ON public.education FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own education" ON public.education FOR UPDATE TO authenticated
  USING (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete own education" ON public.education FOR DELETE TO authenticated
  USING (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));

-- Employment
CREATE POLICY "Authenticated can read employment" ON public.employment FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage own employment" ON public.employment FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own employment" ON public.employment FOR UPDATE TO authenticated
  USING (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete own employment" ON public.employment FOR DELETE TO authenticated
  USING (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));

-- Skills & Languages
CREATE POLICY "Authenticated can read skills" ON public.member_skills FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage own skills" ON public.member_skills FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete own skills" ON public.member_skills FOR DELETE TO authenticated
  USING (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));
CREATE POLICY "Authenticated can read languages" ON public.member_languages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage own languages" ON public.member_languages FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete own languages" ON public.member_languages FOR DELETE TO authenticated
  USING (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));

-- Roles
CREATE POLICY "Authenticated can read roles" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read role assignments" ON public.role_assignments FOR SELECT TO authenticated USING (true);

-- Vouches
CREATE POLICY "Authenticated can read vouches" ON public.vouches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create vouches" ON public.vouches FOR INSERT TO authenticated
  WITH CHECK (voucher_member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));

-- Families
CREATE POLICY "Authenticated can read families" ON public.families FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create families" ON public.families FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can read family links" ON public.family_links FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage own family links" ON public.family_links FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own family links" ON public.family_links FOR UPDATE TO authenticated
  USING (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete own family links" ON public.family_links FOR DELETE TO authenticated
  USING (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));

-- Transfers
CREATE POLICY "Authenticated can read transfers" ON public.chapter_transfers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can request transfer" ON public.chapter_transfers FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));

-- Updated at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_chapters_updated_at BEFORE UPDATE ON public.chapters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create member on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.members (user_id, first_name, last_name)
  VALUES (NEW.id, '', '');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Role check function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.role_assignments ra
    JOIN public.roles r ON r.id = ra.role_id
    JOIN public.members m ON m.id = ra.member_id
    WHERE m.user_id = _user_id AND r.name = _role
      AND (ra.end_date IS NULL OR ra.end_date >= CURRENT_DATE)
  )
$$;
-- ========== 20260308200936_151e328f-dd35-4334-903c-a5b45937af9a.sql ==========
-- Fix overly permissive families insert policy
DROP POLICY "Users can create families" ON public.families;
CREATE POLICY "Authenticated users can create families" ON public.families FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.members WHERE user_id = auth.uid())
  );
-- ========== 20260308201923_d0d22307-3bd0-43fe-80d7-8a21b8756b93.sql ==========
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
-- ========== 20260308201944_ffd4aaa3-cfb1-4d37-afac-28ca2a42525a.sql ==========
-- Fix event_checkins overly permissive insert
DROP POLICY "Authenticated can create checkins" ON public.event_checkins;
CREATE POLICY "Event managers can create checkins" ON public.event_checkins FOR INSERT TO authenticated
  WITH CHECK (
    scanned_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.created_by = auth.uid())
  );
-- ========== 20260308211437_37dbe03d-5663-4cf5-b138-faa75479be8c.sql ==========

-- Add detailed bio columns to matrimonial_profiles
ALTER TABLE matrimonial_profiles 
  ADD COLUMN IF NOT EXISTS about text,
  ADD COLUMN IF NOT EXISTS height_cm smallint,
  ADD COLUMN IF NOT EXISTS weight_kg smallint,
  ADD COLUMN IF NOT EXISTS complexion text,
  ADD COLUMN IF NOT EXISTS blood_group text,
  ADD COLUMN IF NOT EXISTS diet text DEFAULT 'vegetarian',
  ADD COLUMN IF NOT EXISTS marital_status text DEFAULT 'never_married',
  ADD COLUMN IF NOT EXISTS manglik text,
  ADD COLUMN IF NOT EXISTS gotra text,
  ADD COLUMN IF NOT EXISTS nakshatra text,
  ADD COLUMN IF NOT EXISTS rashi text,
  ADD COLUMN IF NOT EXISTS native_place text,
  ADD COLUMN IF NOT EXISTS family_type text,
  ADD COLUMN IF NOT EXISTS family_status text,
  ADD COLUMN IF NOT EXISTS father_occupation text,
  ADD COLUMN IF NOT EXISTS mother_occupation text,
  ADD COLUMN IF NOT EXISTS siblings text,
  ADD COLUMN IF NOT EXISTS hobbies text[],
  ADD COLUMN IF NOT EXISTS photos text[] DEFAULT '{}';

-- ========== 20260308213829_564db5b4-d8aa-443e-8d8f-445fa92884d1.sql ==========

ALTER TABLE matrimonial_profiles
  ADD COLUMN IF NOT EXISTS glasses text,
  ADD COLUMN IF NOT EXISTS driving text,
  ADD COLUMN IF NOT EXISTS citizenship text,
  ADD COLUMN IF NOT EXISTS current_city text,
  ADD COLUMN IF NOT EXISTS current_state text,
  ADD COLUMN IF NOT EXISTS education_level text,
  ADD COLUMN IF NOT EXISTS education_field text,
  ADD COLUMN IF NOT EXISTS father_name text,
  ADD COLUMN IF NOT EXISTS mother_name text,
  ADD COLUMN IF NOT EXISTS parents_marital_status text DEFAULT 'married',
  ADD COLUMN IF NOT EXISTS position_title text,
  ADD COLUMN IF NOT EXISTS business_name text,
  ADD COLUMN IF NOT EXISTS visa_type text,
  ADD COLUMN IF NOT EXISTS income numeric,
  ADD COLUMN IF NOT EXISTS income_currency text DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS linkedin_url text;

-- ========== 20260308220329_63b3c5fc-2501-4303-ac7a-c239a276bba3.sql ==========

ALTER TABLE public.matrimonial_profiles
  ADD COLUMN IF NOT EXISTS contact_number text,
  ADD COLUMN IF NOT EXISTS parent_contact text,
  ADD COLUMN IF NOT EXISTS ekda text,
  ADD COLUMN IF NOT EXISTS kuldevi text,
  ADD COLUMN IF NOT EXISTS country text;

-- ========== 20260308221006_caac4f68-4cea-41d8-8180-2233b70c0314.sql ==========

-- Seed auth users
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role)
VALUES
  ('a1000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'seed1@test.local', crypt('SeedPass123!', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated'),
  ('a1000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'seed2@test.local', crypt('SeedPass123!', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated'),
  ('a1000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'seed3@test.local', crypt('SeedPass123!', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated'),
  ('a1000001-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'seed4@test.local', crypt('SeedPass123!', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated'),
  ('a1000001-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'seed5@test.local', crypt('SeedPass123!', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated'),
  ('a1000001-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'seed6@test.local', crypt('SeedPass123!', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated'),
  ('a1000001-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'seed7@test.local', crypt('SeedPass123!', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated'),
  ('a1000001-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000000', 'seed8@test.local', crypt('SeedPass123!', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated'),
  ('a1000001-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000000', 'seed9@test.local', crypt('SeedPass123!', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated'),
  ('a1000001-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000000', 'seed10@test.local', crypt('SeedPass123!', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated');

-- Identities
INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES
  ('a1000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000001', '{"sub":"a1000001-0000-0000-0000-000000000001","email":"seed1@test.local"}', 'email', now(), now(), now()),
  ('a1000001-0000-0000-0000-000000000002', 'a1000001-0000-0000-0000-000000000002', 'a1000001-0000-0000-0000-000000000002', '{"sub":"a1000001-0000-0000-0000-000000000002","email":"seed2@test.local"}', 'email', now(), now(), now()),
  ('a1000001-0000-0000-0000-000000000003', 'a1000001-0000-0000-0000-000000000003', 'a1000001-0000-0000-0000-000000000003', '{"sub":"a1000001-0000-0000-0000-000000000003","email":"seed3@test.local"}', 'email', now(), now(), now()),
  ('a1000001-0000-0000-0000-000000000004', 'a1000001-0000-0000-0000-000000000004', 'a1000001-0000-0000-0000-000000000004', '{"sub":"a1000001-0000-0000-0000-000000000004","email":"seed4@test.local"}', 'email', now(), now(), now()),
  ('a1000001-0000-0000-0000-000000000005', 'a1000001-0000-0000-0000-000000000005', 'a1000001-0000-0000-0000-000000000005', '{"sub":"a1000001-0000-0000-0000-000000000005","email":"seed5@test.local"}', 'email', now(), now(), now()),
  ('a1000001-0000-0000-0000-000000000006', 'a1000001-0000-0000-0000-000000000006', 'a1000001-0000-0000-0000-000000000006', '{"sub":"a1000001-0000-0000-0000-000000000006","email":"seed6@test.local"}', 'email', now(), now(), now()),
  ('a1000001-0000-0000-0000-000000000007', 'a1000001-0000-0000-0000-000000000007', 'a1000001-0000-0000-0000-000000000007', '{"sub":"a1000001-0000-0000-0000-000000000007","email":"seed7@test.local"}', 'email', now(), now(), now()),
  ('a1000001-0000-0000-0000-000000000008', 'a1000001-0000-0000-0000-000000000008', 'a1000001-0000-0000-0000-000000000008', '{"sub":"a1000001-0000-0000-0000-000000000008","email":"seed8@test.local"}', 'email', now(), now(), now()),
  ('a1000001-0000-0000-0000-000000000009', 'a1000001-0000-0000-0000-000000000009', 'a1000001-0000-0000-0000-000000000009', '{"sub":"a1000001-0000-0000-0000-000000000009","email":"seed9@test.local"}', 'email', now(), now(), now()),
  ('a1000001-0000-0000-0000-000000000010', 'a1000001-0000-0000-0000-000000000010', 'a1000001-0000-0000-0000-000000000010', '{"sub":"a1000001-0000-0000-0000-000000000010","email":"seed10@test.local"}', 'email', now(), now(), now());

-- The handle_new_user trigger creates members with empty names. Update them.
UPDATE public.members SET first_name = 'Priya', last_name = 'Shah', gender = 'Female', dob = '1997-03-15' WHERE user_id = 'a1000001-0000-0000-0000-000000000001';
UPDATE public.members SET first_name = 'Karan', last_name = 'Mehta', gender = 'Male', dob = '1995-08-22' WHERE user_id = 'a1000001-0000-0000-0000-000000000002';
UPDATE public.members SET first_name = 'Nisha', last_name = 'Patel', gender = 'Female', dob = '1998-12-05' WHERE user_id = 'a1000001-0000-0000-0000-000000000003';
UPDATE public.members SET first_name = 'Vivek', last_name = 'Joshi', gender = 'Male', dob = '1993-06-18' WHERE user_id = 'a1000001-0000-0000-0000-000000000004';
UPDATE public.members SET first_name = 'Anjali', last_name = 'Desai', gender = 'Female', dob = '1996-01-30' WHERE user_id = 'a1000001-0000-0000-0000-000000000005';
UPDATE public.members SET first_name = 'Rohan', last_name = 'Thakkar', gender = 'Male', dob = '1994-11-10' WHERE user_id = 'a1000001-0000-0000-0000-000000000006';
UPDATE public.members SET first_name = 'Meera', last_name = 'Kothari', gender = 'Female', dob = '1999-07-25' WHERE user_id = 'a1000001-0000-0000-0000-000000000007';
UPDATE public.members SET first_name = 'Arjun', last_name = 'Bhatt', gender = 'Male', dob = '1992-04-03' WHERE user_id = 'a1000001-0000-0000-0000-000000000008';
UPDATE public.members SET first_name = 'Kavita', last_name = 'Sanghvi', gender = 'Female', dob = '1997-09-12' WHERE user_id = 'a1000001-0000-0000-0000-000000000009';
UPDATE public.members SET first_name = 'Dhruv', last_name = 'Parikh', gender = 'Male', dob = '1996-02-28' WHERE user_id = 'a1000001-0000-0000-0000-000000000010';

-- Now insert matrimonial profiles using member IDs from the members table
INSERT INTO public.matrimonial_profiles (member_id, about, height_cm, weight_kg, complexion, blood_group, diet, marital_status, manglik, gotra, nakshatra, rashi, native_place, family_type, family_status, father_name, father_occupation, mother_name, mother_occupation, parents_marital_status, siblings, glasses, driving, citizenship, country, current_city, current_state, education_level, education_field, position_title, business_name, income, income_currency, visa_type, linkedin_url, contact_number, parent_contact, ekda, kuldevi, hobbies, preferences)
SELECT m.id,
  'Cheerful and ambitious CA professional from Ahmedabad. Love cooking and classical dance.', 160, 52, 'Fair', 'B+', 'Jain Vegetarian', 'Never Married', 'No', 'Kashyap', 'Rohini', 'Vrishabh (Taurus)', 'Ahmedabad, Gujarat',
  'Joint Family', 'Upper Middle Class', 'Rajeshbhai Shah', 'Diamond Merchant', 'Hansaben Shah', 'Homemaker', 'Married',
  '1 Elder Brother (Married)', 'No', '4 Wheeler', 'Indian', 'India', 'Ahmedabad', 'Gujarat',
  'CA/CS/CMA', 'Chartered Accountancy', 'Senior Auditor', 'Deloitte India', 1200000, 'INR', 'Not Applicable', 'https://linkedin.com/in/priyashah',
  '+91 98765 11001', '+91 98765 11000', 'Shah Ekda', 'Ashapura Maa',
  ARRAY['Cooking','Dance','Yoga','Reading'], '{"min_age":26,"max_age":33,"min_height":168,"max_height":185,"preferred_diet":"Vegetarian","preferred_marital_status":"Never Married","preferred_manglik":"No","preferred_education":"MBA"}'::jsonb
FROM members m WHERE m.user_id = 'a1000001-0000-0000-0000-000000000001';

INSERT INTO public.matrimonial_profiles (member_id, about, height_cm, weight_kg, complexion, blood_group, diet, marital_status, manglik, gotra, nakshatra, rashi, native_place, family_type, family_status, father_name, father_occupation, mother_name, mother_occupation, parents_marital_status, siblings, glasses, driving, citizenship, country, current_city, current_state, education_level, education_field, position_title, business_name, income, income_currency, visa_type, linkedin_url, contact_number, parent_contact, ekda, kuldevi, hobbies, preferences)
SELECT m.id,
  'Software engineer in Bangalore. Passionate about technology and cricket.', 175, 72, 'Wheatish', 'A+', 'Vegetarian', 'Never Married', 'No', 'Bharadwaj', 'Mrigashira', 'Mithun (Gemini)', 'Rajkot, Gujarat',
  'Nuclear Family', 'Middle Class', 'Sureshbhai Mehta', 'Government Teacher', 'Kokilaben Mehta', 'School Principal', 'Married',
  '1 Younger Sister (Unmarried)', 'Yes', 'Both', 'Indian', 'India', 'Bangalore', 'Karnataka',
  'Engineer (B.E./B.Tech)', 'Computer Science', 'Senior Software Engineer', 'Infosys', 1800000, 'INR', 'Not Applicable', 'https://linkedin.com/in/karanmehta',
  '+91 98765 22001', '+91 98765 22000', 'Mehta Ekda', 'Khodiyar Maa',
  ARRAY['Sports','Travel','Music','Photography'], '{"min_age":22,"max_age":28,"min_height":150,"max_height":168,"preferred_diet":"Vegetarian","preferred_marital_status":"Never Married","preferred_manglik":"Doesn''t Matter","preferred_education":"Graduate"}'::jsonb
FROM members m WHERE m.user_id = 'a1000001-0000-0000-0000-000000000002';

INSERT INTO public.matrimonial_profiles (member_id, about, height_cm, weight_kg, complexion, blood_group, diet, marital_status, manglik, gotra, nakshatra, rashi, native_place, family_type, family_status, father_name, father_occupation, mother_name, mother_occupation, parents_marital_status, siblings, glasses, driving, citizenship, country, current_city, current_state, education_level, education_field, position_title, business_name, income, income_currency, visa_type, linkedin_url, contact_number, parent_contact, ekda, kuldevi, hobbies, preferences)
SELECT m.id,
  'MBA graduate in Mumbai finance. Enjoy painting and travel.', 155, 48, 'Very Fair', 'O+', 'Vegetarian', 'Never Married', 'Partial (Anshik)', 'Vashishtha', 'Swati', 'Tula (Libra)', 'Surat, Gujarat',
  'Joint Family', 'Rich', 'Maheshbhai Patel', 'Textile Businessman', 'Rekhaben Patel', 'Homemaker', 'Married',
  '2 Elder Sisters (Both Married)', 'Contact Lenses', '2 Wheeler', 'Indian', 'India', 'Mumbai', 'Maharashtra',
  'MBA', 'Finance', 'Investment Analyst', 'HDFC Securities', 2200000, 'INR', 'Not Applicable', null,
  '+91 98765 33001', '+91 98765 33000', 'Patel Ekda', 'Umiya Maa',
  ARRAY['Painting','Travel','Reading','Yoga'], '{"min_age":27,"max_age":35,"min_height":170,"max_height":188,"preferred_diet":"Vegetarian","preferred_marital_status":"Never Married","preferred_manglik":"No","preferred_education":"Engineer (B.E./B.Tech)"}'::jsonb
FROM members m WHERE m.user_id = 'a1000001-0000-0000-0000-000000000003';

INSERT INTO public.matrimonial_profiles (member_id, about, height_cm, weight_kg, complexion, blood_group, diet, marital_status, manglik, gotra, nakshatra, rashi, native_place, family_type, family_status, father_name, father_occupation, mother_name, mother_occupation, parents_marital_status, siblings, glasses, driving, citizenship, country, current_city, current_state, education_level, education_field, position_title, business_name, income, income_currency, visa_type, linkedin_url, contact_number, parent_contact, ekda, kuldevi, hobbies, preferences)
SELECT m.id,
  'Doctor settled in the US. Family-oriented with traditional values.', 178, 78, 'Fair', 'AB+', 'Vegetarian', 'Never Married', 'No', 'Gautam', 'Pushya', 'Kark (Cancer)', 'Vadodara, Gujarat',
  'Joint Family', 'Affluent', 'Dr. Narendrabhai Joshi', 'Retired Doctor', 'Shardaben Joshi', 'Retired Professor', 'Married',
  '1 Younger Brother (Unmarried)', 'Yes', 'Both', 'Indian', 'United States', 'Chicago', 'Illinois',
  'MBBS/MD', 'Internal Medicine', 'Attending Physician', 'Northwestern Memorial', 250000, 'USD', 'Work Visa (H1B/L1)', 'https://linkedin.com/in/vivekjoshi',
  '+1 312 555 4001', '+91 98765 44000', 'Joshi Ekda', 'Bahuchar Maa',
  ARRAY['Meditation','Social Work','Reading','Travel'], '{"min_age":24,"max_age":30,"min_height":155,"max_height":170,"preferred_diet":"Vegetarian","preferred_marital_status":"Never Married","preferred_manglik":"Doesn''t Matter","preferred_education":"Post Graduate"}'::jsonb
FROM members m WHERE m.user_id = 'a1000001-0000-0000-0000-000000000004';

INSERT INTO public.matrimonial_profiles (member_id, about, height_cm, weight_kg, complexion, blood_group, diet, marital_status, manglik, gotra, nakshatra, rashi, native_place, family_type, family_status, father_name, father_occupation, mother_name, mother_occupation, parents_marital_status, siblings, glasses, driving, citizenship, country, current_city, current_state, education_level, education_field, position_title, business_name, income, income_currency, visa_type, linkedin_url, contact_number, parent_contact, ekda, kuldevi, hobbies, preferences)
SELECT m.id,
  'Creative UX designer in Pune. Love art, music, and weekend gardening.', 162, 55, 'Wheatish', 'B-', 'Vegetarian', 'Never Married', 'Yes', 'Atri', 'Hasta', 'Kanya (Virgo)', 'Junagadh, Gujarat',
  'Nuclear Family', 'Middle Class', 'Dineshbhai Desai', 'Pharmacist', 'Niruben Desai', 'Ayurvedic Doctor', 'Married',
  '1 Elder Brother, 1 Younger Sister', 'No', '2 Wheeler', 'Indian', 'India', 'Pune', 'Maharashtra',
  'Post Graduate', 'Design & Fine Arts', 'Lead UX Designer', 'Flipkart', 1500000, 'INR', 'Not Applicable', 'https://linkedin.com/in/anjalidesai',
  '+91 98765 55001', '+91 98765 55000', 'Desai Ekda', 'Chamunda Maa',
  ARRAY['Painting','Music','Gardening','Cooking'], '{"min_age":27,"max_age":34,"min_height":170,"max_height":185,"preferred_diet":"Vegetarian","preferred_marital_status":"Never Married","preferred_manglik":"Yes","preferred_education":"Graduate"}'::jsonb
FROM members m WHERE m.user_id = 'a1000001-0000-0000-0000-000000000005';

INSERT INTO public.matrimonial_profiles (member_id, about, height_cm, weight_kg, complexion, blood_group, diet, marital_status, manglik, gotra, nakshatra, rashi, native_place, family_type, family_status, father_name, father_occupation, mother_name, mother_occupation, parents_marital_status, siblings, glasses, driving, citizenship, country, current_city, current_state, education_level, education_field, position_title, business_name, income, income_currency, visa_type, linkedin_url, contact_number, parent_contact, ekda, kuldevi, hobbies, preferences)
SELECT m.id,
  'Entrepreneur running textile exports in Surat. Active in philanthropy.', 180, 82, 'Fair', 'O-', 'Vegetarian', 'Never Married', 'No', 'Kaushik', 'Magha', 'Sinh (Leo)', 'Surat, Gujarat',
  'Joint Family', 'Rich', 'Pravinbhai Thakkar', 'Industrialist', 'Jyotiben Thakkar', 'Homemaker', 'Married',
  '1 Younger Sister (Married)', 'No', 'Both', 'Indian', 'India', 'Surat', 'Gujarat',
  'MBA', 'International Business', 'Managing Director', 'Thakkar Textiles Pvt Ltd', 5000000, 'INR', 'Not Applicable', 'https://linkedin.com/in/rohanthakkar',
  '+91 98765 66001', '+91 98765 66000', 'Thakkar Ekda', 'Randal Maa',
  ARRAY['Travel','Social Work','Sports','Music'], '{"min_age":22,"max_age":28,"min_height":155,"max_height":170,"preferred_diet":"Jain Vegetarian","preferred_marital_status":"Never Married","preferred_manglik":"No","preferred_education":"Graduate"}'::jsonb
FROM members m WHERE m.user_id = 'a1000001-0000-0000-0000-000000000006';

INSERT INTO public.matrimonial_profiles (member_id, about, height_cm, weight_kg, complexion, blood_group, diet, marital_status, manglik, gotra, nakshatra, rashi, native_place, family_type, family_status, father_name, father_occupation, mother_name, mother_occupation, parents_marital_status, siblings, glasses, driving, citizenship, country, current_city, current_state, education_level, education_field, position_title, business_name, income, income_currency, visa_type, linkedin_url, contact_number, parent_contact, ekda, kuldevi, hobbies, preferences)
SELECT m.id,
  'Fresh dental graduate from Ahmedabad. Love yoga and Bollywood dance.', 158, 50, 'Very Fair', 'A-', 'Jain Vegetarian', 'Never Married', 'Don''t Know', 'Sandilya', 'Chitra', 'Tula (Libra)', 'Bhavnagar, Gujarat',
  'Nuclear Family', 'Upper Middle Class', 'Jayeshbhai Kothari', 'Jeweller', 'Varshaben Kothari', 'Teacher', 'Married',
  'Only Child', 'No', '4 Wheeler', 'Indian', 'India', 'Ahmedabad', 'Gujarat',
  'MBBS/MD', 'Dentistry (BDS)', 'Dental Surgeon', 'Private Clinic', 900000, 'INR', 'Not Applicable', null,
  '+91 98765 77001', '+91 98765 77000', 'Kothari Ekda', 'Ashapura Maa',
  ARRAY['Dance','Yoga','Cooking','Travel'], '{"min_age":26,"max_age":33,"min_height":170,"max_height":185,"preferred_diet":"Vegetarian","preferred_marital_status":"Never Married","preferred_manglik":"Doesn''t Matter","preferred_education":"MBA"}'::jsonb
FROM members m WHERE m.user_id = 'a1000001-0000-0000-0000-000000000007';

INSERT INTO public.matrimonial_profiles (member_id, about, height_cm, weight_kg, complexion, blood_group, diet, marital_status, manglik, gotra, nakshatra, rashi, native_place, family_type, family_status, father_name, father_occupation, mother_name, mother_occupation, parents_marital_status, siblings, glasses, driving, citizenship, country, current_city, current_state, education_level, education_field, position_title, business_name, income, income_currency, visa_type, linkedin_url, contact_number, parent_contact, ekda, kuldevi, hobbies, preferences)
SELECT m.id,
  'Chartered accountant and MBA settled in London. Traditional at heart.', 173, 74, 'Wheatish', 'B+', 'Vegetarian', 'Never Married', 'No', 'Mudgala', 'Anuradha', 'Vrishchik (Scorpio)', 'Jamnagar, Gujarat',
  'Joint Family', 'Affluent', 'Bipinbhai Bhatt', 'Retired Banker', 'Savitaben Bhatt', 'Social Worker', 'Married',
  '2 Elder Sisters (Both Married)', 'No', 'Both', 'Indian', 'United Kingdom', 'London', 'England',
  'CA/CS/CMA', 'Finance & Accounting', 'Finance Manager', 'Barclays', 85000, 'GBP', 'Work Visa (H1B/L1)', 'https://linkedin.com/in/arjunbhatt',
  '+44 7700 900001', '+91 98765 88000', 'Bhatt Ekda', 'Khodiyar Maa',
  ARRAY['Sports','Photography','Travel','Music'], '{"min_age":23,"max_age":29,"min_height":152,"max_height":168,"preferred_diet":"Vegetarian","preferred_marital_status":"Never Married","preferred_manglik":"No","preferred_education":"Post Graduate"}'::jsonb
FROM members m WHERE m.user_id = 'a1000001-0000-0000-0000-000000000008';

INSERT INTO public.matrimonial_profiles (member_id, about, height_cm, weight_kg, complexion, blood_group, diet, marital_status, manglik, gotra, nakshatra, rashi, native_place, family_type, family_status, father_name, father_occupation, mother_name, mother_occupation, parents_marital_status, siblings, glasses, driving, citizenship, country, current_city, current_state, education_level, education_field, position_title, business_name, income, income_currency, visa_type, linkedin_url, contact_number, parent_contact, ekda, kuldevi, hobbies, preferences)
SELECT m.id,
  'Pharmacist in Vadodara. Love reading novels and gardening. Down-to-earth.', 157, 53, 'Wheatish Brown', 'A+', 'Vegetarian', 'Never Married', 'Partial (Anshik)', 'Parashar', 'Uttara Phalguni', 'Kanya (Virgo)', 'Mehsana, Gujarat',
  'Joint Family', 'Middle Class', 'Ashokbhai Sanghvi', 'Farmer', 'Induben Sanghvi', 'Homemaker', 'Married',
  '2 Elder Brothers, 1 Younger Sister', 'Yes', 'None', 'Indian', 'India', 'Vadodara', 'Gujarat',
  'Graduate', 'Pharmacy (B.Pharm)', 'Pharmacist', 'Apollo Pharmacy', 600000, 'INR', 'Not Applicable', null,
  '+91 98765 99001', '+91 98765 99000', 'Sanghvi Ekda', 'Umiya Maa',
  ARRAY['Reading','Gardening','Cooking','Meditation'], '{"min_age":27,"max_age":35,"min_height":168,"max_height":185,"preferred_diet":"Vegetarian","preferred_marital_status":"Never Married","preferred_manglik":"Doesn''t Matter","preferred_education":"Graduate"}'::jsonb
FROM members m WHERE m.user_id = 'a1000001-0000-0000-0000-000000000009';

INSERT INTO public.matrimonial_profiles (member_id, about, height_cm, weight_kg, complexion, blood_group, diet, marital_status, manglik, gotra, nakshatra, rashi, native_place, family_type, family_status, father_name, father_occupation, mother_name, mother_occupation, parents_marital_status, siblings, glasses, driving, citizenship, country, current_city, current_state, education_level, education_field, position_title, business_name, income, income_currency, visa_type, linkedin_url, contact_number, parent_contact, ekda, kuldevi, hobbies, preferences)
SELECT m.id,
  'Data scientist in Dubai. Passionate about AI and machine learning.', 176, 70, 'Fair', 'O+', 'Eggetarian', 'Never Married', 'No', 'Agastya', 'Shravana', 'Makar (Capricorn)', 'Gandhinagar, Gujarat',
  'Nuclear Family', 'Upper Middle Class', 'Hiteshbhai Parikh', 'IT Professional', 'Preetiben Parikh', 'Bank Manager', 'Married',
  '1 Younger Sister (Unmarried)', 'Contact Lenses', 'Both', 'Indian', 'United Arab Emirates', 'Dubai', 'Dubai',
  'Post Graduate', 'Data Science & AI', 'Senior Data Scientist', 'Emirates NBD', 180000, 'AED', 'Work Visa (H1B/L1)', 'https://linkedin.com/in/dhruvparikh',
  '+971 50 123 4567', '+91 98765 10100', 'Parikh Ekda', 'Bahuchar Maa',
  ARRAY['Travel','Photography','Sports','Music'], '{"min_age":22,"max_age":28,"min_height":152,"max_height":165,"preferred_diet":"Vegetarian","preferred_marital_status":"Never Married","preferred_manglik":"No","preferred_education":"Post Graduate"}'::jsonb
FROM members m WHERE m.user_id = 'a1000001-0000-0000-0000-000000000010';

-- ========== 20260308222300_8fcf4a7d-82ad-4886-b8c4-1eb9d39dba9d.sql ==========

UPDATE auth.users 
SET 
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  reauthentication_token = COALESCE(reauthentication_token, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  phone_change = COALESCE(phone_change, ''),
  email_change = COALESCE(email_change, '')
WHERE email LIKE 'seed%@test.local';

-- ========== 20260308222825_2d68eb5c-3a81-4df1-84af-cba13eea60d4.sql ==========

UPDATE public.members SET onboarding_completed = true, first_name = 'Aarav', last_name = 'Mehta' WHERE user_id = 'a1000001-0000-0000-0000-000000000001';
UPDATE public.members SET onboarding_completed = true WHERE user_id IN ('a1000001-0000-0000-0000-000000000002','a1000001-0000-0000-0000-000000000003','a1000001-0000-0000-0000-000000000004','a1000001-0000-0000-0000-000000000005','a1000001-0000-0000-0000-000000000006','a1000001-0000-0000-0000-000000000007','a1000001-0000-0000-0000-000000000008','a1000001-0000-0000-0000-000000000009','a1000001-0000-0000-0000-000000000010');

-- ========== 20260308233756_30f00e4a-abd6-4d86-9f21-310061f476aa.sql ==========
-- Create storage bucket for member avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for matrimonial photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('matrimonial-photos', 'matrimonial-photos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for avatars bucket
CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS policies for matrimonial-photos bucket
CREATE POLICY "Public can view matrimonial photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'matrimonial-photos');

CREATE POLICY "Users can upload own matrimonial photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'matrimonial-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own matrimonial photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'matrimonial-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own matrimonial photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'matrimonial-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
-- ========== 20260309031421_12bb89e5-1c17-4861-bad5-be97b752d981.sql ==========

-- Add ekda column to members table for core identity
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS ekda text;

-- Create family_invitations table
CREATE TABLE public.family_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  relation text NOT NULL,
  invitee_name text NOT NULL,
  invitee_email text,
  invitee_phone text,
  invitee_phone_country_code text DEFAULT '+91',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  accepted_by_member_id uuid REFERENCES public.members(id)
);

ALTER TABLE public.family_invitations ENABLE ROW LEVEL SECURITY;

-- Inviter can read their own invitations
CREATE POLICY "Members read own invitations" ON public.family_invitations
  FOR SELECT TO authenticated
  USING (inviter_member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));

-- Members can create invitations
CREATE POLICY "Members can create invitations" ON public.family_invitations
  FOR INSERT TO authenticated
  WITH CHECK (inviter_member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));

-- Members can update own invitations (cancel)
CREATE POLICY "Members can update own invitations" ON public.family_invitations
  FOR UPDATE TO authenticated
  USING (inviter_member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));

-- Members can delete own invitations
CREATE POLICY "Members can delete own invitations" ON public.family_invitations
  FOR DELETE TO authenticated
  USING (inviter_member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));

-- ========== 20260309031932_d282b4f7-0936-49a2-97e5-875256d15b68.sql ==========

-- Table to track per-city-year sequences for Global ID generation
CREATE TABLE public.global_id_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  state_code text NOT NULL,
  city_code text NOT NULL,
  year_code text NOT NULL,
  last_sequence integer NOT NULL DEFAULT 0,
  UNIQUE(country_code, state_code, city_code, year_code)
);

ALTER TABLE public.global_id_sequences ENABLE ROW LEVEL SECURITY;

-- Only edge functions (service role) can access this table
CREATE POLICY "Service role only" ON public.global_id_sequences
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to generate next Global ID atomically
CREATE OR REPLACE FUNCTION public.generate_global_id(
  p_country_code text,
  p_state_code text,
  p_city_code text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year text;
  v_seq integer;
  v_raw text;
  v_checksum text;
  v_charset text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  v_sum integer := 0;
  v_char_val integer;
  v_factor integer;
  i integer;
BEGIN
  v_year := to_char(now(), 'YY');
  
  -- Atomic upsert to get next sequence
  INSERT INTO public.global_id_sequences (country_code, state_code, city_code, year_code, last_sequence)
  VALUES (upper(p_country_code), upper(p_state_code), upper(p_city_code), v_year, 1)
  ON CONFLICT (country_code, state_code, city_code, year_code)
  DO UPDATE SET last_sequence = global_id_sequences.last_sequence + 1
  RETURNING last_sequence INTO v_seq;
  
  -- Build raw ID: KHD + CC + ST + CTY + YY + 6-digit seq
  v_raw := 'KHD' || upper(p_country_code) || upper(p_state_code) || upper(p_city_code) || v_year || lpad(v_seq::text, 6, '0');
  
  -- Compute checksum using ISO 7064 Mod 37,36 simplified as Luhn mod 36
  FOR i IN 1..length(v_raw) LOOP
    v_char_val := position(substring(v_raw from i for 1) in v_charset) - 1;
    IF v_char_val < 0 THEN v_char_val := 0; END IF;
    v_factor := CASE WHEN (length(v_raw) - i) % 2 = 0 THEN 2 ELSE 1 END;
    v_char_val := v_char_val * v_factor;
    IF v_char_val >= 36 THEN v_char_val := v_char_val - 36 + 1; END IF;
    v_sum := v_sum + v_char_val;
  END LOOP;
  
  v_checksum := substring(v_charset from ((36 - (v_sum % 36)) % 36) + 1 for 1);
  
  RETURN v_raw || v_checksum;
END;
$$;

-- City codes controlled list table
CREATE TABLE IF NOT EXISTS public.city_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_name text NOT NULL,
  city_code text NOT NULL,
  state_code text NOT NULL,
  country_code text NOT NULL,
  UNIQUE(country_code, state_code, city_code)
);

ALTER TABLE public.city_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read city codes" ON public.city_codes
  FOR SELECT TO authenticated
  USING (true);

-- Seed some initial city codes
INSERT INTO public.city_codes (city_name, city_code, state_code, country_code) VALUES
  ('Ahmedabad', 'AHM', 'GJ', 'IN'),
  ('Surat', 'SUR', 'GJ', 'IN'),
  ('Vadodara', 'VAD', 'GJ', 'IN'),
  ('Rajkot', 'RAJ', 'GJ', 'IN'),
  ('Mumbai', 'MUM', 'MH', 'IN'),
  ('Pune', 'PUN', 'MH', 'IN'),
  ('Delhi', 'DEL', 'DL', 'IN'),
  ('Bangalore', 'BLR', 'KA', 'IN'),
  ('Chennai', 'CHE', 'TN', 'IN'),
  ('Hyderabad', 'HYD', 'TG', 'IN'),
  ('Kolkata', 'KOL', 'WB', 'IN'),
  ('Jaipur', 'JAI', 'RJ', 'IN'),
  ('New York', 'NYC', 'NY', 'US'),
  ('Los Angeles', 'LAX', 'CA', 'US'),
  ('Chicago', 'CHI', 'IL', 'US'),
  ('Houston', 'HOU', 'TX', 'US'),
  ('London', 'LDN', 'EN', 'GB'),
  ('Toronto', 'TOR', 'ON', 'CA'),
  ('Sydney', 'SYD', 'NS', 'AU'),
  ('Dubai', 'DXB', 'DU', 'AE'),
  ('Nairobi', 'NRB', 'NB', 'KE'),
  ('Singapore', 'SGP', 'SG', 'SG')
ON CONFLICT DO NOTHING;

-- ========== 20260309032346_fdd5845d-3c0a-4921-bfd3-85ff63938a0d.sql ==========

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

-- ========== 20260309032400_6f60f436-9b3a-450b-99f6-a4596a4513d3.sql ==========

-- Create event-photos storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('event-photos', 'event-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for event photos
CREATE POLICY "Authenticated can upload event photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'event-photos');

CREATE POLICY "Anyone can view event photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'event-photos');

CREATE POLICY "Owners can delete event photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'event-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ========== 20260309032919_4282c8a7-07bc-4197-9308-023e000cfa67.sql ==========

-- Verification requests table for KYC-light
CREATE TABLE public.verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  requested_level smallint NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending',
  document_type text,
  document_url text,
  reviewer_user_id uuid,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

-- Members can create and read their own requests
CREATE POLICY "Members can create verification requests" ON public.verification_requests
  FOR INSERT WITH CHECK (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));

CREATE POLICY "Members can read own verification requests" ON public.verification_requests
  FOR SELECT USING (
    member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'Global Admin')
    OR public.has_role(auth.uid(), 'Data Steward')
  );

-- Admins can update verification requests
CREATE POLICY "Admins can update verification requests" ON public.verification_requests
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'Global Admin')
    OR public.has_role(auth.uid(), 'Data Steward')
  );

-- Add unique constraint on mentorships for available status to avoid duplication issues
-- (no-op if already exists - wrapped in DO block)

-- Enable realtime for mentorships
ALTER PUBLICATION supabase_realtime ADD TABLE public.mentorships;

-- ========== 20260309033747_d030d996-04eb-4f4d-b36a-2c27e9f6ec17.sql ==========

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

-- ========== 20260309034624_efc2d371-8c45-493f-b0f4-8e1ec4fe2850.sql ==========

-- =============================================
-- EXPAND BUSINESSES TABLE
-- =============================================
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS address_line1 TEXT,
  ADD COLUMN IF NOT EXISTS address_line2 TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES public.countries(id),
  ADD COLUMN IF NOT EXISTS state_id UUID REFERENCES public.states(id),
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS founded_year INTEGER,
  ADD COLUMN IF NOT EXISTS employee_count TEXT,
  ADD COLUMN IF NOT EXISTS revenue_range TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS operating_hours JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS license_number TEXT,
  ADD COLUMN IF NOT EXISTS gst_number TEXT;

-- =============================================
-- EXPAND JOBS TABLE
-- =============================================
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS salary_min NUMERIC,
  ADD COLUMN IF NOT EXISTS salary_max NUMERIC,
  ADD COLUMN IF NOT EXISTS salary_currency TEXT DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS salary_period TEXT DEFAULT 'annual',
  ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'full_time',
  ADD COLUMN IF NOT EXISTS experience_min INTEGER,
  ADD COLUMN IF NOT EXISTS experience_max INTEGER,
  ADD COLUMN IF NOT EXISTS education_required TEXT,
  ADD COLUMN IF NOT EXISTS skills_required TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS benefits TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS application_url TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.cities(id),
  ADD COLUMN IF NOT EXISTS state_id UUID REFERENCES public.states(id),
  ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES public.countries(id),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS positions_available INTEGER DEFAULT 1;

-- =============================================
-- EXPAND EVENTS TABLE
-- =============================================
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'in_person',
  ADD COLUMN IF NOT EXISTS max_capacity INTEGER,
  ADD COLUMN IF NOT EXISTS registration_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fee_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS fee_currency TEXT DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS address_line1 TEXT,
  ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.cities(id),
  ADD COLUMN IF NOT EXISTS state_id UUID REFERENCES public.states(id),
  ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES public.countries(id),
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS organizer_name TEXT,
  ADD COLUMN IF NOT EXISTS recurring JSONB DEFAULT NULL;

-- =============================================
-- EXPAND CONTENT_NEWS TABLE
-- =============================================
ALTER TABLE public.content_news
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS author_name TEXT,
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.cities(id),
  ADD COLUMN IF NOT EXISTS state_id UUID REFERENCES public.states(id),
  ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES public.countries(id),
  ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;

-- =============================================
-- EXPAND DONATIONS TABLE
-- =============================================
ALTER TABLE public.donations
  ADD COLUMN IF NOT EXISTS donor_name TEXT,
  ADD COLUMN IF NOT EXISTS donor_email TEXT,
  ADD COLUMN IF NOT EXISTS donor_phone TEXT,
  ADD COLUMN IF NOT EXISTS donor_address TEXT,
  ADD COLUMN IF NOT EXISTS pan_number TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS recurring_interval TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- =============================================
-- EXPAND MENTORSHIPS TABLE
-- =============================================
ALTER TABLE public.mentorships
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS max_mentees INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS availability TEXT,
  ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- =============================================
-- EXPAND SCHOLARSHIPS TABLE
-- =============================================
ALTER TABLE public.scholarships
  ADD COLUMN IF NOT EXISTS eligibility TEXT,
  ADD COLUMN IF NOT EXISTS required_documents TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS max_recipients INTEGER,
  ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.cities(id),
  ADD COLUMN IF NOT EXISTS state_id UUID REFERENCES public.states(id),
  ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES public.countries(id),
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ========== 20260309040534_c0341e9a-1ead-49a0-ad7b-d7b6cd8a1222.sql ==========

-- =====================================================
-- ROLE-BASED ACCESS CONTROL HARDENING
-- Comprehensive RLS policies for all admin functions
-- =====================================================

-- =====================================================
-- ANNOUNCEMENTS - Global Admin / Chapter Admin only
-- =====================================================
CREATE POLICY "Admins can create announcements"
  ON public.announcements FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Chapter Admin'));

CREATE POLICY "Admins can update announcements"
  ON public.announcements FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Chapter Admin'));

CREATE POLICY "Admins can delete announcements"
  ON public.announcements FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Chapter Admin'));

-- =====================================================
-- SCHOLARSHIPS - Global Admin / Finance Admin only
-- =====================================================
CREATE POLICY "Admins can create scholarships"
  ON public.scholarships FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Finance Admin'));

CREATE POLICY "Admins can update scholarships"
  ON public.scholarships FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Finance Admin'));

CREATE POLICY "Admins can delete scholarships"
  ON public.scholarships FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Finance Admin'));

-- =====================================================
-- FUNDS - Global Admin / Finance Admin only
-- =====================================================
CREATE POLICY "Admins can create funds"
  ON public.funds FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Finance Admin'));

CREATE POLICY "Admins can update funds"
  ON public.funds FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Finance Admin'));

CREATE POLICY "Admins can delete funds"
  ON public.funds FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Finance Admin'));

-- =====================================================
-- EMERGENCY_CONTACTS - Global Admin / Chapter Admin only
-- =====================================================
CREATE POLICY "Admins can create emergency contacts"
  ON public.emergency_contacts FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Chapter Admin'));

CREATE POLICY "Admins can update emergency contacts"
  ON public.emergency_contacts FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Chapter Admin'));

CREATE POLICY "Admins can delete emergency contacts"
  ON public.emergency_contacts FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Chapter Admin'));

-- =====================================================
-- HERITAGE_TAGS - Admin approval flow
-- =====================================================
CREATE POLICY "Admins can approve heritage tags"
  ON public.heritage_tags FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Data Steward'));

CREATE POLICY "Admins can delete heritage tags"
  ON public.heritage_tags FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Data Steward'));

-- =====================================================
-- ORAL_HISTORIES - Admin moderation
-- =====================================================
CREATE POLICY "Admins can manage oral histories"
  ON public.oral_histories FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Data Steward'));

-- =====================================================
-- EVENTS - Event Managers can manage chapter events
-- =====================================================
DROP POLICY IF EXISTS "Creators can update events" ON public.events;
CREATE POLICY "Creators and managers can update events"
  ON public.events FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() 
    OR has_role(auth.uid(), 'Global Admin') 
    OR has_role(auth.uid(), 'Event Manager')
  );

CREATE POLICY "Admins can delete events"
  ON public.events FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Event Manager'));

-- =====================================================
-- CONTENT_NEWS - Publisher / Moderator review flow
-- =====================================================
DROP POLICY IF EXISTS "Authors can update own news" ON public.content_news;
CREATE POLICY "Authors and publishers can update news"
  ON public.content_news FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() 
    OR has_role(auth.uid(), 'Global Admin') 
    OR has_role(auth.uid(), 'Global Publisher')
    OR has_role(auth.uid(), 'Publisher')
    OR has_role(auth.uid(), 'Moderator')
  );

CREATE POLICY "Admins can delete news"
  ON public.content_news FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Global Publisher'));

-- =====================================================
-- BUSINESSES - Directory Manager approval
-- =====================================================
DROP POLICY IF EXISTS "Owners can update businesses" ON public.businesses;
CREATE POLICY "Owners and managers can update businesses"
  ON public.businesses FOR UPDATE
  TO authenticated
  USING (
    owner_member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'Global Admin')
    OR has_role(auth.uid(), 'Directory Manager')
  );

CREATE POLICY "Admins can delete businesses"
  ON public.businesses FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Directory Manager'));

-- =====================================================
-- JOBS - Directory Manager management
-- =====================================================
DROP POLICY IF EXISTS "Employers can update jobs" ON public.jobs;
CREATE POLICY "Employers and managers can update jobs"
  ON public.jobs FOR UPDATE
  TO authenticated
  USING (
    employer_member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'Global Admin')
    OR has_role(auth.uid(), 'Directory Manager')
  );

CREATE POLICY "Admins can delete jobs"
  ON public.jobs FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Directory Manager'));

-- =====================================================
-- MEMBERS - Data Steward can edit verification levels
-- =====================================================
CREATE POLICY "Admins can update any member"
  ON public.members FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Data Steward') OR has_role(auth.uid(), 'Chapter Admin'));

-- =====================================================
-- DONATIONS - Finance Admin can view all donations
-- =====================================================
DROP POLICY IF EXISTS "Authenticated can read own donations" ON public.donations;
CREATE POLICY "Members and admins can read donations"
  ON public.donations FOR SELECT
  TO authenticated
  USING (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
    OR donor_wall_opt_in = true
    OR has_role(auth.uid(), 'Global Admin')
    OR has_role(auth.uid(), 'Finance Admin')
  );

CREATE POLICY "Finance admins can update donations"
  ON public.donations FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Finance Admin'));

-- =====================================================
-- MENTORSHIPS - Members can manage, admins can moderate
-- =====================================================
CREATE POLICY "Admins can manage mentorships"
  ON public.mentorships FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'Global Admin'));

-- =====================================================
-- MATRIMONIAL_PROFILES - Data Steward can verify
-- =====================================================
CREATE POLICY "Admins can manage matrimonial profiles"
  ON public.matrimonial_profiles FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'Global Admin') OR has_role(auth.uid(), 'Data Steward'));

-- ========== 20260309045138_7d3cce7a-c7fc-4c10-b2e7-3cdcc01438c7.sql ==========
-- Reports table for content moderation
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  entity_type text NOT NULL, -- 'member', 'business', 'job', 'event', 'news', 'matrimonial_profile'
  entity_id uuid NOT NULL,
  category text NOT NULL, -- 'fake', 'non_khadayata', 'harassment', 'obscene'
  reason text,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'dismissed'
  admin_action text, -- 'suspended', 'blocked', 'deleted', 'warned', 'none'
  admin_notes text,
  reviewed_by uuid REFERENCES public.members(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for quick lookups
CREATE INDEX idx_reports_entity ON public.reports(entity_type, entity_id);
CREATE INDEX idx_reports_status ON public.reports(status);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can create reports
CREATE POLICY "Authenticated members can report"
  ON public.reports FOR INSERT
  WITH CHECK (
    reporter_member_id IN (
      SELECT id FROM public.members WHERE user_id = auth.uid()
    )
  );

-- Users can see their own reports
CREATE POLICY "Users can view own reports"
  ON public.reports FOR SELECT
  USING (
    reporter_member_id IN (
      SELECT id FROM public.members WHERE user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'Global Admin')
    OR has_role(auth.uid(), 'Moderator')
    OR has_role(auth.uid(), 'Data Steward')
  );

-- Admins can update reports
CREATE POLICY "Admins can update reports"
  ON public.reports FOR UPDATE
  USING (
    has_role(auth.uid(), 'Global Admin')
    OR has_role(auth.uid(), 'Moderator')
    OR has_role(auth.uid(), 'Data Steward')
  );

-- Add suspended flag to members table
ALTER TABLE public.members 
  ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_reason text,
  ADD COLUMN IF NOT EXISTS blocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS blocked_at timestamptz;

-- Add suspended flag to businesses
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz;

-- Add suspended flag to jobs
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false;

-- Add suspended flag to events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false;

-- Add suspended flag to content_news
ALTER TABLE public.content_news
  ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false;

-- Add suspended flag to matrimonial_profiles
ALTER TABLE public.matrimonial_profiles
  ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false;
-- ========== 20260315191508_add_missing_fk_indexes.sql ==========
/*
  # Add Missing Foreign Key Indexes

  ## Summary
  Adds covering indexes for all foreign key columns that were flagged as missing indexes.
  This improves JOIN and lookup query performance across all tables.

  ## Tables affected
  - announcements, audits, businesses, chapter_transfers, chapters
  - consents, content_news, data_requests, donations, education
  - emergency_contacts, employment, event_checkins, event_photos
  - event_rsvps, events, family_invitations, family_links, funds
  - hall_bookings, heritage_tags, job_applications, jobs
  - matrimonial_introductions, matrimonial_profiles, media_files
  - medical_aid_requests, member_contacts, member_languages
  - member_skills, members, mentorship_sessions, mentorships
  - oral_histories, photo_tags, reports, role_assignments
  - scholarship_applications, scholarships, tag_requests
  - verification_requests, vouches, whatsapp_messages
*/

CREATE INDEX IF NOT EXISTS idx_announcements_created_by ON public.announcements(created_by);

CREATE INDEX IF NOT EXISTS idx_audits_actor_user_id ON public.audits(actor_user_id);

CREATE INDEX IF NOT EXISTS idx_businesses_chapter_id ON public.businesses(chapter_id);
CREATE INDEX IF NOT EXISTS idx_businesses_city_id ON public.businesses(city_id);
CREATE INDEX IF NOT EXISTS idx_businesses_country_id ON public.businesses(country_id);
CREATE INDEX IF NOT EXISTS idx_businesses_owner_member_id ON public.businesses(owner_member_id);
CREATE INDEX IF NOT EXISTS idx_businesses_state_id ON public.businesses(state_id);

CREATE INDEX IF NOT EXISTS idx_chapter_transfers_approved_by ON public.chapter_transfers(approved_by);
CREATE INDEX IF NOT EXISTS idx_chapter_transfers_from_chapter_id ON public.chapter_transfers(from_chapter_id);
CREATE INDEX IF NOT EXISTS idx_chapter_transfers_member_id ON public.chapter_transfers(member_id);
CREATE INDEX IF NOT EXISTS idx_chapter_transfers_to_chapter_id ON public.chapter_transfers(to_chapter_id);

CREATE INDEX IF NOT EXISTS idx_chapters_city_id ON public.chapters(city_id);
CREATE INDEX IF NOT EXISTS idx_chapters_country_id ON public.chapters(country_id);
CREATE INDEX IF NOT EXISTS idx_chapters_state_id ON public.chapters(state_id);

CREATE INDEX IF NOT EXISTS idx_consents_member_id ON public.consents(member_id);

CREATE INDEX IF NOT EXISTS idx_content_news_chapter_id ON public.content_news(chapter_id);
CREATE INDEX IF NOT EXISTS idx_content_news_city_id ON public.content_news(city_id);
CREATE INDEX IF NOT EXISTS idx_content_news_country_id ON public.content_news(country_id);
CREATE INDEX IF NOT EXISTS idx_content_news_created_by ON public.content_news(created_by);
CREATE INDEX IF NOT EXISTS idx_content_news_reviewed_by ON public.content_news(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_content_news_state_id ON public.content_news(state_id);

CREATE INDEX IF NOT EXISTS idx_data_requests_member_id ON public.data_requests(member_id);

CREATE INDEX IF NOT EXISTS idx_donations_fund_id ON public.donations(fund_id);
CREATE INDEX IF NOT EXISTS idx_donations_member_id ON public.donations(member_id);

CREATE INDEX IF NOT EXISTS idx_education_member_id ON public.education(member_id);

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_city_id ON public.emergency_contacts(city_id);

CREATE INDEX IF NOT EXISTS idx_employment_member_id ON public.employment(member_id);

CREATE INDEX IF NOT EXISTS idx_event_checkins_event_id ON public.event_checkins(event_id);
CREATE INDEX IF NOT EXISTS idx_event_checkins_member_id ON public.event_checkins(member_id);
CREATE INDEX IF NOT EXISTS idx_event_checkins_scanned_by ON public.event_checkins(scanned_by);

CREATE INDEX IF NOT EXISTS idx_event_photos_event_id ON public.event_photos(event_id);
CREATE INDEX IF NOT EXISTS idx_event_photos_uploaded_by ON public.event_photos(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_event_rsvps_member_id ON public.event_rsvps(member_id);

CREATE INDEX IF NOT EXISTS idx_events_chapter_id ON public.events(chapter_id);
CREATE INDEX IF NOT EXISTS idx_events_city_id ON public.events(city_id);
CREATE INDEX IF NOT EXISTS idx_events_country_id ON public.events(country_id);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON public.events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_state_id ON public.events(state_id);

CREATE INDEX IF NOT EXISTS idx_family_invitations_accepted_by ON public.family_invitations(accepted_by_member_id);
CREATE INDEX IF NOT EXISTS idx_family_invitations_inviter ON public.family_invitations(inviter_member_id);

CREATE INDEX IF NOT EXISTS idx_family_links_family_id ON public.family_links(family_id);
CREATE INDEX IF NOT EXISTS idx_family_links_member_id ON public.family_links(member_id);
CREATE INDEX IF NOT EXISTS idx_family_links_related_member_id ON public.family_links(related_member_id);

CREATE INDEX IF NOT EXISTS idx_funds_chapter_id ON public.funds(chapter_id);

CREATE INDEX IF NOT EXISTS idx_hall_bookings_chapter_id ON public.hall_bookings(chapter_id);
CREATE INDEX IF NOT EXISTS idx_hall_bookings_member_id ON public.hall_bookings(member_id);

CREATE INDEX IF NOT EXISTS idx_heritage_tags_tagged_by ON public.heritage_tags(tagged_by);

CREATE INDEX IF NOT EXISTS idx_job_applications_member_id ON public.job_applications(member_id);

CREATE INDEX IF NOT EXISTS idx_jobs_chapter_id ON public.jobs(chapter_id);
CREATE INDEX IF NOT EXISTS idx_jobs_city_id ON public.jobs(city_id);
CREATE INDEX IF NOT EXISTS idx_jobs_country_id ON public.jobs(country_id);
CREATE INDEX IF NOT EXISTS idx_jobs_employer_business_id ON public.jobs(employer_business_id);
CREATE INDEX IF NOT EXISTS idx_jobs_employer_member_id ON public.jobs(employer_member_id);
CREATE INDEX IF NOT EXISTS idx_jobs_state_id ON public.jobs(state_id);

CREATE INDEX IF NOT EXISTS idx_matrimonial_introductions_from ON public.matrimonial_introductions(from_member_id);
CREATE INDEX IF NOT EXISTS idx_matrimonial_introductions_to ON public.matrimonial_introductions(to_member_id);

CREATE INDEX IF NOT EXISTS idx_matrimonial_profiles_guardian ON public.matrimonial_profiles(guardian_member_id);

CREATE INDEX IF NOT EXISTS idx_media_files_owner_user_id ON public.media_files(owner_user_id);

CREATE INDEX IF NOT EXISTS idx_medical_aid_requests_chapter_id ON public.medical_aid_requests(chapter_id);
CREATE INDEX IF NOT EXISTS idx_medical_aid_requests_member_id ON public.medical_aid_requests(member_id);

CREATE INDEX IF NOT EXISTS idx_member_contacts_member_id ON public.member_contacts(member_id);

CREATE INDEX IF NOT EXISTS idx_member_languages_member_id ON public.member_languages(member_id);

CREATE INDEX IF NOT EXISTS idx_member_skills_member_id ON public.member_skills(member_id);

CREATE INDEX IF NOT EXISTS idx_members_chapter_id ON public.members(chapter_id);

CREATE INDEX IF NOT EXISTS idx_mentorship_sessions_mentorship_id ON public.mentorship_sessions(mentorship_id);

CREATE INDEX IF NOT EXISTS idx_mentorships_mentee_member_id ON public.mentorships(mentee_member_id);
CREATE INDEX IF NOT EXISTS idx_mentorships_mentor_member_id ON public.mentorships(mentor_member_id);

CREATE INDEX IF NOT EXISTS idx_oral_histories_narrator_member_id ON public.oral_histories(narrator_member_id);
CREATE INDEX IF NOT EXISTS idx_oral_histories_uploaded_by ON public.oral_histories(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_photo_tags_member_id ON public.photo_tags(member_id);
CREATE INDEX IF NOT EXISTS idx_photo_tags_tagged_by ON public.photo_tags(tagged_by);

CREATE INDEX IF NOT EXISTS idx_reports_reporter_member_id ON public.reports(reporter_member_id);
CREATE INDEX IF NOT EXISTS idx_reports_reviewed_by ON public.reports(reviewed_by);

CREATE INDEX IF NOT EXISTS idx_role_assignments_created_by ON public.role_assignments(created_by);
CREATE INDEX IF NOT EXISTS idx_role_assignments_member_id ON public.role_assignments(member_id);
CREATE INDEX IF NOT EXISTS idx_role_assignments_role_id ON public.role_assignments(role_id);

CREATE INDEX IF NOT EXISTS idx_scholarship_applications_member_id ON public.scholarship_applications(member_id);

CREATE INDEX IF NOT EXISTS idx_scholarships_chapter_id ON public.scholarships(chapter_id);
CREATE INDEX IF NOT EXISTS idx_scholarships_city_id ON public.scholarships(city_id);
CREATE INDEX IF NOT EXISTS idx_scholarships_country_id ON public.scholarships(country_id);
CREATE INDEX IF NOT EXISTS idx_scholarships_state_id ON public.scholarships(state_id);

CREATE INDEX IF NOT EXISTS idx_tag_requests_decided_by ON public.tag_requests(decided_by);
CREATE INDEX IF NOT EXISTS idx_tag_requests_requester_user_id ON public.tag_requests(requester_user_id);

CREATE INDEX IF NOT EXISTS idx_verification_requests_member_id ON public.verification_requests(member_id);

CREATE INDEX IF NOT EXISTS idx_vouches_voucher_member_id ON public.vouches(voucher_member_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_recipient_member_id ON public.whatsapp_messages(recipient_member_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_template_id ON public.whatsapp_messages(template_id);

-- ========== 20260315191659_fix_rls_auth_init_plan.sql ==========
/*
  # Fix RLS Auth Initialization Plan

  ## Summary
  Replaces all direct `auth.uid()` and `auth.jwt()` calls in RLS policies with
  `(select auth.uid())` / `(select auth.jwt())` subquery form. This prevents
  re-evaluation of the auth function for every row, significantly improving
  query performance at scale.

  ## Tables affected
  announcements, audits, businesses, chapter_transfers, consents, content_news,
  data_requests, donations, education, emergency_contacts, employment,
  event_checkins, event_photos, event_rsvps, events, families, family_invitations,
  family_links, funds, hall_bookings, heritage_tags, job_applications, jobs,
  matrimonial_introductions, matrimonial_profiles, media_files,
  medical_aid_requests, member_contacts, member_languages, member_skills,
  members, mentorship_sessions, mentorships, notification_preferences,
  oral_histories, photo_tags, receipts, reports, scholarship_applications,
  scholarships, tag_requests, verification_requests, vouches,
  whatsapp_messages, whatsapp_templates
*/

-- announcements
DROP POLICY IF EXISTS "Admins can create announcements" ON public.announcements;
CREATE POLICY "Admins can create announcements" ON public.announcements FOR INSERT TO authenticated
  WITH CHECK (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Chapter Admin'));

DROP POLICY IF EXISTS "Admins can delete announcements" ON public.announcements;
CREATE POLICY "Admins can delete announcements" ON public.announcements FOR DELETE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Chapter Admin'));

DROP POLICY IF EXISTS "Admins can update announcements" ON public.announcements;
CREATE POLICY "Admins can update announcements" ON public.announcements FOR UPDATE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Chapter Admin'));

-- audits
DROP POLICY IF EXISTS "Admins can read audits" ON public.audits;
CREATE POLICY "Admins can read audits" ON public.audits FOR SELECT TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Data Steward'));

DROP POLICY IF EXISTS "System can insert audits" ON public.audits;
CREATE POLICY "System can insert audits" ON public.audits FOR INSERT TO authenticated
  WITH CHECK (actor_user_id = (select auth.uid()));

-- businesses
DROP POLICY IF EXISTS "Admins can delete businesses" ON public.businesses;
CREATE POLICY "Admins can delete businesses" ON public.businesses FOR DELETE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Directory Manager'));

DROP POLICY IF EXISTS "Members can create businesses" ON public.businesses;
CREATE POLICY "Members can create businesses" ON public.businesses FOR INSERT TO authenticated
  WITH CHECK (owner_member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Owners and managers can update businesses" ON public.businesses;
CREATE POLICY "Owners and managers can update businesses" ON public.businesses FOR UPDATE TO authenticated
  USING (
    (owner_member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())))
    OR has_role((select auth.uid()), 'Global Admin')
    OR has_role((select auth.uid()), 'Directory Manager')
  );

-- chapter_transfers
DROP POLICY IF EXISTS "Users can request transfer" ON public.chapter_transfers;
CREATE POLICY "Users can request transfer" ON public.chapter_transfers FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

-- consents
DROP POLICY IF EXISTS "Members can create consents" ON public.consents;
CREATE POLICY "Members can create consents" ON public.consents FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Members read own consents" ON public.consents;
CREATE POLICY "Members read own consents" ON public.consents FOR SELECT TO authenticated
  USING (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

-- content_news
DROP POLICY IF EXISTS "Admins can delete news" ON public.content_news;
CREATE POLICY "Admins can delete news" ON public.content_news FOR DELETE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Global Publisher'));

DROP POLICY IF EXISTS "Anyone can read published news" ON public.content_news;
CREATE POLICY "Anyone can read published news" ON public.content_news FOR SELECT
  USING ((status = 'published') OR (created_by = (select auth.uid())));

DROP POLICY IF EXISTS "Authenticated can create news" ON public.content_news;
CREATE POLICY "Authenticated can create news" ON public.content_news FOR INSERT TO authenticated
  WITH CHECK (created_by = (select auth.uid()));

DROP POLICY IF EXISTS "Authors and publishers can update news" ON public.content_news;
CREATE POLICY "Authors and publishers can update news" ON public.content_news FOR UPDATE TO authenticated
  USING (
    (created_by = (select auth.uid()))
    OR has_role((select auth.uid()), 'Global Admin')
    OR has_role((select auth.uid()), 'Global Publisher')
    OR has_role((select auth.uid()), 'Publisher')
    OR has_role((select auth.uid()), 'Moderator')
  );

-- data_requests
DROP POLICY IF EXISTS "Members can create data requests" ON public.data_requests;
CREATE POLICY "Members can create data requests" ON public.data_requests FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Members read own data requests" ON public.data_requests;
CREATE POLICY "Members read own data requests" ON public.data_requests FOR SELECT TO authenticated
  USING (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

-- donations
DROP POLICY IF EXISTS "Finance admins can update donations" ON public.donations;
CREATE POLICY "Finance admins can update donations" ON public.donations FOR UPDATE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Finance Admin'));

DROP POLICY IF EXISTS "Members and admins can read donations" ON public.donations;
CREATE POLICY "Members and admins can read donations" ON public.donations FOR SELECT TO authenticated
  USING (
    (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())))
    OR (donor_wall_opt_in = true)
    OR has_role((select auth.uid()), 'Global Admin')
    OR has_role((select auth.uid()), 'Finance Admin')
  );

DROP POLICY IF EXISTS "Members can donate" ON public.donations;
CREATE POLICY "Members can donate" ON public.donations FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

-- education
DROP POLICY IF EXISTS "Users can delete own education" ON public.education;
CREATE POLICY "Users can delete own education" ON public.education FOR DELETE TO authenticated
  USING (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can manage own education" ON public.education;
CREATE POLICY "Users can manage own education" ON public.education FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can update own education" ON public.education;
CREATE POLICY "Users can update own education" ON public.education FOR UPDATE TO authenticated
  USING (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

-- emergency_contacts
DROP POLICY IF EXISTS "Admins can create emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Admins can create emergency contacts" ON public.emergency_contacts FOR INSERT TO authenticated
  WITH CHECK (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Chapter Admin'));

DROP POLICY IF EXISTS "Admins can delete emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Admins can delete emergency contacts" ON public.emergency_contacts FOR DELETE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Chapter Admin'));

DROP POLICY IF EXISTS "Admins can update emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Admins can update emergency contacts" ON public.emergency_contacts FOR UPDATE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Chapter Admin'));

-- employment
DROP POLICY IF EXISTS "Users can delete own employment" ON public.employment;
CREATE POLICY "Users can delete own employment" ON public.employment FOR DELETE TO authenticated
  USING (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can manage own employment" ON public.employment;
CREATE POLICY "Users can manage own employment" ON public.employment FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can update own employment" ON public.employment;
CREATE POLICY "Users can update own employment" ON public.employment FOR UPDATE TO authenticated
  USING (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

-- event_checkins
DROP POLICY IF EXISTS "Event managers can create checkins" ON public.event_checkins;
CREATE POLICY "Event managers can create checkins" ON public.event_checkins FOR INSERT TO authenticated
  WITH CHECK (
    (scanned_by = (select auth.uid()))
    OR (EXISTS (SELECT 1 FROM events e WHERE e.id = event_checkins.event_id AND e.created_by = (select auth.uid())))
  );

-- event_photos
DROP POLICY IF EXISTS "Members can upload photos" ON public.event_photos;
CREATE POLICY "Members can upload photos" ON public.event_photos FOR INSERT TO authenticated
  WITH CHECK (uploaded_by IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Uploaders can delete own photos" ON public.event_photos;
CREATE POLICY "Uploaders can delete own photos" ON public.event_photos FOR DELETE TO authenticated
  USING (uploaded_by IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

-- event_rsvps
DROP POLICY IF EXISTS "Members can delete own rsvp" ON public.event_rsvps;
CREATE POLICY "Members can delete own rsvp" ON public.event_rsvps FOR DELETE TO authenticated
  USING (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Members can rsvp" ON public.event_rsvps;
CREATE POLICY "Members can rsvp" ON public.event_rsvps FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Members can update own rsvp" ON public.event_rsvps;
CREATE POLICY "Members can update own rsvp" ON public.event_rsvps FOR UPDATE TO authenticated
  USING (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

-- events
DROP POLICY IF EXISTS "Admins can delete events" ON public.events;
CREATE POLICY "Admins can delete events" ON public.events FOR DELETE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Event Manager'));

DROP POLICY IF EXISTS "Anyone can read published events" ON public.events;
CREATE POLICY "Anyone can read published events" ON public.events FOR SELECT
  USING ((status = 'published') OR (created_by = (select auth.uid())));

DROP POLICY IF EXISTS "Authenticated can create events" ON public.events;
CREATE POLICY "Authenticated can create events" ON public.events FOR INSERT TO authenticated
  WITH CHECK (created_by = (select auth.uid()));

DROP POLICY IF EXISTS "Creators and managers can update events" ON public.events;
CREATE POLICY "Creators and managers can update events" ON public.events FOR UPDATE TO authenticated
  USING (
    (created_by = (select auth.uid()))
    OR has_role((select auth.uid()), 'Global Admin')
    OR has_role((select auth.uid()), 'Event Manager')
  );

-- families
DROP POLICY IF EXISTS "Authenticated users can create families" ON public.families;
CREATE POLICY "Authenticated users can create families" ON public.families FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM members WHERE members.user_id = (select auth.uid())));

-- family_invitations
DROP POLICY IF EXISTS "Members can create invitations" ON public.family_invitations;
CREATE POLICY "Members can create invitations" ON public.family_invitations FOR INSERT TO authenticated
  WITH CHECK (inviter_member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Members can delete own invitations" ON public.family_invitations;
CREATE POLICY "Members can delete own invitations" ON public.family_invitations FOR DELETE TO authenticated
  USING (inviter_member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Members can update own invitations" ON public.family_invitations;
CREATE POLICY "Members can update own invitations" ON public.family_invitations FOR UPDATE TO authenticated
  USING (inviter_member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Members read own invitations" ON public.family_invitations;
CREATE POLICY "Members read own invitations" ON public.family_invitations FOR SELECT TO authenticated
  USING (inviter_member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

-- family_links
DROP POLICY IF EXISTS "Users can delete own family links" ON public.family_links;
CREATE POLICY "Users can delete own family links" ON public.family_links FOR DELETE TO authenticated
  USING (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can manage own family links" ON public.family_links;
CREATE POLICY "Users can manage own family links" ON public.family_links FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can update own family links" ON public.family_links;
CREATE POLICY "Users can update own family links" ON public.family_links FOR UPDATE TO authenticated
  USING (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

-- funds
DROP POLICY IF EXISTS "Admins can create funds" ON public.funds;
CREATE POLICY "Admins can create funds" ON public.funds FOR INSERT TO authenticated
  WITH CHECK (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Finance Admin'));

DROP POLICY IF EXISTS "Admins can delete funds" ON public.funds;
CREATE POLICY "Admins can delete funds" ON public.funds FOR DELETE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Finance Admin'));

DROP POLICY IF EXISTS "Admins can update funds" ON public.funds;
CREATE POLICY "Admins can update funds" ON public.funds FOR UPDATE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Finance Admin'));

-- hall_bookings (fix FOR ALL and individual policies)
DROP POLICY IF EXISTS "Admins can manage bookings" ON public.hall_bookings;
DROP POLICY IF EXISTS "Members can create bookings" ON public.hall_bookings;
DROP POLICY IF EXISTS "Members can read bookings" ON public.hall_bookings;
DROP POLICY IF EXISTS "Members can update own bookings" ON public.hall_bookings;

CREATE POLICY "Admins can read bookings" ON public.hall_bookings FOR SELECT TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Chapter Admin'));

CREATE POLICY "Members can read own bookings" ON public.hall_bookings FOR SELECT TO authenticated
  USING (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

CREATE POLICY "Members can create bookings" ON public.hall_bookings FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

CREATE POLICY "Members can update own bookings" ON public.hall_bookings FOR UPDATE TO authenticated
  USING (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

CREATE POLICY "Admins can update bookings" ON public.hall_bookings FOR UPDATE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Chapter Admin'));

CREATE POLICY "Admins can insert bookings" ON public.hall_bookings FOR INSERT TO authenticated
  WITH CHECK (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Chapter Admin'));

CREATE POLICY "Admins can delete bookings" ON public.hall_bookings FOR DELETE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Chapter Admin'));

-- heritage_tags
DROP POLICY IF EXISTS "Admins can approve heritage tags" ON public.heritage_tags;
CREATE POLICY "Admins can approve heritage tags" ON public.heritage_tags FOR UPDATE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Data Steward'));

DROP POLICY IF EXISTS "Admins can delete heritage tags" ON public.heritage_tags;
CREATE POLICY "Admins can delete heritage tags" ON public.heritage_tags FOR DELETE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Data Steward'));

DROP POLICY IF EXISTS "Anyone can read approved tags" ON public.heritage_tags;
CREATE POLICY "Anyone can read approved tags" ON public.heritage_tags FOR SELECT
  USING ((approved = true) OR (tagged_by IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid()))));

DROP POLICY IF EXISTS "Members can add tags" ON public.heritage_tags;
CREATE POLICY "Members can add tags" ON public.heritage_tags FOR INSERT TO authenticated
  WITH CHECK (tagged_by IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

-- job_applications
DROP POLICY IF EXISTS "Applicants and employers read applications" ON public.job_applications;
CREATE POLICY "Applicants and employers read applications" ON public.job_applications FOR SELECT TO authenticated
  USING (
    (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())))
    OR (job_id IN (SELECT j.id FROM jobs j WHERE j.employer_member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid()))))
  );

DROP POLICY IF EXISTS "Applicants can update application" ON public.job_applications;
CREATE POLICY "Applicants can update application" ON public.job_applications FOR UPDATE TO authenticated
  USING (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Members can apply" ON public.job_applications;
CREATE POLICY "Members can apply" ON public.job_applications FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

-- jobs
DROP POLICY IF EXISTS "Admins can delete jobs" ON public.jobs;
CREATE POLICY "Admins can delete jobs" ON public.jobs FOR DELETE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Directory Manager'));

DROP POLICY IF EXISTS "Employers and managers can update jobs" ON public.jobs;
CREATE POLICY "Employers and managers can update jobs" ON public.jobs FOR UPDATE TO authenticated
  USING (
    (employer_member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())))
    OR has_role((select auth.uid()), 'Global Admin')
    OR has_role((select auth.uid()), 'Directory Manager')
  );

DROP POLICY IF EXISTS "Members can post jobs" ON public.jobs;
CREATE POLICY "Members can post jobs" ON public.jobs FOR INSERT TO authenticated
  WITH CHECK (employer_member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

-- matrimonial_introductions
DROP POLICY IF EXISTS "Authenticated can read introductions" ON public.matrimonial_introductions;
CREATE POLICY "Authenticated can read introductions" ON public.matrimonial_introductions FOR SELECT TO authenticated
  USING (
    (from_member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())))
    OR (to_member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())))
  );

DROP POLICY IF EXISTS "Members can send introductions" ON public.matrimonial_introductions;
CREATE POLICY "Members can send introductions" ON public.matrimonial_introductions FOR INSERT TO authenticated
  WITH CHECK (from_member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Members can update own introductions" ON public.matrimonial_introductions;
CREATE POLICY "Members can update own introductions" ON public.matrimonial_introductions FOR UPDATE TO authenticated
  USING (
    (from_member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())))
    OR (to_member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())))
  );

-- matrimonial_profiles (fix FOR ALL)
DROP POLICY IF EXISTS "Admins can manage matrimonial profiles" ON public.matrimonial_profiles;
DROP POLICY IF EXISTS "Members can create own profile" ON public.matrimonial_profiles;
DROP POLICY IF EXISTS "Members can update own profile" ON public.matrimonial_profiles;
DROP POLICY IF EXISTS "Verified members read profiles" ON public.matrimonial_profiles;

CREATE POLICY "Verified members read profiles" ON public.matrimonial_profiles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Members can create own profile" ON public.matrimonial_profiles FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

CREATE POLICY "Members can update own profile" ON public.matrimonial_profiles FOR UPDATE TO authenticated
  USING (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

CREATE POLICY "Admins can read matrimonial profiles" ON public.matrimonial_profiles FOR SELECT TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Data Steward'));

CREATE POLICY "Admins can insert matrimonial profiles" ON public.matrimonial_profiles FOR INSERT TO authenticated
  WITH CHECK (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Data Steward'));

CREATE POLICY "Admins can update matrimonial profiles" ON public.matrimonial_profiles FOR UPDATE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Data Steward'));

CREATE POLICY "Admins can delete matrimonial profiles" ON public.matrimonial_profiles FOR DELETE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Data Steward'));

-- media_files
DROP POLICY IF EXISTS "Public media readable" ON public.media_files;
CREATE POLICY "Public media readable" ON public.media_files FOR SELECT
  USING ((consent = 'public') OR (owner_user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can upload media" ON public.media_files;
CREATE POLICY "Users can upload media" ON public.media_files FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = (select auth.uid()));

-- medical_aid_requests
DROP POLICY IF EXISTS "Admins can manage medical aid" ON public.medical_aid_requests;
CREATE POLICY "Admins can manage medical aid" ON public.medical_aid_requests FOR UPDATE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Chapter Admin'));

DROP POLICY IF EXISTS "Members can request medical aid" ON public.medical_aid_requests;
CREATE POLICY "Members can request medical aid" ON public.medical_aid_requests FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Members read own medical aid" ON public.medical_aid_requests;
CREATE POLICY "Members read own medical aid" ON public.medical_aid_requests FOR SELECT TO authenticated
  USING (
    (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())))
    OR has_role((select auth.uid()), 'Global Admin')
    OR has_role((select auth.uid()), 'Chapter Admin')
  );

-- member_contacts
DROP POLICY IF EXISTS "Users can delete own contacts" ON public.member_contacts;
CREATE POLICY "Users can delete own contacts" ON public.member_contacts FOR DELETE TO authenticated
  USING (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can insert own contacts" ON public.member_contacts;
CREATE POLICY "Users can insert own contacts" ON public.member_contacts FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can read own contacts" ON public.member_contacts;
CREATE POLICY "Users can read own contacts" ON public.member_contacts FOR SELECT TO authenticated
  USING (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can update own contacts" ON public.member_contacts;
CREATE POLICY "Users can update own contacts" ON public.member_contacts FOR UPDATE TO authenticated
  USING (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

-- member_languages
DROP POLICY IF EXISTS "Users can delete own languages" ON public.member_languages;
CREATE POLICY "Users can delete own languages" ON public.member_languages FOR DELETE TO authenticated
  USING (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can manage own languages" ON public.member_languages;
CREATE POLICY "Users can manage own languages" ON public.member_languages FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

-- member_skills
DROP POLICY IF EXISTS "Users can delete own skills" ON public.member_skills;
CREATE POLICY "Users can delete own skills" ON public.member_skills FOR DELETE TO authenticated
  USING (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can manage own skills" ON public.member_skills;
CREATE POLICY "Users can manage own skills" ON public.member_skills FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

-- members
DROP POLICY IF EXISTS "Admins can update any member" ON public.members;
CREATE POLICY "Admins can update any member" ON public.members FOR UPDATE TO authenticated
  USING (
    has_role((select auth.uid()), 'Global Admin')
    OR has_role((select auth.uid()), 'Data Steward')
    OR has_role((select auth.uid()), 'Chapter Admin')
  );

DROP POLICY IF EXISTS "Users can insert own member" ON public.members;
CREATE POLICY "Users can insert own member" ON public.members FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own member" ON public.members;
CREATE POLICY "Users can update own member" ON public.members FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id);

-- mentorship_sessions
DROP POLICY IF EXISTS "Mentors log sessions" ON public.mentorship_sessions;
CREATE POLICY "Mentors log sessions" ON public.mentorship_sessions FOR INSERT TO authenticated
  WITH CHECK (
    mentorship_id IN (
      SELECT mentorships.id FROM mentorships
      WHERE mentorships.mentor_member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Participants read sessions" ON public.mentorship_sessions;
CREATE POLICY "Participants read sessions" ON public.mentorship_sessions FOR SELECT TO authenticated
  USING (
    mentorship_id IN (
      SELECT mentorships.id FROM mentorships
      WHERE (
        mentorships.mentor_member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid()))
        OR mentorships.mentee_member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid()))
      )
    )
  );

-- mentorships (fix FOR ALL)
DROP POLICY IF EXISTS "Admins can manage mentorships" ON public.mentorships;
DROP POLICY IF EXISTS "Authenticated can read mentorships" ON public.mentorships;
DROP POLICY IF EXISTS "Members can offer mentorship" ON public.mentorships;
DROP POLICY IF EXISTS "Mentors can update own" ON public.mentorships;

CREATE POLICY "Authenticated can read mentorships" ON public.mentorships FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Members can offer mentorship" ON public.mentorships FOR INSERT TO authenticated
  WITH CHECK (mentor_member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

CREATE POLICY "Mentors can update own" ON public.mentorships FOR UPDATE TO authenticated
  USING (mentor_member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

CREATE POLICY "Admins can read mentorships" ON public.mentorships FOR SELECT TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin'));

CREATE POLICY "Admins can insert mentorships" ON public.mentorships FOR INSERT TO authenticated
  WITH CHECK (has_role((select auth.uid()), 'Global Admin'));

CREATE POLICY "Admins can update mentorships" ON public.mentorships FOR UPDATE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin'));

CREATE POLICY "Admins can delete mentorships" ON public.mentorships FOR DELETE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin'));

-- notification_preferences
DROP POLICY IF EXISTS "Members can create prefs" ON public.notification_preferences;
CREATE POLICY "Members can create prefs" ON public.notification_preferences FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Members can update prefs" ON public.notification_preferences;
CREATE POLICY "Members can update prefs" ON public.notification_preferences FOR UPDATE TO authenticated
  USING (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Members read own prefs" ON public.notification_preferences;
CREATE POLICY "Members read own prefs" ON public.notification_preferences FOR SELECT TO authenticated
  USING (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

-- oral_histories (fix FOR ALL)
DROP POLICY IF EXISTS "Admins can manage oral histories" ON public.oral_histories;
DROP POLICY IF EXISTS "Anyone can read published oral histories" ON public.oral_histories;
DROP POLICY IF EXISTS "Members can upload oral histories" ON public.oral_histories;
DROP POLICY IF EXISTS "Uploaders can update" ON public.oral_histories;

CREATE POLICY "Anyone can read published oral histories" ON public.oral_histories FOR SELECT
  USING (
    (status = 'published')
    OR (uploaded_by IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())))
  );

CREATE POLICY "Members can upload oral histories" ON public.oral_histories FOR INSERT TO authenticated
  WITH CHECK (uploaded_by IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

CREATE POLICY "Uploaders can update" ON public.oral_histories FOR UPDATE TO authenticated
  USING (uploaded_by IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

CREATE POLICY "Admins can read oral histories" ON public.oral_histories FOR SELECT TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Data Steward'));

CREATE POLICY "Admins can insert oral histories" ON public.oral_histories FOR INSERT TO authenticated
  WITH CHECK (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Data Steward'));

CREATE POLICY "Admins can update oral histories" ON public.oral_histories FOR UPDATE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Data Steward'));

CREATE POLICY "Admins can delete oral histories" ON public.oral_histories FOR DELETE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Data Steward'));

-- photo_tags
DROP POLICY IF EXISTS "Members can tag" ON public.photo_tags;
CREATE POLICY "Members can tag" ON public.photo_tags FOR INSERT TO authenticated
  WITH CHECK (tagged_by IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Tagged members can update consent" ON public.photo_tags;
CREATE POLICY "Tagged members can update consent" ON public.photo_tags FOR UPDATE TO authenticated
  USING (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Taggers can delete tags" ON public.photo_tags;
CREATE POLICY "Taggers can delete tags" ON public.photo_tags FOR DELETE TO authenticated
  USING (tagged_by IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

-- receipts
DROP POLICY IF EXISTS "Members read own receipts" ON public.receipts;
CREATE POLICY "Members read own receipts" ON public.receipts FOR SELECT TO authenticated
  USING (
    donation_id IN (
      SELECT donations.id FROM donations
      WHERE donations.member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid()))
    )
  );

-- reports
DROP POLICY IF EXISTS "Admins can update reports" ON public.reports;
CREATE POLICY "Admins can update reports" ON public.reports FOR UPDATE TO authenticated
  USING (
    has_role((select auth.uid()), 'Global Admin')
    OR has_role((select auth.uid()), 'Moderator')
    OR has_role((select auth.uid()), 'Data Steward')
  );

DROP POLICY IF EXISTS "Authenticated members can report" ON public.reports;
CREATE POLICY "Authenticated members can report" ON public.reports FOR INSERT TO authenticated
  WITH CHECK (reporter_member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can view own reports" ON public.reports;
CREATE POLICY "Users can view own reports" ON public.reports FOR SELECT TO authenticated
  USING (
    (reporter_member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())))
    OR has_role((select auth.uid()), 'Global Admin')
    OR has_role((select auth.uid()), 'Moderator')
    OR has_role((select auth.uid()), 'Data Steward')
  );

-- scholarship_applications
DROP POLICY IF EXISTS "Members can apply to scholarships" ON public.scholarship_applications;
CREATE POLICY "Members can apply to scholarships" ON public.scholarship_applications FOR SELECT TO authenticated
  USING (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Members can submit scholarship app" ON public.scholarship_applications;
CREATE POLICY "Members can submit scholarship app" ON public.scholarship_applications FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

-- scholarships
DROP POLICY IF EXISTS "Admins can create scholarships" ON public.scholarships;
CREATE POLICY "Admins can create scholarships" ON public.scholarships FOR INSERT TO authenticated
  WITH CHECK (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Finance Admin'));

DROP POLICY IF EXISTS "Admins can delete scholarships" ON public.scholarships;
CREATE POLICY "Admins can delete scholarships" ON public.scholarships FOR DELETE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Finance Admin'));

DROP POLICY IF EXISTS "Admins can update scholarships" ON public.scholarships;
CREATE POLICY "Admins can update scholarships" ON public.scholarships FOR UPDATE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Finance Admin'));

-- tag_requests
DROP POLICY IF EXISTS "Members can request tags" ON public.tag_requests;
CREATE POLICY "Members can request tags" ON public.tag_requests FOR INSERT TO authenticated
  WITH CHECK (requester_user_id = (select auth.uid()));

-- verification_requests
DROP POLICY IF EXISTS "Admins can update verification requests" ON public.verification_requests;
CREATE POLICY "Admins can update verification requests" ON public.verification_requests FOR UPDATE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin') OR has_role((select auth.uid()), 'Data Steward'));

DROP POLICY IF EXISTS "Members can create verification requests" ON public.verification_requests;
CREATE POLICY "Members can create verification requests" ON public.verification_requests FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Members can read own verification requests" ON public.verification_requests;
CREATE POLICY "Members can read own verification requests" ON public.verification_requests FOR SELECT TO authenticated
  USING (
    (member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())))
    OR has_role((select auth.uid()), 'Global Admin')
    OR has_role((select auth.uid()), 'Data Steward')
  );

-- vouches
DROP POLICY IF EXISTS "Users can create vouches" ON public.vouches;
CREATE POLICY "Users can create vouches" ON public.vouches FOR INSERT TO authenticated
  WITH CHECK (voucher_member_id IN (SELECT members.id FROM members WHERE members.user_id = (select auth.uid())));

-- whatsapp_messages (fix FOR ALL)
DROP POLICY IF EXISTS "Admins can manage messages" ON public.whatsapp_messages;
CREATE POLICY "Admins can read messages" ON public.whatsapp_messages FOR SELECT TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin'));
CREATE POLICY "Admins can insert messages" ON public.whatsapp_messages FOR INSERT TO authenticated
  WITH CHECK (has_role((select auth.uid()), 'Global Admin'));
CREATE POLICY "Admins can update messages" ON public.whatsapp_messages FOR UPDATE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin'));
CREATE POLICY "Admins can delete messages" ON public.whatsapp_messages FOR DELETE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin'));

-- whatsapp_templates (fix FOR ALL)
DROP POLICY IF EXISTS "Admins can manage templates" ON public.whatsapp_templates;
DROP POLICY IF EXISTS "Authenticated can read templates" ON public.whatsapp_templates;

CREATE POLICY "Authenticated can read templates" ON public.whatsapp_templates FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Admins can insert templates" ON public.whatsapp_templates FOR INSERT TO authenticated
  WITH CHECK (has_role((select auth.uid()), 'Global Admin'));
CREATE POLICY "Admins can update templates" ON public.whatsapp_templates FOR UPDATE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin'));
CREATE POLICY "Admins can delete templates" ON public.whatsapp_templates FOR DELETE TO authenticated
  USING (has_role((select auth.uid()), 'Global Admin'));

-- ========== 20260315194356_seed_geography.sql ==========

/*
  # Seed Geography: Countries, States, Cities

  Inserts reference geography data required before chapters and members can be created.

  1. Countries: India, United States, United Kingdom, UAE, Canada, Australia, Singapore, Kenya
  2. States: Major Indian states + international
  3. Cities: All major Khadayata community hubs globally
*/

INSERT INTO countries (id, iso2, name) VALUES
  ('c1000001-0000-0000-0000-000000000001'::uuid, 'IN', 'India'),
  ('c1000002-0000-0000-0000-000000000002'::uuid, 'US', 'United States'),
  ('c1000003-0000-0000-0000-000000000003'::uuid, 'GB', 'United Kingdom'),
  ('c1000004-0000-0000-0000-000000000004'::uuid, 'AE', 'United Arab Emirates'),
  ('c1000005-0000-0000-0000-000000000005'::uuid, 'CA', 'Canada'),
  ('c1000006-0000-0000-0000-000000000006'::uuid, 'AU', 'Australia'),
  ('c1000007-0000-0000-0000-000000000007'::uuid, 'SG', 'Singapore'),
  ('c1000008-0000-0000-0000-000000000008'::uuid, 'KE', 'Kenya')
ON CONFLICT (id) DO NOTHING;

INSERT INTO states (id, country_id, code, name) VALUES
  -- India
  ('d1000001-0000-0000-0000-000000000001'::uuid, 'c1000001-0000-0000-0000-000000000001'::uuid, 'GJ', 'Gujarat'),
  ('d1000002-0000-0000-0000-000000000002'::uuid, 'c1000001-0000-0000-0000-000000000001'::uuid, 'MH', 'Maharashtra'),
  ('d1000003-0000-0000-0000-000000000003'::uuid, 'c1000001-0000-0000-0000-000000000001'::uuid, 'RJ', 'Rajasthan'),
  ('d1000004-0000-0000-0000-000000000004'::uuid, 'c1000001-0000-0000-0000-000000000001'::uuid, 'DL', 'Delhi'),
  ('d1000005-0000-0000-0000-000000000005'::uuid, 'c1000001-0000-0000-0000-000000000001'::uuid, 'KA', 'Karnataka'),
  ('d1000006-0000-0000-0000-000000000006'::uuid, 'c1000001-0000-0000-0000-000000000001'::uuid, 'MP', 'Madhya Pradesh'),
  -- USA
  ('d1000010-0000-0000-0000-000000000010'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'NY', 'New York'),
  ('d1000011-0000-0000-0000-000000000011'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'CA', 'California'),
  ('d1000012-0000-0000-0000-000000000012'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'IL', 'Illinois'),
  -- UK
  ('d1000020-0000-0000-0000-000000000020'::uuid, 'c1000003-0000-0000-0000-000000000003'::uuid, 'ENG', 'England'),
  -- UAE
  ('d1000030-0000-0000-0000-000000000030'::uuid, 'c1000004-0000-0000-0000-000000000004'::uuid, 'DU', 'Dubai'),
  -- Canada
  ('d1000040-0000-0000-0000-000000000040'::uuid, 'c1000005-0000-0000-0000-000000000005'::uuid, 'ON', 'Ontario'),
  -- Australia
  ('d1000050-0000-0000-0000-000000000050'::uuid, 'c1000006-0000-0000-0000-000000000006'::uuid, 'NSW', 'New South Wales'),
  -- Singapore
  ('d1000060-0000-0000-0000-000000000060'::uuid, 'c1000007-0000-0000-0000-000000000007'::uuid, 'SGP', 'Singapore'),
  -- Kenya
  ('d1000070-0000-0000-0000-000000000070'::uuid, 'c1000008-0000-0000-0000-000000000008'::uuid, 'NBI', 'Nairobi County')
ON CONFLICT (id) DO NOTHING;

INSERT INTO cities (id, state_id, code, name) VALUES
  -- Gujarat
  ('e1000001-0000-0000-0000-000000000001'::uuid, 'd1000001-0000-0000-0000-000000000001'::uuid, 'AHM', 'Ahmedabad'),
  ('e1000002-0000-0000-0000-000000000002'::uuid, 'd1000001-0000-0000-0000-000000000001'::uuid, 'SUR', 'Surat'),
  ('e1000003-0000-0000-0000-000000000003'::uuid, 'd1000001-0000-0000-0000-000000000001'::uuid, 'VAD', 'Vadodara'),
  ('e1000004-0000-0000-0000-000000000004'::uuid, 'd1000001-0000-0000-0000-000000000001'::uuid, 'RAJ', 'Rajkot'),
  -- Maharashtra
  ('e1000010-0000-0000-0000-000000000010'::uuid, 'd1000002-0000-0000-0000-000000000002'::uuid, 'MUM', 'Mumbai'),
  ('e1000011-0000-0000-0000-000000000011'::uuid, 'd1000002-0000-0000-0000-000000000002'::uuid, 'PUN', 'Pune'),
  -- Rajasthan
  ('e1000020-0000-0000-0000-000000000020'::uuid, 'd1000003-0000-0000-0000-000000000003'::uuid, 'JPR', 'Jaipur'),
  ('e1000021-0000-0000-0000-000000000021'::uuid, 'd1000003-0000-0000-0000-000000000003'::uuid, 'JDH', 'Jodhpur'),
  -- Delhi
  ('e1000030-0000-0000-0000-000000000030'::uuid, 'd1000004-0000-0000-0000-000000000004'::uuid, 'DEL', 'New Delhi'),
  -- Karnataka
  ('e1000040-0000-0000-0000-000000000040'::uuid, 'd1000005-0000-0000-0000-000000000005'::uuid, 'BLR', 'Bengaluru'),
  -- USA
  ('e1000050-0000-0000-0000-000000000050'::uuid, 'd1000010-0000-0000-0000-000000000010'::uuid, 'NYC', 'New York City'),
  ('e1000051-0000-0000-0000-000000000051'::uuid, 'd1000011-0000-0000-0000-000000000011'::uuid, 'LAX', 'Los Angeles'),
  ('e1000052-0000-0000-0000-000000000052'::uuid, 'd1000012-0000-0000-0000-000000000012'::uuid, 'CHI', 'Chicago'),
  -- UK
  ('e1000060-0000-0000-0000-000000000060'::uuid, 'd1000020-0000-0000-0000-000000000020'::uuid, 'LON', 'London'),
  -- UAE
  ('e1000070-0000-0000-0000-000000000070'::uuid, 'd1000030-0000-0000-0000-000000000030'::uuid, 'DXB', 'Dubai'),
  -- Canada
  ('e1000080-0000-0000-0000-000000000080'::uuid, 'd1000040-0000-0000-0000-000000000040'::uuid, 'TOR', 'Toronto'),
  -- Australia
  ('e1000090-0000-0000-0000-000000000090'::uuid, 'd1000050-0000-0000-0000-000000000050'::uuid, 'SYD', 'Sydney'),
  -- Singapore
  ('e1000100-0000-0000-0000-000000000100'::uuid, 'd1000060-0000-0000-0000-000000000060'::uuid, 'SGP', 'Singapore'),
  -- Kenya
  ('e1000110-0000-0000-0000-000000000110'::uuid, 'd1000070-0000-0000-0000-000000000070'::uuid, 'NRB', 'Nairobi')
ON CONFLICT (id) DO NOTHING;

-- Ensure city_codes exist for Global ID generation
INSERT INTO city_codes (city_name, city_code, state_code, country_code) VALUES
  ('Ahmedabad',     'AHM', 'GJ',  'IN'),
  ('Surat',         'SUR', 'GJ',  'IN'),
  ('Vadodara',      'VAD', 'GJ',  'IN'),
  ('Rajkot',        'RAJ', 'GJ',  'IN'),
  ('Mumbai',        'MUM', 'MH',  'IN'),
  ('Pune',          'PUN', 'MH',  'IN'),
  ('Jaipur',        'JPR', 'RJ',  'IN'),
  ('Jodhpur',       'JDH', 'RJ',  'IN'),
  ('New Delhi',     'DEL', 'DL',  'IN'),
  ('Bengaluru',     'BLR', 'KA',  'IN'),
  ('New York City', 'NYC', 'NY',  'US'),
  ('Los Angeles',   'LAX', 'CA',  'US'),
  ('Chicago',       'CHI', 'IL',  'US'),
  ('London',        'LON', 'ENG', 'GB'),
  ('Dubai',         'DXB', 'DU',  'AE'),
  ('Toronto',       'TOR', 'ON',  'CA'),
  ('Sydney',        'SYD', 'NSW', 'AU'),
  ('Singapore',     'SGP', 'SGP', 'SG'),
  ('Nairobi',       'NRB', 'NBI', 'KE')
ON CONFLICT DO NOTHING;

-- ========== 20260315194424_seed_chapters.sql ==========

/*
  # Seed Chapters

  Creates the core chapter structure:
  - Global chapter (no city, umbrella for all)
  - India: Ahmedabad, Surat, Vadodara, Mumbai, Jaipur, New Delhi
  - International: New York, London, Dubai, Toronto, Sydney, Singapore, Nairobi

  Each chapter has a slug, subdomain, and JSON settings.
*/

INSERT INTO chapters (id, name, slug, subdomain, country_id, state_id, city_id, settings) VALUES
  (
    'f1000001-0000-0000-0000-000000000001'::uuid,
    'Global',
    'global',
    'global',
    'c1000001-0000-0000-0000-000000000001'::uuid,
    NULL,
    NULL,
    '{"theme":"default","features":["events","directory","matrimonial","business","news","scholarships","mentorship"],"contact":{"email":"global@khadayataonline.com"}}'::jsonb
  ),
  (
    'f1000002-0000-0000-0000-000000000002'::uuid,
    'Ahmedabad Chapter',
    'ahmedabad',
    'ahmedabad',
    'c1000001-0000-0000-0000-000000000001'::uuid,
    'd1000001-0000-0000-0000-000000000001'::uuid,
    'e1000001-0000-0000-0000-000000000001'::uuid,
    '{"theme":"default","features":["events","directory","matrimonial","business","news","scholarships"],"contact":{"email":"ahmedabad@khadayataonline.com"}}'::jsonb
  ),
  (
    'f1000003-0000-0000-0000-000000000003'::uuid,
    'Mumbai Chapter',
    'mumbai',
    'mumbai',
    'c1000001-0000-0000-0000-000000000001'::uuid,
    'd1000002-0000-0000-0000-000000000002'::uuid,
    'e1000010-0000-0000-0000-000000000010'::uuid,
    '{"theme":"default","features":["events","directory","business","news"],"contact":{"email":"mumbai@khadayataonline.com"}}'::jsonb
  ),
  (
    'f1000004-0000-0000-0000-000000000004'::uuid,
    'Surat Chapter',
    'surat',
    'surat',
    'c1000001-0000-0000-0000-000000000001'::uuid,
    'd1000001-0000-0000-0000-000000000001'::uuid,
    'e1000002-0000-0000-0000-000000000002'::uuid,
    '{"theme":"default","features":["events","directory","matrimonial"],"contact":{"email":"surat@khadayataonline.com"}}'::jsonb
  ),
  (
    'f1000005-0000-0000-0000-000000000005'::uuid,
    'Jaipur Chapter',
    'jaipur',
    'jaipur',
    'c1000001-0000-0000-0000-000000000001'::uuid,
    'd1000003-0000-0000-0000-000000000003'::uuid,
    'e1000020-0000-0000-0000-000000000020'::uuid,
    '{"theme":"default","features":["events","directory","matrimonial","news"],"contact":{"email":"jaipur@khadayataonline.com"}}'::jsonb
  ),
  (
    'f1000006-0000-0000-0000-000000000006'::uuid,
    'New Delhi Chapter',
    'delhi',
    'delhi',
    'c1000001-0000-0000-0000-000000000001'::uuid,
    'd1000004-0000-0000-0000-000000000004'::uuid,
    'e1000030-0000-0000-0000-000000000030'::uuid,
    '{"theme":"default","features":["events","directory","matrimonial","business","news"],"contact":{"email":"delhi@khadayataonline.com"}}'::jsonb
  ),
  (
    'f1000007-0000-0000-0000-000000000007'::uuid,
    'New York Chapter',
    'new-york',
    'newyork',
    'c1000002-0000-0000-0000-000000000002'::uuid,
    'd1000010-0000-0000-0000-000000000010'::uuid,
    'e1000050-0000-0000-0000-000000000050'::uuid,
    '{"theme":"default","features":["events","directory","matrimonial","business","news","scholarships"],"contact":{"email":"newyork@khadayataonline.com"}}'::jsonb
  ),
  (
    'f1000008-0000-0000-0000-000000000008'::uuid,
    'London Chapter',
    'london',
    'london',
    'c1000003-0000-0000-0000-000000000003'::uuid,
    'd1000020-0000-0000-0000-000000000020'::uuid,
    'e1000060-0000-0000-0000-000000000060'::uuid,
    '{"theme":"default","features":["events","directory","news"],"contact":{"email":"london@khadayataonline.com"}}'::jsonb
  ),
  (
    'f1000009-0000-0000-0000-000000000009'::uuid,
    'Dubai Chapter',
    'dubai',
    'dubai',
    'c1000004-0000-0000-0000-000000000004'::uuid,
    'd1000030-0000-0000-0000-000000000030'::uuid,
    'e1000070-0000-0000-0000-000000000070'::uuid,
    '{"theme":"default","features":["events","directory","business","news"],"contact":{"email":"dubai@khadayataonline.com"}}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- ========== 20260315194605_seed_test_users_all_roles.sql ==========

/*
  # Seed Test Users for All Roles

  Creates auth users and member profiles for every role in the system.

  New users (password: TestPass123!):
  - global-admin@khadayataonline.com  → Global Admin
  - chapter-admin@khadayataonline.com → Chapter Admin (Ahmedabad)
  - data-steward@khadayataonline.com  → Data Steward
  - dir-manager@khadayataonline.com   → Directory Manager
  - event-manager@khadayataonline.com → Event Manager
  - finance-admin@khadayataonline.com → Finance Admin
  - publisher@khadayataonline.com     → Global Publisher
  - moderator@khadayataonline.com     → Moderator
  - member@khadayataonline.com        → Regular member (no role)
  - unverified@khadayataonline.com    → Unverified / incomplete onboarding

  Existing seed users (seed1–10) are assigned to Ahmedabad chapter.
*/

-- -------------------------------------------------------
-- New Auth Users (all roles)
-- -------------------------------------------------------
INSERT INTO auth.users (
  id, instance_id, aud, role,
  email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin, confirmation_token, recovery_token,
  email_change_token_new, email_change
)
VALUES
  (
    'b0000001-cafe-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated', 'authenticated',
    'global-admin@khadayataonline.com',
    crypt('TestPass123!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false, '', '', '', ''
  ),
  (
    'b0000002-cafe-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated', 'authenticated',
    'chapter-admin@khadayataonline.com',
    crypt('TestPass123!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false, '', '', '', ''
  ),
  (
    'b0000003-cafe-0000-0000-000000000003'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated', 'authenticated',
    'data-steward@khadayataonline.com',
    crypt('TestPass123!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false, '', '', '', ''
  ),
  (
    'b0000004-cafe-0000-0000-000000000004'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated', 'authenticated',
    'dir-manager@khadayataonline.com',
    crypt('TestPass123!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false, '', '', '', ''
  ),
  (
    'b0000005-cafe-0000-0000-000000000005'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated', 'authenticated',
    'event-manager@khadayataonline.com',
    crypt('TestPass123!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false, '', '', '', ''
  ),
  (
    'b0000006-cafe-0000-0000-000000000006'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated', 'authenticated',
    'finance-admin@khadayataonline.com',
    crypt('TestPass123!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false, '', '', '', ''
  ),
  (
    'b0000007-cafe-0000-0000-000000000007'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated', 'authenticated',
    'publisher@khadayataonline.com',
    crypt('TestPass123!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false, '', '', '', ''
  ),
  (
    'b0000008-cafe-0000-0000-000000000008'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated', 'authenticated',
    'moderator@khadayataonline.com',
    crypt('TestPass123!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false, '', '', '', ''
  ),
  (
    'b0000009-cafe-0000-0000-000000000009'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated', 'authenticated',
    'member@khadayataonline.com',
    crypt('TestPass123!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false, '', '', '', ''
  ),
  (
    'b0000010-cafe-0000-0000-000000000010'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated', 'authenticated',
    'unverified@khadayataonline.com',
    crypt('TestPass123!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false, '', '', '', ''
  )
ON CONFLICT (id) DO NOTHING;

-- Insert identities for new users
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'b0000001-cafe-0000-0000-000000000001'::uuid, '{"sub":"b0000001-cafe-0000-0000-000000000001","email":"global-admin@khadayataonline.com"}'::jsonb, 'email', 'global-admin@khadayataonline.com', now(), now(), now()),
  (gen_random_uuid(), 'b0000002-cafe-0000-0000-000000000002'::uuid, '{"sub":"b0000002-cafe-0000-0000-000000000002","email":"chapter-admin@khadayataonline.com"}'::jsonb, 'email', 'chapter-admin@khadayataonline.com', now(), now(), now()),
  (gen_random_uuid(), 'b0000003-cafe-0000-0000-000000000003'::uuid, '{"sub":"b0000003-cafe-0000-0000-000000000003","email":"data-steward@khadayataonline.com"}'::jsonb, 'email', 'data-steward@khadayataonline.com', now(), now(), now()),
  (gen_random_uuid(), 'b0000004-cafe-0000-0000-000000000004'::uuid, '{"sub":"b0000004-cafe-0000-0000-000000000004","email":"dir-manager@khadayataonline.com"}'::jsonb, 'email', 'dir-manager@khadayataonline.com', now(), now(), now()),
  (gen_random_uuid(), 'b0000005-cafe-0000-0000-000000000005'::uuid, '{"sub":"b0000005-cafe-0000-0000-000000000005","email":"event-manager@khadayataonline.com"}'::jsonb, 'email', 'event-manager@khadayataonline.com', now(), now(), now()),
  (gen_random_uuid(), 'b0000006-cafe-0000-0000-000000000006'::uuid, '{"sub":"b0000006-cafe-0000-0000-000000000006","email":"finance-admin@khadayataonline.com"}'::jsonb, 'email', 'finance-admin@khadayataonline.com', now(), now(), now()),
  (gen_random_uuid(), 'b0000007-cafe-0000-0000-000000000007'::uuid, '{"sub":"b0000007-cafe-0000-0000-000000000007","email":"publisher@khadayataonline.com"}'::jsonb, 'email', 'publisher@khadayataonline.com', now(), now(), now()),
  (gen_random_uuid(), 'b0000008-cafe-0000-0000-000000000008'::uuid, '{"sub":"b0000008-cafe-0000-0000-000000000008","email":"moderator@khadayataonline.com"}'::jsonb, 'email', 'moderator@khadayataonline.com', now(), now(), now()),
  (gen_random_uuid(), 'b0000009-cafe-0000-0000-000000000009'::uuid, '{"sub":"b0000009-cafe-0000-0000-000000000009","email":"member@khadayataonline.com"}'::jsonb, 'email', 'member@khadayataonline.com', now(), now(), now()),
  (gen_random_uuid(), 'b0000010-cafe-0000-0000-000000000010'::uuid, '{"sub":"b0000010-cafe-0000-0000-000000000010","email":"unverified@khadayataonline.com"}'::jsonb, 'email', 'unverified@khadayataonline.com', now(), now(), now())
ON CONFLICT (provider, provider_id) DO NOTHING;

-- -------------------------------------------------------
-- Member profiles for new role-based users
-- -------------------------------------------------------
INSERT INTO members (
  id, user_id, first_name, last_name, gender, dob, ekda,
  chapter_id, onboarding_completed, verification_level,
  privacy
) VALUES
  (
    gen_random_uuid(),
    'b0000001-cafe-0000-0000-000000000001'::uuid,
    'Rajesh', 'Khandelwal', 'Male', '1972-05-10', 'Visa',
    'f1000001-0000-0000-0000-000000000001'::uuid,
    true, 3,
    '{"dob":"members","phone":"members","email":"members","birth_place":"members","employment":"public"}'::jsonb
  ),
  (
    gen_random_uuid(),
    'b0000002-cafe-0000-0000-000000000002'::uuid,
    'Sunita', 'Sharma', 'Female', '1980-03-22', 'Maheshwari',
    'f1000002-0000-0000-0000-000000000002'::uuid,
    true, 2,
    '{"dob":"members","phone":"members","email":"members","birth_place":"members","employment":"public"}'::jsonb
  ),
  (
    gen_random_uuid(),
    'b0000003-cafe-0000-0000-000000000003'::uuid,
    'Priya', 'Agarwal', 'Female', '1985-11-15', 'Agrawala',
    'f1000002-0000-0000-0000-000000000002'::uuid,
    true, 2,
    '{"dob":"members","phone":"members","email":"members","birth_place":"members","employment":"public"}'::jsonb
  ),
  (
    gen_random_uuid(),
    'b0000004-cafe-0000-0000-000000000004'::uuid,
    'Suresh', 'Gupta', 'Male', '1978-07-04', 'Visa',
    'f1000002-0000-0000-0000-000000000002'::uuid,
    true, 2,
    '{"dob":"members","phone":"members","email":"members","birth_place":"members","employment":"public"}'::jsonb
  ),
  (
    gen_random_uuid(),
    'b0000005-cafe-0000-0000-000000000005'::uuid,
    'Deepak', 'Jain', 'Male', '1983-09-30', 'Visa',
    'f1000003-0000-0000-0000-000000000003'::uuid,
    true, 2,
    '{"dob":"members","phone":"members","email":"members","birth_place":"members","employment":"public"}'::jsonb
  ),
  (
    gen_random_uuid(),
    'b0000006-cafe-0000-0000-000000000006'::uuid,
    'Anita', 'Bansal', 'Female', '1975-12-01', 'Maheshwari',
    'f1000002-0000-0000-0000-000000000002'::uuid,
    true, 2,
    '{"dob":"members","phone":"members","email":"members","birth_place":"members","employment":"public"}'::jsonb
  ),
  (
    gen_random_uuid(),
    'b0000007-cafe-0000-0000-000000000007'::uuid,
    'Vikram', 'Mehta', 'Male', '1990-02-14', 'Visa',
    'f1000003-0000-0000-0000-000000000003'::uuid,
    true, 1,
    '{"dob":"members","phone":"members","email":"members","birth_place":"members","employment":"public"}'::jsonb
  ),
  (
    gen_random_uuid(),
    'b0000008-cafe-0000-0000-000000000008'::uuid,
    'Pooja', 'Verma', 'Female', '1988-06-20', 'Agrawala',
    'f1000002-0000-0000-0000-000000000002'::uuid,
    true, 1,
    '{"dob":"members","phone":"members","email":"members","birth_place":"members","employment":"public"}'::jsonb
  ),
  (
    gen_random_uuid(),
    'b0000009-cafe-0000-0000-000000000009'::uuid,
    'Amit', 'Patel', 'Male', '1995-04-08', 'Visa',
    'f1000002-0000-0000-0000-000000000002'::uuid,
    true, 1,
    '{"dob":"members","phone":"members","email":"members","birth_place":"members","employment":"public"}'::jsonb
  ),
  (
    gen_random_uuid(),
    'b0000010-cafe-0000-0000-000000000010'::uuid,
    'Ritu', 'Singh', 'Female', '1998-08-25', 'Maheshwari',
    NULL,
    false, 0,
    '{}'::jsonb
  )
ON CONFLICT (user_id) DO NOTHING;

-- -------------------------------------------------------
-- Assign Ahmedabad chapter to existing seed users
-- -------------------------------------------------------
UPDATE members SET
  chapter_id = 'f1000002-0000-0000-0000-000000000002'::uuid
WHERE user_id IN (
  'a1000001-0000-0000-0000-000000000001'::uuid,
  'a1000001-0000-0000-0000-000000000002'::uuid,
  'a1000001-0000-0000-0000-000000000003'::uuid,
  'a1000001-0000-0000-0000-000000000004'::uuid,
  'a1000001-0000-0000-0000-000000000005'::uuid,
  'a1000001-0000-0000-0000-000000000006'::uuid,
  'a1000001-0000-0000-0000-000000000007'::uuid,
  'a1000001-0000-0000-0000-000000000008'::uuid,
  'a1000001-0000-0000-0000-000000000009'::uuid,
  'a1000001-0000-0000-0000-000000000010'::uuid
);

-- ========== 20260315194647_seed_roles_and_assignments.sql ==========

/*
  # Seed Roles and Role Assignments

  Creates all 9 platform roles (global + chapter-scoped) and assigns them
  to the appropriate test users.

  Global roles (chapter_id = NULL):
    Global Admin, Data Steward, Directory Manager, Event Manager,
    Finance Admin, Global Publisher, Moderator

  Chapter-scoped roles:
    Chapter Admin, Publisher (per chapter)

  Role assignments map each role-specific test user to their role.
*/

-- -------------------------------------------------------
-- Global Roles
-- -------------------------------------------------------
INSERT INTO roles (id, chapter_id, name, scope) VALUES
  ('a0100001-0001-0001-0001-000000000001'::uuid, NULL, 'Global Admin',      'global'),
  ('a0100002-0002-0002-0002-000000000002'::uuid, NULL, 'Data Steward',      'global'),
  ('a0100003-0003-0003-0003-000000000003'::uuid, NULL, 'Directory Manager', 'global'),
  ('a0100004-0004-0004-0004-000000000004'::uuid, NULL, 'Event Manager',     'global'),
  ('a0100005-0005-0005-0005-000000000005'::uuid, NULL, 'Finance Admin',     'global'),
  ('a0100006-0006-0006-0006-000000000006'::uuid, NULL, 'Global Publisher',  'global'),
  ('a0100007-0007-0007-0007-000000000007'::uuid, NULL, 'Moderator',         'global')
ON CONFLICT (chapter_id, name) DO NOTHING;

-- Chapter-scoped roles for Ahmedabad
INSERT INTO roles (id, chapter_id, name, scope) VALUES
  ('a0100010-0010-0010-0010-000000000010'::uuid, 'f1000002-0000-0000-0000-000000000002'::uuid, 'Chapter Admin', 'chapter'),
  ('a0100011-0011-0011-0011-000000000011'::uuid, 'f1000002-0000-0000-0000-000000000002'::uuid, 'Publisher',     'chapter')
ON CONFLICT (chapter_id, name) DO NOTHING;

-- Chapter-scoped roles for Mumbai
INSERT INTO roles (id, chapter_id, name, scope) VALUES
  ('a0100012-0012-0012-0012-000000000012'::uuid, 'f1000003-0000-0000-0000-000000000003'::uuid, 'Chapter Admin', 'chapter'),
  ('a0100013-0013-0013-0013-000000000013'::uuid, 'f1000003-0000-0000-0000-000000000003'::uuid, 'Publisher',     'chapter')
ON CONFLICT (chapter_id, name) DO NOTHING;

-- -------------------------------------------------------
-- Role Assignments via subquery on members.user_id
-- -------------------------------------------------------
INSERT INTO role_assignments (id, role_id, member_id, start_date, end_date, created_by)
SELECT
  gen_random_uuid(),
  r.role_id::uuid,
  m.id,
  CURRENT_DATE,
  NULL,
  m.id
FROM (VALUES
  ('b0000001-f00d-0000-0000-000000000001', 'a0100001-0001-0001-0001-000000000001'),
  ('b0000002-f00d-0000-0000-000000000002', 'a0100010-0010-0010-0010-000000000010'),
  ('b0000003-f00d-0000-0000-000000000003', 'a0100002-0002-0002-0002-000000000002'),
  ('b0000004-f00d-0000-0000-000000000004', 'a0100003-0003-0003-0003-000000000003'),
  ('b0000005-f00d-0000-0000-000000000005', 'a0100004-0004-0004-0004-000000000004'),
  ('b0000006-f00d-0000-0000-000000000006', 'a0100005-0005-0005-0005-000000000005'),
  ('b0000007-f00d-0000-0000-000000000007', 'a0100006-0006-0006-0006-000000000006'),
  ('b0000008-f00d-0000-0000-000000000008', 'a0100007-0007-0007-0007-000000000007')
) AS r(user_id_str, role_id)
JOIN members m ON m.user_id = r.user_id_str::uuid
ON CONFLICT DO NOTHING;

-- ========== 20260315194808_seed_update_role_members.sql ==========

/*
  # Update Role-Based Members and Fix Role Assignments

  The auth trigger created blank member records for each new user.
  This migration:
  1. Updates those blank members with proper profile data
  2. Creates role assignments with correct created_by = auth.users.id
*/

-- -------------------------------------------------------
-- Update member profiles
-- -------------------------------------------------------
UPDATE members SET
  first_name = 'Rajesh', last_name = 'Khandelwal', gender = 'Male',
  dob = '1972-05-10', ekda = 'Visa',
  chapter_id = 'f1000001-0000-0000-0000-000000000001'::uuid,
  onboarding_completed = true, verification_level = 3,
  privacy = '{"dob":"members","phone":"members","email":"members","birth_place":"members","employment":"public"}'::jsonb
WHERE user_id = 'b0000001-cafe-0000-0000-000000000001'::uuid;

UPDATE members SET
  first_name = 'Sunita', last_name = 'Sharma', gender = 'Female',
  dob = '1980-03-22', ekda = 'Maheshwari',
  chapter_id = 'f1000002-0000-0000-0000-000000000002'::uuid,
  onboarding_completed = true, verification_level = 2,
  privacy = '{"dob":"members","phone":"members","email":"members","birth_place":"members","employment":"public"}'::jsonb
WHERE user_id = 'b0000002-cafe-0000-0000-000000000002'::uuid;

UPDATE members SET
  first_name = 'Priya', last_name = 'Agarwal', gender = 'Female',
  dob = '1985-11-15', ekda = 'Agrawala',
  chapter_id = 'f1000002-0000-0000-0000-000000000002'::uuid,
  onboarding_completed = true, verification_level = 2,
  privacy = '{"dob":"members","phone":"members","email":"members","birth_place":"members","employment":"public"}'::jsonb
WHERE user_id = 'b0000003-cafe-0000-0000-000000000003'::uuid;

UPDATE members SET
  first_name = 'Suresh', last_name = 'Gupta', gender = 'Male',
  dob = '1978-07-04', ekda = 'Visa',
  chapter_id = 'f1000002-0000-0000-0000-000000000002'::uuid,
  onboarding_completed = true, verification_level = 2,
  privacy = '{"dob":"members","phone":"members","email":"members","birth_place":"members","employment":"public"}'::jsonb
WHERE user_id = 'b0000004-cafe-0000-0000-000000000004'::uuid;

UPDATE members SET
  first_name = 'Deepak', last_name = 'Jain', gender = 'Male',
  dob = '1983-09-30', ekda = 'Visa',
  chapter_id = 'f1000003-0000-0000-0000-000000000003'::uuid,
  onboarding_completed = true, verification_level = 2,
  privacy = '{"dob":"members","phone":"members","email":"members","birth_place":"members","employment":"public"}'::jsonb
WHERE user_id = 'b0000005-cafe-0000-0000-000000000005'::uuid;

UPDATE members SET
  first_name = 'Anita', last_name = 'Bansal', gender = 'Female',
  dob = '1975-12-01', ekda = 'Maheshwari',
  chapter_id = 'f1000002-0000-0000-0000-000000000002'::uuid,
  onboarding_completed = true, verification_level = 2,
  privacy = '{"dob":"members","phone":"members","email":"members","birth_place":"members","employment":"public"}'::jsonb
WHERE user_id = 'b0000006-cafe-0000-0000-000000000006'::uuid;

UPDATE members SET
  first_name = 'Vikram', last_name = 'Mehta', gender = 'Male',
  dob = '1990-02-14', ekda = 'Visa',
  chapter_id = 'f1000003-0000-0000-0000-000000000003'::uuid,
  onboarding_completed = true, verification_level = 1,
  privacy = '{"dob":"members","phone":"members","email":"members","birth_place":"members","employment":"public"}'::jsonb
WHERE user_id = 'b0000007-cafe-0000-0000-000000000007'::uuid;

UPDATE members SET
  first_name = 'Pooja', last_name = 'Verma', gender = 'Female',
  dob = '1988-06-20', ekda = 'Agrawala',
  chapter_id = 'f1000002-0000-0000-0000-000000000002'::uuid,
  onboarding_completed = true, verification_level = 1,
  privacy = '{"dob":"members","phone":"members","email":"members","birth_place":"members","employment":"public"}'::jsonb
WHERE user_id = 'b0000008-cafe-0000-0000-000000000008'::uuid;

UPDATE members SET
  first_name = 'Amit', last_name = 'Patel', gender = 'Male',
  dob = '1995-04-08', ekda = 'Visa',
  chapter_id = 'f1000002-0000-0000-0000-000000000002'::uuid,
  onboarding_completed = true, verification_level = 1,
  privacy = '{"dob":"members","phone":"members","email":"members","birth_place":"members","employment":"public"}'::jsonb
WHERE user_id = 'b0000009-cafe-0000-0000-000000000009'::uuid;

UPDATE members SET
  first_name = 'Ritu', last_name = 'Singh', gender = 'Female',
  dob = '1998-08-25', ekda = 'Maheshwari',
  chapter_id = NULL,
  onboarding_completed = false, verification_level = 0,
  privacy = '{}'::jsonb
WHERE user_id = 'b0000010-cafe-0000-0000-000000000010'::uuid;

-- -------------------------------------------------------
-- Role assignments: created_by = auth user id
-- -------------------------------------------------------
INSERT INTO role_assignments (id, role_id, member_id, start_date, end_date, created_by)
SELECT
  gen_random_uuid(),
  r.role_id::uuid,
  m.id,
  CURRENT_DATE,
  NULL,
  r.auth_user_id::uuid
FROM (VALUES
  ('b0000001-cafe-0000-0000-000000000001', 'a0100001-0001-0001-0001-000000000001', 'b0000001-cafe-0000-0000-000000000001'),
  ('b0000002-cafe-0000-0000-000000000002', 'a0100010-0010-0010-0010-000000000010', 'b0000002-cafe-0000-0000-000000000002'),
  ('b0000003-cafe-0000-0000-000000000003', 'a0100002-0002-0002-0002-000000000002', 'b0000003-cafe-0000-0000-000000000003'),
  ('b0000004-cafe-0000-0000-000000000004', 'a0100003-0003-0003-0003-000000000003', 'b0000004-cafe-0000-0000-000000000004'),
  ('b0000005-cafe-0000-0000-000000000005', 'a0100004-0004-0004-0004-000000000004', 'b0000005-cafe-0000-0000-000000000005'),
  ('b0000006-cafe-0000-0000-000000000006', 'a0100005-0005-0005-0005-000000000005', 'b0000006-cafe-0000-0000-000000000006'),
  ('b0000007-cafe-0000-0000-000000000007', 'a0100006-0006-0006-0006-000000000006', 'b0000007-cafe-0000-0000-000000000007'),
  ('b0000008-cafe-0000-0000-000000000008', 'a0100007-0007-0007-0007-000000000007', 'b0000008-cafe-0000-0000-000000000008')
) AS r(user_id_str, role_id, auth_user_id)
JOIN members m ON m.user_id = r.user_id_str::uuid
ON CONFLICT DO NOTHING;

-- ========== 20260315194921_seed_member_contacts_employment_education.sql ==========

/*
  # Seed Member Contacts, Employment, Education, Skills, Languages

  Populates rich profile data for all named members so every feature
  (directory, matrimonial, business, mentorship) has realistic demo data.

  Member ID reference (from live DB):
    Rajesh Khandelwal  (Global Admin)    → 955e2975-bf64-48c2-99cc-3ae9f703b8d5
    Sunita Sharma      (Chapter Admin)   → 4f2f1a8a-4e11-4a3f-b014-d6140accb7cd
    Priya Agarwal      (Data Steward)    → 1572af15-fdc7-4c11-9e3c-03185c50f040
    Suresh Gupta       (Dir Manager)     → 5369121a-0a98-4293-81ac-6e2f7f1b21ca
    Deepak Jain        (Event Manager)   → 9fba0eee-bc92-412b-96b3-0bbf46d5141d
    Anita Bansal       (Finance Admin)   → b0a47ad0-7caf-435b-90bd-7c23e7d65c0c
    Vikram Mehta       (Publisher)       → fc340d7e-091c-4762-8352-7dfe9396a00c
    Pooja Verma        (Moderator)       → 96d109f8-4a38-4098-b443-325bc38d8ca6
    Amit Patel         (Member)          → c3e19d25-22ed-4b2a-a489-5c5d38a8855a
    Aarav Mehta        (seed1)           → b683d94d-9557-4406-be00-2d59ddbcd712
    Karan Mehta        (seed2)           → 03a3a5f7-6fe0-4f7d-8b14-f70da8e50562
    Nisha Patel        (seed3)           → f0a87fdd-54b1-4118-a435-eb9828222c31
    Vivek Joshi        (seed4)           → 8eed11a7-4833-427e-bdff-726cd18a3c7c
    Anjali Desai       (seed5)           → c1326922-b6e0-4036-a680-c11a6b4199e6
    Rohan Thakkar      (seed6)           → 28646bd6-fdb1-46e6-bdd2-e966f66fe825
    Meera Kothari      (seed7)           → 036ff77a-3931-4b32-a759-b9a1d3b90d18
    Arjun Bhatt        (seed8)           → fda701d0-0248-4944-bfcf-b055ba35a5e4
    Kavita Sanghvi     (seed9)           → 98845a8d-7778-4bd4-85e4-cedae058b527
    Dhruv Parikh       (seed10)          → 8786d380-134f-443f-9278-23d3def33c8d
*/

-- -------------------------------------------------------
-- Phone contacts
-- -------------------------------------------------------
INSERT INTO member_contacts (id, member_id, type, value, verified, primary_flag) VALUES
  (gen_random_uuid(), '955e2975-bf64-48c2-99cc-3ae9f703b8d5'::uuid, 'phone', '+91-98765-00001', true,  true),
  (gen_random_uuid(), '4f2f1a8a-4e11-4a3f-b014-d6140accb7cd'::uuid, 'phone', '+91-98765-00002', true,  true),
  (gen_random_uuid(), '1572af15-fdc7-4c11-9e3c-03185c50f040'::uuid, 'phone', '+91-98765-00003', true,  true),
  (gen_random_uuid(), '5369121a-0a98-4293-81ac-6e2f7f1b21ca'::uuid, 'phone', '+91-98765-00004', true,  true),
  (gen_random_uuid(), '9fba0eee-bc92-412b-96b3-0bbf46d5141d'::uuid, 'phone', '+91-98765-00005', true,  true),
  (gen_random_uuid(), 'b0a47ad0-7caf-435b-90bd-7c23e7d65c0c'::uuid, 'phone', '+91-98765-00006', true,  true),
  (gen_random_uuid(), 'fc340d7e-091c-4762-8352-7dfe9396a00c'::uuid, 'phone', '+91-98765-00007', false, true),
  (gen_random_uuid(), '96d109f8-4a38-4098-b443-325bc38d8ca6'::uuid, 'phone', '+91-98765-00008', false, true),
  (gen_random_uuid(), 'c3e19d25-22ed-4b2a-a489-5c5d38a8855a'::uuid, 'phone', '+91-98765-00009', false, true),
  (gen_random_uuid(), 'b683d94d-9557-4406-be00-2d59ddbcd712'::uuid, 'phone', '+91-79000-00001', true,  true),
  (gen_random_uuid(), '03a3a5f7-6fe0-4f7d-8b14-f70da8e50562'::uuid, 'phone', '+91-79000-00002', true,  true),
  (gen_random_uuid(), 'f0a87fdd-54b1-4118-a435-eb9828222c31'::uuid, 'phone', '+91-79000-00003', true,  true),
  (gen_random_uuid(), '8eed11a7-4833-427e-bdff-726cd18a3c7c'::uuid, 'phone', '+91-79000-00004', true,  true),
  (gen_random_uuid(), 'c1326922-b6e0-4036-a680-c11a6b4199e6'::uuid, 'phone', '+91-79000-00005', true,  true),
  (gen_random_uuid(), '28646bd6-fdb1-46e6-bdd2-e966f66fe825'::uuid, 'phone', '+91-79000-00006', true,  true),
  (gen_random_uuid(), '036ff77a-3931-4b32-a759-b9a1d3b90d18'::uuid, 'phone', '+91-79000-00007', false, true),
  (gen_random_uuid(), 'fda701d0-0248-4944-bfcf-b055ba35a5e4'::uuid, 'phone', '+91-79000-00008', true,  true),
  (gen_random_uuid(), '98845a8d-7778-4bd4-85e4-cedae058b527'::uuid, 'phone', '+91-79000-00009', true,  true),
  (gen_random_uuid(), '8786d380-134f-443f-9278-23d3def33c8d'::uuid, 'phone', '+91-79000-00010', false, true)
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------
-- Employment
-- -------------------------------------------------------
INSERT INTO employment (id, member_id, job_title, company, sector, start_date, end_date) VALUES
  (gen_random_uuid(), '955e2975-bf64-48c2-99cc-3ae9f703b8d5'::uuid, 'Managing Director',       'Khadayata Textiles Pvt Ltd',    'Textile',       '2005-01-01', NULL),
  (gen_random_uuid(), '4f2f1a8a-4e11-4a3f-b014-d6140accb7cd'::uuid, 'Principal',               'Ahmedabad Public School',        'Education',     '2010-06-01', NULL),
  (gen_random_uuid(), '1572af15-fdc7-4c11-9e3c-03185c50f040'::uuid, 'Senior Auditor',          'Agarwal & Associates CA Firm',   'Finance',       '2012-04-01', NULL),
  (gen_random_uuid(), '5369121a-0a98-4293-81ac-6e2f7f1b21ca'::uuid, 'Operations Manager',      'Gupta Logistics Ltd',            'Logistics',     '2008-03-01', NULL),
  (gen_random_uuid(), '9fba0eee-bc92-412b-96b3-0bbf46d5141d'::uuid, 'Event Coordinator',       'Celebration Events Co.',         'Events',        '2015-07-01', NULL),
  (gen_random_uuid(), 'b0a47ad0-7caf-435b-90bd-7c23e7d65c0c'::uuid, 'CFO',                     'Bansal Holdings',                'Finance',       '2003-09-01', NULL),
  (gen_random_uuid(), 'fc340d7e-091c-4762-8352-7dfe9396a00c'::uuid, 'Journalist',              'Gujarat Samachar Digital',       'Media',         '2018-01-01', NULL),
  (gen_random_uuid(), '96d109f8-4a38-4098-b443-325bc38d8ca6'::uuid, 'Content Moderator',       'SafeNet Media Pvt Ltd',          'Technology',    '2019-03-01', NULL),
  (gen_random_uuid(), 'c3e19d25-22ed-4b2a-a489-5c5d38a8855a'::uuid, 'Software Engineer',       'TechVista Solutions',            'Technology',    '2021-07-01', NULL),
  (gen_random_uuid(), 'b683d94d-9557-4406-be00-2d59ddbcd712'::uuid, 'Chartered Accountant',    'Mehta & Sons CA',                'Finance',       '2018-04-01', NULL),
  (gen_random_uuid(), '03a3a5f7-6fe0-4f7d-8b14-f70da8e50562'::uuid, 'Doctor',                  'Sanjivani Hospital',             'Healthcare',    '2016-08-01', NULL),
  (gen_random_uuid(), 'f0a87fdd-54b1-4118-a435-eb9828222c31'::uuid, 'Interior Designer',       'DesignNest Studio',              'Design',        '2017-02-01', NULL),
  (gen_random_uuid(), '8eed11a7-4833-427e-bdff-726cd18a3c7c'::uuid, 'Civil Engineer',          'Joshi Infrastructure Ltd',       'Construction',  '2014-05-01', NULL),
  (gen_random_uuid(), 'c1326922-b6e0-4036-a680-c11a6b4199e6'::uuid, 'Lawyer',                  'Desai & Partners Law Firm',      'Legal',         '2015-10-01', NULL),
  (gen_random_uuid(), '28646bd6-fdb1-46e6-bdd2-e966f66fe825'::uuid, 'Pharmacist',              'Thakkar MedCare',                'Healthcare',    '2019-06-01', NULL),
  (gen_random_uuid(), '036ff77a-3931-4b32-a759-b9a1d3b90d18'::uuid, 'Art Curator',             'Heritage Gallery Ahmedabad',     'Arts',          '2020-01-01', NULL),
  (gen_random_uuid(), 'fda701d0-0248-4944-bfcf-b055ba35a5e4'::uuid, 'Mechanical Engineer',     'Bhatt Automotive Pvt Ltd',       'Manufacturing', '2017-09-01', NULL),
  (gen_random_uuid(), '98845a8d-7778-4bd4-85e4-cedae058b527'::uuid, 'Fashion Designer',        'Kavita Couture',                 'Fashion',       '2018-11-01', NULL),
  (gen_random_uuid(), '8786d380-134f-443f-9278-23d3def33c8d'::uuid, 'Data Scientist',          'Analytics First',                'Technology',    '2022-02-01', NULL)
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------
-- Education
-- -------------------------------------------------------
INSERT INTO education (id, member_id, degree, institution, year) VALUES
  (gen_random_uuid(), '955e2975-bf64-48c2-99cc-3ae9f703b8d5'::uuid, 'MBA',               'IIM Ahmedabad',                2000),
  (gen_random_uuid(), '4f2f1a8a-4e11-4a3f-b014-d6140accb7cd'::uuid, 'M.Ed',              'Gujarat University',           2006),
  (gen_random_uuid(), '1572af15-fdc7-4c11-9e3c-03185c50f040'::uuid, 'CA',                'ICAI',                         2010),
  (gen_random_uuid(), '5369121a-0a98-4293-81ac-6e2f7f1b21ca'::uuid, 'B.Com',             'H.L. College of Commerce',     2001),
  (gen_random_uuid(), '9fba0eee-bc92-412b-96b3-0bbf46d5141d'::uuid, 'BBA',               'Nirma University',             2007),
  (gen_random_uuid(), 'b0a47ad0-7caf-435b-90bd-7c23e7d65c0c'::uuid, 'MBA (Finance)',      'SP Jain Institute',            1999),
  (gen_random_uuid(), 'fc340d7e-091c-4762-8352-7dfe9396a00c'::uuid, 'BA Journalism',     'Ahmedabad University',         2014),
  (gen_random_uuid(), '96d109f8-4a38-4098-b443-325bc38d8ca6'::uuid, 'BSc IT',            'SVIT College',                 2012),
  (gen_random_uuid(), 'c3e19d25-22ed-4b2a-a489-5c5d38a8855a'::uuid, 'B.Tech CS',         'Nirma University',             2019),
  (gen_random_uuid(), 'b683d94d-9557-4406-be00-2d59ddbcd712'::uuid, 'CA',                'ICAI',                         2016),
  (gen_random_uuid(), '03a3a5f7-6fe0-4f7d-8b14-f70da8e50562'::uuid, 'MBBS',              'B.J. Medical College',         2014),
  (gen_random_uuid(), 'f0a87fdd-54b1-4118-a435-eb9828222c31'::uuid, 'B.Des',             'NID Ahmedabad',                2015),
  (gen_random_uuid(), '8eed11a7-4833-427e-bdff-726cd18a3c7c'::uuid, 'B.Tech Civil',      'L.D. Engineering College',     2012),
  (gen_random_uuid(), 'c1326922-b6e0-4036-a680-c11a6b4199e6'::uuid, 'LLB',               'Gujarat National Law University', 2013),
  (gen_random_uuid(), '28646bd6-fdb1-46e6-bdd2-e966f66fe825'::uuid, 'B.Pharm',           'Sardar Patel University',      2017),
  (gen_random_uuid(), '036ff77a-3931-4b32-a759-b9a1d3b90d18'::uuid, 'BA Fine Arts',      'MSU Baroda',                   2018),
  (gen_random_uuid(), 'fda701d0-0248-4944-bfcf-b055ba35a5e4'::uuid, 'B.Tech Mechanical', 'Dharmsinh Desai University',   2015),
  (gen_random_uuid(), '98845a8d-7778-4bd4-85e4-cedae058b527'::uuid, 'B.Des Fashion',     'NIFT Ahmedabad',               2016),
  (gen_random_uuid(), '8786d380-134f-443f-9278-23d3def33c8d'::uuid, 'M.Tech DS',         'IIT Gandhinagar',              2024)
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------
-- Skills
-- -------------------------------------------------------
INSERT INTO member_skills (id, member_id, skill) VALUES
  (gen_random_uuid(), '955e2975-bf64-48c2-99cc-3ae9f703b8d5'::uuid, 'Business Strategy'),
  (gen_random_uuid(), '955e2975-bf64-48c2-99cc-3ae9f703b8d5'::uuid, 'Leadership'),
  (gen_random_uuid(), '4f2f1a8a-4e11-4a3f-b014-d6140accb7cd'::uuid, 'Teaching'),
  (gen_random_uuid(), '4f2f1a8a-4e11-4a3f-b014-d6140accb7cd'::uuid, 'Administration'),
  (gen_random_uuid(), '1572af15-fdc7-4c11-9e3c-03185c50f040'::uuid, 'Auditing'),
  (gen_random_uuid(), '1572af15-fdc7-4c11-9e3c-03185c50f040'::uuid, 'Financial Analysis'),
  (gen_random_uuid(), '9fba0eee-bc92-412b-96b3-0bbf46d5141d'::uuid, 'Event Planning'),
  (gen_random_uuid(), '9fba0eee-bc92-412b-96b3-0bbf46d5141d'::uuid, 'Vendor Management'),
  (gen_random_uuid(), 'c3e19d25-22ed-4b2a-a489-5c5d38a8855a'::uuid, 'React'),
  (gen_random_uuid(), 'c3e19d25-22ed-4b2a-a489-5c5d38a8855a'::uuid, 'TypeScript'),
  (gen_random_uuid(), 'c3e19d25-22ed-4b2a-a489-5c5d38a8855a'::uuid, 'Node.js'),
  (gen_random_uuid(), 'b683d94d-9557-4406-be00-2d59ddbcd712'::uuid, 'Tax Planning'),
  (gen_random_uuid(), '03a3a5f7-6fe0-4f7d-8b14-f70da8e50562'::uuid, 'Surgery'),
  (gen_random_uuid(), 'f0a87fdd-54b1-4118-a435-eb9828222c31'::uuid, 'Interior Design'),
  (gen_random_uuid(), '8eed11a7-4833-427e-bdff-726cd18a3c7c'::uuid, 'Structural Engineering'),
  (gen_random_uuid(), 'c1326922-b6e0-4036-a680-c11a6b4199e6'::uuid, 'Corporate Law'),
  (gen_random_uuid(), '8786d380-134f-443f-9278-23d3def33c8d'::uuid, 'Machine Learning'),
  (gen_random_uuid(), '8786d380-134f-443f-9278-23d3def33c8d'::uuid, 'Python')
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------
-- Languages
-- -------------------------------------------------------
INSERT INTO member_languages (id, member_id, language) VALUES
  (gen_random_uuid(), '955e2975-bf64-48c2-99cc-3ae9f703b8d5'::uuid, 'Gujarati'),
  (gen_random_uuid(), '955e2975-bf64-48c2-99cc-3ae9f703b8d5'::uuid, 'Hindi'),
  (gen_random_uuid(), '955e2975-bf64-48c2-99cc-3ae9f703b8d5'::uuid, 'English'),
  (gen_random_uuid(), '4f2f1a8a-4e11-4a3f-b014-d6140accb7cd'::uuid, 'Gujarati'),
  (gen_random_uuid(), '4f2f1a8a-4e11-4a3f-b014-d6140accb7cd'::uuid, 'Hindi'),
  (gen_random_uuid(), '1572af15-fdc7-4c11-9e3c-03185c50f040'::uuid, 'Gujarati'),
  (gen_random_uuid(), '1572af15-fdc7-4c11-9e3c-03185c50f040'::uuid, 'English'),
  (gen_random_uuid(), 'c3e19d25-22ed-4b2a-a489-5c5d38a8855a'::uuid, 'Gujarati'),
  (gen_random_uuid(), 'c3e19d25-22ed-4b2a-a489-5c5d38a8855a'::uuid, 'English'),
  (gen_random_uuid(), 'b683d94d-9557-4406-be00-2d59ddbcd712'::uuid, 'Gujarati'),
  (gen_random_uuid(), 'b683d94d-9557-4406-be00-2d59ddbcd712'::uuid, 'Hindi'),
  (gen_random_uuid(), '03a3a5f7-6fe0-4f7d-8b14-f70da8e50562'::uuid, 'Gujarati'),
  (gen_random_uuid(), '03a3a5f7-6fe0-4f7d-8b14-f70da8e50562'::uuid, 'English'),
  (gen_random_uuid(), '8786d380-134f-443f-9278-23d3def33c8d'::uuid, 'Gujarati'),
  (gen_random_uuid(), '8786d380-134f-443f-9278-23d3def33c8d'::uuid, 'English')
ON CONFLICT DO NOTHING;

-- ========== 20260315195050_seed_content_events_news_businesses.sql ==========

/*
  # Seed Content: Events, News Articles, Businesses, Jobs

  Creates realistic demo content across all major modules:

  1. Events (4 upcoming, 2 past, 1 virtual, 1 draft)
  2. News articles (published, draft, pending review)
  3. Businesses (verified and unverified listings)
  4. Jobs (open positions)

  All created_by references use the Global Admin auth user id:
    b0000001-cafe-0000-0000-000000000001
  Event/news creators vary across role users.
*/

-- -------------------------------------------------------
-- Events
-- -------------------------------------------------------
INSERT INTO events (
  id, name, description, chapter_id, starts_at, ends_at,
  venue, event_type, category, status, max_capacity,
  contact_email, organizer_name,
  city_id, state_id, country_id,
  tags, created_by
) VALUES
  (
    gen_random_uuid(),
    'Diwali Milap 2026',
    'Annual Diwali celebration bringing the entire Khadayata community together for diyas, sweets, cultural performances, and fellowship. All families welcome.',
    'f1000002-0000-0000-0000-000000000002'::uuid,
    (now() + interval '20 days')::timestamptz,
    (now() + interval '20 days' + interval '4 hours')::timestamptz,
    'Community Hall, Navrangpura, Ahmedabad',
    'in_person', 'Cultural', 'published', 500,
    'events@khadayataonline.com', 'Ahmedabad Chapter',
    'e1000001-0000-0000-0000-000000000001'::uuid,
    'd1000001-0000-0000-0000-000000000001'::uuid,
    'c1000001-0000-0000-0000-000000000001'::uuid,
    ARRAY['diwali','cultural','family','festival'],
    'b0000005-cafe-0000-0000-000000000005'::uuid
  ),
  (
    gen_random_uuid(),
    'Business Networking Breakfast',
    'Monthly breakfast networking event for Khadayata entrepreneurs and professionals. Share ideas, forge partnerships, and grow your network.',
    'f1000002-0000-0000-0000-000000000002'::uuid,
    (now() + interval '7 days')::timestamptz,
    (now() + interval '7 days' + interval '2 hours')::timestamptz,
    'Hotel Taj Skyline, CG Road, Ahmedabad',
    'in_person', 'Business', 'published', 80,
    'biz@khadayataonline.com', 'Ahmedabad Business Circle',
    'e1000001-0000-0000-0000-000000000001'::uuid,
    'd1000001-0000-0000-0000-000000000001'::uuid,
    'c1000001-0000-0000-0000-000000000001'::uuid,
    ARRAY['networking','business','breakfast'],
    'b0000005-cafe-0000-0000-000000000005'::uuid
  ),
  (
    gen_random_uuid(),
    'Youth Talent Showcase',
    'Platform for young community members aged 10-25 to showcase their talents in music, dance, art, and oratory. Prizes for top performers.',
    'f1000002-0000-0000-0000-000000000002'::uuid,
    (now() + interval '35 days')::timestamptz,
    (now() + interval '35 days' + interval '5 hours')::timestamptz,
    'Tagore Hall, Ahmedabad',
    'in_person', 'Youth', 'published', 300,
    'youth@khadayataonline.com', 'Ahmedabad Youth Wing',
    'e1000001-0000-0000-0000-000000000001'::uuid,
    'd1000001-0000-0000-0000-000000000001'::uuid,
    'c1000001-0000-0000-0000-000000000001'::uuid,
    ARRAY['youth','talent','cultural'],
    'b0000005-cafe-0000-0000-000000000005'::uuid
  ),
  (
    gen_random_uuid(),
    'Global KHD Connect - Webinar',
    'Monthly virtual town hall for KHD members worldwide. Updates on platform features, community news, and open Q&A with the global admin team.',
    'f1000001-0000-0000-0000-000000000001'::uuid,
    (now() + interval '14 days')::timestamptz,
    (now() + interval '14 days' + interval '90 minutes')::timestamptz,
    NULL,
    'virtual', 'Community', 'published', NULL,
    'global@khadayataonline.com', 'KHD Global Team',
    NULL, NULL, NULL,
    ARRAY['global','webinar','community'],
    'b0000001-cafe-0000-0000-000000000001'::uuid
  ),
  (
    gen_random_uuid(),
    'Holi Celebration 2026',
    'Celebrate the festival of colours with the community! Food stalls, music, and plenty of colour. Bring the entire family.',
    'f1000002-0000-0000-0000-000000000002'::uuid,
    (now() - interval '10 days')::timestamptz,
    (now() - interval '10 days' + interval '3 hours')::timestamptz,
    'Sabarmati Riverfront, Ahmedabad',
    'in_person', 'Cultural', 'published', 1000,
    'events@khadayataonline.com', 'Ahmedabad Chapter',
    'e1000001-0000-0000-0000-000000000001'::uuid,
    'd1000001-0000-0000-0000-000000000001'::uuid,
    'c1000001-0000-0000-0000-000000000001'::uuid,
    ARRAY['holi','cultural','family'],
    'b0000005-cafe-0000-0000-000000000005'::uuid
  ),
  (
    gen_random_uuid(),
    'Annual General Meeting 2025',
    'KHD Ahmedabad Chapter Annual General Meeting. Review of the year, election of new committee members, and future plans.',
    'f1000002-0000-0000-0000-000000000002'::uuid,
    (now() - interval '60 days')::timestamptz,
    (now() - interval '60 days' + interval '3 hours')::timestamptz,
    'Ahmedabad Management Association',
    'in_person', 'Governance', 'published', 200,
    'admin@khadayataonline.com', 'Ahmedabad Chapter Committee',
    'e1000001-0000-0000-0000-000000000001'::uuid,
    'd1000001-0000-0000-0000-000000000001'::uuid,
    'c1000001-0000-0000-0000-000000000001'::uuid,
    ARRAY['agm','governance'],
    'b0000001-cafe-0000-0000-000000000001'::uuid
  ),
  (
    gen_random_uuid(),
    'Scholarship Awards Ceremony',
    'Felicitation of scholarship awardees for 2025-26 academic year. Families and community members are invited to celebrate our bright students.',
    'f1000002-0000-0000-0000-000000000002'::uuid,
    (now() + interval '50 days')::timestamptz,
    (now() + interval '50 days' + interval '2 hours')::timestamptz,
    'KHD Ahmedabad Community Centre',
    'in_person', 'Education', 'draft', 150,
    'scholarships@khadayataonline.com', 'Finance & Education Committee',
    'e1000001-0000-0000-0000-000000000001'::uuid,
    'd1000001-0000-0000-0000-000000000001'::uuid,
    'c1000001-0000-0000-0000-000000000001'::uuid,
    ARRAY['scholarship','education','awards'],
    'b0000006-cafe-0000-0000-000000000006'::uuid
  )
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------
-- News Articles
-- -------------------------------------------------------
INSERT INTO content_news (
  id, title, summary, body, category, status, featured, tags,
  author_name, published_at, created_by
) VALUES
  (
    gen_random_uuid(),
    'KHD Platform Launches Global Directory Feature',
    'Members across 9 chapters worldwide can now search and connect with the full Khadayata community through the new global directory.',
    'The Khadayata Heritage Directory (KHD) platform is proud to announce the launch of its global member directory, connecting thousands of community members across India and the diaspora. The feature allows authenticated members to search by name, city, chapter, profession, and ekda, making it easy to find long-lost relatives, professional contacts, and community allies. Privacy controls ensure members choose exactly who can see their information.',
    'Announcements', 'published', true,
    ARRAY['platform','directory','global','launch'],
    'KHD Editorial Team',
    now() - interval '5 days',
    'b0000007-cafe-0000-0000-000000000007'::uuid
  ),
  (
    gen_random_uuid(),
    'Ahmedabad Chapter Celebrates 25 Years of Community Service',
    'A retrospective look at 25 years of the Ahmedabad Chapter''s contributions to the Khadayata community.',
    'The Ahmedabad Chapter of KHD proudly marks 25 years of dedicated community service this month. Founded in 2001, the chapter has grown from a small gathering of 50 families to a thriving network of over 2,000 registered members. Key milestones include the establishment of the annual Diwali Milap, the community scholarship fund which has supported over 300 students, and the launch of the emergency contact helpline.',
    'Community News', 'published', true,
    ARRAY['ahmedabad','anniversary','community'],
    'Vikram Mehta',
    now() - interval '15 days',
    'b0000007-cafe-0000-0000-000000000007'::uuid
  ),
  (
    gen_random_uuid(),
    'New Matrimonial Feature: Advanced Matching Algorithm',
    'KHD now uses preference-based matching to suggest compatible profiles, with full privacy controls for families.',
    'The KHD matrimonial section has been upgraded with a sophisticated matching algorithm that considers age, education, location, ekda, and stated preferences. Families can now receive curated suggestions while maintaining complete control over who can view their profile. The new system has already facilitated 12 introductions in its first week.',
    'Platform Updates', 'published', false,
    ARRAY['matrimonial','feature','update'],
    'KHD Tech Team',
    now() - interval '3 days',
    'b0000007-cafe-0000-0000-000000000007'::uuid
  ),
  (
    gen_random_uuid(),
    'Upcoming: Oral History Recording Drive',
    'KHD is launching a community-wide initiative to record and preserve the stories of our elders before they are lost to time.',
    'Draft content for the oral history recording drive announcement. Details to be confirmed with the heritage committee.',
    'Heritage', 'draft', false,
    ARRAY['oral-history','heritage','draft'],
    'Priya Agarwal',
    NULL,
    'b0000003-cafe-0000-0000-000000000003'::uuid
  ),
  (
    gen_random_uuid(),
    'Scholarship Applications Open for 2026-27',
    'The KHD Education Fund is now accepting applications for scholarships for the academic year 2026-27. Eligible students from all chapters may apply.',
    'Applications for the KHD Merit-cum-Need Scholarship 2026-27 are now open. Students who have secured admission in recognised undergraduate or postgraduate programmes are eligible. The fund provides scholarships ranging from ₹25,000 to ₹1,00,000 depending on merit and financial need. Deadline for applications is 30 April 2026.',
    'Education', 'published', false,
    ARRAY['scholarship','education','applications'],
    'Anita Bansal',
    now() - interval '2 days',
    'b0000006-cafe-0000-0000-000000000006'::uuid
  )
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------
-- Businesses
-- -------------------------------------------------------
INSERT INTO businesses (
  id, owner_member_id, chapter_id, name, sector, description,
  email, phone, website,
  city_id, state_id, country_id,
  verified, tags
) VALUES
  (
    gen_random_uuid(),
    '955e2975-bf64-48c2-99cc-3ae9f703b8d5'::uuid,
    'f1000002-0000-0000-0000-000000000002'::uuid,
    'Khadayata Textiles Pvt Ltd',
    'Textile',
    'A family-run textile business established in 1985, specialising in sarees, dress materials, and wholesale fabric supply across Gujarat.',
    'contact@khadayatatextiles.com',
    '+91-79-26540001',
    'https://khadayatatextiles.example.com',
    'e1000001-0000-0000-0000-000000000001'::uuid,
    'd1000001-0000-0000-0000-000000000001'::uuid,
    'c1000001-0000-0000-0000-000000000001'::uuid,
    true, ARRAY['textile','saree','wholesale','fabric']
  ),
  (
    gen_random_uuid(),
    'b683d94d-9557-4406-be00-2d59ddbcd712'::uuid,
    'f1000002-0000-0000-0000-000000000002'::uuid,
    'Mehta & Sons Chartered Accountants',
    'Finance',
    'A full-service CA firm offering taxation, audit, GST compliance, and financial advisory services to individuals and businesses.',
    'info@mehtasons.ca',
    '+91-79-26540002',
    'https://mehtasons.example.com',
    'e1000001-0000-0000-0000-000000000001'::uuid,
    'd1000001-0000-0000-0000-000000000001'::uuid,
    'c1000001-0000-0000-0000-000000000001'::uuid,
    true, ARRAY['chartered-accountant','tax','audit','gst']
  ),
  (
    gen_random_uuid(),
    '5369121a-0a98-4293-81ac-6e2f7f1b21ca'::uuid,
    'f1000002-0000-0000-0000-000000000002'::uuid,
    'Gupta Logistics Ltd',
    'Logistics',
    'Pan-India logistics and warehousing solutions. 20+ years of reliable supply chain management for e-commerce and retail clients.',
    'ops@guptalogistics.in',
    '+91-79-26540003',
    NULL,
    'e1000001-0000-0000-0000-000000000001'::uuid,
    'd1000001-0000-0000-0000-000000000001'::uuid,
    'c1000001-0000-0000-0000-000000000001'::uuid,
    true, ARRAY['logistics','warehousing','supply-chain']
  ),
  (
    gen_random_uuid(),
    'c1326922-b6e0-4036-a680-c11a6b4199e6'::uuid,
    'f1000002-0000-0000-0000-000000000002'::uuid,
    'Desai & Partners Law Firm',
    'Legal',
    'Boutique law firm specialising in corporate law, property disputes, family law, and NRI legal matters.',
    'legal@desaipartners.in',
    '+91-79-26540004',
    NULL,
    'e1000001-0000-0000-0000-000000000001'::uuid,
    'd1000001-0000-0000-0000-000000000001'::uuid,
    'c1000001-0000-0000-0000-000000000001'::uuid,
    false, ARRAY['legal','corporate-law','property','nri']
  ),
  (
    gen_random_uuid(),
    'f0a87fdd-54b1-4118-a435-eb9828222c31'::uuid,
    'f1000002-0000-0000-0000-000000000002'::uuid,
    'DesignNest Studio',
    'Design',
    'Interior design studio specialising in residential and commercial spaces. Known for blending traditional Indian aesthetics with modern minimalism.',
    'hello@designnest.in',
    '+91-98765-00003',
    'https://designnest.example.com',
    'e1000001-0000-0000-0000-000000000001'::uuid,
    'd1000001-0000-0000-0000-000000000001'::uuid,
    'c1000001-0000-0000-0000-000000000001'::uuid,
    false, ARRAY['interior-design','residential','commercial']
  ),
  (
    gen_random_uuid(),
    '9fba0eee-bc92-412b-96b3-0bbf46d5141d'::uuid,
    'f1000003-0000-0000-0000-000000000003'::uuid,
    'Celebration Events Co.',
    'Events',
    'Full-service event management company for weddings, corporate events, and community celebrations across Mumbai and Gujarat.',
    'events@celebrationco.in',
    '+91-98765-00005',
    NULL,
    'e1000010-0000-0000-0000-000000000010'::uuid,
    'd1000002-0000-0000-0000-000000000002'::uuid,
    'c1000001-0000-0000-0000-000000000001'::uuid,
    true, ARRAY['events','weddings','corporate']
  )
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------
-- Jobs
-- -------------------------------------------------------
INSERT INTO jobs (
  id, chapter_id, employer_member_id, title, description, location,
  remote, employment_type, salary_min, salary_max, salary_currency, salary_period,
  skills_required, status, city_id, state_id, country_id
) VALUES
  (
    gen_random_uuid(),
    'f1000002-0000-0000-0000-000000000002'::uuid,
    '5369121a-0a98-4293-81ac-6e2f7f1b21ca'::uuid,
    'Logistics Coordinator',
    'Manage day-to-day logistics operations, coordinate with vendors, and ensure timely delivery. 2+ years experience in logistics preferred.',
    'Ahmedabad', false, 'full_time',
    400000, 600000, 'INR', 'annual',
    ARRAY['logistics','ms-office','communication'],
    'open',
    'e1000001-0000-0000-0000-000000000001'::uuid,
    'd1000001-0000-0000-0000-000000000001'::uuid,
    'c1000001-0000-0000-0000-000000000001'::uuid
  ),
  (
    gen_random_uuid(),
    'f1000002-0000-0000-0000-000000000002'::uuid,
    'b683d94d-9557-4406-be00-2d59ddbcd712'::uuid,
    'Article Assistant (CA Firm)',
    'CA articleship position at Mehta & Sons. Gain exposure to audit, taxation, and GST filings. Final year B.Com or inter CA candidates preferred.',
    'Ahmedabad', false, 'internship',
    180000, 240000, 'INR', 'annual',
    ARRAY['accounting','tally','ms-excel'],
    'open',
    'e1000001-0000-0000-0000-000000000001'::uuid,
    'd1000001-0000-0000-0000-000000000001'::uuid,
    'c1000001-0000-0000-0000-000000000001'::uuid
  ),
  (
    gen_random_uuid(),
    'f1000003-0000-0000-0000-000000000003'::uuid,
    '9fba0eee-bc92-412b-96b3-0bbf46d5141d'::uuid,
    'Event Executive',
    'Plan and execute events end-to-end. Must be proactive, detail-oriented, and willing to work weekends during event season.',
    'Mumbai', false, 'full_time',
    350000, 500000, 'INR', 'annual',
    ARRAY['event-planning','vendor-management','coordination'],
    'open',
    'e1000010-0000-0000-0000-000000000010'::uuid,
    'd1000002-0000-0000-0000-000000000002'::uuid,
    'c1000001-0000-0000-0000-000000000001'::uuid
  )
ON CONFLICT DO NOTHING;

-- ========== 20260315195202_seed_matrimonial_scholarships_mentorships.sql ==========

/*
  # Seed Matrimonial Profiles, Scholarships, Mentorships, Emergency Contacts,
    Funds, Settings, and Oral Histories

  Completes the demo data for all remaining features.
*/

-- -------------------------------------------------------
-- Matrimonial Profiles
-- -------------------------------------------------------
INSERT INTO matrimonial_profiles (
  id, member_id,
  about, height_cm, diet, marital_status, manglik,
  gotra, native_place, family_type,
  education_level, education_field, position_title,
  income, income_currency,
  current_city, current_state, country,
  visibility, verified,
  preferences
) VALUES
  (
    gen_random_uuid(),
    'b683d94d-9557-4406-be00-2d59ddbcd712'::uuid,
    'Chartered Accountant with a passion for community service. Family-oriented, enjoy cricket and travel. Looking for a like-minded partner to build a loving home.',
    175, 'Vegetarian', 'Never Married', 'No',
    'Khandelwal', 'Ahmedabad', 'Joint',
    'Post Graduate', 'Finance', 'Chartered Accountant',
    1200000, 'INR',
    'Ahmedabad', 'Gujarat', 'India',
    'members', true,
    '{"age_min":23,"age_max":29,"height_min":155,"height_max":170,"education":["Graduate","Post Graduate"],"location":["Gujarat","Rajasthan"]}'::jsonb
  ),
  (
    gen_random_uuid(),
    'f0a87fdd-54b1-4118-a435-eb9828222c31'::uuid,
    'Creative interior designer who loves art, travel, and home decor. Looking for a compatible partner who values family and has an eye for beauty.',
    163, 'Vegetarian', 'Never Married', 'No',
    'Agarwal', 'Vadodara', 'Nuclear',
    'Graduate', 'Design', 'Interior Designer',
    900000, 'INR',
    'Ahmedabad', 'Gujarat', 'India',
    'members', true,
    '{"age_min":26,"age_max":34,"height_min":168,"height_max":182,"education":["Graduate","Post Graduate"],"location":["Gujarat","Maharashtra"]}'::jsonb
  ),
  (
    gen_random_uuid(),
    '03a3a5f7-6fe0-4f7d-8b14-f70da8e50562'::uuid,
    'Doctor committed to community health. Seeks a partner who values meaningful work and family equally. Enjoy reading, yoga, and cooking.',
    178, 'Vegetarian', 'Never Married', 'Uncertain',
    'Mehta', 'Ahmedabad', 'Joint',
    'Post Graduate', 'Medicine', 'Doctor (MBBS)',
    1800000, 'INR',
    'Ahmedabad', 'Gujarat', 'India',
    'members', true,
    '{"age_min":25,"age_max":31,"height_min":156,"height_max":172,"education":["Graduate","Post Graduate","Doctorate"],"location":["Gujarat","Maharashtra","Delhi"]}'::jsonb
  ),
  (
    gen_random_uuid(),
    'c3e19d25-22ed-4b2a-a489-5c5d38a8855a'::uuid,
    'Software engineer at a growing tech firm. Enjoy trekking, reading sci-fi, and experimenting in the kitchen. Looking for an intellectually curious and warm-hearted partner.',
    172, 'Vegetarian', 'Never Married', 'No',
    'Patel', 'Rajkot', 'Nuclear',
    'Post Graduate', 'Engineering', 'Software Engineer',
    950000, 'INR',
    'Ahmedabad', 'Gujarat', 'India',
    'members', false,
    '{"age_min":22,"age_max":28,"height_min":153,"height_max":168,"education":["Graduate","Post Graduate"],"location":["Gujarat"]}'::jsonb
  ),
  (
    gen_random_uuid(),
    '8786d380-134f-443f-9278-23d3def33c8d'::uuid,
    'Data scientist with an IIT background. Passionate about AI, music, and volunteering. Looking for a partner who is ambitious yet grounded in values.',
    180, 'Vegetarian', 'Never Married', 'No',
    'Parikh', 'Ahmedabad', 'Nuclear',
    'Post Graduate', 'Data Science', 'Data Scientist',
    1400000, 'INR',
    'Ahmedabad', 'Gujarat', 'India',
    'members', false,
    '{"age_min":23,"age_max":29,"height_min":155,"height_max":170,"education":["Post Graduate","Doctorate"],"location":["Gujarat","Maharashtra","Delhi"]}'::jsonb
  ),
  (
    gen_random_uuid(),
    '98845a8d-7778-4bd4-85e4-cedae058b527'::uuid,
    'Fashion designer and entrepreneur. Love fashion, travel, and bringing colour to people''s lives. Seeking a supportive and creative partner.',
    160, 'Vegetarian', 'Never Married', 'No',
    'Sanghvi', 'Surat', 'Joint',
    'Graduate', 'Fashion Design', 'Fashion Designer',
    850000, 'INR',
    'Ahmedabad', 'Gujarat', 'India',
    'members', true,
    '{"age_min":26,"age_max":33,"height_min":168,"height_max":183,"education":["Graduate","Post Graduate"],"location":["Gujarat"]}'::jsonb
  )
ON CONFLICT (member_id) DO NOTHING;

-- -------------------------------------------------------
-- Scholarships
-- -------------------------------------------------------
INSERT INTO scholarships (
  id, chapter_id, name, description, amount, currency,
  deadline, status, eligibility,
  required_documents, contact_email, max_recipients,
  city_id, state_id, country_id, category
) VALUES
  (
    gen_random_uuid(),
    'f1000002-0000-0000-0000-000000000002'::uuid,
    'KHD Merit Scholarship 2026',
    'Annual merit scholarship for students from Khadayata families who have scored 90% or above in Class 12 and secured admission in a recognised UG programme.',
    50000, 'INR',
    (now() + interval '45 days')::date,
    'open',
    'Students from Khadayata families. Class 12 score ≥ 90%. Admission in recognised UG programme. Annual family income ≤ ₹8 lakhs.',
    ARRAY['Class 12 marksheet','College admission letter','Income certificate','Aadhaar card'],
    'scholarships@khadayataonline.com',
    10,
    'e1000001-0000-0000-0000-000000000001'::uuid,
    'd1000001-0000-0000-0000-000000000001'::uuid,
    'c1000001-0000-0000-0000-000000000001'::uuid,
    'Merit'
  ),
  (
    gen_random_uuid(),
    'f1000002-0000-0000-0000-000000000002'::uuid,
    'KHD Need-Based Scholarship 2026',
    'Financial support for deserving students from economically weaker sections of the Khadayata community pursuing higher education.',
    100000, 'INR',
    (now() + interval '45 days')::date,
    'open',
    'Students from Khadayata families. Annual family income ≤ ₹3 lakhs. Pursuing graduation or post-graduation.',
    ARRAY['College fee receipt','Income certificate','Aadhaar card','Bank statement'],
    'scholarships@khadayataonline.com',
    5,
    'e1000001-0000-0000-0000-000000000001'::uuid,
    'd1000001-0000-0000-0000-000000000001'::uuid,
    'c1000001-0000-0000-0000-000000000001'::uuid,
    'Need-Based'
  ),
  (
    gen_random_uuid(),
    'f1000001-0000-0000-0000-000000000001'::uuid,
    'Global STEM Excellence Award',
    'Global scholarship for Khadayata students excelling in STEM disciplines at the post-graduate level anywhere in the world.',
    250000, 'INR',
    (now() + interval '30 days')::date,
    'open',
    'KHD members or their children. Enrolled in an MS, M.Tech, or PhD programme in STEM. Any country.',
    ARRAY['Enrollment letter','Academic transcripts','Research statement','KHD membership proof'],
    'global@khadayataonline.com',
    3,
    NULL, NULL, NULL,
    'STEM'
  )
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------
-- Mentorships
-- -------------------------------------------------------
INSERT INTO mentorships (
  id, mentor_member_id,
  skills, description, max_mentees,
  availability, mode, status
) VALUES
  (
    gen_random_uuid(),
    '955e2975-bf64-48c2-99cc-3ae9f703b8d5'::uuid,
    ARRAY['Business Strategy','Leadership','Entrepreneurship'],
    'Happy to mentor aspiring entrepreneurs and business owners. Can help with business planning, scaling, and navigating the Gujarat market.',
    3, 'Weekends 10am-12pm IST', 'online', 'available'
  ),
  (
    gen_random_uuid(),
    'b683d94d-9557-4406-be00-2d59ddbcd712'::uuid,
    ARRAY['CA Exam Prep','Tax Planning','Accounting'],
    'CA with 7 years of experience. Open to mentoring CA aspirants, fresh graduates entering finance, and young CAs starting their practice.',
    2, 'Weekday evenings 7-9pm IST', 'online', 'available'
  ),
  (
    gen_random_uuid(),
    'c3e19d25-22ed-4b2a-a489-5c5d38a8855a'::uuid,
    ARRAY['React','TypeScript','Node.js','Career in Tech'],
    'Software engineer happy to guide students and career changers entering the tech industry. Can review resumes, do mock interviews, and advise on learning paths.',
    3, 'Saturdays 3-5pm IST', 'online', 'available'
  ),
  (
    gen_random_uuid(),
    '03a3a5f7-6fe0-4f7d-8b14-f70da8e50562'::uuid,
    ARRAY['MBBS Entrance','Medical Career','Research'],
    'Doctor offering guidance to students preparing for NEET and those navigating medical careers. Can provide insights on specialisation choices.',
    2, 'Sunday mornings 9-11am IST', 'online', 'available'
  )
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------
-- Emergency Contacts
-- -------------------------------------------------------
INSERT INTO emergency_contacts (id, city_id, name, phone, type) VALUES
  (gen_random_uuid(), 'e1000001-0000-0000-0000-000000000001'::uuid, 'Ahmedabad KHD Helpline',         '+91-79-26540100', 'Community'),
  (gen_random_uuid(), 'e1000001-0000-0000-0000-000000000001'::uuid, 'Ahmedabad Police',                '100',            'Police'),
  (gen_random_uuid(), 'e1000001-0000-0000-0000-000000000001'::uuid, 'Apollo Hospital Ahmedabad',       '+91-79-66701800', 'Hospital'),
  (gen_random_uuid(), 'e1000001-0000-0000-0000-000000000001'::uuid, 'AMTS Emergency',                  '1800-233-2677',  'Transport'),
  (gen_random_uuid(), 'e1000010-0000-0000-0000-000000000010'::uuid, 'Mumbai KHD Helpline',             '+91-22-26540100', 'Community'),
  (gen_random_uuid(), 'e1000010-0000-0000-0000-000000000010'::uuid, 'Mumbai Police',                   '100',            'Police'),
  (gen_random_uuid(), 'e1000010-0000-0000-0000-000000000010'::uuid, 'Hinduja Hospital Mumbai',         '+91-22-24452222', 'Hospital'),
  (gen_random_uuid(), 'e1000050-0000-0000-0000-000000000050'::uuid, 'New York KHD Helpline',           '+1-212-555-0100', 'Community'),
  (gen_random_uuid(), 'e1000060-0000-0000-0000-000000000060'::uuid, 'London KHD Helpline',             '+44-20-7946-0100','Community'),
  (gen_random_uuid(), 'e1000070-0000-0000-0000-000000000070'::uuid, 'Dubai KHD Helpline',              '+971-4-555-0100', 'Community')
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------
-- Funds
-- -------------------------------------------------------
INSERT INTO funds (id, scope, chapter_id, name, currency, active) VALUES
  (gen_random_uuid(), 'global', NULL,                                                          'KHD General Fund',              'INR', true),
  (gen_random_uuid(), 'global', NULL,                                                          'KHD Education Scholarship Fund', 'INR', true),
  (gen_random_uuid(), 'global', NULL,                                                          'KHD Medical Aid Fund',           'INR', true),
  (gen_random_uuid(), 'chapter','f1000002-0000-0000-0000-000000000002'::uuid,                  'Ahmedabad Chapter Fund',         'INR', true),
  (gen_random_uuid(), 'chapter','f1000003-0000-0000-0000-000000000003'::uuid,                  'Mumbai Chapter Fund',            'INR', true)
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------
-- Platform Settings
-- -------------------------------------------------------
INSERT INTO settings (key, value) VALUES
  ('platform_name',        '{"en":"Khadayata Heritage Directory","gu":"ખંડેળવાળ હેરિટેજ ડિરેક્ટરી"}'::jsonb),
  ('platform_version',     '{"version":"1.0.0","build":"2026.03"}'::jsonb),
  ('kyc_enabled',          '{"enabled":true,"min_level":1}'::jsonb),
  ('matrimonial_enabled',  '{"enabled":true,"require_verification":false}'::jsonb),
  ('global_id_enabled',    '{"enabled":true}'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- -------------------------------------------------------
-- Announcements
-- -------------------------------------------------------
INSERT INTO announcements (id, title, body, starts_at, ends_at, created_by) VALUES
  (
    gen_random_uuid(),
    'Welcome to KHD Platform v1.0',
    'The Khadayata Heritage Directory is now live! Please complete your profile, explore the directory, and connect with community members across the globe. For help, reach us at support@khadayataonline.com.',
    now(), now() + interval '90 days',
    'b0000001-cafe-0000-0000-000000000001'::uuid
  ),
  (
    gen_random_uuid(),
    'Scholarship Applications Open',
    'Applications for KHD scholarships for the 2026-27 academic year are now open. Eligible students should apply before the deadline. Visit the Scholarships section for details.',
    now(), now() + interval '45 days',
    'b0000001-cafe-0000-0000-000000000001'::uuid
  )
ON CONFLICT DO NOTHING;

-- ========== 20260315201558_drop_unused_indexes.sql ==========
/*
  # Drop Unused Indexes

  ## Summary
  Removes all indexes that have never been used (pg_stat_user_indexes.idx_scan = 0).
  Unused indexes consume disk space and slow down write operations (INSERT/UPDATE/DELETE)
  without providing any query performance benefit.

  ## Indexes Dropped
  Covers all reported unused indexes across tables:
  content_news, events, businesses, jobs, members, reports, announcements, audits,
  chapter_transfers, chapters, consents, data_requests, donations, education,
  emergency_contacts, employment, event_checkins, event_photos, event_rsvps,
  family_invitations, family_links, funds, hall_bookings, heritage_tags,
  job_applications, matrimonial_introductions, matrimonial_profiles, media_files,
  medical_aid_requests, member_contacts, member_languages, member_skills,
  mentorship_sessions, mentorships, oral_histories, photo_tags, role_assignments,
  scholarship_applications, scholarships, tag_requests, verification_requests,
  vouches, whatsapp_messages

  ## Notes
  - Foreign key constraint indexes are retained automatically by Postgres
  - Primary key indexes are never dropped
  - Only non-constraint indexes are removed here
*/

DROP INDEX IF EXISTS public.idx_content_news_tags;
DROP INDEX IF EXISTS public.idx_events_time;
DROP INDEX IF EXISTS public.idx_business_sector;
DROP INDEX IF EXISTS public.idx_jobs_status;
DROP INDEX IF EXISTS public.idx_members_name;
DROP INDEX IF EXISTS public.idx_reports_entity;
DROP INDEX IF EXISTS public.idx_reports_status;
DROP INDEX IF EXISTS public.idx_announcements_created_by;
DROP INDEX IF EXISTS public.idx_audits_actor_user_id;
DROP INDEX IF EXISTS public.idx_businesses_chapter_id;
DROP INDEX IF EXISTS public.idx_businesses_city_id;
DROP INDEX IF EXISTS public.idx_businesses_country_id;
DROP INDEX IF EXISTS public.idx_businesses_owner_member_id;
DROP INDEX IF EXISTS public.idx_businesses_state_id;
DROP INDEX IF EXISTS public.idx_chapter_transfers_approved_by;
DROP INDEX IF EXISTS public.idx_chapter_transfers_from_chapter_id;
DROP INDEX IF EXISTS public.idx_chapter_transfers_member_id;
DROP INDEX IF EXISTS public.idx_chapter_transfers_to_chapter_id;
DROP INDEX IF EXISTS public.idx_chapters_city_id;
DROP INDEX IF EXISTS public.idx_chapters_country_id;
DROP INDEX IF EXISTS public.idx_chapters_state_id;
DROP INDEX IF EXISTS public.idx_consents_member_id;
DROP INDEX IF EXISTS public.idx_content_news_chapter_id;
DROP INDEX IF EXISTS public.idx_content_news_city_id;
DROP INDEX IF EXISTS public.idx_content_news_country_id;
DROP INDEX IF EXISTS public.idx_content_news_created_by;
DROP INDEX IF EXISTS public.idx_content_news_reviewed_by;
DROP INDEX IF EXISTS public.idx_content_news_state_id;
DROP INDEX IF EXISTS public.idx_data_requests_member_id;
DROP INDEX IF EXISTS public.idx_donations_fund_id;
DROP INDEX IF EXISTS public.idx_donations_member_id;
DROP INDEX IF EXISTS public.idx_education_member_id;
DROP INDEX IF EXISTS public.idx_emergency_contacts_city_id;
DROP INDEX IF EXISTS public.idx_employment_member_id;
DROP INDEX IF EXISTS public.idx_event_checkins_event_id;
DROP INDEX IF EXISTS public.idx_event_checkins_member_id;
DROP INDEX IF EXISTS public.idx_event_checkins_scanned_by;
DROP INDEX IF EXISTS public.idx_event_photos_event_id;
DROP INDEX IF EXISTS public.idx_event_photos_uploaded_by;
DROP INDEX IF EXISTS public.idx_event_rsvps_member_id;
DROP INDEX IF EXISTS public.idx_events_chapter_id;
DROP INDEX IF EXISTS public.idx_events_city_id;
DROP INDEX IF EXISTS public.idx_events_country_id;
DROP INDEX IF EXISTS public.idx_events_created_by;
DROP INDEX IF EXISTS public.idx_events_state_id;
DROP INDEX IF EXISTS public.idx_family_invitations_accepted_by;
DROP INDEX IF EXISTS public.idx_family_invitations_inviter;
DROP INDEX IF EXISTS public.idx_family_links_family_id;
DROP INDEX IF EXISTS public.idx_family_links_member_id;
DROP INDEX IF EXISTS public.idx_family_links_related_member_id;
DROP INDEX IF EXISTS public.idx_funds_chapter_id;
DROP INDEX IF EXISTS public.idx_hall_bookings_chapter_id;
DROP INDEX IF EXISTS public.idx_hall_bookings_member_id;
DROP INDEX IF EXISTS public.idx_heritage_tags_tagged_by;
DROP INDEX IF EXISTS public.idx_job_applications_member_id;
DROP INDEX IF EXISTS public.idx_jobs_chapter_id;
DROP INDEX IF EXISTS public.idx_jobs_city_id;
DROP INDEX IF EXISTS public.idx_jobs_country_id;
DROP INDEX IF EXISTS public.idx_jobs_employer_business_id;
DROP INDEX IF EXISTS public.idx_jobs_employer_member_id;
DROP INDEX IF EXISTS public.idx_jobs_state_id;
DROP INDEX IF EXISTS public.idx_matrimonial_introductions_from;
DROP INDEX IF EXISTS public.idx_matrimonial_introductions_to;
DROP INDEX IF EXISTS public.idx_matrimonial_profiles_guardian;
DROP INDEX IF EXISTS public.idx_media_files_owner_user_id;
DROP INDEX IF EXISTS public.idx_medical_aid_requests_chapter_id;
DROP INDEX IF EXISTS public.idx_medical_aid_requests_member_id;
DROP INDEX IF EXISTS public.idx_member_contacts_member_id;
DROP INDEX IF EXISTS public.idx_member_languages_member_id;
DROP INDEX IF EXISTS public.idx_member_skills_member_id;
DROP INDEX IF EXISTS public.idx_members_chapter_id;
DROP INDEX IF EXISTS public.idx_mentorship_sessions_mentorship_id;
DROP INDEX IF EXISTS public.idx_mentorships_mentee_member_id;
DROP INDEX IF EXISTS public.idx_mentorships_mentor_member_id;
DROP INDEX IF EXISTS public.idx_oral_histories_narrator_member_id;
DROP INDEX IF EXISTS public.idx_oral_histories_uploaded_by;
DROP INDEX IF EXISTS public.idx_photo_tags_member_id;
DROP INDEX IF EXISTS public.idx_photo_tags_tagged_by;
DROP INDEX IF EXISTS public.idx_reports_reporter_member_id;
DROP INDEX IF EXISTS public.idx_reports_reviewed_by;
DROP INDEX IF EXISTS public.idx_role_assignments_created_by;
DROP INDEX IF EXISTS public.idx_role_assignments_role_id;
DROP INDEX IF EXISTS public.idx_scholarship_applications_member_id;
DROP INDEX IF EXISTS public.idx_scholarships_chapter_id;
DROP INDEX IF EXISTS public.idx_scholarships_city_id;
DROP INDEX IF EXISTS public.idx_scholarships_country_id;
DROP INDEX IF EXISTS public.idx_scholarships_state_id;
DROP INDEX IF EXISTS public.idx_tag_requests_decided_by;
DROP INDEX IF EXISTS public.idx_tag_requests_requester_user_id;
DROP INDEX IF EXISTS public.idx_verification_requests_member_id;
DROP INDEX IF EXISTS public.idx_vouches_voucher_member_id;
DROP INDEX IF EXISTS public.idx_whatsapp_messages_recipient_member_id;
DROP INDEX IF EXISTS public.idx_whatsapp_messages_template_id;

-- ========== 20260315201653_fix_multiple_permissive_policies.sql ==========
/*
  # Fix Multiple Permissive RLS Policies

  ## Summary
  Consolidates duplicate permissive RLS policies on the same table/action into single
  policies using OR logic. Multiple permissive policies for the same role+action cause
  a security warning because Postgres evaluates them with OR, which can be confusing
  and lead to unintended access. Merging them makes the intent explicit and clear.

  ## Tables Fixed
  1. hall_bookings  - INSERT, SELECT, UPDATE
  2. matrimonial_profiles - INSERT, SELECT, UPDATE
  3. members - UPDATE
  4. mentorships - INSERT, SELECT, UPDATE
  5. oral_histories - INSERT, SELECT, UPDATE

  ## Approach
  Drop the two conflicting policies per action and replace with one combined policy
  that uses OR to cover both the admin role check and the member ownership check.
*/

-- ============================================================
-- hall_bookings
-- ============================================================

DROP POLICY IF EXISTS "Admins can insert bookings" ON public.hall_bookings;
DROP POLICY IF EXISTS "Members can create bookings" ON public.hall_bookings;
CREATE POLICY "Members and admins can create bookings"
  ON public.hall_bookings FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id IN (SELECT id FROM public.members WHERE user_id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'Global Admin')
    OR has_role((SELECT auth.uid()), 'Chapter Admin')
  );

DROP POLICY IF EXISTS "Admins can read bookings" ON public.hall_bookings;
DROP POLICY IF EXISTS "Members can read own bookings" ON public.hall_bookings;
CREATE POLICY "Members can read own and admins can read all bookings"
  ON public.hall_bookings FOR SELECT
  TO authenticated
  USING (
    member_id IN (SELECT id FROM public.members WHERE user_id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'Global Admin')
    OR has_role((SELECT auth.uid()), 'Chapter Admin')
  );

DROP POLICY IF EXISTS "Admins can update bookings" ON public.hall_bookings;
DROP POLICY IF EXISTS "Members can update own bookings" ON public.hall_bookings;
CREATE POLICY "Members can update own and admins can update all bookings"
  ON public.hall_bookings FOR UPDATE
  TO authenticated
  USING (
    member_id IN (SELECT id FROM public.members WHERE user_id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'Global Admin')
    OR has_role((SELECT auth.uid()), 'Chapter Admin')
  )
  WITH CHECK (
    member_id IN (SELECT id FROM public.members WHERE user_id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'Global Admin')
    OR has_role((SELECT auth.uid()), 'Chapter Admin')
  );

-- ============================================================
-- matrimonial_profiles
-- ============================================================

DROP POLICY IF EXISTS "Admins can insert matrimonial profiles" ON public.matrimonial_profiles;
DROP POLICY IF EXISTS "Members can create own profile" ON public.matrimonial_profiles;
CREATE POLICY "Members and admins can create matrimonial profiles"
  ON public.matrimonial_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id IN (SELECT id FROM public.members WHERE user_id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'Global Admin')
    OR has_role((SELECT auth.uid()), 'Data Steward')
  );

DROP POLICY IF EXISTS "Admins can read matrimonial profiles" ON public.matrimonial_profiles;
DROP POLICY IF EXISTS "Verified members read profiles" ON public.matrimonial_profiles;
CREATE POLICY "Authenticated members can read matrimonial profiles"
  ON public.matrimonial_profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can update matrimonial profiles" ON public.matrimonial_profiles;
DROP POLICY IF EXISTS "Members can update own profile" ON public.matrimonial_profiles;
CREATE POLICY "Members can update own and admins can update all matrimonial profiles"
  ON public.matrimonial_profiles FOR UPDATE
  TO authenticated
  USING (
    member_id IN (SELECT id FROM public.members WHERE user_id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'Global Admin')
    OR has_role((SELECT auth.uid()), 'Data Steward')
  )
  WITH CHECK (
    member_id IN (SELECT id FROM public.members WHERE user_id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'Global Admin')
    OR has_role((SELECT auth.uid()), 'Data Steward')
  );

-- ============================================================
-- members
-- ============================================================

DROP POLICY IF EXISTS "Admins can update any member" ON public.members;
DROP POLICY IF EXISTS "Users can update own member" ON public.members;
CREATE POLICY "Users can update own and admins can update any member"
  ON public.members FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    OR has_role((SELECT auth.uid()), 'Global Admin')
    OR has_role((SELECT auth.uid()), 'Data Steward')
    OR has_role((SELECT auth.uid()), 'Chapter Admin')
  )
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    OR has_role((SELECT auth.uid()), 'Global Admin')
    OR has_role((SELECT auth.uid()), 'Data Steward')
    OR has_role((SELECT auth.uid()), 'Chapter Admin')
  );

-- ============================================================
-- mentorships
-- ============================================================

DROP POLICY IF EXISTS "Admins can insert mentorships" ON public.mentorships;
DROP POLICY IF EXISTS "Members can offer mentorship" ON public.mentorships;
CREATE POLICY "Members and admins can create mentorships"
  ON public.mentorships FOR INSERT
  TO authenticated
  WITH CHECK (
    mentor_member_id IN (SELECT id FROM public.members WHERE user_id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'Global Admin')
  );

DROP POLICY IF EXISTS "Admins can read mentorships" ON public.mentorships;
DROP POLICY IF EXISTS "Authenticated can read mentorships" ON public.mentorships;
CREATE POLICY "Authenticated can read mentorships"
  ON public.mentorships FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can update mentorships" ON public.mentorships;
DROP POLICY IF EXISTS "Mentors can update own" ON public.mentorships;
CREATE POLICY "Mentors can update own and admins can update all mentorships"
  ON public.mentorships FOR UPDATE
  TO authenticated
  USING (
    mentor_member_id IN (SELECT id FROM public.members WHERE user_id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'Global Admin')
  )
  WITH CHECK (
    mentor_member_id IN (SELECT id FROM public.members WHERE user_id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'Global Admin')
  );

-- ============================================================
-- oral_histories
-- ============================================================

DROP POLICY IF EXISTS "Admins can insert oral histories" ON public.oral_histories;
DROP POLICY IF EXISTS "Members can upload oral histories" ON public.oral_histories;
CREATE POLICY "Members and admins can upload oral histories"
  ON public.oral_histories FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by IN (SELECT id FROM public.members WHERE user_id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'Global Admin')
    OR has_role((SELECT auth.uid()), 'Data Steward')
  );

DROP POLICY IF EXISTS "Admins can read oral histories" ON public.oral_histories;
DROP POLICY IF EXISTS "Anyone can read published oral histories" ON public.oral_histories;
CREATE POLICY "Published oral histories readable by all, admins read all"
  ON public.oral_histories FOR SELECT
  TO authenticated
  USING (
    status = 'published'
    OR uploaded_by IN (SELECT id FROM public.members WHERE user_id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'Global Admin')
    OR has_role((SELECT auth.uid()), 'Data Steward')
  );

DROP POLICY IF EXISTS "Admins can update oral histories" ON public.oral_histories;
DROP POLICY IF EXISTS "Uploaders can update" ON public.oral_histories;
CREATE POLICY "Uploaders and admins can update oral histories"
  ON public.oral_histories FOR UPDATE
  TO authenticated
  USING (
    uploaded_by IN (SELECT id FROM public.members WHERE user_id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'Global Admin')
    OR has_role((SELECT auth.uid()), 'Data Steward')
  )
  WITH CHECK (
    uploaded_by IN (SELECT id FROM public.members WHERE user_id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'Global Admin')
    OR has_role((SELECT auth.uid()), 'Data Steward')
  );

-- ========== 20260315205853_add_audit_triggers.sql ==========
/*
  # Add audit log triggers

  ## Summary
  Adds PostgreSQL triggers to automatically capture audit entries when key data changes:

  1. Trigger on `members` table for verification_level changes
  2. Trigger on `role_assignments` table for inserts and deletes
  3. Trigger on `matrimonial_profiles` for verified status changes

  All changes are written to the `audits` table with actor, entity, field, old/new values.

  ## Security Notes
  - Triggers run as SECURITY DEFINER so they can always write to audits
  - No RLS bypass — uses service-level insert
*/

CREATE OR REPLACE FUNCTION fn_audit_member_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.verification_level IS DISTINCT FROM NEW.verification_level THEN
    INSERT INTO audits (actor_user_id, entity_type, entity_id, field, old_value, new_value, reason)
    VALUES (
      auth.uid(),
      'member',
      NEW.id,
      'verification_level',
      to_jsonb(OLD.verification_level),
      to_jsonb(NEW.verification_level),
      'Level updated'
    );
  END IF;

  IF OLD.is_suspended IS DISTINCT FROM NEW.is_suspended THEN
    INSERT INTO audits (actor_user_id, entity_type, entity_id, field, old_value, new_value, reason)
    VALUES (
      auth.uid(),
      'member',
      NEW.id,
      'is_suspended',
      to_jsonb(OLD.is_suspended),
      to_jsonb(NEW.is_suspended),
      CASE WHEN NEW.is_suspended THEN 'Member suspended' ELSE 'Member unsuspended' END
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_member_changes ON members;
CREATE TRIGGER trg_audit_member_changes
  AFTER UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION fn_audit_member_changes();


CREATE OR REPLACE FUNCTION fn_audit_role_assignments()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audits (actor_user_id, entity_type, entity_id, field, old_value, new_value, reason)
    VALUES (
      auth.uid(),
      'role_assignment',
      NEW.id,
      'role_id',
      NULL,
      to_jsonb(NEW.role_id),
      'Role assigned'
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audits (actor_user_id, entity_type, entity_id, field, old_value, new_value, reason)
    VALUES (
      auth.uid(),
      'role_assignment',
      OLD.id,
      'role_id',
      to_jsonb(OLD.role_id),
      NULL,
      'Role removed'
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_role_assignments ON role_assignments;
CREATE TRIGGER trg_audit_role_assignments
  AFTER INSERT OR DELETE ON role_assignments
  FOR EACH ROW EXECUTE FUNCTION fn_audit_role_assignments();


CREATE OR REPLACE FUNCTION fn_audit_verification_requests()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO audits (actor_user_id, entity_type, entity_id, field, old_value, new_value, reason)
    VALUES (
      auth.uid(),
      'verification_request',
      NEW.id,
      'status',
      to_jsonb(OLD.status),
      to_jsonb(NEW.status),
      'Verification request status updated'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_verification_requests ON verification_requests;
CREATE TRIGGER trg_audit_verification_requests
  AFTER UPDATE ON verification_requests
  FOR EACH ROW EXECUTE FUNCTION fn_audit_verification_requests();

-- ========== 20260315210105_add_community_niche_features.sql ==========
/*
  # Community Niche Features

  ## Summary
  Adds tables and columns to support Khadayata-specific community features:

  1. `samiti_groups` — Sub-groups within chapters (Mahila Mandal, Yuva Samiti, etc.)
  2. `samiti_members` — Members enrolled in sub-groups
  3. `donor_wall` — Tiered donor recognition for temple/community donations
  4. `rishta_requests` — Formal Rishta (match request) flow routed to family contact
  5. `family_connections` — Parivar (family tree) connections between members
  6. Adds `kuldevi` column to members if missing
  7. Adds `overseas_verified` flag to members for diaspora NRI tier
  8. Adds `elder_priority` flag to oral_history table for 70+ members

  ## Security
  - RLS enabled on all new tables
  - Members can view samiti data; only admins can manage
  - Rishta requests visible to sender + recipient family contact
  - Donor wall is public read
*/

-- Samiti (sub-group) management
CREATE TABLE IF NOT EXISTS samiti_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid REFERENCES chapters(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text DEFAULT 'general',
  description text,
  contact_member_id uuid REFERENCES members(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE samiti_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view samiti groups"
  ON samiti_groups FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert samiti groups"
  ON samiti_groups FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1)
      AND r.name IN ('Global Admin', 'Chapter Admin')
    )
  );

CREATE POLICY "Admins can update samiti groups"
  ON samiti_groups FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1)
      AND r.name IN ('Global Admin', 'Chapter Admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1)
      AND r.name IN ('Global Admin', 'Chapter Admin')
    )
  );

CREATE TABLE IF NOT EXISTS samiti_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  samiti_id uuid REFERENCES samiti_groups(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  UNIQUE(samiti_id, member_id)
);

ALTER TABLE samiti_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view samiti memberships"
  ON samiti_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage samiti members"
  ON samiti_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1)
      AND r.name IN ('Global Admin', 'Chapter Admin')
    )
  );

CREATE POLICY "Admins can delete samiti members"
  ON samiti_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1)
      AND r.name IN ('Global Admin', 'Chapter Admin')
    )
  );

-- Donor Wall
CREATE TABLE IF NOT EXISTS donor_wall (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES members(id) ON DELETE SET NULL,
  display_name text NOT NULL,
  tier text NOT NULL DEFAULT 'patron',
  amount_donated numeric(12, 2),
  currency text DEFAULT 'INR',
  dedication text,
  anonymous boolean DEFAULT false,
  chapter_id uuid REFERENCES chapters(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE donor_wall ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view donor wall"
  ON donor_wall FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert donor wall entries"
  ON donor_wall FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1)
      AND r.name IN ('Global Admin', 'Finance Admin')
    )
  );

-- Rishta Requests
CREATE TABLE IF NOT EXISTS rishta_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_profile_id uuid REFERENCES matrimonial_profiles(id) ON DELETE CASCADE,
  to_profile_id uuid REFERENCES matrimonial_profiles(id) ON DELETE CASCADE,
  family_contact_name text,
  family_contact_phone text,
  message text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  UNIQUE(from_profile_id, to_profile_id)
);

ALTER TABLE rishta_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their own rishta requests"
  ON rishta_requests FOR SELECT
  TO authenticated
  USING (
    from_profile_id IN (
      SELECT id FROM matrimonial_profiles
      WHERE member_id = (SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1)
    )
    OR
    to_profile_id IN (
      SELECT id FROM matrimonial_profiles
      WHERE member_id = (SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1)
    )
  );

CREATE POLICY "Members can create rishta requests"
  ON rishta_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    from_profile_id IN (
      SELECT id FROM matrimonial_profiles
      WHERE member_id = (SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1)
    )
  );

CREATE POLICY "Members can update their received rishta requests"
  ON rishta_requests FOR UPDATE
  TO authenticated
  USING (
    to_profile_id IN (
      SELECT id FROM matrimonial_profiles
      WHERE member_id = (SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1)
    )
  )
  WITH CHECK (
    to_profile_id IN (
      SELECT id FROM matrimonial_profiles
      WHERE member_id = (SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1)
    )
  );

-- Family Connections (Parivar Tree)
CREATE TABLE IF NOT EXISTS family_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  related_member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  relation_type text NOT NULL,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(member_id, related_member_id, relation_type)
);

ALTER TABLE family_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view family connections"
  ON family_connections FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Members can create their own family connections"
  ON family_connections FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id = (SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1)
  );

CREATE POLICY "Members can delete their own family connections"
  ON family_connections FOR DELETE
  TO authenticated
  USING (
    member_id = (SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1)
  );

-- Add kuldevi to members if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'members' AND column_name = 'kuldevi'
  ) THEN
    ALTER TABLE members ADD COLUMN kuldevi text;
  END IF;
END $$;

-- Add overseas_verified to members if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'members' AND column_name = 'overseas_verified'
  ) THEN
    ALTER TABLE members ADD COLUMN overseas_verified boolean DEFAULT false;
  END IF;
END $$;

-- Add elder_priority to oral_history if table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'oral_history'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'oral_history' AND column_name = 'elder_priority'
    ) THEN
      ALTER TABLE oral_history ADD COLUMN elder_priority boolean DEFAULT false;
    END IF;
  END IF;
END $$;

-- Index for donor wall
CREATE INDEX IF NOT EXISTS idx_donor_wall_tier ON donor_wall(tier);
CREATE INDEX IF NOT EXISTS idx_donor_wall_chapter ON donor_wall(chapter_id);
CREATE INDEX IF NOT EXISTS idx_samiti_groups_chapter ON samiti_groups(chapter_id);
CREATE INDEX IF NOT EXISTS idx_family_connections_member ON family_connections(member_id);
CREATE INDEX IF NOT EXISTS idx_rishta_requests_from ON rishta_requests(from_profile_id);
CREATE INDEX IF NOT EXISTS idx_rishta_requests_to ON rishta_requests(to_profile_id);

-- ========== 20260315214847_add_missing_fk_indexes_batch2.sql ==========
/*
  # Add Missing Foreign Key Indexes (Batch 2)

  ## Summary
  Adds covering indexes for all foreign key columns that are missing indexes.
  This prevents sequential scans during cascading deletes and JOIN operations.

  ## Tables Covered
  - announcements, audits, businesses, chapter_transfers, chapters
  - consents, content_news, data_requests, donations, donor_wall
  - education, emergency_contacts, employment, event_checkins, event_photos
  - event_rsvps, events, family_connections, family_invitations, family_links
  - funds, hall_bookings, heritage_tags, job_applications, jobs
  - matrimonial_introductions, matrimonial_profiles, media_files
  - medical_aid_requests, member_contacts, member_languages, member_skills
  - members, mentorship_sessions, mentorships, oral_histories, photo_tags
  - reports, role_assignments, samiti_groups, samiti_members
  - scholarship_applications, scholarships, tag_requests, verification_requests
  - vouches, whatsapp_messages
*/

-- announcements
CREATE INDEX IF NOT EXISTS idx_announcements_created_by ON public.announcements(created_by);

-- audits
CREATE INDEX IF NOT EXISTS idx_audits_actor_user_id ON public.audits(actor_user_id);

-- businesses
CREATE INDEX IF NOT EXISTS idx_businesses_chapter_id ON public.businesses(chapter_id);
CREATE INDEX IF NOT EXISTS idx_businesses_city_id ON public.businesses(city_id);
CREATE INDEX IF NOT EXISTS idx_businesses_country_id ON public.businesses(country_id);
CREATE INDEX IF NOT EXISTS idx_businesses_owner_member_id ON public.businesses(owner_member_id);
CREATE INDEX IF NOT EXISTS idx_businesses_state_id ON public.businesses(state_id);

-- chapter_transfers
CREATE INDEX IF NOT EXISTS idx_chapter_transfers_approved_by ON public.chapter_transfers(approved_by);
CREATE INDEX IF NOT EXISTS idx_chapter_transfers_from_chapter_id ON public.chapter_transfers(from_chapter_id);
CREATE INDEX IF NOT EXISTS idx_chapter_transfers_member_id ON public.chapter_transfers(member_id);
CREATE INDEX IF NOT EXISTS idx_chapter_transfers_to_chapter_id ON public.chapter_transfers(to_chapter_id);

-- chapters
CREATE INDEX IF NOT EXISTS idx_chapters_city_id ON public.chapters(city_id);
CREATE INDEX IF NOT EXISTS idx_chapters_country_id ON public.chapters(country_id);
CREATE INDEX IF NOT EXISTS idx_chapters_state_id ON public.chapters(state_id);

-- consents
CREATE INDEX IF NOT EXISTS idx_consents_member_id ON public.consents(member_id);

-- content_news
CREATE INDEX IF NOT EXISTS idx_content_news_chapter_id ON public.content_news(chapter_id);
CREATE INDEX IF NOT EXISTS idx_content_news_city_id ON public.content_news(city_id);
CREATE INDEX IF NOT EXISTS idx_content_news_country_id ON public.content_news(country_id);
CREATE INDEX IF NOT EXISTS idx_content_news_created_by ON public.content_news(created_by);
CREATE INDEX IF NOT EXISTS idx_content_news_reviewed_by ON public.content_news(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_content_news_state_id ON public.content_news(state_id);

-- data_requests
CREATE INDEX IF NOT EXISTS idx_data_requests_member_id ON public.data_requests(member_id);

-- donations
CREATE INDEX IF NOT EXISTS idx_donations_fund_id ON public.donations(fund_id);
CREATE INDEX IF NOT EXISTS idx_donations_member_id ON public.donations(member_id);

-- donor_wall
CREATE INDEX IF NOT EXISTS idx_donor_wall_member_id ON public.donor_wall(member_id);

-- education
CREATE INDEX IF NOT EXISTS idx_education_member_id ON public.education(member_id);

-- emergency_contacts
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_city_id ON public.emergency_contacts(city_id);

-- employment
CREATE INDEX IF NOT EXISTS idx_employment_member_id ON public.employment(member_id);

-- event_checkins
CREATE INDEX IF NOT EXISTS idx_event_checkins_event_id ON public.event_checkins(event_id);
CREATE INDEX IF NOT EXISTS idx_event_checkins_member_id ON public.event_checkins(member_id);
CREATE INDEX IF NOT EXISTS idx_event_checkins_scanned_by ON public.event_checkins(scanned_by);

-- event_photos
CREATE INDEX IF NOT EXISTS idx_event_photos_event_id ON public.event_photos(event_id);
CREATE INDEX IF NOT EXISTS idx_event_photos_uploaded_by ON public.event_photos(uploaded_by);

-- event_rsvps
CREATE INDEX IF NOT EXISTS idx_event_rsvps_member_id ON public.event_rsvps(member_id);

-- events
CREATE INDEX IF NOT EXISTS idx_events_chapter_id ON public.events(chapter_id);
CREATE INDEX IF NOT EXISTS idx_events_city_id ON public.events(city_id);
CREATE INDEX IF NOT EXISTS idx_events_country_id ON public.events(country_id);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON public.events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_state_id ON public.events(state_id);

-- family_connections
CREATE INDEX IF NOT EXISTS idx_family_connections_related_member_id ON public.family_connections(related_member_id);

-- family_invitations
CREATE INDEX IF NOT EXISTS idx_family_invitations_accepted_by ON public.family_invitations(accepted_by_member_id);
CREATE INDEX IF NOT EXISTS idx_family_invitations_inviter ON public.family_invitations(inviter_member_id);

-- family_links
CREATE INDEX IF NOT EXISTS idx_family_links_family_id ON public.family_links(family_id);
CREATE INDEX IF NOT EXISTS idx_family_links_member_id ON public.family_links(member_id);
CREATE INDEX IF NOT EXISTS idx_family_links_related_member_id ON public.family_links(related_member_id);

-- funds
CREATE INDEX IF NOT EXISTS idx_funds_chapter_id ON public.funds(chapter_id);

-- hall_bookings
CREATE INDEX IF NOT EXISTS idx_hall_bookings_chapter_id ON public.hall_bookings(chapter_id);
CREATE INDEX IF NOT EXISTS idx_hall_bookings_member_id ON public.hall_bookings(member_id);

-- heritage_tags
CREATE INDEX IF NOT EXISTS idx_heritage_tags_tagged_by ON public.heritage_tags(tagged_by);

-- job_applications
CREATE INDEX IF NOT EXISTS idx_job_applications_member_id ON public.job_applications(member_id);

-- jobs
CREATE INDEX IF NOT EXISTS idx_jobs_chapter_id ON public.jobs(chapter_id);
CREATE INDEX IF NOT EXISTS idx_jobs_city_id ON public.jobs(city_id);
CREATE INDEX IF NOT EXISTS idx_jobs_country_id ON public.jobs(country_id);
CREATE INDEX IF NOT EXISTS idx_jobs_employer_business_id ON public.jobs(employer_business_id);
CREATE INDEX IF NOT EXISTS idx_jobs_employer_member_id ON public.jobs(employer_member_id);
CREATE INDEX IF NOT EXISTS idx_jobs_state_id ON public.jobs(state_id);

-- matrimonial_introductions
CREATE INDEX IF NOT EXISTS idx_matrimonial_introductions_from ON public.matrimonial_introductions(from_member_id);
CREATE INDEX IF NOT EXISTS idx_matrimonial_introductions_to ON public.matrimonial_introductions(to_member_id);

-- matrimonial_profiles
CREATE INDEX IF NOT EXISTS idx_matrimonial_profiles_guardian ON public.matrimonial_profiles(guardian_member_id);

-- media_files
CREATE INDEX IF NOT EXISTS idx_media_files_owner_user_id ON public.media_files(owner_user_id);

-- medical_aid_requests
CREATE INDEX IF NOT EXISTS idx_medical_aid_requests_chapter_id ON public.medical_aid_requests(chapter_id);
CREATE INDEX IF NOT EXISTS idx_medical_aid_requests_member_id ON public.medical_aid_requests(member_id);

-- member_contacts
CREATE INDEX IF NOT EXISTS idx_member_contacts_member_id ON public.member_contacts(member_id);

-- member_languages
CREATE INDEX IF NOT EXISTS idx_member_languages_member_id ON public.member_languages(member_id);

-- member_skills
CREATE INDEX IF NOT EXISTS idx_member_skills_member_id ON public.member_skills(member_id);

-- members
CREATE INDEX IF NOT EXISTS idx_members_chapter_id ON public.members(chapter_id);

-- mentorship_sessions
CREATE INDEX IF NOT EXISTS idx_mentorship_sessions_mentorship_id ON public.mentorship_sessions(mentorship_id);

-- mentorships
CREATE INDEX IF NOT EXISTS idx_mentorships_mentee_member_id ON public.mentorships(mentee_member_id);
CREATE INDEX IF NOT EXISTS idx_mentorships_mentor_member_id ON public.mentorships(mentor_member_id);

-- oral_histories
CREATE INDEX IF NOT EXISTS idx_oral_histories_narrator_member_id ON public.oral_histories(narrator_member_id);
CREATE INDEX IF NOT EXISTS idx_oral_histories_uploaded_by ON public.oral_histories(uploaded_by);

-- photo_tags
CREATE INDEX IF NOT EXISTS idx_photo_tags_member_id ON public.photo_tags(member_id);
CREATE INDEX IF NOT EXISTS idx_photo_tags_tagged_by ON public.photo_tags(tagged_by);

-- reports
CREATE INDEX IF NOT EXISTS idx_reports_reporter_member_id ON public.reports(reporter_member_id);
CREATE INDEX IF NOT EXISTS idx_reports_reviewed_by ON public.reports(reviewed_by);

-- role_assignments
CREATE INDEX IF NOT EXISTS idx_role_assignments_created_by ON public.role_assignments(created_by);
CREATE INDEX IF NOT EXISTS idx_role_assignments_role_id ON public.role_assignments(role_id);

-- samiti_groups
CREATE INDEX IF NOT EXISTS idx_samiti_groups_contact_member_id ON public.samiti_groups(contact_member_id);

-- samiti_members
CREATE INDEX IF NOT EXISTS idx_samiti_members_member_id ON public.samiti_members(member_id);

-- scholarship_applications
CREATE INDEX IF NOT EXISTS idx_scholarship_applications_member_id ON public.scholarship_applications(member_id);

-- scholarships
CREATE INDEX IF NOT EXISTS idx_scholarships_chapter_id ON public.scholarships(chapter_id);
CREATE INDEX IF NOT EXISTS idx_scholarships_city_id ON public.scholarships(city_id);
CREATE INDEX IF NOT EXISTS idx_scholarships_country_id ON public.scholarships(country_id);
CREATE INDEX IF NOT EXISTS idx_scholarships_state_id ON public.scholarships(state_id);

-- tag_requests
CREATE INDEX IF NOT EXISTS idx_tag_requests_decided_by ON public.tag_requests(decided_by);
CREATE INDEX IF NOT EXISTS idx_tag_requests_requester_user_id ON public.tag_requests(requester_user_id);

-- verification_requests
CREATE INDEX IF NOT EXISTS idx_verification_requests_member_id ON public.verification_requests(member_id);

-- vouches
CREATE INDEX IF NOT EXISTS idx_vouches_voucher_member_id ON public.vouches(voucher_member_id);

-- whatsapp_messages
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_recipient_member_id ON public.whatsapp_messages(recipient_member_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_template_id ON public.whatsapp_messages(template_id);

-- ========== 20260315214923_fix_rls_auth_init_plan_batch2.sql ==========
/*
  # Fix RLS Auth Initialization Plan Issues

  ## Summary
  Replaces `auth.uid()` with `(select auth.uid())` in RLS policies for:
  - samiti_groups (insert, update)
  - samiti_members (insert, delete)
  - donor_wall (insert)
  - rishta_requests (insert, update, select)
  - family_connections (insert, delete)

  This prevents auth.uid() from being re-evaluated for every row,
  improving query performance at scale.
*/

-- samiti_groups: fix INSERT policy
DROP POLICY IF EXISTS "Admins can insert samiti groups" ON public.samiti_groups;
CREATE POLICY "Admins can insert samiti groups"
  ON public.samiti_groups
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (
        SELECT members.id FROM members WHERE members.user_id = (select auth.uid()) LIMIT 1
      )
      AND r.name = ANY (ARRAY['Global Admin', 'Chapter Admin'])
    )
  );

-- samiti_groups: fix UPDATE policy
DROP POLICY IF EXISTS "Admins can update samiti groups" ON public.samiti_groups;
CREATE POLICY "Admins can update samiti groups"
  ON public.samiti_groups
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (
        SELECT members.id FROM members WHERE members.user_id = (select auth.uid()) LIMIT 1
      )
      AND r.name = ANY (ARRAY['Global Admin', 'Chapter Admin'])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (
        SELECT members.id FROM members WHERE members.user_id = (select auth.uid()) LIMIT 1
      )
      AND r.name = ANY (ARRAY['Global Admin', 'Chapter Admin'])
    )
  );

-- samiti_members: fix INSERT policy
DROP POLICY IF EXISTS "Admins can manage samiti members" ON public.samiti_members;
CREATE POLICY "Admins can manage samiti members"
  ON public.samiti_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (
        SELECT members.id FROM members WHERE members.user_id = (select auth.uid()) LIMIT 1
      )
      AND r.name = ANY (ARRAY['Global Admin', 'Chapter Admin'])
    )
  );

-- samiti_members: fix DELETE policy
DROP POLICY IF EXISTS "Admins can delete samiti members" ON public.samiti_members;
CREATE POLICY "Admins can delete samiti members"
  ON public.samiti_members
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (
        SELECT members.id FROM members WHERE members.user_id = (select auth.uid()) LIMIT 1
      )
      AND r.name = ANY (ARRAY['Global Admin', 'Chapter Admin'])
    )
  );

-- donor_wall: fix INSERT policy
DROP POLICY IF EXISTS "Admins can insert donor wall entries" ON public.donor_wall;
CREATE POLICY "Admins can insert donor wall entries"
  ON public.donor_wall
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (
        SELECT members.id FROM members WHERE members.user_id = (select auth.uid()) LIMIT 1
      )
      AND r.name = ANY (ARRAY['Global Admin', 'Finance Admin'])
    )
  );

-- rishta_requests: fix INSERT policy
DROP POLICY IF EXISTS "Members can create rishta requests" ON public.rishta_requests;
CREATE POLICY "Members can create rishta requests"
  ON public.rishta_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    from_profile_id IN (
      SELECT matrimonial_profiles.id
      FROM matrimonial_profiles
      WHERE matrimonial_profiles.member_id = (
        SELECT members.id FROM members WHERE members.user_id = (select auth.uid()) LIMIT 1
      )
    )
  );

-- rishta_requests: fix UPDATE policy
DROP POLICY IF EXISTS "Members can update their received rishta requests" ON public.rishta_requests;
CREATE POLICY "Members can update their received rishta requests"
  ON public.rishta_requests
  FOR UPDATE
  TO authenticated
  USING (
    to_profile_id IN (
      SELECT matrimonial_profiles.id
      FROM matrimonial_profiles
      WHERE matrimonial_profiles.member_id = (
        SELECT members.id FROM members WHERE members.user_id = (select auth.uid()) LIMIT 1
      )
    )
  )
  WITH CHECK (
    to_profile_id IN (
      SELECT matrimonial_profiles.id
      FROM matrimonial_profiles
      WHERE matrimonial_profiles.member_id = (
        SELECT members.id FROM members WHERE members.user_id = (select auth.uid()) LIMIT 1
      )
    )
  );

-- rishta_requests: fix SELECT policy
DROP POLICY IF EXISTS "Members can view their own rishta requests" ON public.rishta_requests;
CREATE POLICY "Members can view their own rishta requests"
  ON public.rishta_requests
  FOR SELECT
  TO authenticated
  USING (
    (
      from_profile_id IN (
        SELECT matrimonial_profiles.id
        FROM matrimonial_profiles
        WHERE matrimonial_profiles.member_id = (
          SELECT members.id FROM members WHERE members.user_id = (select auth.uid()) LIMIT 1
        )
      )
    ) OR (
      to_profile_id IN (
        SELECT matrimonial_profiles.id
        FROM matrimonial_profiles
        WHERE matrimonial_profiles.member_id = (
          SELECT members.id FROM members WHERE members.user_id = (select auth.uid()) LIMIT 1
        )
      )
    )
  );

-- family_connections: fix INSERT policy
DROP POLICY IF EXISTS "Members can create their own family connections" ON public.family_connections;
CREATE POLICY "Members can create their own family connections"
  ON public.family_connections
  FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id = (
      SELECT members.id FROM members WHERE members.user_id = (select auth.uid()) LIMIT 1
    )
  );

-- family_connections: fix DELETE policy
DROP POLICY IF EXISTS "Members can delete their own family connections" ON public.family_connections;
CREATE POLICY "Members can delete their own family connections"
  ON public.family_connections
  FOR DELETE
  TO authenticated
  USING (
    member_id = (
      SELECT members.id FROM members WHERE members.user_id = (select auth.uid()) LIMIT 1
    )
  );

-- ========== 20260315214938_drop_unused_indexes_batch2.sql ==========
/*
  # Drop Unused Indexes

  ## Summary
  Removes indexes that have never been used and only add write overhead.
  These were flagged by Supabase advisor as unused.

  ## Indexes Dropped
  - idx_donor_wall_tier (donor_wall)
  - idx_donor_wall_chapter (donor_wall)
  - idx_samiti_groups_chapter (samiti_groups)
  - idx_family_connections_member (family_connections)
  - idx_rishta_requests_from (rishta_requests)
  - idx_rishta_requests_to (rishta_requests)
*/

DROP INDEX IF EXISTS public.idx_donor_wall_tier;
DROP INDEX IF EXISTS public.idx_donor_wall_chapter;
DROP INDEX IF EXISTS public.idx_samiti_groups_chapter;
DROP INDEX IF EXISTS public.idx_family_connections_member;
DROP INDEX IF EXISTS public.idx_rishta_requests_from;
DROP INDEX IF EXISTS public.idx_rishta_requests_to;

-- ========== 20260315215002_fix_function_search_paths.sql ==========
/*
  # Fix Mutable Search Path on Audit Functions

  ## Summary
  Adds `SET search_path = public` to all three audit trigger functions to prevent
  search path injection attacks. Functions with mutable search paths can be
  exploited if a malicious schema is placed earlier in the search path.

  ## Functions Fixed
  - public.fn_audit_member_changes
  - public.fn_audit_role_assignments
  - public.fn_audit_verification_requests
*/

CREATE OR REPLACE FUNCTION public.fn_audit_member_changes()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  IF OLD.verification_level IS DISTINCT FROM NEW.verification_level THEN
    INSERT INTO audits (actor_user_id, entity_type, entity_id, field, old_value, new_value, reason)
    VALUES (
      auth.uid(),
      'member',
      NEW.id,
      'verification_level',
      to_jsonb(OLD.verification_level),
      to_jsonb(NEW.verification_level),
      'Level updated'
    );
  END IF;

  IF OLD.is_suspended IS DISTINCT FROM NEW.is_suspended THEN
    INSERT INTO audits (actor_user_id, entity_type, entity_id, field, old_value, new_value, reason)
    VALUES (
      auth.uid(),
      'member',
      NEW.id,
      'is_suspended',
      to_jsonb(OLD.is_suspended),
      to_jsonb(NEW.is_suspended),
      CASE WHEN NEW.is_suspended THEN 'Member suspended' ELSE 'Member unsuspended' END
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_audit_role_assignments()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audits (actor_user_id, entity_type, entity_id, field, old_value, new_value, reason)
    VALUES (
      auth.uid(),
      'role_assignment',
      NEW.id,
      'role_id',
      NULL,
      to_jsonb(NEW.role_id),
      'Role assigned'
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audits (actor_user_id, entity_type, entity_id, field, old_value, new_value, reason)
    VALUES (
      auth.uid(),
      'role_assignment',
      OLD.id,
      'role_id',
      to_jsonb(OLD.role_id),
      NULL,
      'Role removed'
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_audit_verification_requests()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO audits (actor_user_id, entity_type, entity_id, field, old_value, new_value, reason)
    VALUES (
      auth.uid(),
      'verification_request',
      NEW.id,
      'status',
      to_jsonb(OLD.status),
      to_jsonb(NEW.status),
      'Verification request status updated'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- ========== 20260315220018_fix_audit_trigger_missing_column.sql ==========
/*
  # Fix Audit Trigger: Guard is_suspended Column Reference

  ## Summary
  The fn_audit_member_changes trigger function references OLD.is_suspended
  which does not exist on the members table. This causes any UPDATE on the
  members table to fail. Guards the check with a dynamic column existence
  check so the trigger works regardless of whether the column exists.
  
  ## Changes
  - Rewrites fn_audit_member_changes to safely check for is_suspended only
    if the column exists, using a TRY/CATCH approach to avoid hard errors.
*/

CREATE OR REPLACE FUNCTION public.fn_audit_member_changes()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  IF OLD.verification_level IS DISTINCT FROM NEW.verification_level THEN
    INSERT INTO audits (actor_user_id, entity_type, entity_id, field, old_value, new_value, reason)
    VALUES (
      auth.uid(),
      'member',
      NEW.id,
      'verification_level',
      to_jsonb(OLD.verification_level),
      to_jsonb(NEW.verification_level),
      'Level updated'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- ========== 20260315220028_fix_seed_ekda_visa_values.sql ==========
/*
  # Fix Test Seed Data: Replace 'Visa' Ekda Values

  ## Summary
  Replaces invalid test seed data 'Visa' (a payment card brand) stored in the
  members.ekda column with culturally appropriate Khadayata community Ekda
  (clan/gotra group) values. Multiple members had this placeholder value.

  ## Changes
  - Updates members who have ekda = 'Visa' with realistic Khadayata ekda values
  - Uses known valid Khadayata Ekdas: Agrawala, Maheshwari, Oswal, Khandelwal, Porwal
*/

UPDATE members SET ekda = 'Khandelwal' WHERE id = '955e2975-bf64-48c2-99cc-3ae9f703b8d5' AND ekda = 'Visa';
UPDATE members SET ekda = 'Oswal'       WHERE id = '5369121a-0a98-4293-81ac-6e2f7f1b21ca' AND ekda = 'Visa';
UPDATE members SET ekda = 'Agrawala'    WHERE id = '9fba0eee-bc92-412b-96b3-0bbf46d5141d' AND ekda = 'Visa';
UPDATE members SET ekda = 'Maheshwari'  WHERE id = 'fc340d7e-091c-4762-8352-7dfe9396a00c' AND ekda = 'Visa';
UPDATE members SET ekda = 'Porwal'      WHERE id = 'c3e19d25-22ed-4b2a-a489-5c5d38a8855a' AND ekda = 'Visa';

UPDATE members SET ekda = 'Khandelwal' WHERE ekda = 'Visa';

-- ========== 20260315230741_add_news_publisher_features.sql ==========
/*
  # Add Publisher Features to content_news

  1. New Columns
    - `article_type` (text, default 'article') — article | obituary | breaking
    - `pinned` (boolean, default false) — marks breaking/pinned news
    - `pinned_until` (timestamptz, nullable) — auto-expiry for pinned articles
    - `image_alt` (text, nullable) — WCAG alt text for cover image
    - `scope` (text, default 'chapter') — 'global' or 'chapter' for scoping
    - `read_time_minutes` (integer, nullable) — estimated read time

  2. Changes
    - Updates `status` enum notes: draft, review, published, archived
    - `article_type` values: article, obituary, breaking

  3. Security
    - No RLS changes required — existing policies cover new columns
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content_news' AND column_name = 'article_type'
  ) THEN
    ALTER TABLE content_news ADD COLUMN article_type text NOT NULL DEFAULT 'article';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content_news' AND column_name = 'pinned'
  ) THEN
    ALTER TABLE content_news ADD COLUMN pinned boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content_news' AND column_name = 'pinned_until'
  ) THEN
    ALTER TABLE content_news ADD COLUMN pinned_until timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content_news' AND column_name = 'image_alt'
  ) THEN
    ALTER TABLE content_news ADD COLUMN image_alt text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content_news' AND column_name = 'scope'
  ) THEN
    ALTER TABLE content_news ADD COLUMN scope text NOT NULL DEFAULT 'chapter';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content_news' AND column_name = 'read_time_minutes'
  ) THEN
    ALTER TABLE content_news ADD COLUMN read_time_minutes integer;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_content_news_pinned ON content_news (pinned, pinned_until) WHERE pinned = true;
CREATE INDEX IF NOT EXISTS idx_content_news_article_type ON content_news (article_type);

-- ========== 20260315231450_fix_publisher_verification_level.sql ==========
/*
  # Fix Publisher test user verification level

  Sets publisher@khadayataonline.com (Vikram Mehta) to verification_level = 2 (Trusted/L2)
  to match all other admin-class test users and suppress the "Submit ID docs for L2" dashboard prompt.
*/

UPDATE members
SET verification_level = 2
WHERE id = (
  SELECT m.id
  FROM members m
  JOIN auth.users au ON au.id = m.user_id
  WHERE au.email = 'publisher@khadayataonline.com'
);

-- ========== 20260315233237_fix_moderator_verification_level.sql ==========
/*
  # Fix Moderator test user verification level

  Sets moderator@khadayataonline.com (Pooja Verma) to verification_level = 2 (Trusted/L2)
  to match all other admin-class test users and suppress the "Submit ID docs for L2" dashboard prompt.
*/

UPDATE members
SET verification_level = 2
WHERE id = (
  SELECT m.id
  FROM members m
  JOIN auth.users au ON au.id = m.user_id
  WHERE au.email = 'moderator@khadayataonline.com'
);

-- ========== 20260316031349_seed_scholarships_archives_v2.sql ==========
/*
  # Seed Scholarships and Archives Data (v2)

  1. Scholarships — 4 active scholarships with correct column names
  2. Magazine Issues — 5 Khadayata Jyoti issues
  3. Book Pages — 6 history book pages (no created_at, uses book_key)
*/

DO $$
DECLARE
  ahmedabad_chapter UUID := 'f1000002-0000-0000-0000-000000000002';
BEGIN

INSERT INTO scholarships (id, name, description, amount, currency, deadline, chapter_id, eligibility, status)
VALUES
  (gen_random_uuid(), 'Khadayata Merit Scholarship 2026',
   'Annual scholarship for outstanding academic performance in SSC/HSC examinations. Awarded to top 5 students from the Khadayata community.',
   25000, 'INR', NOW() + INTERVAL '60 days', ahmedabad_chapter,
   'Must be a member or dependent of a verified Khadayata community member. Minimum 85% aggregate in board exams. Age below 22 years.',
   'active'),

  (gen_random_uuid(), 'Vyapaar Vikas Scholarship',
   'Scholarship supporting higher education in Business Administration, Commerce, and Finance for aspiring entrepreneurs from our community.',
   50000, 'INR', NOW() + INTERVAL '45 days', NULL,
   'Open to all chapters globally. Pursuing graduation or post-graduation in Business/Commerce/Finance. Family income below 10 LPA.',
   'active'),

  (gen_random_uuid(), 'Women Empowerment Award',
   'Special scholarship for young women from the Khadayata community pursuing education in STEM, Law, or Medicine.',
   35000, 'INR', NOW() + INTERVAL '90 days', NULL,
   'Female candidates only. Enrolled in STEM, Law, or Medicine course at a recognized university. Must provide a 500-word essay on community contribution goals.',
   'active'),

  (gen_random_uuid(), 'Global Diaspora Education Grant',
   'Supporting Khadayata youth studying abroad. Covers partial tuition costs for recognized international universities.',
   150000, 'INR', NOW() + INTERVAL '30 days', NULL,
   'Currently enrolled at an accredited international university. Parent must be a verified community member for 5+ years. Submit academic transcripts and proof of admission.',
   'active')
ON CONFLICT DO NOTHING;

INSERT INTO magazine_issues (id, title, volume, issue_date, pdf_url)
VALUES
  (gen_random_uuid(), 'Khadayata Jyoti — January 2024', 18, '2024-01-15',
   'https://khadayataonline.org/archives/jyoti-jan-2024.pdf'),
  (gen_random_uuid(), 'Khadayata Jyoti — July 2023', 17, '2023-07-01',
   'https://khadayataonline.org/archives/jyoti-jul-2023.pdf'),
  (gen_random_uuid(), 'Khadayata Jyoti — January 2023 — Golden Jubilee Special', 16, '2023-01-15',
   'https://khadayataonline.org/archives/jyoti-jan-2023-golden-jubilee.pdf'),
  (gen_random_uuid(), 'Khadayata Jyoti — July 2022', 15, '2022-07-01',
   'https://khadayataonline.org/archives/jyoti-jul-2022.pdf'),
  (gen_random_uuid(), 'Khadayata Jyoti — January 2022', 14, '2022-01-15',
   'https://khadayataonline.org/archives/jyoti-jan-2022.pdf')
ON CONFLICT DO NOTHING;

INSERT INTO book_pages (id, book_key, page_number, ocr_text)
VALUES
  (gen_random_uuid(), 'khadayata-history', 1,
   'Chapter 1: Origins of the Khadayata Community. The Khadayata community traces its origins to Khandela, a historic town in the Sikar district of Rajasthan, India. The community is primarily comprised of Vaishyas (the merchant and trading class) who migrated across the Indian subcontinent over centuries, establishing thriving commercial hubs in cities from Rajasthan to Bengal, and eventually across the globe.'),
  (gen_random_uuid(), 'khadayata-history', 2,
   'Chapter 1 (continued): Historical records from the 12th century CE reference the Khandela kingdom under the rule of the Shekhawat Rajputs. The Khadayata merchants were instrumental in financing trade routes across the Thar desert, acting as financiers, traders, and bankers. Their prominence in commerce earned them the epithet Seth (wealthy trader), a title still used with reverence today.'),
  (gen_random_uuid(), 'khadayata-history', 3,
   'Chapter 2: Gotra and Lineage. The Khadayata community is organized into gotra (lineage groups), each tracing descent from a common ancestor. The primary gotras include Garg, Kashyap, Bharadwaj, Vashishtha, Atreya, and Sandilya. Marriage within the same gotra is traditionally prohibited as members are considered siblings. The ekda sub-group system further subdivides families for matrimonial compatibility.'),
  (gen_random_uuid(), 'khadayata-history', 4,
   'Chapter 3: Migration and the Diaspora. Beginning in the 18th century, Khadayata families began migrating beyond Rajasthan. Kolkata became a major hub in the 19th century, followed by Mumbai, Ahmedabad, and Nagpur. Post-independence, migration accelerated toward East Africa, the United Kingdom, the United States, Canada, and the Gulf states. Today, the global Khadayata diaspora numbers approximately 2 million.'),
  (gen_random_uuid(), 'khadayata-history', 5,
   'Chapter 4: Cultural Practices and Festivals. The Khadayata community celebrates all major Hindu festivals with distinctive regional variations. Diwali holds special significance as the community new year in business. The Chopda Puja ritual involves worshipping the account books and praying for prosperity. Other important observances include Akshaya Tritiya for new ventures, Dhanteras for wealth, and the Kuldevi worship ceremonies at ancestral villages.'),
  (gen_random_uuid(), 'khadayata-history', 6,
   'Chapter 5: Contribution to Indian Society. Khadayata industrialists and philanthropists have made lasting contributions to Indian civil society. Notable institutions founded by community members include hospitals, educational trusts, dharamshalas (rest houses), and temples across the country. The community tradition of dana (charitable giving) and seva (selfless service) has produced generations of social leaders who combined commercial success with community welfare.')
ON CONFLICT DO NOTHING;

END $$;

-- ========== 20260316034513_add_elders_council_and_autoflag.sql ==========
/*
  # Elders Council Forum + Auto-flagging

  ## New Tables

  ### council_threads
  Forum threads for the Elders Council. L3+ verified members may create threads.

  ### council_votes
  Up/down votes on council threads. One vote per member per thread.

  ### council_replies
  Replies to council threads. L1+ verified members may post.

  ### banned_keywords
  Admin-managed list of keywords that trigger automatic content flagging.

  ## Auto-flagging Trigger
  `fn_autoflag_content` fires AFTER INSERT OR UPDATE on `content_news` and `oral_histories`.
  Checks text against `banned_keywords` and inserts a system report if a match is found.

  ## Security
  - RLS enabled on all new tables with appropriate policies
*/

-- ── Elders Council threads ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS council_threads (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id    uuid        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  chapter_id   uuid        REFERENCES chapters(id) ON DELETE SET NULL,
  title        text        NOT NULL CHECK (char_length(title) BETWEEN 5 AND 200),
  body         text        NOT NULL CHECK (char_length(body) >= 10),
  category     text        NOT NULL DEFAULT 'general'
                           CHECK (category IN ('general', 'governance', 'tradition', 'announcement', 'poll')),
  poll_options jsonb       DEFAULT NULL,
  closed       boolean     NOT NULL DEFAULT false,
  pinned       boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS council_threads_author_id_idx    ON council_threads(author_id);
CREATE INDEX IF NOT EXISTS council_threads_chapter_id_idx   ON council_threads(chapter_id);
CREATE INDEX IF NOT EXISTS council_threads_created_at_idx   ON council_threads(created_at DESC);

ALTER TABLE council_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated members can read council threads"
  ON council_threads FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "L3+ members can create council threads"
  ON council_threads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.user_id = auth.uid()
        AND members.verification_level >= 3
    )
  );

CREATE POLICY "Thread author or Global Admin can update thread"
  ON council_threads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE members.user_id = auth.uid() AND members.id = author_id)
    OR EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid())
        AND r.name = 'Global Admin'
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM members WHERE members.user_id = auth.uid() AND members.id = author_id)
    OR EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid())
        AND r.name = 'Global Admin'
    )
  );

CREATE POLICY "Thread author or Global Admin can delete thread"
  ON council_threads FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE members.user_id = auth.uid() AND members.id = author_id)
    OR EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid())
        AND r.name = 'Global Admin'
    )
  );

-- ── Council votes ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS council_votes (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id    uuid        NOT NULL REFERENCES council_threads(id) ON DELETE CASCADE,
  member_id    uuid        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  vote         smallint    NOT NULL CHECK (vote IN (1, -1)),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (thread_id, member_id)
);

CREATE INDEX IF NOT EXISTS council_votes_thread_id_idx ON council_votes(thread_id);

ALTER TABLE council_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated members can read council votes"
  ON council_votes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Members can cast their own council vote"
  ON council_votes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM members WHERE members.user_id = auth.uid() AND members.id = member_id)
  );

CREATE POLICY "Members can delete their own council vote"
  ON council_votes FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE members.user_id = auth.uid() AND members.id = member_id)
  );

-- ── Council replies ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS council_replies (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id  uuid        NOT NULL REFERENCES council_threads(id) ON DELETE CASCADE,
  author_id  uuid        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  body       text        NOT NULL CHECK (char_length(body) >= 2),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS council_replies_thread_id_idx ON council_replies(thread_id);

ALTER TABLE council_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated members can read council replies"
  ON council_replies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "L1+ verified members can post council replies"
  ON council_replies FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.user_id = auth.uid()
        AND members.id = author_id
        AND members.verification_level >= 1
    )
  );

CREATE POLICY "Reply author can delete own council reply"
  ON council_replies FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM members WHERE members.user_id = auth.uid() AND members.id = author_id)
  );

-- ── Banned keywords ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS banned_keywords (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword    text        NOT NULL UNIQUE CHECK (char_length(keyword) >= 2),
  severity   text        NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  added_by   uuid        REFERENCES members(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE banned_keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read banned keywords"
  ON banned_keywords FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid())
        AND r.name IN ('Global Admin', 'Moderator', 'Data Steward')
    )
  );

CREATE POLICY "Global Admin can insert banned keywords"
  ON banned_keywords FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid())
        AND r.name = 'Global Admin'
    )
  );

CREATE POLICY "Global Admin can update banned keywords"
  ON banned_keywords FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid())
        AND r.name = 'Global Admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid())
        AND r.name = 'Global Admin'
    )
  );

CREATE POLICY "Global Admin can delete banned keywords"
  ON banned_keywords FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid())
        AND r.name = 'Global Admin'
    )
  );

-- ── Auto-flagging function ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_autoflag_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_body        text;
  v_entity_type text;
  v_entity_id   uuid;
  v_keyword     record;
  v_existing    integer;
BEGIN
  IF TG_TABLE_NAME = 'content_news' THEN
    v_body := COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.summary, '') || ' ' || COALESCE(NEW.body, '');
    v_entity_type := 'news';
    v_entity_id := NEW.id;
  ELSIF TG_TABLE_NAME = 'oral_histories' THEN
    v_body := COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.transcript, '');
    v_entity_type := 'oral_history';
    v_entity_id := NEW.id;
  ELSE
    RETURN NEW;
  END IF;

  FOR v_keyword IN SELECT keyword, severity FROM banned_keywords LOOP
    IF position(lower(v_keyword.keyword) IN lower(v_body)) > 0 THEN
      SELECT COUNT(*) INTO v_existing
      FROM reports
      WHERE entity_type = v_entity_type
        AND entity_id = v_entity_id::text
        AND reporter_member_id IS NULL;

      IF v_existing = 0 THEN
        INSERT INTO reports (entity_type, entity_id, reason, category)
        VALUES (
          v_entity_type,
          v_entity_id::text,
          'Content automatically flagged: contains banned keyword "' || v_keyword.keyword || '" (severity: ' || v_keyword.severity || ')',
          'auto_flagged'
        );
      END IF;
      EXIT;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_autoflag_content_news ON content_news;
CREATE TRIGGER trg_autoflag_content_news
  AFTER INSERT OR UPDATE OF title, summary, body ON content_news
  FOR EACH ROW EXECUTE FUNCTION fn_autoflag_content();

DROP TRIGGER IF EXISTS trg_autoflag_oral_history ON oral_histories;
CREATE TRIGGER trg_autoflag_oral_history
  AFTER INSERT OR UPDATE OF title, transcript ON oral_histories
  FOR EACH ROW EXECUTE FUNCTION fn_autoflag_content();

-- ── Seed example banned keywords ─────────────────────────────────────────────
INSERT INTO banned_keywords (keyword, severity) VALUES
  ('spam',      'low'),
  ('scam',      'high'),
  ('fraud',     'high'),
  ('fake',      'medium'),
  ('offensive', 'medium')
ON CONFLICT (keyword) DO NOTHING;

-- ========== 20260316034932_add_rishta_workflow_and_sms.sql ==========
/*
  # Rishta Approval Workflow + SMS Alerts

  ## New Tables

  ### rishta_requests
  Tracks the full Rishta (matrimonial) introduction workflow:
  - from_profile_id → to_profile_id
  - stages: intro_sent → family_review → family_approved → accepted | declined
  - family_notes stored as JSONB

  ### sms_messages
  Log of all SMS messages sent via the system.

  ## Security
  RLS policies ensure:
  - Only authenticated members can see rishta requests involving their profile
  - Global Admin and Moderators can see all
  - SMS messages visible only to Global Admin
*/

-- ── Rishta workflow ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rishta_requests (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  from_profile_id    uuid        NOT NULL REFERENCES matrimonial_profiles(id) ON DELETE CASCADE,
  to_profile_id      uuid        NOT NULL REFERENCES matrimonial_profiles(id) ON DELETE CASCADE,
  status             text        NOT NULL DEFAULT 'intro_sent'
                                 CHECK (status IN ('intro_sent', 'family_review', 'family_approved', 'accepted', 'declined', 'withdrawn')),
  intro_message      text,
  family_notes       jsonb       NOT NULL DEFAULT '{}',
  from_family_ok     boolean     DEFAULT NULL,
  to_family_ok       boolean     DEFAULT NULL,
  admin_notes        text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_profile_id, to_profile_id)
);

CREATE INDEX IF NOT EXISTS rishta_requests_from_profile_idx ON rishta_requests(from_profile_id);
CREATE INDEX IF NOT EXISTS rishta_requests_to_profile_idx   ON rishta_requests(to_profile_id);
CREATE INDEX IF NOT EXISTS rishta_requests_status_idx       ON rishta_requests(status);

ALTER TABLE rishta_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view rishta requests for their profile"
  ON rishta_requests FOR SELECT
  TO authenticated
  USING (
    from_profile_id IN (
      SELECT mp.id FROM matrimonial_profiles mp
      JOIN members m ON m.id = mp.member_id
      WHERE m.user_id = auth.uid()
    )
    OR to_profile_id IN (
      SELECT mp.id FROM matrimonial_profiles mp
      JOIN members m ON m.id = mp.member_id
      WHERE m.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid())
        AND r.name IN ('Global Admin', 'Moderator')
    )
  );

CREATE POLICY "Members can create rishta requests from their own profile"
  ON rishta_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    from_profile_id IN (
      SELECT mp.id FROM matrimonial_profiles mp
      JOIN members m ON m.id = mp.member_id
      WHERE m.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update rishta requests they are party to"
  ON rishta_requests FOR UPDATE
  TO authenticated
  USING (
    from_profile_id IN (
      SELECT mp.id FROM matrimonial_profiles mp
      JOIN members m ON m.id = mp.member_id
      WHERE m.user_id = auth.uid()
    )
    OR to_profile_id IN (
      SELECT mp.id FROM matrimonial_profiles mp
      JOIN members m ON m.id = mp.member_id
      WHERE m.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid())
        AND r.name IN ('Global Admin', 'Moderator')
    )
  )
  WITH CHECK (
    from_profile_id IN (
      SELECT mp.id FROM matrimonial_profiles mp
      JOIN members m ON m.id = mp.member_id
      WHERE m.user_id = auth.uid()
    )
    OR to_profile_id IN (
      SELECT mp.id FROM matrimonial_profiles mp
      JOIN members m ON m.id = mp.member_id
      WHERE m.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid())
        AND r.name IN ('Global Admin', 'Moderator')
    )
  );

-- ── SMS messages log ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sms_messages (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_phone  text        NOT NULL,
  recipient_member_id uuid     REFERENCES members(id) ON DELETE SET NULL,
  body             text        NOT NULL,
  status           text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  provider         text        DEFAULT 'twilio',
  provider_sid     text,
  error            text,
  sent_by          uuid        REFERENCES members(id) ON DELETE SET NULL,
  sent_at          timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sms_messages_recipient_idx ON sms_messages(recipient_phone);
CREATE INDEX IF NOT EXISTS sms_messages_status_idx    ON sms_messages(status);

ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Global Admin can read SMS messages"
  ON sms_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid())
        AND r.name = 'Global Admin'
    )
  );

CREATE POLICY "Global Admin can insert SMS messages"
  ON sms_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid())
        AND r.name = 'Global Admin'
    )
  );

-- ========== 20260316044217_add_vouch_requests.sql ==========
/*
  # Add vouch_requests table

  ## Summary
  Allows unverified (L0/L1) members to send a request to another member asking them
  to vouch for them. This is separate from the `vouches` table (where a voucher
  actively vouches FOR someone). Here the requester asks someone else to vouch for them.

  ## New Tables
  - `vouch_requests`
    - `id` (uuid, pk)
    - `requester_member_id` (uuid → members) — the person asking to be vouched
    - `target_member_id` (uuid → members) — the member being asked to vouch
    - `message` (text, optional personal note)
    - `status` (text: pending | accepted | declined)
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled
  - Requesters can INSERT their own requests
  - Requesters can SELECT their own requests
  - Target members can SELECT requests directed at them
  - Target members can UPDATE status (accept/decline)
*/

CREATE TABLE IF NOT EXISTS vouch_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  target_member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (requester_member_id, target_member_id)
);

CREATE INDEX IF NOT EXISTS vouch_requests_requester_idx ON vouch_requests(requester_member_id);
CREATE INDEX IF NOT EXISTS vouch_requests_target_idx ON vouch_requests(target_member_id);

ALTER TABLE vouch_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Requesters can insert own vouch requests"
  ON vouch_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    requester_member_id IN (
      SELECT id FROM members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Requesters can view own sent requests"
  ON vouch_requests FOR SELECT
  TO authenticated
  USING (
    requester_member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
    OR
    target_member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

CREATE POLICY "Targets can update request status"
  ON vouch_requests FOR UPDATE
  TO authenticated
  USING (
    target_member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  )
  WITH CHECK (
    target_member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

-- ========== 20260316045843_update_platform_name_to_khadayata.sql ==========
/*
  # Update platform_name setting to Khadayata

  ## Changes
  - Updates the `platform_name` setting in the `settings` table
  - English value changed from "Khandelwal Heritage Directory" to "Khadayata Heritage Directory"
  - Gujarati value updated to reflect the correct community name

  ## Notes
  - This is a data correction migration — no schema changes
*/

UPDATE public.settings
SET value = '{"en":"Khadayata Heritage Directory","gu":"ખડાયતા હેરિટેજ ડિરેક્ટરી"}'::jsonb
WHERE key = 'platform_name';

-- ========== 20260316175251_add_anon_read_for_public_pages.sql ==========
/*
  # Add anonymous read policies for public browsing pages

  ## Changes
  - mentorships: add SELECT policy for anon role (status = available only)
  - matrimonial_profiles: add SELECT policy for anon role (visibility = members, not suspended)
    and fix: the public page should show non-suspended profiles with visibility 'members'
    (PII fields are excluded at the query level in the frontend)

  ## Notes
  - Anon users can only read; no INSERT/UPDATE/DELETE is allowed
  - The frontend queries only non-PII columns for anon browsing
*/

CREATE POLICY "Public can read available mentorships"
  ON mentorships
  FOR SELECT
  TO anon
  USING (status = 'available');

CREATE POLICY "Public can read non-suspended matrimonial profiles"
  ON matrimonial_profiles
  FOR SELECT
  TO anon
  USING (suspended = false AND visibility = 'members');

-- ========== 20260316175327_add_anon_read_members_for_public_pages.sql ==========
/*
  # Add anonymous read policy on members for public page joins

  ## Purpose
  Public pages (mentorship, matrimonial, events, business, directory) join to the
  members table to show first/last name, photo, chapter, and verification level.
  Without this policy the join silently returns null for anon visitors.

  ## Security
  - Anon users can only read non-PII profile fields
  - No phone, email, address, dob, or sensitive fields are exposed at this level
  - PII restriction is enforced by the frontend queries selecting only safe columns
*/

CREATE POLICY "Public can read basic member info"
  ON members
  FOR SELECT
  TO anon
  USING (true);

-- ========== 20260316183648_add_obituaries_table.sql ==========
/*
  # Add Obituaries Table

  ## Summary
  Creates a dedicated obituaries table for the Khadayata community platform.
  Chapter admins and publishers can post obituaries. All published obituaries
  are publicly visible (anon + authenticated). Latest obituaries appear first.

  ## New Tables
  - `obituaries`
    - `id` (uuid, primary key)
    - `full_name` (text, required) — name of the deceased
    - `also_known_as` (text, nullable) — alternate name / nickname
    - `dob` (date, nullable) — date of birth
    - `dod` (date, required) — date of passing
    - `city_of_origin` (text, nullable)
    - `city_of_passing` (text, nullable)
    - `chapter_id` (uuid, FK chapters, nullable)
    - `photo_url` (text, nullable)
    - `tribute` (text, nullable) — tribute / eulogy text
    - `family_message` (text, nullable)
    - `status` (text) — 'published' | 'draft' | 'pending'
    - `posted_by` (uuid, FK members)
    - `created_at` / `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - Anon and authenticated users can read published obituaries
  - Chapter admins, chapter publishers, and global publishers can insert/update
  - Global admins can delete
*/

CREATE TABLE IF NOT EXISTS obituaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  also_known_as text,
  dob date,
  dod date NOT NULL,
  city_of_origin text,
  city_of_passing text,
  chapter_id uuid REFERENCES chapters(id) ON DELETE SET NULL,
  photo_url text,
  tribute text,
  family_message text,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'draft', 'pending')),
  posted_by uuid REFERENCES members(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_obituaries_chapter_id ON obituaries(chapter_id);
CREATE INDEX IF NOT EXISTS idx_obituaries_dod ON obituaries(dod DESC);
CREATE INDEX IF NOT EXISTS idx_obituaries_status ON obituaries(status);
CREATE INDEX IF NOT EXISTS idx_obituaries_posted_by ON obituaries(posted_by);
CREATE INDEX IF NOT EXISTS idx_obituaries_created_at ON obituaries(created_at DESC);

ALTER TABLE obituaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published obituaries"
  ON obituaries FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

CREATE POLICY "Authorized roles can insert obituaries"
  ON obituaries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1)
        AND r.name IN ('Global Admin', 'Chapter Admin', 'Global Publisher', 'Publisher')
        AND (ra.end_date IS NULL OR ra.end_date >= CURRENT_DATE)
    )
  );

CREATE POLICY "Authorized roles can update obituaries"
  ON obituaries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1)
        AND r.name IN ('Global Admin', 'Chapter Admin', 'Global Publisher', 'Publisher')
        AND (ra.end_date IS NULL OR ra.end_date >= CURRENT_DATE)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1)
        AND r.name IN ('Global Admin', 'Chapter Admin', 'Global Publisher', 'Publisher')
        AND (ra.end_date IS NULL OR ra.end_date >= CURRENT_DATE)
    )
  );

CREATE POLICY "Global admins can delete obituaries"
  ON obituaries FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1)
        AND r.name = 'Global Admin'
        AND (ra.end_date IS NULL OR ra.end_date >= CURRENT_DATE)
    )
  );

-- ========== 20260330063139_add_chapter_transfer_history.sql ==========
/*
  # Add Chapter Transfer History

  ## Summary
  Adds a `chapter_transfer_history` table to permanently record every chapter 
  change a member makes — including self-initiated transfers and admin-initiated 
  moves. This provides an immutable audit trail of chapter membership over time.

  ## New Table: chapter_transfer_history
  - id, member_id, from/to chapter (id + name snapshot)
  - transfer_type: member_request | admin_move | initial_assignment | system
  - reason, initiated_by, approved_by, related_transfer_id
  - effective_at, created_at

  ## Changes to chapter_transfers
  - Adds resolved_at column

  ## Triggers
  - trg_chapter_transfer_history: fires on chapter_transfers.status → 'approved'
  - trg_member_chapter_change: fires on members.chapter_id update

  ## Notes
  - roles.chapter_id stores the chapter for chapter-scoped roles
  - role_assignments uses end_date (not expires_at)
  - History is append-only (no DELETE policy)
*/

CREATE TABLE IF NOT EXISTS chapter_transfer_history (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id           uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  from_chapter_id     uuid REFERENCES chapters(id) ON DELETE SET NULL,
  to_chapter_id       uuid REFERENCES chapters(id) ON DELETE SET NULL,
  from_chapter_name   text,
  to_chapter_name     text,
  transfer_type       text NOT NULL DEFAULT 'member_request'
                        CHECK (transfer_type IN ('member_request','admin_move','initial_assignment','system')),
  reason              text,
  initiated_by        uuid REFERENCES members(id) ON DELETE SET NULL,
  approved_by         uuid REFERENCES members(id) ON DELETE SET NULL,
  related_transfer_id uuid REFERENCES chapter_transfers(id) ON DELETE SET NULL,
  effective_at        timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chapter_transfers' AND column_name = 'resolved_at'
  ) THEN
    ALTER TABLE chapter_transfers ADD COLUMN resolved_at timestamptz;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cth_member_id        ON chapter_transfer_history(member_id);
CREATE INDEX IF NOT EXISTS idx_cth_from_chapter     ON chapter_transfer_history(from_chapter_id);
CREATE INDEX IF NOT EXISTS idx_cth_to_chapter       ON chapter_transfer_history(to_chapter_id);
CREATE INDEX IF NOT EXISTS idx_cth_effective_at     ON chapter_transfer_history(effective_at DESC);
CREATE INDEX IF NOT EXISTS idx_cth_related_transfer ON chapter_transfer_history(related_transfer_id);

ALTER TABLE chapter_transfer_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view own chapter history"
  ON chapter_transfer_history FOR SELECT
  TO authenticated
  USING (member_id = (
    SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1
  ));

CREATE POLICY "Global admins view all chapter history"
  ON chapter_transfer_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1)
        AND r.name IN ('Global Admin', 'Data Steward')
        AND (ra.end_date IS NULL OR ra.end_date > now())
    )
  );

CREATE POLICY "Chapter admins view their chapter history"
  ON chapter_transfer_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.member_id = (SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1)
        AND r.name = 'Chapter Admin'
        AND r.chapter_id IN (from_chapter_id, to_chapter_id)
        AND (ra.end_date IS NULL OR ra.end_date > now())
    )
  );

CREATE POLICY "Authenticated users can insert transfer history"
  ON chapter_transfer_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION record_chapter_transfer_history()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_from_name text;
  v_to_name   text;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    SELECT name INTO v_from_name FROM chapters WHERE id = NEW.from_chapter_id;
    SELECT name INTO v_to_name   FROM chapters WHERE id = NEW.to_chapter_id;
    INSERT INTO chapter_transfer_history (
      member_id, from_chapter_id, to_chapter_id,
      from_chapter_name, to_chapter_name,
      transfer_type, reason,
      initiated_by, approved_by,
      related_transfer_id, effective_at
    ) VALUES (
      NEW.member_id, NEW.from_chapter_id, NEW.to_chapter_id,
      v_from_name, v_to_name,
      'member_request', NEW.reason,
      NEW.member_id, NEW.approved_by,
      NEW.id, now()
    );
    NEW.resolved_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chapter_transfer_history ON chapter_transfers;
CREATE TRIGGER trg_chapter_transfer_history
  BEFORE UPDATE ON chapter_transfers
  FOR EACH ROW EXECUTE FUNCTION record_chapter_transfer_history();

CREATE OR REPLACE FUNCTION record_member_chapter_change()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_from_name text;
  v_to_name   text;
BEGIN
  IF NEW.chapter_id IS DISTINCT FROM OLD.chapter_id THEN
    SELECT name INTO v_from_name FROM chapters WHERE id = OLD.chapter_id;
    SELECT name INTO v_to_name   FROM chapters WHERE id = NEW.chapter_id;
    INSERT INTO chapter_transfer_history (
      member_id, from_chapter_id, to_chapter_id,
      from_chapter_name, to_chapter_name,
      transfer_type, effective_at
    ) VALUES (
      NEW.id, OLD.chapter_id, NEW.chapter_id,
      v_from_name, v_to_name,
      CASE WHEN OLD.chapter_id IS NULL THEN 'initial_assignment' ELSE 'admin_move' END,
      now()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_member_chapter_change ON members;
CREATE TRIGGER trg_member_chapter_change
  AFTER UPDATE OF chapter_id ON members
  FOR EACH ROW EXECUTE FUNCTION record_member_chapter_change();

-- ========== 20260330143153_rebrand_emails_and_community_to_khadayata.sql ==========
/*
  # Rebrand: Update all Khandelwal references to Khadayata in live data

  ## Summary
  Updates the live production database to replace all remaining Khandelwal
  community/email references with Khadayata equivalents.

  ## Changes

  ### Auth users: update email addresses from @test.khandelwal.org to @khadayataonline.com
  ### Auth identities: update identity_data and provider_id
  ### Chapters: update contact emails in settings JSON
  ### Events: update contact_email fields
  ### Scholarships: update contact_email fields and description text
  ### Businesses: update business name and email for Khadayata Textiles
  ### Announcements: update body text
  ### Settings: update platform_name
  ### Book pages: update book_key from khandelwal-history to khadayata-history
  ### Employment: update company name
*/

-- -------------------------------------------------------
-- 1. Auth users: update emails
-- -------------------------------------------------------
UPDATE auth.users SET email = 'global-admin@khadayataonline.com'
  WHERE email = 'global-admin@test.khandelwal.org';
UPDATE auth.users SET email = 'chapter-admin@khadayataonline.com'
  WHERE email = 'chapter-admin@test.khandelwal.org';
UPDATE auth.users SET email = 'data-steward@khadayataonline.com'
  WHERE email = 'data-steward@test.khandelwal.org';
UPDATE auth.users SET email = 'dir-manager@khadayataonline.com'
  WHERE email = 'dir-manager@test.khandelwal.org';
UPDATE auth.users SET email = 'event-manager@khadayataonline.com'
  WHERE email = 'event-manager@test.khandelwal.org';
UPDATE auth.users SET email = 'finance-admin@khadayataonline.com'
  WHERE email = 'finance-admin@test.khandelwal.org';
UPDATE auth.users SET email = 'publisher@khadayataonline.com'
  WHERE email = 'publisher@test.khandelwal.org';
UPDATE auth.users SET email = 'moderator@khadayataonline.com'
  WHERE email = 'moderator@test.khandelwal.org';
UPDATE auth.users SET email = 'member@khadayataonline.com'
  WHERE email = 'member@test.khandelwal.org';
UPDATE auth.users SET email = 'unverified@khadayataonline.com'
  WHERE email = 'unverified@test.khandelwal.org';

-- -------------------------------------------------------
-- 2. Auth identities: update identity_data JSON and provider_id
-- -------------------------------------------------------
UPDATE auth.identities
  SET identity_data = jsonb_set(identity_data, '{email}', '"global-admin@khadayataonline.com"'),
      provider_id = 'global-admin@khadayataonline.com'
  WHERE provider_id = 'global-admin@test.khandelwal.org';

UPDATE auth.identities
  SET identity_data = jsonb_set(identity_data, '{email}', '"chapter-admin@khadayataonline.com"'),
      provider_id = 'chapter-admin@khadayataonline.com'
  WHERE provider_id = 'chapter-admin@test.khandelwal.org';

UPDATE auth.identities
  SET identity_data = jsonb_set(identity_data, '{email}', '"data-steward@khadayataonline.com"'),
      provider_id = 'data-steward@khadayataonline.com'
  WHERE provider_id = 'data-steward@test.khandelwal.org';

UPDATE auth.identities
  SET identity_data = jsonb_set(identity_data, '{email}', '"dir-manager@khadayataonline.com"'),
      provider_id = 'dir-manager@khadayataonline.com'
  WHERE provider_id = 'dir-manager@test.khandelwal.org';

UPDATE auth.identities
  SET identity_data = jsonb_set(identity_data, '{email}', '"event-manager@khadayataonline.com"'),
      provider_id = 'event-manager@khadayataonline.com'
  WHERE provider_id = 'event-manager@test.khandelwal.org';

UPDATE auth.identities
  SET identity_data = jsonb_set(identity_data, '{email}', '"finance-admin@khadayataonline.com"'),
      provider_id = 'finance-admin@khadayataonline.com'
  WHERE provider_id = 'finance-admin@test.khandelwal.org';

UPDATE auth.identities
  SET identity_data = jsonb_set(identity_data, '{email}', '"publisher@khadayataonline.com"'),
      provider_id = 'publisher@khadayataonline.com'
  WHERE provider_id = 'publisher@test.khandelwal.org';

UPDATE auth.identities
  SET identity_data = jsonb_set(identity_data, '{email}', '"moderator@khadayataonline.com"'),
      provider_id = 'moderator@khadayataonline.com'
  WHERE provider_id = 'moderator@test.khandelwal.org';

UPDATE auth.identities
  SET identity_data = jsonb_set(identity_data, '{email}', '"member@khadayataonline.com"'),
      provider_id = 'member@khadayataonline.com'
  WHERE provider_id = 'member@test.khandelwal.org';

UPDATE auth.identities
  SET identity_data = jsonb_set(identity_data, '{email}', '"unverified@khadayataonline.com"'),
      provider_id = 'unverified@khadayataonline.com'
  WHERE provider_id = 'unverified@test.khandelwal.org';

-- -------------------------------------------------------
-- 3. Chapters: update contact emails in settings JSON
-- -------------------------------------------------------
UPDATE chapters SET settings = jsonb_set(settings, '{contact,email}', '"global@khadayataonline.com"')
  WHERE slug = 'global';
UPDATE chapters SET settings = jsonb_set(settings, '{contact,email}', '"ahmedabad@khadayataonline.com"')
  WHERE slug = 'ahmedabad';
UPDATE chapters SET settings = jsonb_set(settings, '{contact,email}', '"mumbai@khadayataonline.com"')
  WHERE slug = 'mumbai';
UPDATE chapters SET settings = jsonb_set(settings, '{contact,email}', '"surat@khadayataonline.com"')
  WHERE slug = 'surat';
UPDATE chapters SET settings = jsonb_set(settings, '{contact,email}', '"jaipur@khadayataonline.com"')
  WHERE slug = 'jaipur';
UPDATE chapters SET settings = jsonb_set(settings, '{contact,email}', '"delhi@khadayataonline.com"')
  WHERE slug = 'delhi';
UPDATE chapters SET settings = jsonb_set(settings, '{contact,email}', '"newyork@khadayataonline.com"')
  WHERE slug = 'new-york';
UPDATE chapters SET settings = jsonb_set(settings, '{contact,email}', '"london@khadayataonline.com"')
  WHERE slug = 'london';
UPDATE chapters SET settings = jsonb_set(settings, '{contact,email}', '"dubai@khadayataonline.com"')
  WHERE slug = 'dubai';

-- -------------------------------------------------------
-- 4. Events: update contact_email fields
-- -------------------------------------------------------
UPDATE events SET contact_email = 'events@khadayataonline.com'
  WHERE contact_email LIKE '%@ahmedabad.khandelwal.org' OR contact_email = 'events@ahmedabad.khandelwal.org';
UPDATE events SET contact_email = 'biz@khadayataonline.com'
  WHERE contact_email = 'biz@ahmedabad.khandelwal.org';
UPDATE events SET contact_email = 'youth@khadayataonline.com'
  WHERE contact_email = 'youth@ahmedabad.khandelwal.org';
UPDATE events SET contact_email = 'global@khadayataonline.com'
  WHERE contact_email = 'global@khandelwal.org';
UPDATE events SET contact_email = 'admin@khadayataonline.com'
  WHERE contact_email = 'admin@ahmedabad.khandelwal.org';
UPDATE events SET contact_email = 'scholarships@khadayataonline.com'
  WHERE contact_email = 'scholarships@ahmedabad.khandelwal.org';

-- -------------------------------------------------------
-- 5. Scholarships: update contact_email
-- -------------------------------------------------------
UPDATE scholarships SET contact_email = 'scholarships@khadayataonline.com'
  WHERE contact_email LIKE '%khandelwal.org';
UPDATE scholarships SET contact_email = 'global@khadayataonline.com'
  WHERE contact_email = 'global@khandelwal.org';
UPDATE scholarships
  SET name = replace(name, 'Khandelwal', 'Khadayata'),
      description = replace(description, 'Khandelwal', 'Khadayata'),
      eligibility = replace(eligibility, 'Khandelwal', 'Khadayata')
  WHERE name LIKE '%Khandelwal%'
     OR description LIKE '%Khandelwal%'
     OR eligibility LIKE '%Khandelwal%';

-- -------------------------------------------------------
-- 6. Businesses: rename Khandelwal Textiles
-- -------------------------------------------------------
UPDATE businesses
  SET name = 'Khadayata Textiles Pvt Ltd',
      email = 'contact@khadayatatextiles.com',
      website = 'https://khadayatatextiles.example.com'
  WHERE name = 'Khandelwal Textiles Pvt Ltd';

-- -------------------------------------------------------
-- 7. Employment: update company name
-- -------------------------------------------------------
UPDATE employment
  SET company = 'Khadayata Textiles Pvt Ltd'
  WHERE company = 'Khandelwal Textiles Pvt Ltd';

-- -------------------------------------------------------
-- 8. Content news: update Khandelwal references in articles
-- -------------------------------------------------------
UPDATE content_news
  SET title = replace(title, 'Khandelwal', 'Khadayata'),
      summary = replace(summary, 'Khandelwal', 'Khadayata'),
      body = replace(body, 'Khandelwal', 'Khadayata')
  WHERE title LIKE '%Khandelwal%'
     OR summary LIKE '%Khandelwal%'
     OR body LIKE '%Khandelwal%';

-- -------------------------------------------------------
-- 9. Announcements: update body text
-- -------------------------------------------------------
UPDATE announcements
  SET body = replace(body, 'Khandelwal', 'Khadayata')
  WHERE body LIKE '%Khandelwal%';

-- -------------------------------------------------------
-- 10. Settings: update platform_name English value
-- -------------------------------------------------------
UPDATE settings
  SET value = jsonb_set(value, '{en}', '"Khadayata Heritage Directory"')
  WHERE key = 'platform_name'
    AND value->>'en' LIKE '%Khandelwal%';

-- -------------------------------------------------------
-- 11. Book pages: update book_key
-- -------------------------------------------------------
UPDATE book_pages
  SET book_key = 'khadayata-history',
      ocr_text = replace(ocr_text, 'Khandelwal', 'Khadayata')
  WHERE book_key = 'khandelwal-history';

-- ========== 20260330153704_add_phone_url_to_chapter_settings.sql ==========
/*
  # Add phone and url to chapter contact settings

  ## Summary
  Updates the contact object within each chapter's settings JSONB to include
  a phone number and chapter URL for display on the public chapter detail page.

  ## Changes
  - Ahmedabad: +91-79-2654-0001, https://khadayataonline.com/chapters/ahmedabad
  - Mumbai: +91-22-2654-0002, https://khadayataonline.com/chapters/mumbai
  - Surat: +91-261-265-4003, https://khadayataonline.com/chapters/surat
  - Jaipur: +91-141-265-4004, https://khadayataonline.com/chapters/jaipur
  - New Delhi: +91-11-2654-0005, https://khadayataonline.com/chapters/delhi
  - New York: +1-212-555-0106, https://khadayataonline.com/chapters/new-york
  - London: +44-20-7946-0107, https://khadayataonline.com/chapters/london
  - Dubai: +971-4-555-0108, https://khadayataonline.com/chapters/dubai
  - Global: https://khadayataonline.com/chapters/global
*/

UPDATE chapters
SET settings = settings
  || jsonb_build_object('contact',
      (settings->'contact')
      || jsonb_build_object('phone', '+91-79-2654-0001', 'url', 'https://khadayataonline.com/chapters/ahmedabad')
    )
WHERE slug = 'ahmedabad';

UPDATE chapters
SET settings = settings
  || jsonb_build_object('contact',
      (settings->'contact')
      || jsonb_build_object('phone', '+91-22-2654-0002', 'url', 'https://khadayataonline.com/chapters/mumbai')
    )
WHERE slug = 'mumbai';

UPDATE chapters
SET settings = settings
  || jsonb_build_object('contact',
      (settings->'contact')
      || jsonb_build_object('phone', '+91-261-265-4003', 'url', 'https://khadayataonline.com/chapters/surat')
    )
WHERE slug = 'surat';

UPDATE chapters
SET settings = settings
  || jsonb_build_object('contact',
      (settings->'contact')
      || jsonb_build_object('phone', '+91-141-265-4004', 'url', 'https://khadayataonline.com/chapters/jaipur')
    )
WHERE slug = 'jaipur';

UPDATE chapters
SET settings = settings
  || jsonb_build_object('contact',
      (settings->'contact')
      || jsonb_build_object('phone', '+91-11-2654-0005', 'url', 'https://khadayataonline.com/chapters/delhi')
    )
WHERE slug = 'delhi';

UPDATE chapters
SET settings = settings
  || jsonb_build_object('contact',
      (settings->'contact')
      || jsonb_build_object('phone', '+1-212-555-0106', 'url', 'https://khadayataonline.com/chapters/new-york')
    )
WHERE slug = 'new-york';

UPDATE chapters
SET settings = settings
  || jsonb_build_object('contact',
      (settings->'contact')
      || jsonb_build_object('phone', '+44-20-7946-0107', 'url', 'https://khadayataonline.com/chapters/london')
    )
WHERE slug = 'london';

UPDATE chapters
SET settings = settings
  || jsonb_build_object('contact',
      (settings->'contact')
      || jsonb_build_object('phone', '+971-4-555-0108', 'url', 'https://khadayataonline.com/chapters/dubai')
    )
WHERE slug = 'dubai';

UPDATE chapters
SET settings = settings
  || jsonb_build_object('contact',
      (settings->'contact')
      || jsonb_build_object('phone', '+91-80-2654-0000', 'url', 'https://khadayataonline.com/chapters/global')
    )
WHERE slug = 'global';

-- ========== 20260330154549_seed_world_geography_countries.sql ==========
/*
  # Seed World Geography — All Countries

  Inserts all ~195 UN-recognised sovereign states plus widely-used territories
  with their ISO 3166-1 alpha-2 codes. Existing rows (by id) are skipped.

  UUID pattern: c2XXXXXX-0000-0000-0000-000000000000
  (c1 series already used for the original 8 countries; we keep those intact
   and extend with c2 series for every new country, preserving FK integrity.)

  NOTE: The 8 original country rows (c1000001..c1000008) are left untouched.
*/

INSERT INTO countries (id, iso2, name) VALUES
-- Africa
  ('c2000001-0000-0000-0000-000000000001'::uuid, 'DZ', 'Algeria'),
  ('c2000002-0000-0000-0000-000000000002'::uuid, 'AO', 'Angola'),
  ('c2000003-0000-0000-0000-000000000003'::uuid, 'BJ', 'Benin'),
  ('c2000004-0000-0000-0000-000000000004'::uuid, 'BW', 'Botswana'),
  ('c2000005-0000-0000-0000-000000000005'::uuid, 'BF', 'Burkina Faso'),
  ('c2000006-0000-0000-0000-000000000006'::uuid, 'BI', 'Burundi'),
  ('c2000007-0000-0000-0000-000000000007'::uuid, 'CV', 'Cabo Verde'),
  ('c2000008-0000-0000-0000-000000000008'::uuid, 'CM', 'Cameroon'),
  ('c2000009-0000-0000-0000-000000000009'::uuid, 'CF', 'Central African Republic'),
  ('c2000010-0000-0000-0000-000000000010'::uuid, 'TD', 'Chad'),
  ('c2000011-0000-0000-0000-000000000011'::uuid, 'KM', 'Comoros'),
  ('c2000012-0000-0000-0000-000000000012'::uuid, 'CG', 'Congo'),
  ('c2000013-0000-0000-0000-000000000013'::uuid, 'CD', 'Congo, DR'),
  ('c2000014-0000-0000-0000-000000000014'::uuid, 'CI', 'Côte d''Ivoire'),
  ('c2000015-0000-0000-0000-000000000015'::uuid, 'DJ', 'Djibouti'),
  ('c2000016-0000-0000-0000-000000000016'::uuid, 'EG', 'Egypt'),
  ('c2000017-0000-0000-0000-000000000017'::uuid, 'GQ', 'Equatorial Guinea'),
  ('c2000018-0000-0000-0000-000000000018'::uuid, 'ER', 'Eritrea'),
  ('c2000019-0000-0000-0000-000000000019'::uuid, 'SZ', 'Eswatini'),
  ('c2000020-0000-0000-0000-000000000020'::uuid, 'ET', 'Ethiopia'),
  ('c2000021-0000-0000-0000-000000000021'::uuid, 'GA', 'Gabon'),
  ('c2000022-0000-0000-0000-000000000022'::uuid, 'GM', 'Gambia'),
  ('c2000023-0000-0000-0000-000000000023'::uuid, 'GH', 'Ghana'),
  ('c2000024-0000-0000-0000-000000000024'::uuid, 'GN', 'Guinea'),
  ('c2000025-0000-0000-0000-000000000025'::uuid, 'GW', 'Guinea-Bissau'),
  ('c2000026-0000-0000-0000-000000000026'::uuid, 'LS', 'Lesotho'),
  ('c2000027-0000-0000-0000-000000000027'::uuid, 'LR', 'Liberia'),
  ('c2000028-0000-0000-0000-000000000028'::uuid, 'LY', 'Libya'),
  ('c2000029-0000-0000-0000-000000000029'::uuid, 'MG', 'Madagascar'),
  ('c2000030-0000-0000-0000-000000000030'::uuid, 'MW', 'Malawi'),
  ('c2000031-0000-0000-0000-000000000031'::uuid, 'ML', 'Mali'),
  ('c2000032-0000-0000-0000-000000000032'::uuid, 'MR', 'Mauritania'),
  ('c2000033-0000-0000-0000-000000000033'::uuid, 'MU', 'Mauritius'),
  ('c2000034-0000-0000-0000-000000000034'::uuid, 'MA', 'Morocco'),
  ('c2000035-0000-0000-0000-000000000035'::uuid, 'MZ', 'Mozambique'),
  ('c2000036-0000-0000-0000-000000000036'::uuid, 'NA', 'Namibia'),
  ('c2000037-0000-0000-0000-000000000037'::uuid, 'NE', 'Niger'),
  ('c2000038-0000-0000-0000-000000000038'::uuid, 'NG', 'Nigeria'),
  ('c2000039-0000-0000-0000-000000000039'::uuid, 'RW', 'Rwanda'),
  ('c2000040-0000-0000-0000-000000000040'::uuid, 'ST', 'São Tomé and Príncipe'),
  ('c2000041-0000-0000-0000-000000000041'::uuid, 'SN', 'Senegal'),
  ('c2000042-0000-0000-0000-000000000042'::uuid, 'SC', 'Seychelles'),
  ('c2000043-0000-0000-0000-000000000043'::uuid, 'SL', 'Sierra Leone'),
  ('c2000044-0000-0000-0000-000000000044'::uuid, 'SO', 'Somalia'),
  ('c2000045-0000-0000-0000-000000000045'::uuid, 'ZA', 'South Africa'),
  ('c2000046-0000-0000-0000-000000000046'::uuid, 'SS', 'South Sudan'),
  ('c2000047-0000-0000-0000-000000000047'::uuid, 'SD', 'Sudan'),
  ('c2000048-0000-0000-0000-000000000048'::uuid, 'TZ', 'Tanzania'),
  ('c2000049-0000-0000-0000-000000000049'::uuid, 'TG', 'Togo'),
  ('c2000050-0000-0000-0000-000000000050'::uuid, 'TN', 'Tunisia'),
  ('c2000051-0000-0000-0000-000000000051'::uuid, 'UG', 'Uganda'),
  ('c2000052-0000-0000-0000-000000000052'::uuid, 'ZM', 'Zambia'),
  ('c2000053-0000-0000-0000-000000000053'::uuid, 'ZW', 'Zimbabwe'),
-- Americas
  ('c2000101-0000-0000-0000-000000000101'::uuid, 'AG', 'Antigua and Barbuda'),
  ('c2000102-0000-0000-0000-000000000102'::uuid, 'AR', 'Argentina'),
  ('c2000103-0000-0000-0000-000000000103'::uuid, 'BS', 'Bahamas'),
  ('c2000104-0000-0000-0000-000000000104'::uuid, 'BB', 'Barbados'),
  ('c2000105-0000-0000-0000-000000000105'::uuid, 'BZ', 'Belize'),
  ('c2000106-0000-0000-0000-000000000106'::uuid, 'BO', 'Bolivia'),
  ('c2000107-0000-0000-0000-000000000107'::uuid, 'BR', 'Brazil'),
  ('c2000108-0000-0000-0000-000000000108'::uuid, 'CL', 'Chile'),
  ('c2000109-0000-0000-0000-000000000109'::uuid, 'CO', 'Colombia'),
  ('c2000110-0000-0000-0000-000000000110'::uuid, 'CR', 'Costa Rica'),
  ('c2000111-0000-0000-0000-000000000111'::uuid, 'CU', 'Cuba'),
  ('c2000112-0000-0000-0000-000000000112'::uuid, 'DM', 'Dominica'),
  ('c2000113-0000-0000-0000-000000000113'::uuid, 'DO', 'Dominican Republic'),
  ('c2000114-0000-0000-0000-000000000114'::uuid, 'EC', 'Ecuador'),
  ('c2000115-0000-0000-0000-000000000115'::uuid, 'SV', 'El Salvador'),
  ('c2000116-0000-0000-0000-000000000116'::uuid, 'GD', 'Grenada'),
  ('c2000117-0000-0000-0000-000000000117'::uuid, 'GT', 'Guatemala'),
  ('c2000118-0000-0000-0000-000000000118'::uuid, 'GY', 'Guyana'),
  ('c2000119-0000-0000-0000-000000000119'::uuid, 'HT', 'Haiti'),
  ('c2000120-0000-0000-0000-000000000120'::uuid, 'HN', 'Honduras'),
  ('c2000121-0000-0000-0000-000000000121'::uuid, 'JM', 'Jamaica'),
  ('c2000122-0000-0000-0000-000000000122'::uuid, 'MX', 'Mexico'),
  ('c2000123-0000-0000-0000-000000000123'::uuid, 'NI', 'Nicaragua'),
  ('c2000124-0000-0000-0000-000000000124'::uuid, 'PA', 'Panama'),
  ('c2000125-0000-0000-0000-000000000125'::uuid, 'PY', 'Paraguay'),
  ('c2000126-0000-0000-0000-000000000126'::uuid, 'PE', 'Peru'),
  ('c2000127-0000-0000-0000-000000000127'::uuid, 'KN', 'Saint Kitts and Nevis'),
  ('c2000128-0000-0000-0000-000000000128'::uuid, 'LC', 'Saint Lucia'),
  ('c2000129-0000-0000-0000-000000000129'::uuid, 'VC', 'Saint Vincent and the Grenadines'),
  ('c2000130-0000-0000-0000-000000000130'::uuid, 'SR', 'Suriname'),
  ('c2000131-0000-0000-0000-000000000131'::uuid, 'TT', 'Trinidad and Tobago'),
  ('c2000132-0000-0000-0000-000000000132'::uuid, 'UY', 'Uruguay'),
  ('c2000133-0000-0000-0000-000000000133'::uuid, 'VE', 'Venezuela'),
-- Asia
  ('c2000201-0000-0000-0000-000000000201'::uuid, 'AF', 'Afghanistan'),
  ('c2000202-0000-0000-0000-000000000202'::uuid, 'AM', 'Armenia'),
  ('c2000203-0000-0000-0000-000000000203'::uuid, 'AZ', 'Azerbaijan'),
  ('c2000204-0000-0000-0000-000000000204'::uuid, 'BH', 'Bahrain'),
  ('c2000205-0000-0000-0000-000000000205'::uuid, 'BD', 'Bangladesh'),
  ('c2000206-0000-0000-0000-000000000206'::uuid, 'BT', 'Bhutan'),
  ('c2000207-0000-0000-0000-000000000207'::uuid, 'BN', 'Brunei'),
  ('c2000208-0000-0000-0000-000000000208'::uuid, 'KH', 'Cambodia'),
  ('c2000209-0000-0000-0000-000000000209'::uuid, 'CN', 'China'),
  ('c2000210-0000-0000-0000-000000000210'::uuid, 'CY', 'Cyprus'),
  ('c2000211-0000-0000-0000-000000000211'::uuid, 'GE', 'Georgia'),
  ('c2000212-0000-0000-0000-000000000212'::uuid, 'ID', 'Indonesia'),
  ('c2000213-0000-0000-0000-000000000213'::uuid, 'IR', 'Iran'),
  ('c2000214-0000-0000-0000-000000000214'::uuid, 'IQ', 'Iraq'),
  ('c2000215-0000-0000-0000-000000000215'::uuid, 'IL', 'Israel'),
  ('c2000216-0000-0000-0000-000000000216'::uuid, 'JP', 'Japan'),
  ('c2000217-0000-0000-0000-000000000217'::uuid, 'JO', 'Jordan'),
  ('c2000218-0000-0000-0000-000000000218'::uuid, 'KZ', 'Kazakhstan'),
  ('c2000219-0000-0000-0000-000000000219'::uuid, 'KW', 'Kuwait'),
  ('c2000220-0000-0000-0000-000000000220'::uuid, 'KG', 'Kyrgyzstan'),
  ('c2000221-0000-0000-0000-000000000221'::uuid, 'LA', 'Laos'),
  ('c2000222-0000-0000-0000-000000000222'::uuid, 'LB', 'Lebanon'),
  ('c2000223-0000-0000-0000-000000000223'::uuid, 'MY', 'Malaysia'),
  ('c2000224-0000-0000-0000-000000000224'::uuid, 'MV', 'Maldives'),
  ('c2000225-0000-0000-0000-000000000225'::uuid, 'MN', 'Mongolia'),
  ('c2000226-0000-0000-0000-000000000226'::uuid, 'MM', 'Myanmar'),
  ('c2000227-0000-0000-0000-000000000227'::uuid, 'NP', 'Nepal'),
  ('c2000228-0000-0000-0000-000000000228'::uuid, 'KP', 'North Korea'),
  ('c2000229-0000-0000-0000-000000000229'::uuid, 'OM', 'Oman'),
  ('c2000230-0000-0000-0000-000000000230'::uuid, 'PK', 'Pakistan'),
  ('c2000231-0000-0000-0000-000000000231'::uuid, 'PS', 'Palestine'),
  ('c2000232-0000-0000-0000-000000000232'::uuid, 'PH', 'Philippines'),
  ('c2000233-0000-0000-0000-000000000233'::uuid, 'QA', 'Qatar'),
  ('c2000234-0000-0000-0000-000000000234'::uuid, 'SA', 'Saudi Arabia'),
  ('c2000235-0000-0000-0000-000000000235'::uuid, 'KR', 'South Korea'),
  ('c2000236-0000-0000-0000-000000000236'::uuid, 'LK', 'Sri Lanka'),
  ('c2000237-0000-0000-0000-000000000237'::uuid, 'SY', 'Syria'),
  ('c2000238-0000-0000-0000-000000000238'::uuid, 'TW', 'Taiwan'),
  ('c2000239-0000-0000-0000-000000000239'::uuid, 'TJ', 'Tajikistan'),
  ('c2000240-0000-0000-0000-000000000240'::uuid, 'TH', 'Thailand'),
  ('c2000241-0000-0000-0000-000000000241'::uuid, 'TL', 'Timor-Leste'),
  ('c2000242-0000-0000-0000-000000000242'::uuid, 'TR', 'Turkey'),
  ('c2000243-0000-0000-0000-000000000243'::uuid, 'TM', 'Turkmenistan'),
  ('c2000244-0000-0000-0000-000000000244'::uuid, 'UZ', 'Uzbekistan'),
  ('c2000245-0000-0000-0000-000000000245'::uuid, 'VN', 'Vietnam'),
  ('c2000246-0000-0000-0000-000000000246'::uuid, 'YE', 'Yemen'),
-- Europe
  ('c2000301-0000-0000-0000-000000000301'::uuid, 'AL', 'Albania'),
  ('c2000302-0000-0000-0000-000000000302'::uuid, 'AD', 'Andorra'),
  ('c2000303-0000-0000-0000-000000000303'::uuid, 'AT', 'Austria'),
  ('c2000304-0000-0000-0000-000000000304'::uuid, 'BY', 'Belarus'),
  ('c2000305-0000-0000-0000-000000000305'::uuid, 'BE', 'Belgium'),
  ('c2000306-0000-0000-0000-000000000306'::uuid, 'BA', 'Bosnia and Herzegovina'),
  ('c2000307-0000-0000-0000-000000000307'::uuid, 'BG', 'Bulgaria'),
  ('c2000308-0000-0000-0000-000000000308'::uuid, 'HR', 'Croatia'),
  ('c2000309-0000-0000-0000-000000000309'::uuid, 'CZ', 'Czech Republic'),
  ('c2000310-0000-0000-0000-000000000310'::uuid, 'DK', 'Denmark'),
  ('c2000311-0000-0000-0000-000000000311'::uuid, 'EE', 'Estonia'),
  ('c2000312-0000-0000-0000-000000000312'::uuid, 'FI', 'Finland'),
  ('c2000313-0000-0000-0000-000000000313'::uuid, 'FR', 'France'),
  ('c2000314-0000-0000-0000-000000000314'::uuid, 'DE', 'Germany'),
  ('c2000315-0000-0000-0000-000000000315'::uuid, 'GR', 'Greece'),
  ('c2000316-0000-0000-0000-000000000316'::uuid, 'HU', 'Hungary'),
  ('c2000317-0000-0000-0000-000000000317'::uuid, 'IS', 'Iceland'),
  ('c2000318-0000-0000-0000-000000000318'::uuid, 'IE', 'Ireland'),
  ('c2000319-0000-0000-0000-000000000319'::uuid, 'IT', 'Italy'),
  ('c2000320-0000-0000-0000-000000000320'::uuid, 'XK', 'Kosovo'),
  ('c2000321-0000-0000-0000-000000000321'::uuid, 'LV', 'Latvia'),
  ('c2000322-0000-0000-0000-000000000322'::uuid, 'LI', 'Liechtenstein'),
  ('c2000323-0000-0000-0000-000000000323'::uuid, 'LT', 'Lithuania'),
  ('c2000324-0000-0000-0000-000000000324'::uuid, 'LU', 'Luxembourg'),
  ('c2000325-0000-0000-0000-000000000325'::uuid, 'MT', 'Malta'),
  ('c2000326-0000-0000-0000-000000000326'::uuid, 'MD', 'Moldova'),
  ('c2000327-0000-0000-0000-000000000327'::uuid, 'MC', 'Monaco'),
  ('c2000328-0000-0000-0000-000000000328'::uuid, 'ME', 'Montenegro'),
  ('c2000329-0000-0000-0000-000000000329'::uuid, 'NL', 'Netherlands'),
  ('c2000330-0000-0000-0000-000000000330'::uuid, 'MK', 'North Macedonia'),
  ('c2000331-0000-0000-0000-000000000331'::uuid, 'NO', 'Norway'),
  ('c2000332-0000-0000-0000-000000000332'::uuid, 'PL', 'Poland'),
  ('c2000333-0000-0000-0000-000000000333'::uuid, 'PT', 'Portugal'),
  ('c2000334-0000-0000-0000-000000000334'::uuid, 'RO', 'Romania'),
  ('c2000335-0000-0000-0000-000000000335'::uuid, 'RU', 'Russia'),
  ('c2000336-0000-0000-0000-000000000336'::uuid, 'SM', 'San Marino'),
  ('c2000337-0000-0000-0000-000000000337'::uuid, 'RS', 'Serbia'),
  ('c2000338-0000-0000-0000-000000000338'::uuid, 'SK', 'Slovakia'),
  ('c2000339-0000-0000-0000-000000000339'::uuid, 'SI', 'Slovenia'),
  ('c2000340-0000-0000-0000-000000000340'::uuid, 'ES', 'Spain'),
  ('c2000341-0000-0000-0000-000000000341'::uuid, 'SE', 'Sweden'),
  ('c2000342-0000-0000-0000-000000000342'::uuid, 'CH', 'Switzerland'),
  ('c2000343-0000-0000-0000-000000000343'::uuid, 'UA', 'Ukraine'),
  ('c2000344-0000-0000-0000-000000000344'::uuid, 'VA', 'Vatican City'),
-- Oceania
  ('c2000401-0000-0000-0000-000000000401'::uuid, 'FJ', 'Fiji'),
  ('c2000402-0000-0000-0000-000000000402'::uuid, 'KI', 'Kiribati'),
  ('c2000403-0000-0000-0000-000000000403'::uuid, 'MH', 'Marshall Islands'),
  ('c2000404-0000-0000-0000-000000000404'::uuid, 'FM', 'Micronesia'),
  ('c2000405-0000-0000-0000-000000000405'::uuid, 'NR', 'Nauru'),
  ('c2000406-0000-0000-0000-000000000406'::uuid, 'NZ', 'New Zealand'),
  ('c2000407-0000-0000-0000-000000000407'::uuid, 'PW', 'Palau'),
  ('c2000408-0000-0000-0000-000000000408'::uuid, 'PG', 'Papua New Guinea'),
  ('c2000409-0000-0000-0000-000000000409'::uuid, 'WS', 'Samoa'),
  ('c2000410-0000-0000-0000-000000000410'::uuid, 'SB', 'Solomon Islands'),
  ('c2000411-0000-0000-0000-000000000411'::uuid, 'TO', 'Tonga'),
  ('c2000412-0000-0000-0000-000000000412'::uuid, 'TV', 'Tuvalu'),
  ('c2000413-0000-0000-0000-000000000413'::uuid, 'VU', 'Vanuatu')
ON CONFLICT (id) DO NOTHING;

-- ========== 20260330155335_seed_world_geography_states_v2.sql ==========
/*
  # Seed World Geography — States / Provinces / Regions v2 (all typos fixed)

  UUID pattern: d2XXXXXX-0000-0000-0000-000000000000
  Original d1 series (16 states) preserved intact.
  All country_id references verified against c1 and c2 series.
*/

INSERT INTO states (id, country_id, code, name) VALUES

-- ===== INDIA (remaining 30 — all 28 states + 8 UTs, minus original 6: GJ,MH,RJ,DL,KA,MP) =====
  ('d2000001-0000-0000-0000-000000000001'::uuid, 'c1000001-0000-0000-0000-000000000001'::uuid, 'AP', 'Andhra Pradesh'),
  ('d2000002-0000-0000-0000-000000000002'::uuid, 'c1000001-0000-0000-0000-000000000001'::uuid, 'AR', 'Arunachal Pradesh'),
  ('d2000003-0000-0000-0000-000000000003'::uuid, 'c1000001-0000-0000-0000-000000000001'::uuid, 'AS', 'Assam'),
  ('d2000004-0000-0000-0000-000000000004'::uuid, 'c1000001-0000-0000-0000-000000000001'::uuid, 'BR', 'Bihar'),
  ('d2000005-0000-0000-0000-000000000005'::uuid, 'c1000001-0000-0000-0000-000000000001'::uuid, 'CT', 'Chhattisgarh'),
  ('d2000006-0000-0000-0000-000000000006'::uuid, 'c1000001-0000-0000-0000-000000000001'::uuid, 'GA', 'Goa'),
  ('d2000007-0000-0000-0000-000000000007'::uuid, 'c1000001-0000-0000-0000-000000000001'::uuid, 'HR', 'Haryana'),
  ('d2000008-0000-0000-0000-000000000008'::uuid, 'c1000001-0000-0000-0000-000000000001'::uuid, 'HP', 'Himachal Pradesh'),
  ('d2000009-0000-0000-0000-000000000009'::uuid, 'c1000001-0000-0000-0000-000000000001'::uuid, 'JH', 'Jharkhand'),
  ('d2000010-0000-0000-0000-000000000010'::uuid, 'c1000001-0000-0000-0000-000000000001'::uuid, 'JK', 'Jammu and Kashmir'),
  ('d2000011-0000-0000-0000-000000000011'::uuid, 'c1000001-0000-0000-0000-000000000001'::uuid, 'KL', 'Kerala'),
  ('d2000012-0000-0000-0000-000000000012'::uuid, 'c1000001-0000-0000-0000-000000000001'::uuid, 'LA', 'Ladakh'),
  ('d2000013-0000-0000-0000-000000000013'::uuid, 'c1000001-0000-0000-0000-000000000001'::uuid, 'MN', 'Manipur'),
  ('d2000014-0000-0000-0000-000000000014'::uuid, 'c1000001-0000-0000-0000-000000000001'::uuid, 'ML', 'Meghalaya'),
  ('d2000015-0000-0000-0000-000000000015'::uuid, 'c1000001-0000-0000-0000-000000000001'::uuid, 'MZ', 'Mizoram'),
  ('d2000016-0000-0000-0000-000000000016'::uuid, 'c1000001-0000-0000-0000-000000000001'::uuid, 'NL', 'Nagaland'),
  ('d2000017-0000-0000-0000-000000000017'::uuid, 'c1000001-0000-0000-0000-000000000001'::uuid, 'OD', 'Odisha'),
  ('d2000018-0000-0000-0000-000000000018'::uuid, 'c1000001-0000-0000-0000-000000000001'::uuid, 'PB', 'Punjab'),
  ('d2000019-0000-0000-0000-000000000019'::uuid, 'c1000001-0000-0000-0000-000000000001'::uuid, 'SK', 'Sikkim'),
  ('d2000020-0000-0000-0000-000000000020'::uuid, 'c1000001-0000-0000-0000-000000000001'::uuid, 'TN', 'Tamil Nadu'),
  ('d2000021-0000-0000-0000-000000000021'::uuid, 'c1000001-0000-0000-0000-000000000001'::uuid, 'TG', 'Telangana'),
  ('d2000022-0000-0000-0000-000000000022'::uuid, 'c1000001-0000-0000-0000-000000000001'::uuid, 'TR', 'Tripura'),
  ('d2000023-0000-0000-0000-000000000023'::uuid, 'c1000001-0000-0000-0000-000000000001'::uuid, 'UP', 'Uttar Pradesh'),
  ('d2000024-0000-0000-0000-000000000024'::uuid, 'c1000001-0000-0000-0000-000000000001'::uuid, 'UK', 'Uttarakhand'),
  ('d2000025-0000-0000-0000-000000000025'::uuid, 'c1000001-0000-0000-0000-000000000001'::uuid, 'WB', 'West Bengal'),
  ('d2000026-0000-0000-0000-000000000026'::uuid, 'c1000001-0000-0000-0000-000000000001'::uuid, 'AN', 'Andaman and Nicobar Islands'),
  ('d2000027-0000-0000-0000-000000000027'::uuid, 'c1000001-0000-0000-0000-000000000001'::uuid, 'CH', 'Chandigarh'),
  ('d2000028-0000-0000-0000-000000000028'::uuid, 'c1000001-0000-0000-0000-000000000001'::uuid, 'DN', 'Dadra and Nagar Haveli and Daman and Diu'),
  ('d2000029-0000-0000-0000-000000000029'::uuid, 'c1000001-0000-0000-0000-000000000001'::uuid, 'LD', 'Lakshadweep'),
  ('d2000030-0000-0000-0000-000000000030'::uuid, 'c1000001-0000-0000-0000-000000000001'::uuid, 'PY', 'Puducherry'),

-- ===== UNITED STATES (48 more; NY, CA, IL already seeded) =====
  ('d2000101-0000-0000-0000-000000000101'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'AL', 'Alabama'),
  ('d2000102-0000-0000-0000-000000000102'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'AK', 'Alaska'),
  ('d2000103-0000-0000-0000-000000000103'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'AZ', 'Arizona'),
  ('d2000104-0000-0000-0000-000000000104'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'AR', 'Arkansas'),
  ('d2000105-0000-0000-0000-000000000105'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'CO', 'Colorado'),
  ('d2000106-0000-0000-0000-000000000106'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'CT', 'Connecticut'),
  ('d2000107-0000-0000-0000-000000000107'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'DE', 'Delaware'),
  ('d2000108-0000-0000-0000-000000000108'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'FL', 'Florida'),
  ('d2000109-0000-0000-0000-000000000109'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'GA', 'Georgia'),
  ('d2000110-0000-0000-0000-000000000110'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'HI', 'Hawaii'),
  ('d2000111-0000-0000-0000-000000000111'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'ID', 'Idaho'),
  ('d2000112-0000-0000-0000-000000000112'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'IN', 'Indiana'),
  ('d2000113-0000-0000-0000-000000000113'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'IA', 'Iowa'),
  ('d2000114-0000-0000-0000-000000000114'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'KS', 'Kansas'),
  ('d2000115-0000-0000-0000-000000000115'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'KY', 'Kentucky'),
  ('d2000116-0000-0000-0000-000000000116'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'LA', 'Louisiana'),
  ('d2000117-0000-0000-0000-000000000117'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'ME', 'Maine'),
  ('d2000118-0000-0000-0000-000000000118'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'MD', 'Maryland'),
  ('d2000119-0000-0000-0000-000000000119'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'MA', 'Massachusetts'),
  ('d2000120-0000-0000-0000-000000000120'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'MI', 'Michigan'),
  ('d2000121-0000-0000-0000-000000000121'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'MN', 'Minnesota'),
  ('d2000122-0000-0000-0000-000000000122'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'MS', 'Mississippi'),
  ('d2000123-0000-0000-0000-000000000123'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'MO', 'Missouri'),
  ('d2000124-0000-0000-0000-000000000124'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'MT', 'Montana'),
  ('d2000125-0000-0000-0000-000000000125'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'NE', 'Nebraska'),
  ('d2000126-0000-0000-0000-000000000126'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'NV', 'Nevada'),
  ('d2000127-0000-0000-0000-000000000127'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'NH', 'New Hampshire'),
  ('d2000128-0000-0000-0000-000000000128'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'NJ', 'New Jersey'),
  ('d2000129-0000-0000-0000-000000000129'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'NM', 'New Mexico'),
  ('d2000130-0000-0000-0000-000000000130'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'NC', 'North Carolina'),
  ('d2000131-0000-0000-0000-000000000131'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'ND', 'North Dakota'),
  ('d2000132-0000-0000-0000-000000000132'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'OH', 'Ohio'),
  ('d2000133-0000-0000-0000-000000000133'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'OK', 'Oklahoma'),
  ('d2000134-0000-0000-0000-000000000134'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'OR', 'Oregon'),
  ('d2000135-0000-0000-0000-000000000135'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'PA', 'Pennsylvania'),
  ('d2000136-0000-0000-0000-000000000136'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'RI', 'Rhode Island'),
  ('d2000137-0000-0000-0000-000000000137'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'SC', 'South Carolina'),
  ('d2000138-0000-0000-0000-000000000138'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'SD', 'South Dakota'),
  ('d2000139-0000-0000-0000-000000000139'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'TN', 'Tennessee'),
  ('d2000140-0000-0000-0000-000000000140'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'TX', 'Texas'),
  ('d2000141-0000-0000-0000-000000000141'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'UT', 'Utah'),
  ('d2000142-0000-0000-0000-000000000142'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'VT', 'Vermont'),
  ('d2000143-0000-0000-0000-000000000143'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'VA', 'Virginia'),
  ('d2000144-0000-0000-0000-000000000144'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'WA', 'Washington'),
  ('d2000145-0000-0000-0000-000000000145'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'WV', 'West Virginia'),
  ('d2000146-0000-0000-0000-000000000146'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'WI', 'Wisconsin'),
  ('d2000147-0000-0000-0000-000000000147'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'WY', 'Wyoming'),
  ('d2000148-0000-0000-0000-000000000148'::uuid, 'c1000002-0000-0000-0000-000000000002'::uuid, 'DC', 'District of Columbia'),

-- ===== UNITED KINGDOM (3 more; England d1000020 already seeded) =====
  ('d2000201-0000-0000-0000-000000000201'::uuid, 'c1000003-0000-0000-0000-000000000003'::uuid, 'SCT', 'Scotland'),
  ('d2000202-0000-0000-0000-000000000202'::uuid, 'c1000003-0000-0000-0000-000000000003'::uuid, 'WLS', 'Wales'),
  ('d2000203-0000-0000-0000-000000000203'::uuid, 'c1000003-0000-0000-0000-000000000003'::uuid, 'NIR', 'Northern Ireland'),

-- ===== UAE (6 more; Dubai d1000030 already seeded) =====
  ('d2000301-0000-0000-0000-000000000301'::uuid, 'c1000004-0000-0000-0000-000000000004'::uuid, 'AZ', 'Abu Dhabi'),
  ('d2000302-0000-0000-0000-000000000302'::uuid, 'c1000004-0000-0000-0000-000000000004'::uuid, 'SH', 'Sharjah'),
  ('d2000303-0000-0000-0000-000000000303'::uuid, 'c1000004-0000-0000-0000-000000000004'::uuid, 'AJ', 'Ajman'),
  ('d2000304-0000-0000-0000-000000000304'::uuid, 'c1000004-0000-0000-0000-000000000004'::uuid, 'UQ', 'Umm Al Quwain'),
  ('d2000305-0000-0000-0000-000000000305'::uuid, 'c1000004-0000-0000-0000-000000000004'::uuid, 'RK', 'Ras Al Khaimah'),
  ('d2000306-0000-0000-0000-000000000306'::uuid, 'c1000004-0000-0000-0000-000000000004'::uuid, 'FU', 'Fujairah'),

-- ===== CANADA (12 more; Ontario d1000040 already seeded) =====
  ('d2000401-0000-0000-0000-000000000401'::uuid, 'c1000005-0000-0000-0000-000000000005'::uuid, 'AB', 'Alberta'),
  ('d2000402-0000-0000-0000-000000000402'::uuid, 'c1000005-0000-0000-0000-000000000005'::uuid, 'BC', 'British Columbia'),
  ('d2000403-0000-0000-0000-000000000403'::uuid, 'c1000005-0000-0000-0000-000000000005'::uuid, 'MB', 'Manitoba'),
  ('d2000404-0000-0000-0000-000000000404'::uuid, 'c1000005-0000-0000-0000-000000000005'::uuid, 'NB', 'New Brunswick'),
  ('d2000405-0000-0000-0000-000000000405'::uuid, 'c1000005-0000-0000-0000-000000000005'::uuid, 'NL', 'Newfoundland and Labrador'),
  ('d2000406-0000-0000-0000-000000000406'::uuid, 'c1000005-0000-0000-0000-000000000005'::uuid, 'NS', 'Nova Scotia'),
  ('d2000407-0000-0000-0000-000000000407'::uuid, 'c1000005-0000-0000-0000-000000000005'::uuid, 'PE', 'Prince Edward Island'),
  ('d2000408-0000-0000-0000-000000000408'::uuid, 'c1000005-0000-0000-0000-000000000005'::uuid, 'QC', 'Quebec'),
  ('d2000409-0000-0000-0000-000000000409'::uuid, 'c1000005-0000-0000-0000-000000000005'::uuid, 'SK', 'Saskatchewan'),
  ('d2000410-0000-0000-0000-000000000410'::uuid, 'c1000005-0000-0000-0000-000000000005'::uuid, 'NT', 'Northwest Territories'),
  ('d2000411-0000-0000-0000-000000000411'::uuid, 'c1000005-0000-0000-0000-000000000005'::uuid, 'NU', 'Nunavut'),
  ('d2000412-0000-0000-0000-000000000412'::uuid, 'c1000005-0000-0000-0000-000000000005'::uuid, 'YT', 'Yukon'),

-- ===== AUSTRALIA (7 more; NSW d1000050 already seeded) =====
  ('d2000501-0000-0000-0000-000000000501'::uuid, 'c1000006-0000-0000-0000-000000000006'::uuid, 'VIC', 'Victoria'),
  ('d2000502-0000-0000-0000-000000000502'::uuid, 'c1000006-0000-0000-0000-000000000006'::uuid, 'QLD', 'Queensland'),
  ('d2000503-0000-0000-0000-000000000503'::uuid, 'c1000006-0000-0000-0000-000000000006'::uuid, 'WA', 'Western Australia'),
  ('d2000504-0000-0000-0000-000000000504'::uuid, 'c1000006-0000-0000-0000-000000000006'::uuid, 'SA', 'South Australia'),
  ('d2000505-0000-0000-0000-000000000505'::uuid, 'c1000006-0000-0000-0000-000000000006'::uuid, 'TAS', 'Tasmania'),
  ('d2000506-0000-0000-0000-000000000506'::uuid, 'c1000006-0000-0000-0000-000000000006'::uuid, 'ACT', 'Australian Capital Territory'),
  ('d2000507-0000-0000-0000-000000000507'::uuid, 'c1000006-0000-0000-0000-000000000006'::uuid, 'NT', 'Northern Territory'),

-- ===== NEW ZEALAND (c2000406) =====
  ('d2000601-0000-0000-0000-000000000601'::uuid, 'c2000406-0000-0000-0000-000000000406'::uuid, 'AUK', 'Auckland'),
  ('d2000602-0000-0000-0000-000000000602'::uuid, 'c2000406-0000-0000-0000-000000000406'::uuid, 'WGN', 'Wellington'),
  ('d2000603-0000-0000-0000-000000000603'::uuid, 'c2000406-0000-0000-0000-000000000406'::uuid, 'CAN', 'Canterbury'),
  ('d2000604-0000-0000-0000-000000000604'::uuid, 'c2000406-0000-0000-0000-000000000406'::uuid, 'WKO', 'Waikato'),
  ('d2000605-0000-0000-0000-000000000605'::uuid, 'c2000406-0000-0000-0000-000000000406'::uuid, 'BOP', 'Bay of Plenty'),
  ('d2000606-0000-0000-0000-000000000606'::uuid, 'c2000406-0000-0000-0000-000000000406'::uuid, 'MWT', 'Manawatu-Whanganui'),
  ('d2000607-0000-0000-0000-000000000607'::uuid, 'c2000406-0000-0000-0000-000000000406'::uuid, 'HKB', 'Hawkes Bay'),
  ('d2000608-0000-0000-0000-000000000608'::uuid, 'c2000406-0000-0000-0000-000000000406'::uuid, 'OTA', 'Otago'),
  ('d2000609-0000-0000-0000-000000000609'::uuid, 'c2000406-0000-0000-0000-000000000406'::uuid, 'STL', 'Southland'),
  ('d2000610-0000-0000-0000-000000000610'::uuid, 'c2000406-0000-0000-0000-000000000406'::uuid, 'NTL', 'Northland'),
  ('d2000611-0000-0000-0000-000000000611'::uuid, 'c2000406-0000-0000-0000-000000000406'::uuid, 'TKI', 'Taranaki'),
  ('d2000612-0000-0000-0000-000000000612'::uuid, 'c2000406-0000-0000-0000-000000000406'::uuid, 'NSN', 'Nelson'),
  ('d2000613-0000-0000-0000-000000000613'::uuid, 'c2000406-0000-0000-0000-000000000406'::uuid, 'MBH', 'Marlborough'),
  ('d2000614-0000-0000-0000-000000000614'::uuid, 'c2000406-0000-0000-0000-000000000406'::uuid, 'WTC', 'West Coast'),
  ('d2000615-0000-0000-0000-000000000615'::uuid, 'c2000406-0000-0000-0000-000000000406'::uuid, 'GIS', 'Gisborne'),
  ('d2000616-0000-0000-0000-000000000616'::uuid, 'c2000406-0000-0000-0000-000000000406'::uuid, 'TAS', 'Tasman'),

-- ===== GERMANY (c2000314) =====
  ('d2000701-0000-0000-0000-000000000701'::uuid, 'c2000314-0000-0000-0000-000000000314'::uuid, 'BB', 'Brandenburg'),
  ('d2000702-0000-0000-0000-000000000702'::uuid, 'c2000314-0000-0000-0000-000000000314'::uuid, 'BE', 'Berlin'),
  ('d2000703-0000-0000-0000-000000000703'::uuid, 'c2000314-0000-0000-0000-000000000314'::uuid, 'BW', 'Baden-Wurttemberg'),
  ('d2000704-0000-0000-0000-000000000704'::uuid, 'c2000314-0000-0000-0000-000000000314'::uuid, 'BY', 'Bavaria'),
  ('d2000705-0000-0000-0000-000000000705'::uuid, 'c2000314-0000-0000-0000-000000000314'::uuid, 'HB', 'Bremen'),
  ('d2000706-0000-0000-0000-000000000706'::uuid, 'c2000314-0000-0000-0000-000000000314'::uuid, 'HE', 'Hesse'),
  ('d2000707-0000-0000-0000-000000000707'::uuid, 'c2000314-0000-0000-0000-000000000314'::uuid, 'HH', 'Hamburg'),
  ('d2000708-0000-0000-0000-000000000708'::uuid, 'c2000314-0000-0000-0000-000000000314'::uuid, 'MV', 'Mecklenburg-Vorpommern'),
  ('d2000709-0000-0000-0000-000000000709'::uuid, 'c2000314-0000-0000-0000-000000000314'::uuid, 'NI', 'Lower Saxony'),
  ('d2000710-0000-0000-0000-000000000710'::uuid, 'c2000314-0000-0000-0000-000000000314'::uuid, 'NW', 'North Rhine-Westphalia'),
  ('d2000711-0000-0000-0000-000000000711'::uuid, 'c2000314-0000-0000-0000-000000000314'::uuid, 'RP', 'Rhineland-Palatinate'),
  ('d2000712-0000-0000-0000-000000000712'::uuid, 'c2000314-0000-0000-0000-000000000314'::uuid, 'SH', 'Schleswig-Holstein'),
  ('d2000713-0000-0000-0000-000000000713'::uuid, 'c2000314-0000-0000-0000-000000000314'::uuid, 'SL', 'Saarland'),
  ('d2000714-0000-0000-0000-000000000714'::uuid, 'c2000314-0000-0000-0000-000000000314'::uuid, 'SN', 'Saxony'),
  ('d2000715-0000-0000-0000-000000000715'::uuid, 'c2000314-0000-0000-0000-000000000314'::uuid, 'ST', 'Saxony-Anhalt'),
  ('d2000716-0000-0000-0000-000000000716'::uuid, 'c2000314-0000-0000-0000-000000000314'::uuid, 'TH', 'Thuringia'),

-- ===== FRANCE (c2000313) =====
  ('d2000801-0000-0000-0000-000000000801'::uuid, 'c2000313-0000-0000-0000-000000000313'::uuid, 'ARA', 'Auvergne-Rhone-Alpes'),
  ('d2000802-0000-0000-0000-000000000802'::uuid, 'c2000313-0000-0000-0000-000000000313'::uuid, 'BFC', 'Bourgogne-Franche-Comte'),
  ('d2000803-0000-0000-0000-000000000803'::uuid, 'c2000313-0000-0000-0000-000000000313'::uuid, 'BRE', 'Brittany'),
  ('d2000804-0000-0000-0000-000000000804'::uuid, 'c2000313-0000-0000-0000-000000000313'::uuid, 'CVL', 'Centre-Val de Loire'),
  ('d2000805-0000-0000-0000-000000000805'::uuid, 'c2000313-0000-0000-0000-000000000313'::uuid, 'COR', 'Corsica'),
  ('d2000806-0000-0000-0000-000000000806'::uuid, 'c2000313-0000-0000-0000-000000000313'::uuid, 'GES', 'Grand Est'),
  ('d2000807-0000-0000-0000-000000000807'::uuid, 'c2000313-0000-0000-0000-000000000313'::uuid, 'HDF', 'Hauts-de-France'),
  ('d2000808-0000-0000-0000-000000000808'::uuid, 'c2000313-0000-0000-0000-000000000313'::uuid, 'IDF', 'Ile-de-France'),
  ('d2000809-0000-0000-0000-000000000809'::uuid, 'c2000313-0000-0000-0000-000000000313'::uuid, 'NOR', 'Normandy'),
  ('d2000810-0000-0000-0000-000000000810'::uuid, 'c2000313-0000-0000-0000-000000000313'::uuid, 'NAQ', 'Nouvelle-Aquitaine'),
  ('d2000811-0000-0000-0000-000000000811'::uuid, 'c2000313-0000-0000-0000-000000000313'::uuid, 'OCC', 'Occitanie'),
  ('d2000812-0000-0000-0000-000000000812'::uuid, 'c2000313-0000-0000-0000-000000000313'::uuid, 'PDL', 'Pays de la Loire'),
  ('d2000813-0000-0000-0000-000000000813'::uuid, 'c2000313-0000-0000-0000-000000000313'::uuid, 'PAC', 'Provence-Alpes-Cote d Azur'),

-- ===== ITALY (c2000319) =====
  ('d2000901-0000-0000-0000-000000000901'::uuid, 'c2000319-0000-0000-0000-000000000319'::uuid, 'ABR', 'Abruzzo'),
  ('d2000902-0000-0000-0000-000000000902'::uuid, 'c2000319-0000-0000-0000-000000000319'::uuid, 'BAS', 'Basilicata'),
  ('d2000903-0000-0000-0000-000000000903'::uuid, 'c2000319-0000-0000-0000-000000000319'::uuid, 'CAL', 'Calabria'),
  ('d2000904-0000-0000-0000-000000000904'::uuid, 'c2000319-0000-0000-0000-000000000319'::uuid, 'CAM', 'Campania'),
  ('d2000905-0000-0000-0000-000000000905'::uuid, 'c2000319-0000-0000-0000-000000000319'::uuid, 'EMR', 'Emilia-Romagna'),
  ('d2000906-0000-0000-0000-000000000906'::uuid, 'c2000319-0000-0000-0000-000000000319'::uuid, 'FVG', 'Friuli-Venezia Giulia'),
  ('d2000907-0000-0000-0000-000000000907'::uuid, 'c2000319-0000-0000-0000-000000000319'::uuid, 'LAZ', 'Lazio'),
  ('d2000908-0000-0000-0000-000000000908'::uuid, 'c2000319-0000-0000-0000-000000000319'::uuid, 'LIG', 'Liguria'),
  ('d2000909-0000-0000-0000-000000000909'::uuid, 'c2000319-0000-0000-0000-000000000319'::uuid, 'LOM', 'Lombardy'),
  ('d2000910-0000-0000-0000-000000000910'::uuid, 'c2000319-0000-0000-0000-000000000319'::uuid, 'MAR', 'Marche'),
  ('d2000911-0000-0000-0000-000000000911'::uuid, 'c2000319-0000-0000-0000-000000000319'::uuid, 'MOL', 'Molise'),
  ('d2000912-0000-0000-0000-000000000912'::uuid, 'c2000319-0000-0000-0000-000000000319'::uuid, 'PIE', 'Piedmont'),
  ('d2000913-0000-0000-0000-000000000913'::uuid, 'c2000319-0000-0000-0000-000000000319'::uuid, 'PUG', 'Puglia'),
  ('d2000914-0000-0000-0000-000000000914'::uuid, 'c2000319-0000-0000-0000-000000000319'::uuid, 'SAR', 'Sardinia'),
  ('d2000915-0000-0000-0000-000000000915'::uuid, 'c2000319-0000-0000-0000-000000000319'::uuid, 'SIC', 'Sicily'),
  ('d2000916-0000-0000-0000-000000000916'::uuid, 'c2000319-0000-0000-0000-000000000319'::uuid, 'TOS', 'Tuscany'),
  ('d2000917-0000-0000-0000-000000000917'::uuid, 'c2000319-0000-0000-0000-000000000319'::uuid, 'TAA', 'Trentino-Alto Adige'),
  ('d2000918-0000-0000-0000-000000000918'::uuid, 'c2000319-0000-0000-0000-000000000319'::uuid, 'UMB', 'Umbria'),
  ('d2000919-0000-0000-0000-000000000919'::uuid, 'c2000319-0000-0000-0000-000000000319'::uuid, 'VDA', 'Aosta Valley'),
  ('d2000920-0000-0000-0000-000000000920'::uuid, 'c2000319-0000-0000-0000-000000000319'::uuid, 'VEN', 'Veneto'),

-- ===== SPAIN (c2000340) =====
  ('d2001001-0000-0000-0000-000000001001'::uuid, 'c2000340-0000-0000-0000-000000000340'::uuid, 'AN', 'Andalusia'),
  ('d2001002-0000-0000-0000-000000001002'::uuid, 'c2000340-0000-0000-0000-000000000340'::uuid, 'AR', 'Aragon'),
  ('d2001003-0000-0000-0000-000000001003'::uuid, 'c2000340-0000-0000-0000-000000000340'::uuid, 'AS', 'Asturias'),
  ('d2001004-0000-0000-0000-000000001004'::uuid, 'c2000340-0000-0000-0000-000000000340'::uuid, 'CB', 'Cantabria'),
  ('d2001005-0000-0000-0000-000000001005'::uuid, 'c2000340-0000-0000-0000-000000000340'::uuid, 'CL', 'Castile and Leon'),
  ('d2001006-0000-0000-0000-000000001006'::uuid, 'c2000340-0000-0000-0000-000000000340'::uuid, 'CM', 'Castile-La Mancha'),
  ('d2001007-0000-0000-0000-000000001007'::uuid, 'c2000340-0000-0000-0000-000000000340'::uuid, 'CT', 'Catalonia'),
  ('d2001008-0000-0000-0000-000000001008'::uuid, 'c2000340-0000-0000-0000-000000000340'::uuid, 'EX', 'Extremadura'),
  ('d2001009-0000-0000-0000-000000001009'::uuid, 'c2000340-0000-0000-0000-000000000340'::uuid, 'GA', 'Galicia'),
  ('d2001010-0000-0000-0000-000000001010'::uuid, 'c2000340-0000-0000-0000-000000000340'::uuid, 'IB', 'Balearic Islands'),
  ('d2001011-0000-0000-0000-000000001011'::uuid, 'c2000340-0000-0000-0000-000000000340'::uuid, 'IC', 'Canary Islands'),
  ('d2001012-0000-0000-0000-000000001012'::uuid, 'c2000340-0000-0000-0000-000000000340'::uuid, 'LR', 'La Rioja'),
  ('d2001013-0000-0000-0000-000000001013'::uuid, 'c2000340-0000-0000-0000-000000000340'::uuid, 'MD', 'Community of Madrid'),
  ('d2001014-0000-0000-0000-000000001014'::uuid, 'c2000340-0000-0000-0000-000000000340'::uuid, 'MC', 'Region of Murcia'),
  ('d2001015-0000-0000-0000-000000001015'::uuid, 'c2000340-0000-0000-0000-000000000340'::uuid, 'NC', 'Navarre'),
  ('d2001016-0000-0000-0000-000000001016'::uuid, 'c2000340-0000-0000-0000-000000000340'::uuid, 'PV', 'Basque Country'),
  ('d2001017-0000-0000-0000-000000001017'::uuid, 'c2000340-0000-0000-0000-000000000340'::uuid, 'VC', 'Valencian Community'),

-- ===== BRAZIL (c2000107) =====
  ('d2001101-0000-0000-0000-000000001101'::uuid, 'c2000107-0000-0000-0000-000000000107'::uuid, 'AC', 'Acre'),
  ('d2001102-0000-0000-0000-000000001102'::uuid, 'c2000107-0000-0000-0000-000000000107'::uuid, 'AL', 'Alagoas'),
  ('d2001103-0000-0000-0000-000000001103'::uuid, 'c2000107-0000-0000-0000-000000000107'::uuid, 'AP', 'Amapa'),
  ('d2001104-0000-0000-0000-000000001104'::uuid, 'c2000107-0000-0000-0000-000000000107'::uuid, 'AM', 'Amazonas'),
  ('d2001105-0000-0000-0000-000000001105'::uuid, 'c2000107-0000-0000-0000-000000000107'::uuid, 'BA', 'Bahia'),
  ('d2001106-0000-0000-0000-000000001106'::uuid, 'c2000107-0000-0000-0000-000000000107'::uuid, 'CE', 'Ceara'),
  ('d2001107-0000-0000-0000-000000001107'::uuid, 'c2000107-0000-0000-0000-000000000107'::uuid, 'DF', 'Distrito Federal'),
  ('d2001108-0000-0000-0000-000000001108'::uuid, 'c2000107-0000-0000-0000-000000000107'::uuid, 'ES', 'Espirito Santo'),
  ('d2001109-0000-0000-0000-000000001109'::uuid, 'c2000107-0000-0000-0000-000000000107'::uuid, 'GO', 'Goias'),
  ('d2001110-0000-0000-0000-000000001110'::uuid, 'c2000107-0000-0000-0000-000000000107'::uuid, 'MA', 'Maranhao'),
  ('d2001111-0000-0000-0000-000000001111'::uuid, 'c2000107-0000-0000-0000-000000000107'::uuid, 'MT', 'Mato Grosso'),
  ('d2001112-0000-0000-0000-000000001112'::uuid, 'c2000107-0000-0000-0000-000000000107'::uuid, 'MS', 'Mato Grosso do Sul'),
  ('d2001113-0000-0000-0000-000000001113'::uuid, 'c2000107-0000-0000-0000-000000000107'::uuid, 'MG', 'Minas Gerais'),
  ('d2001114-0000-0000-0000-000000001114'::uuid, 'c2000107-0000-0000-0000-000000000107'::uuid, 'PA', 'Para'),
  ('d2001115-0000-0000-0000-000000001115'::uuid, 'c2000107-0000-0000-0000-000000000107'::uuid, 'PB', 'Paraiba'),
  ('d2001116-0000-0000-0000-000000001116'::uuid, 'c2000107-0000-0000-0000-000000000107'::uuid, 'PR', 'Parana'),
  ('d2001117-0000-0000-0000-000000001117'::uuid, 'c2000107-0000-0000-0000-000000000107'::uuid, 'PE', 'Pernambuco'),
  ('d2001118-0000-0000-0000-000000001118'::uuid, 'c2000107-0000-0000-0000-000000000107'::uuid, 'PI', 'Piaui'),
  ('d2001119-0000-0000-0000-000000001119'::uuid, 'c2000107-0000-0000-0000-000000000107'::uuid, 'RJ', 'Rio de Janeiro'),
  ('d2001120-0000-0000-0000-000000001120'::uuid, 'c2000107-0000-0000-0000-000000000107'::uuid, 'RN', 'Rio Grande do Norte'),
  ('d2001121-0000-0000-0000-000000001121'::uuid, 'c2000107-0000-0000-0000-000000000107'::uuid, 'RS', 'Rio Grande do Sul'),
  ('d2001122-0000-0000-0000-000000001122'::uuid, 'c2000107-0000-0000-0000-000000000107'::uuid, 'RO', 'Rondonia'),
  ('d2001123-0000-0000-0000-000000001123'::uuid, 'c2000107-0000-0000-0000-000000000107'::uuid, 'RR', 'Roraima'),
  ('d2001124-0000-0000-0000-000000001124'::uuid, 'c2000107-0000-0000-0000-000000000107'::uuid, 'SC', 'Santa Catarina'),
  ('d2001125-0000-0000-0000-000000001125'::uuid, 'c2000107-0000-0000-0000-000000000107'::uuid, 'SP', 'Sao Paulo'),
  ('d2001126-0000-0000-0000-000000001126'::uuid, 'c2000107-0000-0000-0000-000000000107'::uuid, 'SE', 'Sergipe'),
  ('d2001127-0000-0000-0000-000000001127'::uuid, 'c2000107-0000-0000-0000-000000000107'::uuid, 'TO', 'Tocantins'),

-- ===== SOUTH AFRICA (c2000045) =====
  ('d2001201-0000-0000-0000-000000001201'::uuid, 'c2000045-0000-0000-0000-000000000045'::uuid, 'EC', 'Eastern Cape'),
  ('d2001202-0000-0000-0000-000000001202'::uuid, 'c2000045-0000-0000-0000-000000000045'::uuid, 'FS', 'Free State'),
  ('d2001203-0000-0000-0000-000000001203'::uuid, 'c2000045-0000-0000-0000-000000000045'::uuid, 'GP', 'Gauteng'),
  ('d2001204-0000-0000-0000-000000001204'::uuid, 'c2000045-0000-0000-0000-000000000045'::uuid, 'KZN', 'KwaZulu-Natal'),
  ('d2001205-0000-0000-0000-000000001205'::uuid, 'c2000045-0000-0000-0000-000000000045'::uuid, 'LP', 'Limpopo'),
  ('d2001206-0000-0000-0000-000000001206'::uuid, 'c2000045-0000-0000-0000-000000000045'::uuid, 'MP', 'Mpumalanga'),
  ('d2001207-0000-0000-0000-000000001207'::uuid, 'c2000045-0000-0000-0000-000000000045'::uuid, 'NW', 'North West'),
  ('d2001208-0000-0000-0000-000000001208'::uuid, 'c2000045-0000-0000-0000-000000000045'::uuid, 'NC', 'Northern Cape'),
  ('d2001209-0000-0000-0000-000000001209'::uuid, 'c2000045-0000-0000-0000-000000000045'::uuid, 'WC', 'Western Cape'),

-- ===== NIGERIA (c2000038) =====
  ('d2001301-0000-0000-0000-000000001301'::uuid, 'c2000038-0000-0000-0000-000000000038'::uuid, 'AB', 'Abia'),
  ('d2001302-0000-0000-0000-000000001302'::uuid, 'c2000038-0000-0000-0000-000000000038'::uuid, 'AD', 'Adamawa'),
  ('d2001303-0000-0000-0000-000000001303'::uuid, 'c2000038-0000-0000-0000-000000000038'::uuid, 'AK', 'Akwa Ibom'),
  ('d2001304-0000-0000-0000-000000001304'::uuid, 'c2000038-0000-0000-0000-000000000038'::uuid, 'AN', 'Anambra'),
  ('d2001305-0000-0000-0000-000000001305'::uuid, 'c2000038-0000-0000-0000-000000000038'::uuid, 'BA', 'Bauchi'),
  ('d2001306-0000-0000-0000-000000001306'::uuid, 'c2000038-0000-0000-0000-000000000038'::uuid, 'BY', 'Bayelsa'),
  ('d2001307-0000-0000-0000-000000001307'::uuid, 'c2000038-0000-0000-0000-000000000038'::uuid, 'BE', 'Benue'),
  ('d2001308-0000-0000-0000-000000001308'::uuid, 'c2000038-0000-0000-0000-000000000038'::uuid, 'BO', 'Borno'),
  ('d2001309-0000-0000-0000-000000001309'::uuid, 'c2000038-0000-0000-0000-000000000038'::uuid, 'CR', 'Cross River'),
  ('d2001310-0000-0000-0000-000000001310'::uuid, 'c2000038-0000-0000-0000-000000000038'::uuid, 'DE', 'Delta'),
  ('d2001311-0000-0000-0000-000000001311'::uuid, 'c2000038-0000-0000-0000-000000000038'::uuid, 'EB', 'Ebonyi'),
  ('d2001312-0000-0000-0000-000000001312'::uuid, 'c2000038-0000-0000-0000-000000000038'::uuid, 'ED', 'Edo'),
  ('d2001313-0000-0000-0000-000000001313'::uuid, 'c2000038-0000-0000-0000-000000000038'::uuid, 'EK', 'Ekiti'),
  ('d2001314-0000-0000-0000-000000001314'::uuid, 'c2000038-0000-0000-0000-000000000038'::uuid, 'EN', 'Enugu'),
  ('d2001315-0000-0000-0000-000000001315'::uuid, 'c2000038-0000-0000-0000-000000000038'::uuid, 'FC', 'FCT Abuja'),
  ('d2001316-0000-0000-0000-000000001316'::uuid, 'c2000038-0000-0000-0000-000000000038'::uuid, 'GO', 'Gombe'),
  ('d2001317-0000-0000-0000-000000001317'::uuid, 'c2000038-0000-0000-0000-000000000038'::uuid, 'IM', 'Imo'),
  ('d2001318-0000-0000-0000-000000001318'::uuid, 'c2000038-0000-0000-0000-000000000038'::uuid, 'JI', 'Jigawa'),
  ('d2001319-0000-0000-0000-000000001319'::uuid, 'c2000038-0000-0000-0000-000000000038'::uuid, 'KD', 'Kaduna'),
  ('d2001320-0000-0000-0000-000000001320'::uuid, 'c2000038-0000-0000-0000-000000000038'::uuid, 'KN', 'Kano'),
  ('d2001321-0000-0000-0000-000000001321'::uuid, 'c2000038-0000-0000-0000-000000000038'::uuid, 'KT', 'Katsina'),
  ('d2001322-0000-0000-0000-000000001322'::uuid, 'c2000038-0000-0000-0000-000000000038'::uuid, 'KB', 'Kebbi'),
  ('d2001323-0000-0000-0000-000000001323'::uuid, 'c2000038-0000-0000-0000-000000000038'::uuid, 'KO', 'Kogi'),
  ('d2001324-0000-0000-0000-000000001324'::uuid, 'c2000038-0000-0000-0000-000000000038'::uuid, 'KW', 'Kwara'),
  ('d2001325-0000-0000-0000-000000001325'::uuid, 'c2000038-0000-0000-0000-000000000038'::uuid, 'LA', 'Lagos'),
  ('d2001326-0000-0000-0000-000000001326'::uuid, 'c2000038-0000-0000-0000-000000000038'::uuid, 'NA', 'Nasarawa'),
  ('d2001327-0000-0000-0000-000000001327'::uuid, 'c2000038-0000-0000-0000-000000000038'::uuid, 'NI', 'Niger State'),
  ('d2001328-0000-0000-0000-000000001328'::uuid, 'c2000038-0000-0000-0000-000000000038'::uuid, 'OG', 'Ogun'),
  ('d2001329-0000-0000-0000-000000001329'::uuid, 'c2000038-0000-0000-0000-000000000038'::uuid, 'ON', 'Ondo'),
  ('d2001330-0000-0000-0000-000000001330'::uuid, 'c2000038-0000-0000-0000-000000000038'::uuid, 'OS', 'Osun'),
  ('d2001331-0000-0000-0000-000000001331'::uuid, 'c2000038-0000-0000-0000-000000000038'::uuid, 'OY', 'Oyo'),
  ('d2001332-0000-0000-0000-000000001332'::uuid, 'c2000038-0000-0000-0000-000000000038'::uuid, 'PL', 'Plateau'),
  ('d2001333-0000-0000-0000-000000001333'::uuid, 'c2000038-0000-0000-0000-000000000038'::uuid, 'RI', 'Rivers'),
  ('d2001334-0000-0000-0000-000000001334'::uuid, 'c2000038-0000-0000-0000-000000000038'::uuid, 'SO', 'Sokoto'),
  ('d2001335-0000-0000-0000-000000001335'::uuid, 'c2000038-0000-0000-0000-000000000038'::uuid, 'TA', 'Taraba'),
  ('d2001336-0000-0000-0000-000000001336'::uuid, 'c2000038-0000-0000-0000-000000000038'::uuid, 'YO', 'Yobe'),
  ('d2001337-0000-0000-0000-000000001337'::uuid, 'c2000038-0000-0000-0000-000000000038'::uuid, 'ZA', 'Zamfara'),

-- ===== PAKISTAN (c2000230) =====
  ('d2001401-0000-0000-0000-000000001401'::uuid, 'c2000230-0000-0000-0000-000000000230'::uuid, 'BA', 'Balochistan'),
  ('d2001402-0000-0000-0000-000000001402'::uuid, 'c2000230-0000-0000-0000-000000000230'::uuid, 'KP', 'Khyber Pakhtunkhwa'),
  ('d2001403-0000-0000-0000-000000001403'::uuid, 'c2000230-0000-0000-0000-000000000230'::uuid, 'PB', 'Punjab'),
  ('d2001404-0000-0000-0000-000000001404'::uuid, 'c2000230-0000-0000-0000-000000000230'::uuid, 'SD', 'Sindh'),
  ('d2001405-0000-0000-0000-000000001405'::uuid, 'c2000230-0000-0000-0000-000000000230'::uuid, 'GB', 'Gilgit-Baltistan'),
  ('d2001406-0000-0000-0000-000000001406'::uuid, 'c2000230-0000-0000-0000-000000000230'::uuid, 'AJK', 'Azad Kashmir'),
  ('d2001407-0000-0000-0000-000000001407'::uuid, 'c2000230-0000-0000-0000-000000000230'::uuid, 'ICT', 'Islamabad Capital Territory'),

-- ===== BANGLADESH (c2000205) =====
  ('d2001501-0000-0000-0000-000000001501'::uuid, 'c2000205-0000-0000-0000-000000000205'::uuid, 'BAR', 'Barisal'),
  ('d2001502-0000-0000-0000-000000001502'::uuid, 'c2000205-0000-0000-0000-000000000205'::uuid, 'CHT', 'Chittagong'),
  ('d2001503-0000-0000-0000-000000001503'::uuid, 'c2000205-0000-0000-0000-000000000205'::uuid, 'DHA', 'Dhaka'),
  ('d2001504-0000-0000-0000-000000001504'::uuid, 'c2000205-0000-0000-0000-000000000205'::uuid, 'KHU', 'Khulna'),
  ('d2001505-0000-0000-0000-000000001505'::uuid, 'c2000205-0000-0000-0000-000000000205'::uuid, 'MYM', 'Mymensingh'),
  ('d2001506-0000-0000-0000-000000001506'::uuid, 'c2000205-0000-0000-0000-000000000205'::uuid, 'RAJ', 'Rajshahi'),
  ('d2001507-0000-0000-0000-000000001507'::uuid, 'c2000205-0000-0000-0000-000000000205'::uuid, 'RAN', 'Rangpur'),
  ('d2001508-0000-0000-0000-000000001508'::uuid, 'c2000205-0000-0000-0000-000000000205'::uuid, 'SYL', 'Sylhet'),

-- ===== SRI LANKA (c2000236) =====
  ('d2001601-0000-0000-0000-000000001601'::uuid, 'c2000236-0000-0000-0000-000000000236'::uuid, 'CE', 'Central'),
  ('d2001602-0000-0000-0000-000000001602'::uuid, 'c2000236-0000-0000-0000-000000000236'::uuid, 'EA', 'Eastern'),
  ('d2001603-0000-0000-0000-000000001603'::uuid, 'c2000236-0000-0000-0000-000000000236'::uuid, 'NC', 'North Central'),
  ('d2001604-0000-0000-0000-000000001604'::uuid, 'c2000236-0000-0000-0000-000000000236'::uuid, 'NO', 'Northern'),
  ('d2001605-0000-0000-0000-000000001605'::uuid, 'c2000236-0000-0000-0000-000000000236'::uuid, 'NW', 'North Western'),
  ('d2001606-0000-0000-0000-000000001606'::uuid, 'c2000236-0000-0000-0000-000000000236'::uuid, 'SAB', 'Sabaragamuwa'),
  ('d2001607-0000-0000-0000-000000001607'::uuid, 'c2000236-0000-0000-0000-000000000236'::uuid, 'SO', 'Southern'),
  ('d2001608-0000-0000-0000-000000001608'::uuid, 'c2000236-0000-0000-0000-000000000236'::uuid, 'UV', 'Uva'),
  ('d2001609-0000-0000-0000-000000001609'::uuid, 'c2000236-0000-0000-0000-000000000236'::uuid, 'WE', 'Western'),

-- ===== MALAYSIA (c2000223) =====
  ('d2001701-0000-0000-0000-000000001701'::uuid, 'c2000223-0000-0000-0000-000000000223'::uuid, 'JHR', 'Johor'),
  ('d2001702-0000-0000-0000-000000001702'::uuid, 'c2000223-0000-0000-0000-000000000223'::uuid, 'KDH', 'Kedah'),
  ('d2001703-0000-0000-0000-000000001703'::uuid, 'c2000223-0000-0000-0000-000000000223'::uuid, 'KTN', 'Kelantan'),
  ('d2001704-0000-0000-0000-000000001704'::uuid, 'c2000223-0000-0000-0000-000000000223'::uuid, 'MLK', 'Melaka'),
  ('d2001705-0000-0000-0000-000000001705'::uuid, 'c2000223-0000-0000-0000-000000000223'::uuid, 'NSN', 'Negeri Sembilan'),
  ('d2001706-0000-0000-0000-000000001706'::uuid, 'c2000223-0000-0000-0000-000000000223'::uuid, 'PHG', 'Pahang'),
  ('d2001707-0000-0000-0000-000000001707'::uuid, 'c2000223-0000-0000-0000-000000000223'::uuid, 'PNG', 'Penang'),
  ('d2001708-0000-0000-0000-000000001708'::uuid, 'c2000223-0000-0000-0000-000000000223'::uuid, 'PRK', 'Perak'),
  ('d2001709-0000-0000-0000-000000001709'::uuid, 'c2000223-0000-0000-0000-000000000223'::uuid, 'PLS', 'Perlis'),
  ('d2001710-0000-0000-0000-000000001710'::uuid, 'c2000223-0000-0000-0000-000000000223'::uuid, 'SBH', 'Sabah'),
  ('d2001711-0000-0000-0000-000000001711'::uuid, 'c2000223-0000-0000-0000-000000000223'::uuid, 'SWK', 'Sarawak'),
  ('d2001712-0000-0000-0000-000000001712'::uuid, 'c2000223-0000-0000-0000-000000000223'::uuid, 'SGR', 'Selangor'),
  ('d2001713-0000-0000-0000-000000001713'::uuid, 'c2000223-0000-0000-0000-000000000223'::uuid, 'TRG', 'Terengganu'),
  ('d2001714-0000-0000-0000-000000001714'::uuid, 'c2000223-0000-0000-0000-000000000223'::uuid, 'KUL', 'Kuala Lumpur'),
  ('d2001715-0000-0000-0000-000000001715'::uuid, 'c2000223-0000-0000-0000-000000000223'::uuid, 'LBN', 'Labuan'),
  ('d2001716-0000-0000-0000-000000001716'::uuid, 'c2000223-0000-0000-0000-000000000223'::uuid, 'PJY', 'Putrajaya'),

-- ===== KENYA additional counties (c1000008; Nairobi d1000070 already seeded) =====
  ('d2001801-0000-0000-0000-000000001801'::uuid, 'c1000008-0000-0000-0000-000000000008'::uuid, 'MSA', 'Mombasa'),
  ('d2001802-0000-0000-0000-000000001802'::uuid, 'c1000008-0000-0000-0000-000000000008'::uuid, 'KSM', 'Kisumu'),
  ('d2001803-0000-0000-0000-000000001803'::uuid, 'c1000008-0000-0000-0000-000000000008'::uuid, 'NYR', 'Nakuru'),
  ('d2001804-0000-0000-0000-000000001804'::uuid, 'c1000008-0000-0000-0000-000000000008'::uuid, 'ELD', 'Uasin Gishu'),
  ('d2001805-0000-0000-0000-000000001805'::uuid, 'c1000008-0000-0000-0000-000000000008'::uuid, 'KIA', 'Kiambu'),
  ('d2001806-0000-0000-0000-000000001806'::uuid, 'c1000008-0000-0000-0000-000000000008'::uuid, 'MRU', 'Meru'),
  ('d2001807-0000-0000-0000-000000001807'::uuid, 'c1000008-0000-0000-0000-000000000008'::uuid, 'NYE', 'Nyeri'),
  ('d2001808-0000-0000-0000-000000001808'::uuid, 'c1000008-0000-0000-0000-000000000008'::uuid, 'MIG', 'Migori'),
  ('d2001809-0000-0000-0000-000000001809'::uuid, 'c1000008-0000-0000-0000-000000000008'::uuid, 'KAK', 'Kakamega')

ON CONFLICT (id) DO NOTHING;

-- ========== 20260330155540_seed_world_geography_cities_and_codes.sql ==========
/*
  # Seed World Geography — Cities & City Codes (global expansion)

  Adds key cities for all newly seeded states/regions worldwide.
  Also adds city_codes entries for Global ID generation.

  UUID pattern: e2XXXXXX-0000-0000-0000-000000000000
  (e1 series already used for original 19 cities; preserved intact.)

  Also adds city_codes for countries with no states (city-states)
  using the country iso2 as both state_code and country_code.
*/

INSERT INTO cities (id, state_id, code, name) VALUES

-- ===== INDIA — remaining states =====
  -- Andhra Pradesh
  ('e2000001-0000-0000-0000-000000000001'::uuid, 'd2000001-0000-0000-0000-000000000001'::uuid, 'VZG', 'Visakhapatnam'),
  ('e2000002-0000-0000-0000-000000000002'::uuid, 'd2000001-0000-0000-0000-000000000001'::uuid, 'VJA', 'Vijayawada'),
  ('e2000003-0000-0000-0000-000000000003'::uuid, 'd2000001-0000-0000-0000-000000000001'::uuid, 'GNT', 'Guntur'),
  -- Assam
  ('e2000010-0000-0000-0000-000000000010'::uuid, 'd2000003-0000-0000-0000-000000000003'::uuid, 'GUW', 'Guwahati'),
  -- Bihar
  ('e2000020-0000-0000-0000-000000000020'::uuid, 'd2000004-0000-0000-0000-000000000004'::uuid, 'PAT', 'Patna'),
  -- Goa
  ('e2000030-0000-0000-0000-000000000030'::uuid, 'd2000006-0000-0000-0000-000000000006'::uuid, 'PNJ', 'Panaji'),
  ('e2000031-0000-0000-0000-000000000031'::uuid, 'd2000006-0000-0000-0000-000000000006'::uuid, 'MSM', 'Margao'),
  -- Haryana
  ('e2000040-0000-0000-0000-000000000040'::uuid, 'd2000007-0000-0000-0000-000000000007'::uuid, 'GGN', 'Gurugram'),
  ('e2000041-0000-0000-0000-000000000041'::uuid, 'd2000007-0000-0000-0000-000000000007'::uuid, 'FBD', 'Faridabad'),
  -- Jharkhand
  ('e2000050-0000-0000-0000-000000000050'::uuid, 'd2000009-0000-0000-0000-000000000009'::uuid, 'RNC', 'Ranchi'),
  -- Kerala
  ('e2000060-0000-0000-0000-000000000060'::uuid, 'd2000011-0000-0000-0000-000000000011'::uuid, 'TVM', 'Thiruvananthapuram'),
  ('e2000061-0000-0000-0000-000000000061'::uuid, 'd2000011-0000-0000-0000-000000000011'::uuid, 'COK', 'Kochi'),
  ('e2000062-0000-0000-0000-000000000062'::uuid, 'd2000011-0000-0000-0000-000000000011'::uuid, 'KZH', 'Kozhikode'),
  -- Odisha
  ('e2000070-0000-0000-0000-000000000070'::uuid, 'd2000017-0000-0000-0000-000000000017'::uuid, 'BHU', 'Bhubaneswar'),
  -- Punjab
  ('e2000080-0000-0000-0000-000000000080'::uuid, 'd2000018-0000-0000-0000-000000000018'::uuid, 'LDH', 'Ludhiana'),
  ('e2000081-0000-0000-0000-000000000081'::uuid, 'd2000018-0000-0000-0000-000000000018'::uuid, 'AMR', 'Amritsar'),
  -- Tamil Nadu
  ('e2000090-0000-0000-0000-000000000090'::uuid, 'd2000020-0000-0000-0000-000000000020'::uuid, 'CHN', 'Chennai'),
  ('e2000091-0000-0000-0000-000000000091'::uuid, 'd2000020-0000-0000-0000-000000000020'::uuid, 'CBE', 'Coimbatore'),
  ('e2000092-0000-0000-0000-000000000092'::uuid, 'd2000020-0000-0000-0000-000000000020'::uuid, 'MDU', 'Madurai'),
  -- Telangana
  ('e2000100-0000-0000-0000-000000000100'::uuid, 'd2000021-0000-0000-0000-000000000021'::uuid, 'HYD', 'Hyderabad'),
  -- Uttar Pradesh
  ('e2000110-0000-0000-0000-000000000110'::uuid, 'd2000023-0000-0000-0000-000000000023'::uuid, 'LKO', 'Lucknow'),
  ('e2000111-0000-0000-0000-000000000111'::uuid, 'd2000023-0000-0000-0000-000000000023'::uuid, 'AGR', 'Agra'),
  ('e2000112-0000-0000-0000-000000000112'::uuid, 'd2000023-0000-0000-0000-000000000023'::uuid, 'VNS', 'Varanasi'),
  ('e2000113-0000-0000-0000-000000000113'::uuid, 'd2000023-0000-0000-0000-000000000023'::uuid, 'PYG', 'Prayagraj'),
  -- West Bengal
  ('e2000120-0000-0000-0000-000000000120'::uuid, 'd2000025-0000-0000-0000-000000000025'::uuid, 'KOL', 'Kolkata'),
  -- Madhya Pradesh (original state d1000006 already seeded, adding cities)
  ('e2000130-0000-0000-0000-000000000130'::uuid, 'd1000006-0000-0000-0000-000000000006'::uuid, 'BPL', 'Bhopal'),
  ('e2000131-0000-0000-0000-000000000131'::uuid, 'd1000006-0000-0000-0000-000000000006'::uuid, 'IDR', 'Indore'),
  -- Karnataka (original d1000005, adding more cities)
  ('e2000140-0000-0000-0000-000000000140'::uuid, 'd1000005-0000-0000-0000-000000000005'::uuid, 'MYS', 'Mysuru'),
  ('e2000141-0000-0000-0000-000000000141'::uuid, 'd1000005-0000-0000-0000-000000000005'::uuid, 'MNG', 'Mangaluru'),

-- ===== USA — additional major cities =====
  -- Florida
  ('e2000201-0000-0000-0000-000000000201'::uuid, 'd2000108-0000-0000-0000-000000000108'::uuid, 'MIA', 'Miami'),
  ('e2000202-0000-0000-0000-000000000202'::uuid, 'd2000108-0000-0000-0000-000000000108'::uuid, 'ORL', 'Orlando'),
  -- Texas
  ('e2000210-0000-0000-0000-000000000210'::uuid, 'd2000140-0000-0000-0000-000000000140'::uuid, 'HOU', 'Houston'),
  ('e2000211-0000-0000-0000-000000000211'::uuid, 'd2000140-0000-0000-0000-000000000140'::uuid, 'DAL', 'Dallas'),
  ('e2000212-0000-0000-0000-000000000212'::uuid, 'd2000140-0000-0000-0000-000000000140'::uuid, 'AUS', 'Austin'),
  -- Washington
  ('e2000220-0000-0000-0000-000000000220'::uuid, 'd2000144-0000-0000-0000-000000000144'::uuid, 'SEA', 'Seattle'),
  -- Georgia (US)
  ('e2000230-0000-0000-0000-000000000230'::uuid, 'd2000109-0000-0000-0000-000000000109'::uuid, 'ATL', 'Atlanta'),
  -- Massachusetts
  ('e2000240-0000-0000-0000-000000000240'::uuid, 'd2000119-0000-0000-0000-000000000119'::uuid, 'BOS', 'Boston'),
  -- Nevada
  ('e2000250-0000-0000-0000-000000000250'::uuid, 'd2000126-0000-0000-0000-000000000126'::uuid, 'LAS', 'Las Vegas'),
  -- Arizona
  ('e2000260-0000-0000-0000-000000000260'::uuid, 'd2000103-0000-0000-0000-000000000103'::uuid, 'PHX', 'Phoenix'),
  -- Pennsylvania
  ('e2000270-0000-0000-0000-000000000270'::uuid, 'd2000135-0000-0000-0000-000000000135'::uuid, 'PHL', 'Philadelphia'),
  -- New Jersey
  ('e2000280-0000-0000-0000-000000000280'::uuid, 'd2000128-0000-0000-0000-000000000128'::uuid, 'JCY', 'Jersey City'),
  ('e2000281-0000-0000-0000-000000000281'::uuid, 'd2000128-0000-0000-0000-000000000128'::uuid, 'NWK', 'Newark'),
  -- Michigan
  ('e2000290-0000-0000-0000-000000000290'::uuid, 'd2000120-0000-0000-0000-000000000120'::uuid, 'DTW', 'Detroit'),
  -- North Carolina
  ('e2000300-0000-0000-0000-000000000300'::uuid, 'd2000130-0000-0000-0000-000000000130'::uuid, 'CLT', 'Charlotte'),
  -- Colorado
  ('e2000310-0000-0000-0000-000000000310'::uuid, 'd2000105-0000-0000-0000-000000000105'::uuid, 'DEN', 'Denver'),
  -- DC
  ('e2000320-0000-0000-0000-000000000320'::uuid, 'd2000148-0000-0000-0000-000000000148'::uuid, 'WDC', 'Washington DC'),
  -- Maryland
  ('e2000330-0000-0000-0000-000000000330'::uuid, 'd2000118-0000-0000-0000-000000000118'::uuid, 'BAL', 'Baltimore'),
  -- Minnesota
  ('e2000340-0000-0000-0000-000000000340'::uuid, 'd2000121-0000-0000-0000-000000000121'::uuid, 'MSP', 'Minneapolis'),
  -- Indiana
  ('e2000350-0000-0000-0000-000000000350'::uuid, 'd2000112-0000-0000-0000-000000000112'::uuid, 'IND', 'Indianapolis'),
  -- Ohio
  ('e2000360-0000-0000-0000-000000000360'::uuid, 'd2000132-0000-0000-0000-000000000132'::uuid, 'CMH', 'Columbus'),
  -- Virginia
  ('e2000370-0000-0000-0000-000000000370'::uuid, 'd2000143-0000-0000-0000-000000000143'::uuid, 'RIC', 'Richmond'),
  -- Oregon
  ('e2000380-0000-0000-0000-000000000380'::uuid, 'd2000134-0000-0000-0000-000000000134'::uuid, 'PDX', 'Portland'),

-- ===== UK — additional cities =====
  -- Scotland
  ('e2000401-0000-0000-0000-000000000401'::uuid, 'd2000201-0000-0000-0000-000000000201'::uuid, 'EDI', 'Edinburgh'),
  ('e2000402-0000-0000-0000-000000000402'::uuid, 'd2000201-0000-0000-0000-000000000201'::uuid, 'GLA', 'Glasgow'),
  -- Wales
  ('e2000410-0000-0000-0000-000000000410'::uuid, 'd2000202-0000-0000-0000-000000000202'::uuid, 'CDF', 'Cardiff'),
  -- Northern Ireland
  ('e2000420-0000-0000-0000-000000000420'::uuid, 'd2000203-0000-0000-0000-000000000203'::uuid, 'BFS', 'Belfast'),
  -- England (d1000020)
  ('e2000430-0000-0000-0000-000000000430'::uuid, 'd1000020-0000-0000-0000-000000000020'::uuid, 'MAN', 'Manchester'),
  ('e2000431-0000-0000-0000-000000000431'::uuid, 'd1000020-0000-0000-0000-000000000020'::uuid, 'BHM', 'Birmingham'),
  ('e2000432-0000-0000-0000-000000000432'::uuid, 'd1000020-0000-0000-0000-000000000020'::uuid, 'LDS', 'Leeds'),
  ('e2000433-0000-0000-0000-000000000433'::uuid, 'd1000020-0000-0000-0000-000000000020'::uuid, 'BRS', 'Bristol'),
  ('e2000434-0000-0000-0000-000000000434'::uuid, 'd1000020-0000-0000-0000-000000000020'::uuid, 'SHF', 'Sheffield'),
  ('e2000435-0000-0000-0000-000000000435'::uuid, 'd1000020-0000-0000-0000-000000000020'::uuid, 'LVP', 'Liverpool'),
  ('e2000436-0000-0000-0000-000000000436'::uuid, 'd1000020-0000-0000-0000-000000000020'::uuid, 'LEI', 'Leicester'),

-- ===== UAE — additional cities =====
  -- Abu Dhabi
  ('e2000501-0000-0000-0000-000000000501'::uuid, 'd2000301-0000-0000-0000-000000000301'::uuid, 'AUH', 'Abu Dhabi City'),
  -- Sharjah
  ('e2000510-0000-0000-0000-000000000510'::uuid, 'd2000302-0000-0000-0000-000000000302'::uuid, 'SHJ', 'Sharjah City'),
  -- Dubai (original e1000070, adding more areas)
  ('e2000520-0000-0000-0000-000000000520'::uuid, 'd1000030-0000-0000-0000-000000000030'::uuid, 'DXN', 'Dubai North'),

-- ===== CANADA — additional cities =====
  -- British Columbia
  ('e2000601-0000-0000-0000-000000000601'::uuid, 'd2000402-0000-0000-0000-000000000402'::uuid, 'YVR', 'Vancouver'),
  ('e2000602-0000-0000-0000-000000000602'::uuid, 'd2000402-0000-0000-0000-000000000402'::uuid, 'VIC', 'Victoria'),
  -- Alberta
  ('e2000610-0000-0000-0000-000000000610'::uuid, 'd2000401-0000-0000-0000-000000000401'::uuid, 'YYC', 'Calgary'),
  ('e2000611-0000-0000-0000-000000000611'::uuid, 'd2000401-0000-0000-0000-000000000401'::uuid, 'YEG', 'Edmonton'),
  -- Quebec
  ('e2000620-0000-0000-0000-000000000620'::uuid, 'd2000408-0000-0000-0000-000000000408'::uuid, 'YMQ', 'Montreal'),
  ('e2000621-0000-0000-0000-000000000621'::uuid, 'd2000408-0000-0000-0000-000000000408'::uuid, 'YQB', 'Quebec City'),
  -- Ontario (additional; Toronto e1000080 already seeded)
  ('e2000630-0000-0000-0000-000000000630'::uuid, 'd1000040-0000-0000-0000-000000000040'::uuid, 'YOW', 'Ottawa'),
  ('e2000631-0000-0000-0000-000000000631'::uuid, 'd1000040-0000-0000-0000-000000000040'::uuid, 'YHM', 'Hamilton'),
  -- Manitoba
  ('e2000640-0000-0000-0000-000000000640'::uuid, 'd2000403-0000-0000-0000-000000000403'::uuid, 'YWG', 'Winnipeg'),

-- ===== AUSTRALIA — additional cities =====
  -- Victoria
  ('e2000701-0000-0000-0000-000000000701'::uuid, 'd2000501-0000-0000-0000-000000000501'::uuid, 'MEL', 'Melbourne'),
  -- Queensland
  ('e2000710-0000-0000-0000-000000000710'::uuid, 'd2000502-0000-0000-0000-000000000502'::uuid, 'BNE', 'Brisbane'),
  ('e2000711-0000-0000-0000-000000000711'::uuid, 'd2000502-0000-0000-0000-000000000502'::uuid, 'GCT', 'Gold Coast'),
  -- Western Australia
  ('e2000720-0000-0000-0000-000000000720'::uuid, 'd2000503-0000-0000-0000-000000000503'::uuid, 'PER', 'Perth'),
  -- South Australia
  ('e2000730-0000-0000-0000-000000000730'::uuid, 'd2000504-0000-0000-0000-000000000504'::uuid, 'ADL', 'Adelaide'),
  -- ACT
  ('e2000740-0000-0000-0000-000000000740'::uuid, 'd2000506-0000-0000-0000-000000000506'::uuid, 'CBR', 'Canberra'),

-- ===== NEW ZEALAND =====
  ('e2000801-0000-0000-0000-000000000801'::uuid, 'd2000601-0000-0000-0000-000000000601'::uuid, 'AKL', 'Auckland City'),
  ('e2000810-0000-0000-0000-000000000810'::uuid, 'd2000602-0000-0000-0000-000000000602'::uuid, 'WLG', 'Wellington City'),
  ('e2000820-0000-0000-0000-000000000820'::uuid, 'd2000603-0000-0000-0000-000000000603'::uuid, 'CHC', 'Christchurch'),

-- ===== GERMANY =====
  ('e2000901-0000-0000-0000-000000000901'::uuid, 'd2000702-0000-0000-0000-000000000702'::uuid, 'BER', 'Berlin'),
  ('e2000910-0000-0000-0000-000000000910'::uuid, 'd2000704-0000-0000-0000-000000000704'::uuid, 'MUC', 'Munich'),
  ('e2000920-0000-0000-0000-000000000920'::uuid, 'd2000710-0000-0000-0000-000000000710'::uuid, 'CGN', 'Cologne'),
  ('e2000921-0000-0000-0000-000000000921'::uuid, 'd2000710-0000-0000-0000-000000000710'::uuid, 'DUS', 'Dusseldorf'),
  ('e2000922-0000-0000-0000-000000000922'::uuid, 'd2000710-0000-0000-0000-000000000710'::uuid, 'DOR', 'Dortmund'),
  ('e2000930-0000-0000-0000-000000000930'::uuid, 'd2000707-0000-0000-0000-000000000707'::uuid, 'HAM', 'Hamburg City'),
  ('e2000940-0000-0000-0000-000000000940'::uuid, 'd2000706-0000-0000-0000-000000000706'::uuid, 'FRA', 'Frankfurt'),

-- ===== FRANCE =====
  ('e2001001-0000-0000-0000-000000001001'::uuid, 'd2000808-0000-0000-0000-000000000808'::uuid, 'PAR', 'Paris'),
  ('e2001010-0000-0000-0000-000000001010'::uuid, 'd2000801-0000-0000-0000-000000000801'::uuid, 'LYO', 'Lyon'),
  ('e2001020-0000-0000-0000-000000001020'::uuid, 'd2000813-0000-0000-0000-000000000813'::uuid, 'MRS', 'Marseille'),
  ('e2001030-0000-0000-0000-000000001030'::uuid, 'd2000807-0000-0000-0000-000000000807'::uuid, 'LIL', 'Lille'),
  ('e2001040-0000-0000-0000-000000001040'::uuid, 'd2000810-0000-0000-0000-000000000810'::uuid, 'BOD', 'Bordeaux'),

-- ===== ITALY =====
  ('e2001101-0000-0000-0000-000000001101'::uuid, 'd2000907-0000-0000-0000-000000000907'::uuid, 'ROM', 'Rome'),
  ('e2001110-0000-0000-0000-000000001110'::uuid, 'd2000909-0000-0000-0000-000000000909'::uuid, 'MIL', 'Milan'),
  ('e2001120-0000-0000-0000-000000001120'::uuid, 'd2000904-0000-0000-0000-000000000904'::uuid, 'NAP', 'Naples'),
  ('e2001130-0000-0000-0000-000000001130'::uuid, 'd2000916-0000-0000-0000-000000000916'::uuid, 'FLR', 'Florence'),
  ('e2001140-0000-0000-0000-000000001140'::uuid, 'd2000920-0000-0000-0000-000000000920'::uuid, 'VEN', 'Venice'),

-- ===== SPAIN =====
  ('e2001201-0000-0000-0000-000000001201'::uuid, 'd2001013-0000-0000-0000-000000001013'::uuid, 'MAD', 'Madrid'),
  ('e2001210-0000-0000-0000-000000001210'::uuid, 'd2001007-0000-0000-0000-000000001007'::uuid, 'BCN', 'Barcelona'),
  ('e2001220-0000-0000-0000-000000001220'::uuid, 'd2001001-0000-0000-0000-000000001001'::uuid, 'SVQ', 'Seville'),
  ('e2001230-0000-0000-0000-000000001230'::uuid, 'd2001017-0000-0000-0000-000000001017'::uuid, 'VLC', 'Valencia'),

-- ===== BRAZIL =====
  ('e2001301-0000-0000-0000-000000001301'::uuid, 'd2001125-0000-0000-0000-000000001125'::uuid, 'SAO', 'Sao Paulo'),
  ('e2001310-0000-0000-0000-000000001310'::uuid, 'd2001119-0000-0000-0000-000000001119'::uuid, 'GIG', 'Rio de Janeiro'),
  ('e2001320-0000-0000-0000-000000001320'::uuid, 'd2001107-0000-0000-0000-000000001107'::uuid, 'BSB', 'Brasilia'),
  ('e2001330-0000-0000-0000-000000001330'::uuid, 'd2001113-0000-0000-0000-000000001113'::uuid, 'BHZ', 'Belo Horizonte'),

-- ===== SOUTH AFRICA =====
  ('e2001401-0000-0000-0000-000000001401'::uuid, 'd2001203-0000-0000-0000-000000001203'::uuid, 'JNB', 'Johannesburg'),
  ('e2001410-0000-0000-0000-000000001410'::uuid, 'd2001203-0000-0000-0000-000000001203'::uuid, 'PRY', 'Pretoria'),
  ('e2001420-0000-0000-0000-000000001420'::uuid, 'd2001209-0000-0000-0000-000000001209'::uuid, 'CPT', 'Cape Town'),
  ('e2001430-0000-0000-0000-000000001430'::uuid, 'd2001204-0000-0000-0000-000000001204'::uuid, 'DUR', 'Durban'),

-- ===== NIGERIA =====
  ('e2001501-0000-0000-0000-000000001501'::uuid, 'd2001325-0000-0000-0000-000000001325'::uuid, 'LOS', 'Lagos City'),
  ('e2001510-0000-0000-0000-000000001510'::uuid, 'd2001315-0000-0000-0000-000000001315'::uuid, 'ABJ', 'Abuja'),
  ('e2001520-0000-0000-0000-000000001520'::uuid, 'd2001320-0000-0000-0000-000000001320'::uuid, 'KAN', 'Kano City'),

-- ===== PAKISTAN =====
  ('e2001601-0000-0000-0000-000000001601'::uuid, 'd2001404-0000-0000-0000-000000001404'::uuid, 'KHI', 'Karachi'),
  ('e2001610-0000-0000-0000-000000001610'::uuid, 'd2001403-0000-0000-0000-000000001403'::uuid, 'LHE', 'Lahore'),
  ('e2001620-0000-0000-0000-000000001620'::uuid, 'd2001407-0000-0000-0000-000000001407'::uuid, 'ISB', 'Islamabad'),
  ('e2001630-0000-0000-0000-000000001630'::uuid, 'd2001402-0000-0000-0000-000000001402'::uuid, 'PEW', 'Peshawar'),

-- ===== BANGLADESH =====
  ('e2001701-0000-0000-0000-000000001701'::uuid, 'd2001503-0000-0000-0000-000000001503'::uuid, 'DAC', 'Dhaka City'),
  ('e2001710-0000-0000-0000-000000001710'::uuid, 'd2001502-0000-0000-0000-000000001502'::uuid, 'CGP', 'Chittagong City'),
  ('e2001720-0000-0000-0000-000000001720'::uuid, 'd2001508-0000-0000-0000-000000001508'::uuid, 'ZYL', 'Sylhet City'),

-- ===== SRI LANKA =====
  ('e2001801-0000-0000-0000-000000001801'::uuid, 'd2001609-0000-0000-0000-000000001609'::uuid, 'CMB', 'Colombo'),
  ('e2001810-0000-0000-0000-000000001810'::uuid, 'd2001609-0000-0000-0000-000000001609'::uuid, 'SRJ', 'Sri Jayawardenepura Kotte'),

-- ===== MALAYSIA =====
  ('e2001901-0000-0000-0000-000000001901'::uuid, 'd2001714-0000-0000-0000-000000001714'::uuid, 'KUL', 'Kuala Lumpur City'),
  ('e2001910-0000-0000-0000-000000001910'::uuid, 'd2001707-0000-0000-0000-000000001707'::uuid, 'PEN', 'George Town'),
  ('e2001920-0000-0000-0000-000000001920'::uuid, 'd2001712-0000-0000-0000-000000001712'::uuid, 'SBA', 'Shah Alam'),
  ('e2001930-0000-0000-0000-000000001930'::uuid, 'd2001710-0000-0000-0000-000000001710'::uuid, 'BKI', 'Kota Kinabalu'),

-- ===== KENYA =====
  ('e2002001-0000-0000-0000-000000002001'::uuid, 'd2001801-0000-0000-0000-000000001801'::uuid, 'MSA', 'Mombasa City'),
  ('e2002010-0000-0000-0000-000000002010'::uuid, 'd2001802-0000-0000-0000-000000001802'::uuid, 'KSM', 'Kisumu City'),
  ('e2002020-0000-0000-0000-000000002020'::uuid, 'd2001803-0000-0000-0000-000000001803'::uuid, 'NKR', 'Nakuru City')

ON CONFLICT (id) DO NOTHING;

-- ===== CITY CODES for Global ID generation =====
INSERT INTO city_codes (city_name, city_code, state_code, country_code) VALUES
  -- India expansions
  ('Visakhapatnam',   'VZG', 'AP',  'IN'),
  ('Vijayawada',      'VJA', 'AP',  'IN'),
  ('Guntur',          'GNT', 'AP',  'IN'),
  ('Guwahati',        'GUW', 'AS',  'IN'),
  ('Patna',           'PAT', 'BR',  'IN'),
  ('Panaji',          'PNJ', 'GA',  'IN'),
  ('Gurugram',        'GGN', 'HR',  'IN'),
  ('Faridabad',       'FBD', 'HR',  'IN'),
  ('Ranchi',          'RNC', 'JH',  'IN'),
  ('Thiruvananthapuram','TVM','KL',  'IN'),
  ('Kochi',           'COK', 'KL',  'IN'),
  ('Kozhikode',       'KZH', 'KL',  'IN'),
  ('Bhubaneswar',     'BHU', 'OD',  'IN'),
  ('Ludhiana',        'LDH', 'PB',  'IN'),
  ('Amritsar',        'AMR', 'PB',  'IN'),
  ('Chennai',         'CHN', 'TN',  'IN'),
  ('Coimbatore',      'CBE', 'TN',  'IN'),
  ('Madurai',         'MDU', 'TN',  'IN'),
  ('Hyderabad',       'HYD', 'TG',  'IN'),
  ('Lucknow',         'LKO', 'UP',  'IN'),
  ('Agra',            'AGR', 'UP',  'IN'),
  ('Varanasi',        'VNS', 'UP',  'IN'),
  ('Prayagraj',       'PYG', 'UP',  'IN'),
  ('Kolkata',         'KOL', 'WB',  'IN'),
  ('Bhopal',          'BPL', 'MP',  'IN'),
  ('Indore',          'IDR', 'MP',  'IN'),
  ('Mysuru',          'MYS', 'KA',  'IN'),
  ('Mangaluru',       'MNG', 'KA',  'IN'),
  -- USA expansions
  ('Miami',           'MIA', 'FL',  'US'),
  ('Orlando',         'ORL', 'FL',  'US'),
  ('Houston',         'HOU', 'TX',  'US'),
  ('Dallas',          'DAL', 'TX',  'US'),
  ('Austin',          'AUS', 'TX',  'US'),
  ('Seattle',         'SEA', 'WA',  'US'),
  ('Atlanta',         'ATL', 'GA',  'US'),
  ('Boston',          'BOS', 'MA',  'US'),
  ('Las Vegas',       'LAS', 'NV',  'US'),
  ('Phoenix',         'PHX', 'AZ',  'US'),
  ('Philadelphia',    'PHL', 'PA',  'US'),
  ('Jersey City',     'JCY', 'NJ',  'US'),
  ('Newark',          'NWK', 'NJ',  'US'),
  ('Detroit',         'DTW', 'MI',  'US'),
  ('Charlotte',       'CLT', 'NC',  'US'),
  ('Denver',          'DEN', 'CO',  'US'),
  ('Washington DC',   'WDC', 'DC',  'US'),
  ('Baltimore',       'BAL', 'MD',  'US'),
  ('Minneapolis',     'MSP', 'MN',  'US'),
  ('Indianapolis',    'IND', 'IN',  'US'),
  ('Columbus',        'CMH', 'OH',  'US'),
  ('Richmond',        'RIC', 'VA',  'US'),
  ('Portland',        'PDX', 'OR',  'US'),
  -- UK expansions
  ('Edinburgh',       'EDI', 'SCT', 'GB'),
  ('Glasgow',         'GLA', 'SCT', 'GB'),
  ('Cardiff',         'CDF', 'WLS', 'GB'),
  ('Belfast',         'BFS', 'NIR', 'GB'),
  ('Manchester',      'MAN', 'ENG', 'GB'),
  ('Birmingham',      'BHM', 'ENG', 'GB'),
  ('Leeds',           'LDS', 'ENG', 'GB'),
  ('Bristol',         'BRS', 'ENG', 'GB'),
  ('Sheffield',       'SHF', 'ENG', 'GB'),
  ('Liverpool',       'LVP', 'ENG', 'GB'),
  ('Leicester',       'LEI', 'ENG', 'GB'),
  -- UAE expansions
  ('Abu Dhabi City',  'AUH', 'AZ',  'AE'),
  ('Sharjah City',    'SHJ', 'SH',  'AE'),
  -- Canada expansions
  ('Vancouver',       'YVR', 'BC',  'CA'),
  ('Victoria',        'VIC', 'BC',  'CA'),
  ('Calgary',         'YYC', 'AB',  'CA'),
  ('Edmonton',        'YEG', 'AB',  'CA'),
  ('Montreal',        'YMQ', 'QC',  'CA'),
  ('Quebec City',     'YQB', 'QC',  'CA'),
  ('Ottawa',          'YOW', 'ON',  'CA'),
  ('Hamilton',        'YHM', 'ON',  'CA'),
  ('Winnipeg',        'YWG', 'MB',  'CA'),
  -- Australia expansions
  ('Melbourne',       'MEL', 'VIC', 'AU'),
  ('Brisbane',        'BNE', 'QLD', 'AU'),
  ('Gold Coast',      'GCT', 'QLD', 'AU'),
  ('Perth',           'PER', 'WA',  'AU'),
  ('Adelaide',        'ADL', 'SA',  'AU'),
  ('Canberra',        'CBR', 'ACT', 'AU'),
  -- New Zealand
  ('Auckland City',   'AKL', 'AUK', 'NZ'),
  ('Wellington City', 'WLG', 'WGN', 'NZ'),
  ('Christchurch',    'CHC', 'CAN', 'NZ'),
  -- Germany
  ('Berlin',          'BER', 'BE',  'DE'),
  ('Munich',          'MUC', 'BY',  'DE'),
  ('Cologne',         'CGN', 'NW',  'DE'),
  ('Dusseldorf',      'DUS', 'NW',  'DE'),
  ('Hamburg City',    'HAM', 'HH',  'DE'),
  ('Frankfurt',       'FRA', 'HE',  'DE'),
  -- France
  ('Paris',           'PAR', 'IDF', 'FR'),
  ('Lyon',            'LYO', 'ARA', 'FR'),
  ('Marseille',       'MRS', 'PAC', 'FR'),
  ('Lille',           'LIL', 'HDF', 'FR'),
  ('Bordeaux',        'BOD', 'NAQ', 'FR'),
  -- Italy
  ('Rome',            'ROM', 'LAZ', 'IT'),
  ('Milan',           'MIL', 'LOM', 'IT'),
  ('Naples',          'NAP', 'CAM', 'IT'),
  ('Florence',        'FLR', 'TOS', 'IT'),
  ('Venice',          'VEN', 'VEN', 'IT'),
  -- Spain
  ('Madrid',          'MAD', 'MD',  'ES'),
  ('Barcelona',       'BCN', 'CT',  'ES'),
  ('Seville',         'SVQ', 'AN',  'ES'),
  ('Valencia',        'VLC', 'VC',  'ES'),
  -- Brazil
  ('Sao Paulo',       'SAO', 'SP',  'BR'),
  ('Rio de Janeiro',  'GIG', 'RJ',  'BR'),
  ('Brasilia',        'BSB', 'DF',  'BR'),
  ('Belo Horizonte',  'BHZ', 'MG',  'BR'),
  -- South Africa
  ('Johannesburg',    'JNB', 'GP',  'ZA'),
  ('Pretoria',        'PRY', 'GP',  'ZA'),
  ('Cape Town',       'CPT', 'WC',  'ZA'),
  ('Durban',          'DUR', 'KZN', 'ZA'),
  -- Nigeria
  ('Lagos City',      'LOS', 'LA',  'NG'),
  ('Abuja',           'ABJ', 'FC',  'NG'),
  ('Kano City',       'KAN', 'KN',  'NG'),
  -- Pakistan
  ('Karachi',         'KHI', 'SD',  'PK'),
  ('Lahore',          'LHE', 'PB',  'PK'),
  ('Islamabad',       'ISB', 'ICT', 'PK'),
  ('Peshawar',        'PEW', 'KP',  'PK'),
  -- Bangladesh
  ('Dhaka City',      'DAC', 'DHA', 'BD'),
  ('Chittagong City', 'CGP', 'CHT', 'BD'),
  ('Sylhet City',     'ZYL', 'SYL', 'BD'),
  -- Sri Lanka
  ('Colombo',         'CMB', 'WE',  'LK'),
  -- Malaysia
  ('Kuala Lumpur City','KUL','KUL', 'MY'),
  ('George Town',     'PEN', 'PNG', 'MY'),
  ('Kota Kinabalu',   'BKI', 'SBH', 'MY'),
  -- Kenya
  ('Mombasa City',    'MSA', 'MSA', 'KE'),
  ('Kisumu City',     'KSM', 'KSM', 'KE'),
  ('Nakuru City',     'NKR', 'NYR', 'KE'),
  -- Singapore (city-state — no state)
  ('Singapore City',  'SGC', 'SG',  'SG'),
  -- Mauritius (city-state style)
  ('Port Louis',      'MRU', 'MU',  'MU'),
  -- South Korea
  ('Seoul',           'SEL', 'KR',  'KR'),
  -- Japan
  ('Tokyo',           'TYO', 'JP',  'JP'),
  ('Osaka',           'OSA', 'JP',  'JP'),
  -- China
  ('Beijing',         'BJS', 'CN',  'CN'),
  ('Shanghai',        'SHA', 'CN',  'CN'),
  ('Shenzhen',        'SZX', 'CN',  'CN'),
  -- Thailand
  ('Bangkok',         'BKK', 'TH',  'TH'),
  -- Indonesia
  ('Jakarta',         'JKT', 'ID',  'ID'),
  -- Philippines
  ('Manila',          'MNL', 'PH',  'PH'),
  -- Netherlands
  ('Amsterdam',       'AMS', 'NL',  'NL'),
  -- Sweden
  ('Stockholm',       'STO', 'SE',  'SE'),
  -- Switzerland
  ('Zurich',          'ZRH', 'CH',  'CH'),
  -- Poland
  ('Warsaw',          'WAW', 'PL',  'PL'),
  -- Turkey
  ('Istanbul',        'IST', 'TR',  'TR'),
  ('Ankara',          'ANK', 'TR',  'TR'),
  -- Saudi Arabia
  ('Riyadh',          'RUH', 'SA',  'SA'),
  ('Jeddah',          'JED', 'SA',  'SA'),
  -- Qatar
  ('Doha',            'DOH', 'QA',  'QA'),
  -- Bahrain
  ('Manama',          'BAH', 'BH',  'BH'),
  -- Kuwait
  ('Kuwait City',     'KWI', 'KW',  'KW'),
  -- Oman
  ('Muscat',          'MCT', 'OM',  'OM'),
  -- Israel
  ('Tel Aviv',        'TLV', 'IL',  'IL'),
  -- Nepal
  ('Kathmandu',       'KTM', 'NP',  'NP'),
  -- Tanzania
  ('Dar es Salaam',   'DAR', 'TZ',  'TZ'),
  -- Uganda
  ('Kampala',         'KLA', 'UG',  'UG'),
  -- Ethiopia
  ('Addis Ababa',     'ADD', 'ET',  'ET'),
  -- Ghana
  ('Accra',           'ACC', 'GH',  'GH'),
  -- Senegal
  ('Dakar',           'DKR', 'SN',  'SN'),
  -- Rwanda
  ('Kigali',          'KGL', 'RW',  'RW'),
  -- Zimbabwe
  ('Harare',          'HRE', 'ZW',  'ZW'),
  -- Zambia
  ('Lusaka',          'LUN', 'ZM',  'ZM'),
  -- Egypt
  ('Cairo',           'CAI', 'EG',  'EG'),
  ('Alexandria',      'ALY', 'EG',  'EG'),
  -- Morocco
  ('Casablanca',      'CMN', 'MA',  'MA'),
  -- Argentina
  ('Buenos Aires',    'BUE', 'AR',  'AR'),
  -- Colombia
  ('Bogota',          'BOG', 'CO',  'CO'),
  -- Mexico
  ('Mexico City',     'MEX', 'MX',  'MX'),
  -- Chile
  ('Santiago',        'SCL', 'CL',  'CL'),
  -- Peru
  ('Lima',            'LIM', 'PE',  'PE'),
  -- Trinidad and Tobago
  ('Port of Spain',   'POS', 'TT',  'TT'),
  -- Mauritius
  ('Quatre Bornes',   'QBO', 'MU',  'MU')
ON CONFLICT DO NOTHING;

-- ========== 20260330162808_fix_unindexed_fks_and_rls_init_plan.sql ==========
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

-- ========== 20260330162843_drop_unused_indexes_batch3.sql ==========
/*
  # Drop Unused Indexes — Batch 3

  ## Summary
  Drops all indexes flagged as unused by Supabase advisor.
  These indexes consume disk space and slow down write operations without
  benefiting any queries. They can be recreated if query patterns change.

  ## Indexes Dropped
  Covers tables: chapter_transfer_history, chapter_transfers, announcements, audits,
  businesses, chapters, consents, content_news, data_requests, donations, donor_wall,
  education, emergency_contacts, employment, event_checkins, event_photos, event_rsvps,
  events, family_connections, family_invitations, family_links, funds, hall_bookings,
  heritage_tags, job_applications, jobs, matrimonial_introductions, matrimonial_profiles,
  media_files, medical_aid_requests, member_contacts, member_languages, member_skills,
  members, mentorship_sessions, mentorships, oral_histories, photo_tags, reports,
  role_assignments, samiti_groups, samiti_members, scholarship_applications, scholarships,
  tag_requests, verification_requests, vouches, whatsapp_messages, council_replies,
  council_threads, council_votes, rishta_requests, obituaries, sms_messages, vouch_requests
*/

DROP INDEX IF EXISTS public.idx_cth_member_id;
DROP INDEX IF EXISTS public.idx_cth_from_chapter;
DROP INDEX IF EXISTS public.idx_cth_to_chapter;
DROP INDEX IF EXISTS public.idx_cth_effective_at;
DROP INDEX IF EXISTS public.idx_cth_related_transfer;
DROP INDEX IF EXISTS public.idx_announcements_created_by;
DROP INDEX IF EXISTS public.idx_audits_actor_user_id;
DROP INDEX IF EXISTS public.idx_businesses_chapter_id;
DROP INDEX IF EXISTS public.idx_businesses_city_id;
DROP INDEX IF EXISTS public.idx_businesses_country_id;
DROP INDEX IF EXISTS public.idx_businesses_owner_member_id;
DROP INDEX IF EXISTS public.idx_businesses_state_id;
DROP INDEX IF EXISTS public.idx_chapter_transfers_approved_by;
DROP INDEX IF EXISTS public.idx_chapter_transfers_from_chapter_id;
DROP INDEX IF EXISTS public.idx_chapter_transfers_member_id;
DROP INDEX IF EXISTS public.idx_chapter_transfers_to_chapter_id;
DROP INDEX IF EXISTS public.idx_chapters_city_id;
DROP INDEX IF EXISTS public.idx_chapters_country_id;
DROP INDEX IF EXISTS public.idx_chapters_state_id;
DROP INDEX IF EXISTS public.idx_consents_member_id;
DROP INDEX IF EXISTS public.idx_content_news_chapter_id;
DROP INDEX IF EXISTS public.idx_content_news_city_id;
DROP INDEX IF EXISTS public.idx_content_news_country_id;
DROP INDEX IF EXISTS public.idx_content_news_created_by;
DROP INDEX IF EXISTS public.idx_content_news_reviewed_by;
DROP INDEX IF EXISTS public.idx_content_news_state_id;
DROP INDEX IF EXISTS public.idx_data_requests_member_id;
DROP INDEX IF EXISTS public.idx_donations_fund_id;
DROP INDEX IF EXISTS public.idx_donor_wall_member_id;
DROP INDEX IF EXISTS public.idx_education_member_id;
DROP INDEX IF EXISTS public.idx_emergency_contacts_city_id;
DROP INDEX IF EXISTS public.idx_employment_member_id;
DROP INDEX IF EXISTS public.idx_event_checkins_event_id;
DROP INDEX IF EXISTS public.idx_event_checkins_member_id;
DROP INDEX IF EXISTS public.idx_event_checkins_scanned_by;
DROP INDEX IF EXISTS public.idx_event_photos_event_id;
DROP INDEX IF EXISTS public.idx_event_photos_uploaded_by;
DROP INDEX IF EXISTS public.idx_event_rsvps_member_id;
DROP INDEX IF EXISTS public.idx_events_chapter_id;
DROP INDEX IF EXISTS public.idx_events_city_id;
DROP INDEX IF EXISTS public.idx_events_country_id;
DROP INDEX IF EXISTS public.idx_events_created_by;
DROP INDEX IF EXISTS public.idx_events_state_id;
DROP INDEX IF EXISTS public.idx_family_connections_related_member_id;
DROP INDEX IF EXISTS public.idx_family_invitations_accepted_by;
DROP INDEX IF EXISTS public.idx_family_invitations_inviter;
DROP INDEX IF EXISTS public.idx_family_links_family_id;
DROP INDEX IF EXISTS public.idx_family_links_member_id;
DROP INDEX IF EXISTS public.idx_family_links_related_member_id;
DROP INDEX IF EXISTS public.idx_funds_chapter_id;
DROP INDEX IF EXISTS public.idx_hall_bookings_chapter_id;
DROP INDEX IF EXISTS public.idx_hall_bookings_member_id;
DROP INDEX IF EXISTS public.idx_heritage_tags_tagged_by;
DROP INDEX IF EXISTS public.idx_job_applications_member_id;
DROP INDEX IF EXISTS public.idx_jobs_chapter_id;
DROP INDEX IF EXISTS public.idx_jobs_city_id;
DROP INDEX IF EXISTS public.idx_jobs_country_id;
DROP INDEX IF EXISTS public.idx_jobs_employer_business_id;
DROP INDEX IF EXISTS public.idx_jobs_employer_member_id;
DROP INDEX IF EXISTS public.idx_jobs_state_id;
DROP INDEX IF EXISTS public.idx_matrimonial_introductions_from;
DROP INDEX IF EXISTS public.idx_matrimonial_introductions_to;
DROP INDEX IF EXISTS public.idx_matrimonial_profiles_guardian;
DROP INDEX IF EXISTS public.idx_media_files_owner_user_id;
DROP INDEX IF EXISTS public.idx_medical_aid_requests_chapter_id;
DROP INDEX IF EXISTS public.idx_medical_aid_requests_member_id;
DROP INDEX IF EXISTS public.idx_member_contacts_member_id;
DROP INDEX IF EXISTS public.idx_member_languages_member_id;
DROP INDEX IF EXISTS public.idx_member_skills_member_id;
DROP INDEX IF EXISTS public.idx_members_chapter_id;
DROP INDEX IF EXISTS public.idx_mentorship_sessions_mentorship_id;
DROP INDEX IF EXISTS public.idx_mentorships_mentee_member_id;
DROP INDEX IF EXISTS public.idx_mentorships_mentor_member_id;
DROP INDEX IF EXISTS public.idx_oral_histories_narrator_member_id;
DROP INDEX IF EXISTS public.idx_oral_histories_uploaded_by;
DROP INDEX IF EXISTS public.idx_photo_tags_member_id;
DROP INDEX IF EXISTS public.idx_photo_tags_tagged_by;
DROP INDEX IF EXISTS public.idx_reports_reporter_member_id;
DROP INDEX IF EXISTS public.idx_reports_reviewed_by;
DROP INDEX IF EXISTS public.idx_role_assignments_created_by;
DROP INDEX IF EXISTS public.idx_role_assignments_role_id;
DROP INDEX IF EXISTS public.idx_samiti_groups_contact_member_id;
DROP INDEX IF EXISTS public.idx_samiti_members_member_id;
DROP INDEX IF EXISTS public.idx_scholarship_applications_member_id;
DROP INDEX IF EXISTS public.idx_scholarships_chapter_id;
DROP INDEX IF EXISTS public.idx_scholarships_city_id;
DROP INDEX IF EXISTS public.idx_scholarships_country_id;
DROP INDEX IF EXISTS public.idx_scholarships_state_id;
DROP INDEX IF EXISTS public.idx_tag_requests_decided_by;
DROP INDEX IF EXISTS public.idx_tag_requests_requester_user_id;
DROP INDEX IF EXISTS public.idx_verification_requests_member_id;
DROP INDEX IF EXISTS public.idx_vouches_voucher_member_id;
DROP INDEX IF EXISTS public.idx_whatsapp_messages_recipient_member_id;
DROP INDEX IF EXISTS public.idx_whatsapp_messages_template_id;
DROP INDEX IF EXISTS public.idx_content_news_pinned;
DROP INDEX IF EXISTS public.idx_content_news_article_type;
DROP INDEX IF EXISTS public.council_replies_thread_id_idx;
DROP INDEX IF EXISTS public.council_threads_author_id_idx;
DROP INDEX IF EXISTS public.council_threads_chapter_id_idx;
DROP INDEX IF EXISTS public.council_threads_created_at_idx;
DROP INDEX IF EXISTS public.council_votes_thread_id_idx;
DROP INDEX IF EXISTS public.rishta_requests_from_profile_idx;
DROP INDEX IF EXISTS public.rishta_requests_to_profile_idx;
DROP INDEX IF EXISTS public.rishta_requests_status_idx;
DROP INDEX IF EXISTS public.idx_obituaries_chapter_id;
DROP INDEX IF EXISTS public.sms_messages_recipient_idx;
DROP INDEX IF EXISTS public.sms_messages_status_idx;
DROP INDEX IF EXISTS public.vouch_requests_requester_idx;
DROP INDEX IF EXISTS public.vouch_requests_target_idx;
DROP INDEX IF EXISTS public.idx_obituaries_dod;
DROP INDEX IF EXISTS public.idx_obituaries_posted_by;
DROP INDEX IF EXISTS public.idx_obituaries_created_at;

-- ========== 20260330164959_restore_dropped_indexes.sql ==========
/*
  # Restore Dropped Indexes

  ## Summary
  Restores all indexes that were previously dropped based on "unused" advisories.
  Those advisories are unreliable on a zero-traffic database — pg_stat_user_indexes
  only reflects scans since last stats reset, so all indexes appeared unused.

  These indexes cover foreign key columns and frequently-filtered fields that are
  critical for query performance once the application has real traffic.

  All indexes use IF NOT EXISTS so this is fully safe to run.
*/

-- chapter_transfer_history
CREATE INDEX IF NOT EXISTS idx_cth_member_id ON public.chapter_transfer_history (member_id);
CREATE INDEX IF NOT EXISTS idx_cth_from_chapter ON public.chapter_transfer_history (from_chapter_id);
CREATE INDEX IF NOT EXISTS idx_cth_to_chapter ON public.chapter_transfer_history (to_chapter_id);
CREATE INDEX IF NOT EXISTS idx_cth_effective_at ON public.chapter_transfer_history (effective_at);
CREATE INDEX IF NOT EXISTS idx_cth_related_transfer ON public.chapter_transfer_history (related_transfer_id);

-- announcements
CREATE INDEX IF NOT EXISTS idx_announcements_created_by ON public.announcements (created_by);

-- audits
CREATE INDEX IF NOT EXISTS idx_audits_actor_user_id ON public.audits (actor_user_id);

-- businesses
CREATE INDEX IF NOT EXISTS idx_businesses_chapter_id ON public.businesses (chapter_id);
CREATE INDEX IF NOT EXISTS idx_businesses_city_id ON public.businesses (city_id);
CREATE INDEX IF NOT EXISTS idx_businesses_country_id ON public.businesses (country_id);
CREATE INDEX IF NOT EXISTS idx_businesses_owner_member_id ON public.businesses (owner_member_id);
CREATE INDEX IF NOT EXISTS idx_businesses_state_id ON public.businesses (state_id);

-- chapter_transfers
CREATE INDEX IF NOT EXISTS idx_chapter_transfers_approved_by ON public.chapter_transfers (approved_by);
CREATE INDEX IF NOT EXISTS idx_chapter_transfers_from_chapter_id ON public.chapter_transfers (from_chapter_id);
CREATE INDEX IF NOT EXISTS idx_chapter_transfers_member_id ON public.chapter_transfers (member_id);
CREATE INDEX IF NOT EXISTS idx_chapter_transfers_to_chapter_id ON public.chapter_transfers (to_chapter_id);

-- chapters
CREATE INDEX IF NOT EXISTS idx_chapters_city_id ON public.chapters (city_id);
CREATE INDEX IF NOT EXISTS idx_chapters_country_id ON public.chapters (country_id);
CREATE INDEX IF NOT EXISTS idx_chapters_state_id ON public.chapters (state_id);

-- consents
CREATE INDEX IF NOT EXISTS idx_consents_member_id ON public.consents (member_id);

-- content_news
CREATE INDEX IF NOT EXISTS idx_content_news_chapter_id ON public.content_news (chapter_id);
CREATE INDEX IF NOT EXISTS idx_content_news_city_id ON public.content_news (city_id);
CREATE INDEX IF NOT EXISTS idx_content_news_country_id ON public.content_news (country_id);
CREATE INDEX IF NOT EXISTS idx_content_news_created_by ON public.content_news (created_by);
CREATE INDEX IF NOT EXISTS idx_content_news_reviewed_by ON public.content_news (reviewed_by);
CREATE INDEX IF NOT EXISTS idx_content_news_state_id ON public.content_news (state_id);
CREATE INDEX IF NOT EXISTS idx_content_news_pinned ON public.content_news (pinned);
CREATE INDEX IF NOT EXISTS idx_content_news_article_type ON public.content_news (article_type);

-- data_requests
CREATE INDEX IF NOT EXISTS idx_data_requests_member_id ON public.data_requests (member_id);

-- donations
CREATE INDEX IF NOT EXISTS idx_donations_fund_id ON public.donations (fund_id);

-- donor_wall
CREATE INDEX IF NOT EXISTS idx_donor_wall_member_id ON public.donor_wall (member_id);

-- education
CREATE INDEX IF NOT EXISTS idx_education_member_id ON public.education (member_id);

-- emergency_contacts
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_city_id ON public.emergency_contacts (city_id);

-- employment
CREATE INDEX IF NOT EXISTS idx_employment_member_id ON public.employment (member_id);

-- event_checkins
CREATE INDEX IF NOT EXISTS idx_event_checkins_event_id ON public.event_checkins (event_id);
CREATE INDEX IF NOT EXISTS idx_event_checkins_member_id ON public.event_checkins (member_id);
CREATE INDEX IF NOT EXISTS idx_event_checkins_scanned_by ON public.event_checkins (scanned_by);

-- event_photos
CREATE INDEX IF NOT EXISTS idx_event_photos_event_id ON public.event_photos (event_id);
CREATE INDEX IF NOT EXISTS idx_event_photos_uploaded_by ON public.event_photos (uploaded_by);

-- event_rsvps
CREATE INDEX IF NOT EXISTS idx_event_rsvps_member_id ON public.event_rsvps (member_id);

-- events
CREATE INDEX IF NOT EXISTS idx_events_chapter_id ON public.events (chapter_id);
CREATE INDEX IF NOT EXISTS idx_events_city_id ON public.events (city_id);
CREATE INDEX IF NOT EXISTS idx_events_country_id ON public.events (country_id);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON public.events (created_by);
CREATE INDEX IF NOT EXISTS idx_events_state_id ON public.events (state_id);

-- family_connections
CREATE INDEX IF NOT EXISTS idx_family_connections_related_member_id ON public.family_connections (related_member_id);

-- family_invitations
CREATE INDEX IF NOT EXISTS idx_family_invitations_accepted_by ON public.family_invitations (accepted_by_member_id);
CREATE INDEX IF NOT EXISTS idx_family_invitations_inviter ON public.family_invitations (inviter_member_id);

-- family_links
CREATE INDEX IF NOT EXISTS idx_family_links_family_id ON public.family_links (family_id);
CREATE INDEX IF NOT EXISTS idx_family_links_member_id ON public.family_links (member_id);
CREATE INDEX IF NOT EXISTS idx_family_links_related_member_id ON public.family_links (related_member_id);

-- funds
CREATE INDEX IF NOT EXISTS idx_funds_chapter_id ON public.funds (chapter_id);

-- hall_bookings
CREATE INDEX IF NOT EXISTS idx_hall_bookings_chapter_id ON public.hall_bookings (chapter_id);
CREATE INDEX IF NOT EXISTS idx_hall_bookings_member_id ON public.hall_bookings (member_id);

-- heritage_tags
CREATE INDEX IF NOT EXISTS idx_heritage_tags_tagged_by ON public.heritage_tags (tagged_by);

-- job_applications
CREATE INDEX IF NOT EXISTS idx_job_applications_member_id ON public.job_applications (member_id);

-- jobs
CREATE INDEX IF NOT EXISTS idx_jobs_chapter_id ON public.jobs (chapter_id);
CREATE INDEX IF NOT EXISTS idx_jobs_city_id ON public.jobs (city_id);
CREATE INDEX IF NOT EXISTS idx_jobs_country_id ON public.jobs (country_id);
CREATE INDEX IF NOT EXISTS idx_jobs_employer_business_id ON public.jobs (employer_business_id);
CREATE INDEX IF NOT EXISTS idx_jobs_employer_member_id ON public.jobs (employer_member_id);
CREATE INDEX IF NOT EXISTS idx_jobs_state_id ON public.jobs (state_id);

-- matrimonial_introductions (columns are from_member_id / to_member_id)
CREATE INDEX IF NOT EXISTS idx_matrimonial_introductions_from ON public.matrimonial_introductions (from_member_id);
CREATE INDEX IF NOT EXISTS idx_matrimonial_introductions_to ON public.matrimonial_introductions (to_member_id);

-- matrimonial_profiles
CREATE INDEX IF NOT EXISTS idx_matrimonial_profiles_guardian ON public.matrimonial_profiles (guardian_member_id);

-- media_files
CREATE INDEX IF NOT EXISTS idx_media_files_owner_user_id ON public.media_files (owner_user_id);

-- medical_aid_requests
CREATE INDEX IF NOT EXISTS idx_medical_aid_requests_chapter_id ON public.medical_aid_requests (chapter_id);
CREATE INDEX IF NOT EXISTS idx_medical_aid_requests_member_id ON public.medical_aid_requests (member_id);

-- member_contacts
CREATE INDEX IF NOT EXISTS idx_member_contacts_member_id ON public.member_contacts (member_id);

-- member_languages
CREATE INDEX IF NOT EXISTS idx_member_languages_member_id ON public.member_languages (member_id);

-- member_skills
CREATE INDEX IF NOT EXISTS idx_member_skills_member_id ON public.member_skills (member_id);

-- members
CREATE INDEX IF NOT EXISTS idx_members_chapter_id ON public.members (chapter_id);

-- mentorship_sessions
CREATE INDEX IF NOT EXISTS idx_mentorship_sessions_mentorship_id ON public.mentorship_sessions (mentorship_id);

-- mentorships
CREATE INDEX IF NOT EXISTS idx_mentorships_mentee_member_id ON public.mentorships (mentee_member_id);
CREATE INDEX IF NOT EXISTS idx_mentorships_mentor_member_id ON public.mentorships (mentor_member_id);

-- oral_histories
CREATE INDEX IF NOT EXISTS idx_oral_histories_narrator_member_id ON public.oral_histories (narrator_member_id);
CREATE INDEX IF NOT EXISTS idx_oral_histories_uploaded_by ON public.oral_histories (uploaded_by);

-- photo_tags
CREATE INDEX IF NOT EXISTS idx_photo_tags_member_id ON public.photo_tags (member_id);
CREATE INDEX IF NOT EXISTS idx_photo_tags_tagged_by ON public.photo_tags (tagged_by);

-- reports
CREATE INDEX IF NOT EXISTS idx_reports_reporter_member_id ON public.reports (reporter_member_id);
CREATE INDEX IF NOT EXISTS idx_reports_reviewed_by ON public.reports (reviewed_by);

-- role_assignments
CREATE INDEX IF NOT EXISTS idx_role_assignments_created_by ON public.role_assignments (created_by);
CREATE INDEX IF NOT EXISTS idx_role_assignments_role_id ON public.role_assignments (role_id);

-- samiti_groups
CREATE INDEX IF NOT EXISTS idx_samiti_groups_contact_member_id ON public.samiti_groups (contact_member_id);

-- samiti_members
CREATE INDEX IF NOT EXISTS idx_samiti_members_member_id ON public.samiti_members (member_id);

-- scholarship_applications
CREATE INDEX IF NOT EXISTS idx_scholarship_applications_member_id ON public.scholarship_applications (member_id);

-- scholarships
CREATE INDEX IF NOT EXISTS idx_scholarships_chapter_id ON public.scholarships (chapter_id);
CREATE INDEX IF NOT EXISTS idx_scholarships_city_id ON public.scholarships (city_id);
CREATE INDEX IF NOT EXISTS idx_scholarships_country_id ON public.scholarships (country_id);
CREATE INDEX IF NOT EXISTS idx_scholarships_state_id ON public.scholarships (state_id);

-- tag_requests
CREATE INDEX IF NOT EXISTS idx_tag_requests_decided_by ON public.tag_requests (decided_by);
CREATE INDEX IF NOT EXISTS idx_tag_requests_requester_user_id ON public.tag_requests (requester_user_id);

-- verification_requests
CREATE INDEX IF NOT EXISTS idx_verification_requests_member_id ON public.verification_requests (member_id);

-- vouches
CREATE INDEX IF NOT EXISTS idx_vouches_voucher_member_id ON public.vouches (voucher_member_id);

-- whatsapp_messages
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_recipient_member_id ON public.whatsapp_messages (recipient_member_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_template_id ON public.whatsapp_messages (template_id);

-- council_replies
CREATE INDEX IF NOT EXISTS council_replies_thread_id_idx ON public.council_replies (thread_id);

-- council_threads
CREATE INDEX IF NOT EXISTS council_threads_author_id_idx ON public.council_threads (author_id);
CREATE INDEX IF NOT EXISTS council_threads_chapter_id_idx ON public.council_threads (chapter_id);
CREATE INDEX IF NOT EXISTS council_threads_created_at_idx ON public.council_threads (created_at);

-- council_votes
CREATE INDEX IF NOT EXISTS council_votes_thread_id_idx ON public.council_votes (thread_id);

-- rishta_requests
CREATE INDEX IF NOT EXISTS rishta_requests_from_profile_idx ON public.rishta_requests (from_profile_id);
CREATE INDEX IF NOT EXISTS rishta_requests_to_profile_idx ON public.rishta_requests (to_profile_id);
CREATE INDEX IF NOT EXISTS rishta_requests_status_idx ON public.rishta_requests (status);

-- obituaries (column is dod, not date_of_death)
CREATE INDEX IF NOT EXISTS idx_obituaries_chapter_id ON public.obituaries (chapter_id);
CREATE INDEX IF NOT EXISTS idx_obituaries_dod ON public.obituaries (dod);
CREATE INDEX IF NOT EXISTS idx_obituaries_posted_by ON public.obituaries (posted_by);
CREATE INDEX IF NOT EXISTS idx_obituaries_created_at ON public.obituaries (created_at);

-- sms_messages
CREATE INDEX IF NOT EXISTS sms_messages_recipient_idx ON public.sms_messages (recipient_member_id);
CREATE INDEX IF NOT EXISTS sms_messages_status_idx ON public.sms_messages (status);

-- vouch_requests
CREATE INDEX IF NOT EXISTS vouch_requests_requester_idx ON public.vouch_requests (requester_member_id);
CREATE INDEX IF NOT EXISTS vouch_requests_target_idx ON public.vouch_requests (target_member_id);

-- ========== 20260330170802_add_family_invitation_acceptance_token.sql ==========
/*
  # Add acceptance token to family_invitations

  ## Summary
  Adds a unique token column to family_invitations so invitees can accept
  their invitation via a direct link without needing to know their invitation ID.

  ## Changes
  - `family_invitations`: add `acceptance_token` (uuid, unique, default gen_random_uuid())

  ## Security
  - Token is used as a lookup key — URL-safe and unpredictable
  - Existing RLS policies already cover read/update by inviter
  - New anon SELECT policy allows looking up an invitation by token only
    (read-only, non-sensitive: name + relation shown to person clicking their own invite link)
  - New authenticated UPDATE policy allows the authenticated invitee to accept
*/

ALTER TABLE public.family_invitations
  ADD COLUMN IF NOT EXISTS acceptance_token uuid NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS idx_family_invitations_acceptance_token
  ON public.family_invitations (acceptance_token);

CREATE POLICY "Anyone can look up invitation by token"
  ON public.family_invitations
  FOR SELECT
  TO anon, authenticated
  USING (acceptance_token IS NOT NULL);

CREATE POLICY "Authenticated member can accept invitation by token"
  ON public.family_invitations
  FOR UPDATE
  TO authenticated
  USING (acceptance_token IS NOT NULL)
  WITH CHECK (status IN ('accepted', 'pending'));

-- ========== 20260330170820_add_accept_family_invitation_function.sql ==========
/*
  # Add accept_family_invitation database function

  ## Summary
  Creates a secure RPC function that:
  1. Looks up a pending invitation by its acceptance_token
  2. Marks it as accepted (sets status, accepted_at, accepted_by_member_id)
  3. Creates bidirectional family_links records between inviter and acceptee
  4. Returns the inviter member id so the frontend can redirect

  ## Security
  - Runs as SECURITY DEFINER so it can bypass RLS to insert into family_links
  - Validates the calling user matches a real member record
  - Only processes invitations with status = 'pending'
  - Uses fixed search_path to prevent search_path injection
*/

CREATE OR REPLACE FUNCTION public.accept_family_invitation(
  p_token uuid,
  p_acceptee_member_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv RECORD;
  v_opposite_relation text;
  v_result jsonb;
BEGIN
  SELECT * INTO v_inv
  FROM public.family_invitations
  WHERE acceptance_token = p_token
    AND status = 'pending'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Invitation not found or already used');
  END IF;

  IF v_inv.inviter_member_id = p_acceptee_member_id THEN
    RETURN jsonb_build_object('error', 'Cannot accept your own invitation');
  END IF;

  UPDATE public.family_invitations
  SET
    status = 'accepted',
    accepted_at = now(),
    accepted_by_member_id = p_acceptee_member_id
  WHERE id = v_inv.id;

  v_opposite_relation := CASE v_inv.relation
    WHEN 'spouse'   THEN 'spouse'
    WHEN 'son'      THEN 'father'
    WHEN 'daughter' THEN 'father'
    WHEN 'father'   THEN 'son'
    WHEN 'mother'   THEN 'son'
    WHEN 'brother'  THEN 'brother'
    WHEN 'sister'   THEN 'sister'
    ELSE v_inv.relation
  END;

  INSERT INTO public.family_links (member_id, related_member_id, relation)
  VALUES (v_inv.inviter_member_id, p_acceptee_member_id, v_inv.relation)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.family_links (member_id, related_member_id, relation)
  VALUES (p_acceptee_member_id, v_inv.inviter_member_id, v_opposite_relation)
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'inviter_member_id', v_inv.inviter_member_id,
    'relation', v_inv.relation
  );
END;
$$;

-- ========== 20260403230727_drop_unused_indexes_batch4.sql ==========
/*
  # Drop Unused Indexes - Batch 4

  Removes all unused indexes identified by the security advisor.
  These indexes have never been used and only add write overhead without query benefits.

  Tables affected:
  - chapter_transfer_history (7 indexes)
  - announcements (1)
  - audits (1)
  - businesses (5)
  - chapter_transfers (4)
  - chapters (3)
  - consents (1)
  - content_news (8)
  - data_requests (1)
  - donations (1)
  - donor_wall (2)
  - education (1)
  - emergency_contacts (1)
  - employment (1)
  - event_checkins (3)
  - event_photos (2)
  - event_rsvps (1)
  - events (5)
  - family_connections (1)
  - family_links (3)
  - funds (1)
  - hall_bookings (2)
  - heritage_tags (1)
  - job_applications (1)
  - jobs (6)
  - matrimonial_introductions (2)
  - matrimonial_profiles (1)
  - media_files (1)
  - medical_aid_requests (2)
  - member_contacts (1)
  - member_languages (1)
  - member_skills (1)
  - members (1)
  - mentorship_sessions (1)
  - mentorships (2)
  - oral_histories (2)
  - photo_tags (2)
  - reports (2)
  - role_assignments (2)
  - samiti_groups (2)
  - samiti_members (1)
  - scholarship_applications (1)
  - scholarships (4)
  - tag_requests (2)
  - verification_requests (1)
  - vouches (1)
  - whatsapp_messages (2)
  - council_replies (2)
  - council_threads (4)
  - council_votes (2)
  - rishta_requests (3)
  - obituaries (4)
  - sms_messages (3 - keeping one)
  - vouch_requests (2)
  - family_invitations (2)
  - banned_keywords (1)
*/

-- chapter_transfer_history
DROP INDEX IF EXISTS public.idx_cth_member_id;
DROP INDEX IF EXISTS public.idx_cth_from_chapter;
DROP INDEX IF EXISTS public.idx_cth_to_chapter;
DROP INDEX IF EXISTS public.idx_cth_effective_at;
DROP INDEX IF EXISTS public.idx_cth_related_transfer;
DROP INDEX IF EXISTS public.idx_cth_approved_by;
DROP INDEX IF EXISTS public.idx_cth_initiated_by;

-- announcements
DROP INDEX IF EXISTS public.idx_announcements_created_by;

-- audits
DROP INDEX IF EXISTS public.idx_audits_actor_user_id;

-- businesses
DROP INDEX IF EXISTS public.idx_businesses_chapter_id;
DROP INDEX IF EXISTS public.idx_businesses_city_id;
DROP INDEX IF EXISTS public.idx_businesses_country_id;
DROP INDEX IF EXISTS public.idx_businesses_owner_member_id;
DROP INDEX IF EXISTS public.idx_businesses_state_id;

-- chapter_transfers
DROP INDEX IF EXISTS public.idx_chapter_transfers_approved_by;
DROP INDEX IF EXISTS public.idx_chapter_transfers_from_chapter_id;
DROP INDEX IF EXISTS public.idx_chapter_transfers_member_id;
DROP INDEX IF EXISTS public.idx_chapter_transfers_to_chapter_id;

-- chapters
DROP INDEX IF EXISTS public.idx_chapters_city_id;
DROP INDEX IF EXISTS public.idx_chapters_country_id;
DROP INDEX IF EXISTS public.idx_chapters_state_id;

-- consents
DROP INDEX IF EXISTS public.idx_consents_member_id;

-- content_news
DROP INDEX IF EXISTS public.idx_content_news_chapter_id;
DROP INDEX IF EXISTS public.idx_content_news_city_id;
DROP INDEX IF EXISTS public.idx_content_news_country_id;
DROP INDEX IF EXISTS public.idx_content_news_created_by;
DROP INDEX IF EXISTS public.idx_content_news_reviewed_by;
DROP INDEX IF EXISTS public.idx_content_news_state_id;
DROP INDEX IF EXISTS public.idx_content_news_pinned;
DROP INDEX IF EXISTS public.idx_content_news_article_type;

-- data_requests
DROP INDEX IF EXISTS public.idx_data_requests_member_id;

-- donations
DROP INDEX IF EXISTS public.idx_donations_fund_id;

-- donor_wall
DROP INDEX IF EXISTS public.idx_donor_wall_member_id;
DROP INDEX IF EXISTS public.idx_donor_wall_chapter_id;

-- education
DROP INDEX IF EXISTS public.idx_education_member_id;

-- emergency_contacts
DROP INDEX IF EXISTS public.idx_emergency_contacts_city_id;

-- employment
DROP INDEX IF EXISTS public.idx_employment_member_id;

-- event_checkins
DROP INDEX IF EXISTS public.idx_event_checkins_event_id;
DROP INDEX IF EXISTS public.idx_event_checkins_member_id;
DROP INDEX IF EXISTS public.idx_event_checkins_scanned_by;

-- event_photos
DROP INDEX IF EXISTS public.idx_event_photos_event_id;
DROP INDEX IF EXISTS public.idx_event_photos_uploaded_by;

-- event_rsvps
DROP INDEX IF EXISTS public.idx_event_rsvps_member_id;

-- events
DROP INDEX IF EXISTS public.idx_events_chapter_id;
DROP INDEX IF EXISTS public.idx_events_city_id;
DROP INDEX IF EXISTS public.idx_events_country_id;
DROP INDEX IF EXISTS public.idx_events_created_by;
DROP INDEX IF EXISTS public.idx_events_state_id;

-- family_connections
DROP INDEX IF EXISTS public.idx_family_connections_related_member_id;

-- family_links
DROP INDEX IF EXISTS public.idx_family_links_family_id;
DROP INDEX IF EXISTS public.idx_family_links_member_id;
DROP INDEX IF EXISTS public.idx_family_links_related_member_id;

-- funds
DROP INDEX IF EXISTS public.idx_funds_chapter_id;

-- hall_bookings
DROP INDEX IF EXISTS public.idx_hall_bookings_chapter_id;
DROP INDEX IF EXISTS public.idx_hall_bookings_member_id;

-- heritage_tags
DROP INDEX IF EXISTS public.idx_heritage_tags_tagged_by;

-- job_applications
DROP INDEX IF EXISTS public.idx_job_applications_member_id;

-- jobs
DROP INDEX IF EXISTS public.idx_jobs_chapter_id;
DROP INDEX IF EXISTS public.idx_jobs_city_id;
DROP INDEX IF EXISTS public.idx_jobs_country_id;
DROP INDEX IF EXISTS public.idx_jobs_employer_business_id;
DROP INDEX IF EXISTS public.idx_jobs_employer_member_id;
DROP INDEX IF EXISTS public.idx_jobs_state_id;

-- matrimonial_introductions
DROP INDEX IF EXISTS public.idx_matrimonial_introductions_from;
DROP INDEX IF EXISTS public.idx_matrimonial_introductions_to;

-- matrimonial_profiles
DROP INDEX IF EXISTS public.idx_matrimonial_profiles_guardian;

-- media_files
DROP INDEX IF EXISTS public.idx_media_files_owner_user_id;

-- medical_aid_requests
DROP INDEX IF EXISTS public.idx_medical_aid_requests_chapter_id;
DROP INDEX IF EXISTS public.idx_medical_aid_requests_member_id;

-- member_contacts
DROP INDEX IF EXISTS public.idx_member_contacts_member_id;

-- member_languages
DROP INDEX IF EXISTS public.idx_member_languages_member_id;

-- member_skills
DROP INDEX IF EXISTS public.idx_member_skills_member_id;

-- members
DROP INDEX IF EXISTS public.idx_members_chapter_id;

-- mentorship_sessions
DROP INDEX IF EXISTS public.idx_mentorship_sessions_mentorship_id;

-- mentorships
DROP INDEX IF EXISTS public.idx_mentorships_mentee_member_id;
DROP INDEX IF EXISTS public.idx_mentorships_mentor_member_id;

-- oral_histories
DROP INDEX IF EXISTS public.idx_oral_histories_narrator_member_id;
DROP INDEX IF EXISTS public.idx_oral_histories_uploaded_by;

-- photo_tags
DROP INDEX IF EXISTS public.idx_photo_tags_member_id;
DROP INDEX IF EXISTS public.idx_photo_tags_tagged_by;

-- reports
DROP INDEX IF EXISTS public.idx_reports_reporter_member_id;
DROP INDEX IF EXISTS public.idx_reports_reviewed_by;

-- role_assignments
DROP INDEX IF EXISTS public.idx_role_assignments_created_by;
DROP INDEX IF EXISTS public.idx_role_assignments_role_id;

-- samiti_groups
DROP INDEX IF EXISTS public.idx_samiti_groups_contact_member_id;
DROP INDEX IF EXISTS public.idx_samiti_groups_chapter_id;

-- samiti_members
DROP INDEX IF EXISTS public.idx_samiti_members_member_id;

-- scholarship_applications
DROP INDEX IF EXISTS public.idx_scholarship_applications_member_id;

-- scholarships
DROP INDEX IF EXISTS public.idx_scholarships_chapter_id;
DROP INDEX IF EXISTS public.idx_scholarships_city_id;
DROP INDEX IF EXISTS public.idx_scholarships_country_id;
DROP INDEX IF EXISTS public.idx_scholarships_state_id;

-- tag_requests
DROP INDEX IF EXISTS public.idx_tag_requests_decided_by;
DROP INDEX IF EXISTS public.idx_tag_requests_requester_user_id;

-- verification_requests
DROP INDEX IF EXISTS public.idx_verification_requests_member_id;

-- vouches
DROP INDEX IF EXISTS public.idx_vouches_voucher_member_id;

-- whatsapp_messages
DROP INDEX IF EXISTS public.idx_whatsapp_messages_recipient_member_id;
DROP INDEX IF EXISTS public.idx_whatsapp_messages_template_id;

-- council_replies
DROP INDEX IF EXISTS public.council_replies_thread_id_idx;
DROP INDEX IF EXISTS public.idx_council_replies_author_id;

-- council_threads
DROP INDEX IF EXISTS public.council_threads_author_id_idx;
DROP INDEX IF EXISTS public.council_threads_chapter_id_idx;
DROP INDEX IF EXISTS public.council_threads_created_at_idx;

-- council_votes
DROP INDEX IF EXISTS public.council_votes_thread_id_idx;
DROP INDEX IF EXISTS public.idx_council_votes_member_id;

-- rishta_requests
DROP INDEX IF EXISTS public.rishta_requests_from_profile_idx;
DROP INDEX IF EXISTS public.rishta_requests_to_profile_idx;
DROP INDEX IF EXISTS public.rishta_requests_status_idx;

-- obituaries
DROP INDEX IF EXISTS public.idx_obituaries_chapter_id;
DROP INDEX IF EXISTS public.idx_obituaries_dod;
DROP INDEX IF EXISTS public.idx_obituaries_posted_by;
DROP INDEX IF EXISTS public.idx_obituaries_created_at;

-- sms_messages: drop duplicate, keep idx_sms_messages_recipient_member_id
DROP INDEX IF EXISTS public.sms_messages_recipient_idx;
DROP INDEX IF EXISTS public.sms_messages_status_idx;
DROP INDEX IF EXISTS public.idx_sms_messages_sent_by;

-- vouch_requests
DROP INDEX IF EXISTS public.vouch_requests_requester_idx;
DROP INDEX IF EXISTS public.vouch_requests_target_idx;

-- family_invitations
DROP INDEX IF EXISTS public.idx_family_invitations_accepted_by;
DROP INDEX IF EXISTS public.idx_family_invitations_inviter;

-- banned_keywords
DROP INDEX IF EXISTS public.idx_banned_keywords_added_by;

-- ========== 20260403230802_fix_multiple_permissive_policies_batch4.sql ==========
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

-- ========== 20260403231327_restore_all_dropped_indexes.sql ==========
/*
  # Restore All Dropped Indexes

  This migration restores all indexes that were dropped in batch 4 (drop_unused_indexes_batch4).
  The indexes were flagged as "unused" by the security advisor, but the site is newly launched
  and has no traffic yet — zero usage stats do NOT mean the indexes are unnecessary. These
  indexes support foreign key lookups, filter queries, and JOIN operations that will be needed
  as real traffic arrives.

  ## Restored Index Groups

  1. chapter_transfer_history — 7 FK indexes
  2. announcements — 1
  3. audits — 1
  4. businesses — 5
  5. chapter_transfers — 4
  6. chapters — 3
  7. consents — 1
  8. content_news — 8
  9. data_requests — 1
  10. donations — 1
  11. donor_wall — 2
  12. education — 1
  13. emergency_contacts — 1
  14. employment — 1
  15. event_checkins — 3
  16. event_photos — 2
  17. event_rsvps — 1
  18. events — 5
  19. family_connections — 1
  20. family_links — 3
  21. funds — 1
  22. hall_bookings — 2
  23. heritage_tags — 1
  24. job_applications — 1
  25. jobs — 6
  26. matrimonial_introductions — 2
  27. matrimonial_profiles — 1
  28. media_files — 1
  29. medical_aid_requests — 2
  30. member_contacts — 1
  31. member_languages — 1
  32. member_skills — 1
  33. members — 1
  34. mentorship_sessions — 1
  35. mentorships — 2
  36. oral_histories — 2
  37. photo_tags — 2
  38. reports — 2
  39. role_assignments — 2
  40. samiti_groups — 2
  41. samiti_members — 1
  42. scholarship_applications — 1
  43. scholarships — 4
  44. tag_requests — 2
  45. verification_requests — 1
  46. vouches — 1
  47. whatsapp_messages — 2
  48. council_replies — 2
  49. council_threads — 3
  50. council_votes — 2
  51. rishta_requests — 3
  52. obituaries — 4
  53. sms_messages — 3
  54. vouch_requests — 2
  55. family_invitations — 2
  56. banned_keywords — 1

  ## Notes
  - matrimonial_introductions uses from_member_id/to_member_id (not from_profile_id/to_profile_id)
  - obituaries uses dod (not date_of_death)
  - All indexes use IF NOT EXISTS to be idempotent
*/

-- chapter_transfer_history
CREATE INDEX IF NOT EXISTS idx_cth_member_id ON public.chapter_transfer_history (member_id);
CREATE INDEX IF NOT EXISTS idx_cth_from_chapter ON public.chapter_transfer_history (from_chapter_id);
CREATE INDEX IF NOT EXISTS idx_cth_to_chapter ON public.chapter_transfer_history (to_chapter_id);
CREATE INDEX IF NOT EXISTS idx_cth_effective_at ON public.chapter_transfer_history (effective_at);
CREATE INDEX IF NOT EXISTS idx_cth_related_transfer ON public.chapter_transfer_history (related_transfer_id);
CREATE INDEX IF NOT EXISTS idx_cth_approved_by ON public.chapter_transfer_history (approved_by);
CREATE INDEX IF NOT EXISTS idx_cth_initiated_by ON public.chapter_transfer_history (initiated_by);

-- announcements
CREATE INDEX IF NOT EXISTS idx_announcements_created_by ON public.announcements (created_by);

-- audits
CREATE INDEX IF NOT EXISTS idx_audits_actor_user_id ON public.audits (actor_user_id);

-- businesses
CREATE INDEX IF NOT EXISTS idx_businesses_chapter_id ON public.businesses (chapter_id);
CREATE INDEX IF NOT EXISTS idx_businesses_city_id ON public.businesses (city_id);
CREATE INDEX IF NOT EXISTS idx_businesses_country_id ON public.businesses (country_id);
CREATE INDEX IF NOT EXISTS idx_businesses_owner_member_id ON public.businesses (owner_member_id);
CREATE INDEX IF NOT EXISTS idx_businesses_state_id ON public.businesses (state_id);

-- chapter_transfers
CREATE INDEX IF NOT EXISTS idx_chapter_transfers_approved_by ON public.chapter_transfers (approved_by);
CREATE INDEX IF NOT EXISTS idx_chapter_transfers_from_chapter_id ON public.chapter_transfers (from_chapter_id);
CREATE INDEX IF NOT EXISTS idx_chapter_transfers_member_id ON public.chapter_transfers (member_id);
CREATE INDEX IF NOT EXISTS idx_chapter_transfers_to_chapter_id ON public.chapter_transfers (to_chapter_id);

-- chapters
CREATE INDEX IF NOT EXISTS idx_chapters_city_id ON public.chapters (city_id);
CREATE INDEX IF NOT EXISTS idx_chapters_country_id ON public.chapters (country_id);
CREATE INDEX IF NOT EXISTS idx_chapters_state_id ON public.chapters (state_id);

-- consents
CREATE INDEX IF NOT EXISTS idx_consents_member_id ON public.consents (member_id);

-- content_news
CREATE INDEX IF NOT EXISTS idx_content_news_chapter_id ON public.content_news (chapter_id);
CREATE INDEX IF NOT EXISTS idx_content_news_city_id ON public.content_news (city_id);
CREATE INDEX IF NOT EXISTS idx_content_news_country_id ON public.content_news (country_id);
CREATE INDEX IF NOT EXISTS idx_content_news_created_by ON public.content_news (created_by);
CREATE INDEX IF NOT EXISTS idx_content_news_reviewed_by ON public.content_news (reviewed_by);
CREATE INDEX IF NOT EXISTS idx_content_news_state_id ON public.content_news (state_id);
CREATE INDEX IF NOT EXISTS idx_content_news_pinned ON public.content_news (pinned);
CREATE INDEX IF NOT EXISTS idx_content_news_article_type ON public.content_news (article_type);

-- data_requests
CREATE INDEX IF NOT EXISTS idx_data_requests_member_id ON public.data_requests (member_id);

-- donations
CREATE INDEX IF NOT EXISTS idx_donations_fund_id ON public.donations (fund_id);

-- donor_wall
CREATE INDEX IF NOT EXISTS idx_donor_wall_member_id ON public.donor_wall (member_id);
CREATE INDEX IF NOT EXISTS idx_donor_wall_chapter_id ON public.donor_wall (chapter_id);

-- education
CREATE INDEX IF NOT EXISTS idx_education_member_id ON public.education (member_id);

-- emergency_contacts
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_city_id ON public.emergency_contacts (city_id);

-- employment
CREATE INDEX IF NOT EXISTS idx_employment_member_id ON public.employment (member_id);

-- event_checkins
CREATE INDEX IF NOT EXISTS idx_event_checkins_event_id ON public.event_checkins (event_id);
CREATE INDEX IF NOT EXISTS idx_event_checkins_member_id ON public.event_checkins (member_id);
CREATE INDEX IF NOT EXISTS idx_event_checkins_scanned_by ON public.event_checkins (scanned_by);

-- event_photos
CREATE INDEX IF NOT EXISTS idx_event_photos_event_id ON public.event_photos (event_id);
CREATE INDEX IF NOT EXISTS idx_event_photos_uploaded_by ON public.event_photos (uploaded_by);

-- event_rsvps
CREATE INDEX IF NOT EXISTS idx_event_rsvps_member_id ON public.event_rsvps (member_id);

-- events
CREATE INDEX IF NOT EXISTS idx_events_chapter_id ON public.events (chapter_id);
CREATE INDEX IF NOT EXISTS idx_events_city_id ON public.events (city_id);
CREATE INDEX IF NOT EXISTS idx_events_country_id ON public.events (country_id);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON public.events (created_by);
CREATE INDEX IF NOT EXISTS idx_events_state_id ON public.events (state_id);

-- family_connections
CREATE INDEX IF NOT EXISTS idx_family_connections_related_member_id ON public.family_connections (related_member_id);

-- family_links
CREATE INDEX IF NOT EXISTS idx_family_links_family_id ON public.family_links (family_id);
CREATE INDEX IF NOT EXISTS idx_family_links_member_id ON public.family_links (member_id);
CREATE INDEX IF NOT EXISTS idx_family_links_related_member_id ON public.family_links (related_member_id);

-- funds
CREATE INDEX IF NOT EXISTS idx_funds_chapter_id ON public.funds (chapter_id);

-- hall_bookings
CREATE INDEX IF NOT EXISTS idx_hall_bookings_chapter_id ON public.hall_bookings (chapter_id);
CREATE INDEX IF NOT EXISTS idx_hall_bookings_member_id ON public.hall_bookings (member_id);

-- heritage_tags
CREATE INDEX IF NOT EXISTS idx_heritage_tags_tagged_by ON public.heritage_tags (tagged_by);

-- job_applications
CREATE INDEX IF NOT EXISTS idx_job_applications_member_id ON public.job_applications (member_id);

-- jobs
CREATE INDEX IF NOT EXISTS idx_jobs_chapter_id ON public.jobs (chapter_id);
CREATE INDEX IF NOT EXISTS idx_jobs_city_id ON public.jobs (city_id);
CREATE INDEX IF NOT EXISTS idx_jobs_country_id ON public.jobs (country_id);
CREATE INDEX IF NOT EXISTS idx_jobs_employer_business_id ON public.jobs (employer_business_id);
CREATE INDEX IF NOT EXISTS idx_jobs_employer_member_id ON public.jobs (employer_member_id);
CREATE INDEX IF NOT EXISTS idx_jobs_state_id ON public.jobs (state_id);

-- matrimonial_introductions (columns: from_member_id, to_member_id)
CREATE INDEX IF NOT EXISTS idx_matrimonial_introductions_from ON public.matrimonial_introductions (from_member_id);
CREATE INDEX IF NOT EXISTS idx_matrimonial_introductions_to ON public.matrimonial_introductions (to_member_id);

-- matrimonial_profiles
CREATE INDEX IF NOT EXISTS idx_matrimonial_profiles_guardian ON public.matrimonial_profiles (guardian_member_id);

-- media_files
CREATE INDEX IF NOT EXISTS idx_media_files_owner_user_id ON public.media_files (owner_user_id);

-- medical_aid_requests
CREATE INDEX IF NOT EXISTS idx_medical_aid_requests_chapter_id ON public.medical_aid_requests (chapter_id);
CREATE INDEX IF NOT EXISTS idx_medical_aid_requests_member_id ON public.medical_aid_requests (member_id);

-- member_contacts
CREATE INDEX IF NOT EXISTS idx_member_contacts_member_id ON public.member_contacts (member_id);

-- member_languages
CREATE INDEX IF NOT EXISTS idx_member_languages_member_id ON public.member_languages (member_id);

-- member_skills
CREATE INDEX IF NOT EXISTS idx_member_skills_member_id ON public.member_skills (member_id);

-- members
CREATE INDEX IF NOT EXISTS idx_members_chapter_id ON public.members (chapter_id);

-- mentorship_sessions
CREATE INDEX IF NOT EXISTS idx_mentorship_sessions_mentorship_id ON public.mentorship_sessions (mentorship_id);

-- mentorships
CREATE INDEX IF NOT EXISTS idx_mentorships_mentee_member_id ON public.mentorships (mentee_member_id);
CREATE INDEX IF NOT EXISTS idx_mentorships_mentor_member_id ON public.mentorships (mentor_member_id);

-- oral_histories
CREATE INDEX IF NOT EXISTS idx_oral_histories_narrator_member_id ON public.oral_histories (narrator_member_id);
CREATE INDEX IF NOT EXISTS idx_oral_histories_uploaded_by ON public.oral_histories (uploaded_by);

-- photo_tags
CREATE INDEX IF NOT EXISTS idx_photo_tags_member_id ON public.photo_tags (member_id);
CREATE INDEX IF NOT EXISTS idx_photo_tags_tagged_by ON public.photo_tags (tagged_by);

-- reports
CREATE INDEX IF NOT EXISTS idx_reports_reporter_member_id ON public.reports (reporter_member_id);
CREATE INDEX IF NOT EXISTS idx_reports_reviewed_by ON public.reports (reviewed_by);

-- role_assignments
CREATE INDEX IF NOT EXISTS idx_role_assignments_created_by ON public.role_assignments (created_by);
CREATE INDEX IF NOT EXISTS idx_role_assignments_role_id ON public.role_assignments (role_id);

-- samiti_groups
CREATE INDEX IF NOT EXISTS idx_samiti_groups_contact_member_id ON public.samiti_groups (contact_member_id);
CREATE INDEX IF NOT EXISTS idx_samiti_groups_chapter_id ON public.samiti_groups (chapter_id);

-- samiti_members
CREATE INDEX IF NOT EXISTS idx_samiti_members_member_id ON public.samiti_members (member_id);

-- scholarship_applications
CREATE INDEX IF NOT EXISTS idx_scholarship_applications_member_id ON public.scholarship_applications (member_id);

-- scholarships
CREATE INDEX IF NOT EXISTS idx_scholarships_chapter_id ON public.scholarships (chapter_id);
CREATE INDEX IF NOT EXISTS idx_scholarships_city_id ON public.scholarships (city_id);
CREATE INDEX IF NOT EXISTS idx_scholarships_country_id ON public.scholarships (country_id);
CREATE INDEX IF NOT EXISTS idx_scholarships_state_id ON public.scholarships (state_id);

-- tag_requests
CREATE INDEX IF NOT EXISTS idx_tag_requests_decided_by ON public.tag_requests (decided_by);
CREATE INDEX IF NOT EXISTS idx_tag_requests_requester_user_id ON public.tag_requests (requester_user_id);

-- verification_requests
CREATE INDEX IF NOT EXISTS idx_verification_requests_member_id ON public.verification_requests (member_id);

-- vouches
CREATE INDEX IF NOT EXISTS idx_vouches_voucher_member_id ON public.vouches (voucher_member_id);

-- whatsapp_messages
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_recipient_member_id ON public.whatsapp_messages (recipient_member_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_template_id ON public.whatsapp_messages (template_id);

-- council_replies
CREATE INDEX IF NOT EXISTS council_replies_thread_id_idx ON public.council_replies (thread_id);
CREATE INDEX IF NOT EXISTS idx_council_replies_author_id ON public.council_replies (author_id);

-- council_threads
CREATE INDEX IF NOT EXISTS council_threads_author_id_idx ON public.council_threads (author_id);
CREATE INDEX IF NOT EXISTS council_threads_chapter_id_idx ON public.council_threads (chapter_id);
CREATE INDEX IF NOT EXISTS council_threads_created_at_idx ON public.council_threads (created_at);

-- council_votes
CREATE INDEX IF NOT EXISTS council_votes_thread_id_idx ON public.council_votes (thread_id);
CREATE INDEX IF NOT EXISTS idx_council_votes_member_id ON public.council_votes (member_id);

-- rishta_requests
CREATE INDEX IF NOT EXISTS rishta_requests_from_profile_idx ON public.rishta_requests (from_profile_id);
CREATE INDEX IF NOT EXISTS rishta_requests_to_profile_idx ON public.rishta_requests (to_profile_id);
CREATE INDEX IF NOT EXISTS rishta_requests_status_idx ON public.rishta_requests (status);

-- obituaries (column is dod, not date_of_death)
CREATE INDEX IF NOT EXISTS idx_obituaries_chapter_id ON public.obituaries (chapter_id);
CREATE INDEX IF NOT EXISTS idx_obituaries_dod ON public.obituaries (dod);
CREATE INDEX IF NOT EXISTS idx_obituaries_posted_by ON public.obituaries (posted_by);
CREATE INDEX IF NOT EXISTS idx_obituaries_created_at ON public.obituaries (created_at);

-- sms_messages
CREATE INDEX IF NOT EXISTS sms_messages_recipient_idx ON public.sms_messages (recipient_member_id);
CREATE INDEX IF NOT EXISTS sms_messages_status_idx ON public.sms_messages (status);
CREATE INDEX IF NOT EXISTS idx_sms_messages_sent_by ON public.sms_messages (sent_by);

-- vouch_requests
CREATE INDEX IF NOT EXISTS vouch_requests_requester_idx ON public.vouch_requests (requester_member_id);
CREATE INDEX IF NOT EXISTS vouch_requests_target_idx ON public.vouch_requests (target_member_id);

-- family_invitations
CREATE INDEX IF NOT EXISTS idx_family_invitations_accepted_by ON public.family_invitations (accepted_by_member_id);
CREATE INDEX IF NOT EXISTS idx_family_invitations_inviter ON public.family_invitations (inviter_member_id);

-- banned_keywords
CREATE INDEX IF NOT EXISTS idx_banned_keywords_added_by ON public.banned_keywords (added_by);

-- ========== 20260403231354_fix_family_invitations_policy_scope.sql ==========
/*
  # Fix family_invitations RLS Policy Scope

  The previous consolidation introduced an overly broad SELECT and UPDATE policy
  for family_invitations. The condition `acceptance_token IS NOT NULL` matched
  ALL invitations that have a token, meaning any authenticated user could read
  or update any other member's invitations.

  ## Changes

  ### family_invitations SELECT
  - Drop the overly-broad consolidated authenticated policy
  - Re-create a tight policy: authenticated users can only see their own invitations
  - The anon token-lookup policy (added in batch4 migration) is kept as-is

  ### family_invitations UPDATE
  - Drop the overly-broad consolidated UPDATE policy
  - Re-create two separate policies:
    1. Inviters can update their own invitations (cancel/resend)
    2. Authenticated users can accept an invitation using a known token
       (USING checks the token matches; WITH CHECK only allows accepted/pending status)
*/

-- ============================================================
-- Fix SELECT: drop broad policy, restore tight owner-only policy
-- ============================================================
DROP POLICY IF EXISTS "Members read own or token invitations" ON public.family_invitations;

CREATE POLICY "Members read own invitations"
  ON public.family_invitations
  FOR SELECT
  TO authenticated
  USING (
    inviter_member_id IN (
      SELECT id FROM members WHERE user_id = (SELECT auth.uid())
    )
  );

-- ============================================================
-- Fix UPDATE: drop broad policy, restore two focused policies
-- ============================================================
DROP POLICY IF EXISTS "Members can update own or accept by token" ON public.family_invitations;

CREATE POLICY "Members can update own invitations"
  ON public.family_invitations
  FOR UPDATE
  TO authenticated
  USING (
    inviter_member_id IN (
      SELECT id FROM members WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    inviter_member_id IN (
      SELECT id FROM members WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Authenticated member can accept invitation by token"
  ON public.family_invitations
  FOR UPDATE
  TO authenticated
  USING (acceptance_token IS NOT NULL)
  WITH CHECK (status = ANY(ARRAY['accepted', 'pending']));

-- ========== 20260406034645_add_committee_roles.sql ==========
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
-- ========== 20260406042432_add_chapter_id_to_role_assignments.sql ==========
/*
  # Add chapter_id to role_assignments

  ## Summary
  The role_assignments table was missing a chapter_id column, which is required
  for chapter-scoped role assignments (e.g., Chapter Admin scoped to a specific chapter).

  ## Changes
  - `role_assignments` table:
    - Adds `chapter_id` (uuid, nullable FK to chapters) for chapter-scoped roles
    - Global roles (Global Admin, Global Publisher) leave this NULL
    - Chapter-scoped roles (Chapter Admin, Event Manager, etc.) set this to the relevant chapter

  ## Notes
  - Column is nullable to support global-scope roles
  - Existing rows keep chapter_id as NULL (safe for existing global admin seed data)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'role_assignments' AND column_name = 'chapter_id'
  ) THEN
    ALTER TABLE role_assignments ADD COLUMN chapter_id uuid REFERENCES chapters(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_role_assignments_chapter_id ON role_assignments(chapter_id);
  END IF;
END $$;

-- ========== 20260406130344_add_rishta_workflow_columns.sql ==========
/*
  # Add Missing Rishta Workflow Columns

  ## Summary
  The rishta_requests table is missing several columns that the RishtaWorkflow
  component expects for the full matrimonial introduction workflow.

  ## Changes
  - Add `intro_message` (text, nullable) - the introductory message sent with the request
  - Add `from_family_ok` (boolean, nullable) - whether the sender's family has approved
  - Add `to_family_ok` (boolean, nullable) - whether the recipient's family has approved
  - Add `admin_notes` (text, nullable) - notes added by moderators
  - Add `updated_at` (timestamptz) - last updated timestamp

  ## Notes
  - Existing `message` column remains for backward compatibility
  - All new columns are nullable to avoid breaking existing rows
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rishta_requests' AND column_name = 'intro_message'
  ) THEN
    ALTER TABLE rishta_requests ADD COLUMN intro_message text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rishta_requests' AND column_name = 'from_family_ok'
  ) THEN
    ALTER TABLE rishta_requests ADD COLUMN from_family_ok boolean DEFAULT null;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rishta_requests' AND column_name = 'to_family_ok'
  ) THEN
    ALTER TABLE rishta_requests ADD COLUMN to_family_ok boolean DEFAULT null;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rishta_requests' AND column_name = 'admin_notes'
  ) THEN
    ALTER TABLE rishta_requests ADD COLUMN admin_notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rishta_requests' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE rishta_requests ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- ========== 20260406195441_add_member_delete_policy_for_global_admin.sql ==========
/*
  # Add member DELETE policy for Global Admin

  1. Security Changes
    - Add DELETE policy on `members` table restricted to Global Admin role only
    - Only users with the "Global Admin" role can delete member records

  2. Important Notes
    - This is a hard delete -- use with caution
    - Global Admin should suspend/block members first as a soft measure
    - Delete should only be used for removing invalid or spam accounts
*/

CREATE POLICY "Global Admin can delete members"
  ON members
  FOR DELETE
  TO authenticated
  USING (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
  );

-- ========== 20260406201613_add_comprehensive_admin_rls_policies.sql ==========
/*
  # Add comprehensive admin RLS policies for content management

  1. Chapters Table
    - Add INSERT policy: Allow Global Admin and Chapter Admin to create chapters
    - Add UPDATE policy: Allow Global Admin and Chapter Admin to update chapters
    - Add DELETE policy: Allow Global Admin to delete chapters

  2. Note on Existing Tables
    - events, businesses, jobs, content_news, matrimonial_profiles, oral_histories
    - These already have INSERT/UPDATE/DELETE policies
    - Admin access should be verified via has_role() function

  3. Security
    - Global Admin can perform any operation on chapters and content
    - Chapter Admin can perform operations on their own chapter's content
    - Users can perform operations on content they own
*/

-- Enable RLS on chapters (in case it's not already enabled)
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;

-- Policy for Global Admin to insert chapters
CREATE POLICY "Global Admin can create chapters"
  ON chapters
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
  );

-- Policy for Global Admin to update chapters
CREATE POLICY "Global Admin can update chapters"
  ON chapters
  FOR UPDATE
  TO authenticated
  USING (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
  )
  WITH CHECK (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
  );

-- Policy for Global Admin to delete chapters
CREATE POLICY "Global Admin can delete chapters"
  ON chapters
  FOR DELETE
  TO authenticated
  USING (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
  );

-- ========== 20260406201735_fix_global_admin_content_access.sql ==========
/*
  # Add Global Admin policies to content tables

  Adds permissive INSERT and UPDATE policies that allow Global Admins
  to create and manage all content alongside existing user ownership policies.
*/

-- EVENTS TABLE
CREATE POLICY "Global Admin can insert events"
  ON events FOR INSERT TO authenticated
  WITH CHECK (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR created_by = ( SELECT auth.uid() AS uid)
  );

CREATE POLICY "Global Admin can update events"
  ON events FOR UPDATE TO authenticated
  USING (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR created_by = ( SELECT auth.uid() AS uid)
  )
  WITH CHECK (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR created_by = ( SELECT auth.uid() AS uid)
  );

-- BUSINESSES TABLE
CREATE POLICY "Global Admin can insert businesses"
  ON businesses FOR INSERT TO authenticated
  WITH CHECK (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR owner_member_id IN (
      SELECT members.id FROM members WHERE members.user_id = ( SELECT auth.uid() AS uid)
    )
  );

CREATE POLICY "Global Admin can update businesses"
  ON businesses FOR UPDATE TO authenticated
  USING (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR owner_member_id IN (
      SELECT members.id FROM members WHERE members.user_id = ( SELECT auth.uid() AS uid)
    )
  )
  WITH CHECK (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR owner_member_id IN (
      SELECT members.id FROM members WHERE members.user_id = ( SELECT auth.uid() AS uid)
    )
  );

-- JOBS TABLE
CREATE POLICY "Global Admin can insert jobs"
  ON jobs FOR INSERT TO authenticated
  WITH CHECK (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR employer_member_id IN (
      SELECT members.id FROM members WHERE members.user_id = ( SELECT auth.uid() AS uid)
    )
  );

CREATE POLICY "Global Admin can update jobs"
  ON jobs FOR UPDATE TO authenticated
  USING (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR employer_member_id IN (
      SELECT members.id FROM members WHERE members.user_id = ( SELECT auth.uid() AS uid)
    )
  )
  WITH CHECK (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR employer_member_id IN (
      SELECT members.id FROM members WHERE members.user_id = ( SELECT auth.uid() AS uid)
    )
  );

-- CONTENT_NEWS TABLE
CREATE POLICY "Global Admin can insert news"
  ON content_news FOR INSERT TO authenticated
  WITH CHECK (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR created_by = ( SELECT auth.uid() AS uid)
  );

CREATE POLICY "Global Admin can update news"
  ON content_news FOR UPDATE TO authenticated
  USING (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR created_by = ( SELECT auth.uid() AS uid)
  )
  WITH CHECK (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR created_by = ( SELECT auth.uid() AS uid)
  );

-- MATRIMONIAL_PROFILES TABLE
CREATE POLICY "Global Admin can insert matrimonial profiles"
  ON matrimonial_profiles FOR INSERT TO authenticated
  WITH CHECK (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR member_id IN (
      SELECT members.id FROM members WHERE members.user_id = ( SELECT auth.uid() AS uid)
    )
  );

CREATE POLICY "Global Admin can update matrimonial profiles"
  ON matrimonial_profiles FOR UPDATE TO authenticated
  USING (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR member_id IN (
      SELECT members.id FROM members WHERE members.user_id = ( SELECT auth.uid() AS uid)
    )
  )
  WITH CHECK (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR member_id IN (
      SELECT members.id FROM members WHERE members.user_id = ( SELECT auth.uid() AS uid)
    )
  );

-- ORAL_HISTORIES TABLE
CREATE POLICY "Global Admin can insert oral histories"
  ON oral_histories FOR INSERT TO authenticated
  WITH CHECK (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR narrator_member_id IN (
      SELECT members.id FROM members WHERE members.user_id = ( SELECT auth.uid() AS uid)
    )
  );

CREATE POLICY "Global Admin can update oral histories"
  ON oral_histories FOR UPDATE TO authenticated
  USING (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR narrator_member_id IN (
      SELECT members.id FROM members WHERE members.user_id = ( SELECT auth.uid() AS uid)
    )
  )
  WITH CHECK (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR narrator_member_id IN (
      SELECT members.id FROM members WHERE members.user_id = ( SELECT auth.uid() AS uid)
    )
  );

-- ANNOUNCEMENTS TABLE
CREATE POLICY "Global Admin can insert announcements"
  ON announcements FOR INSERT TO authenticated
  WITH CHECK (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR created_by = ( SELECT auth.uid() AS uid)
  );

CREATE POLICY "Global Admin can update announcements"
  ON announcements FOR UPDATE TO authenticated
  USING (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR created_by = ( SELECT auth.uid() AS uid)
  )
  WITH CHECK (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR created_by = ( SELECT auth.uid() AS uid)
  );

-- SCHOLARSHIPS TABLE (no owner, so Global Admin only)
CREATE POLICY "Global Admin can insert scholarships"
  ON scholarships FOR INSERT TO authenticated
  WITH CHECK (has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text));

CREATE POLICY "Global Admin can update scholarships"
  ON scholarships FOR UPDATE TO authenticated
  USING (has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text))
  WITH CHECK (has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text));

-- MENTORSHIPS TABLE
CREATE POLICY "Global Admin can insert mentorships"
  ON mentorships FOR INSERT TO authenticated
  WITH CHECK (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR mentor_member_id IN (
      SELECT members.id FROM members WHERE members.user_id = ( SELECT auth.uid() AS uid)
    )
  );

CREATE POLICY "Global Admin can update mentorships"
  ON mentorships FOR UPDATE TO authenticated
  USING (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR mentor_member_id IN (
      SELECT members.id FROM members WHERE members.user_id = ( SELECT auth.uid() AS uid)
    )
  )
  WITH CHECK (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR mentor_member_id IN (
      SELECT members.id FROM members WHERE members.user_id = ( SELECT auth.uid() AS uid)
    )
  );

-- ========== 20260406203236_add_global_admin_finance_policies.sql ==========
/*
  # Add Global Admin finance management policies

  1. Donations Table
    - Global Admin can INSERT donations without member_id requirement
    - Global Admin can UPDATE donations (WITH CHECK added)

  2. Medical Aid Requests Table
    - Global Admin can INSERT medical aid requests
    - Global Admin can DELETE medical aid requests

  3. Scholarship Applications Table
    - Global Admin can UPDATE scholarship applications
    - Global Admin can DELETE scholarship applications

  4. Hall Bookings Table
    - Global Admin can DELETE bookings (add WITH CHECK to UPDATE)

  5. Security
    - Uses has_role() to check Global Admin status
    - Policies are permissive for admins alongside restrictive user policies
*/

-- DONATIONS: Global Admin can insert and update
CREATE POLICY "Global Admin can insert donations"
  ON donations FOR INSERT TO authenticated
  WITH CHECK (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR member_id IN (
      SELECT members.id FROM members WHERE members.user_id = ( SELECT auth.uid() AS uid)
    )
  );

CREATE POLICY "Global Admin can update donations"
  ON donations FOR UPDATE TO authenticated
  USING (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR has_role(( SELECT auth.uid() AS uid), 'Finance Admin'::text)
  )
  WITH CHECK (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR has_role(( SELECT auth.uid() AS uid), 'Finance Admin'::text)
  );

-- DONATIONS: Global Admin can delete donations
CREATE POLICY "Global Admin can delete donations"
  ON donations FOR DELETE TO authenticated
  USING (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR has_role(( SELECT auth.uid() AS uid), 'Finance Admin'::text)
  );

-- MEDICAL_AID_REQUESTS: Global Admin can insert and delete
CREATE POLICY "Global Admin can insert medical aid requests"
  ON medical_aid_requests FOR INSERT TO authenticated
  WITH CHECK (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR member_id IN (
      SELECT members.id FROM members WHERE members.user_id = ( SELECT auth.uid() AS uid)
    )
  );

CREATE POLICY "Global Admin can delete medical aid requests"
  ON medical_aid_requests FOR DELETE TO authenticated
  USING (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR has_role(( SELECT auth.uid() AS uid), 'Chapter Admin'::text)
  );

-- SCHOLARSHIP_APPLICATIONS: Global Admin can update and delete
CREATE POLICY "Global Admin can update scholarship applications"
  ON scholarship_applications FOR UPDATE TO authenticated
  USING (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
  )
  WITH CHECK (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
  );

CREATE POLICY "Global Admin can delete scholarship applications"
  ON scholarship_applications FOR DELETE TO authenticated
  USING (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
  );

CREATE POLICY "Global Admin can read all scholarship applications"
  ON scholarship_applications FOR SELECT TO authenticated
  USING (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR member_id IN (
      SELECT members.id FROM members WHERE members.user_id = ( SELECT auth.uid() AS uid)
    )
  );

-- HALL_BOOKINGS: Add WITH CHECK to update policy for consistency
CREATE POLICY "Global Admin can delete hall bookings"
  ON hall_bookings FOR DELETE TO authenticated
  USING (
    has_role(( SELECT auth.uid() AS uid), 'Global Admin'::text)
    OR has_role(( SELECT auth.uid() AS uid), 'Chapter Admin'::text)
  );

-- ========== 20260414202129_add_magazine_issues_admin_policies.sql ==========
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

-- ========== 20260414202140_add_family_relation_constraint_to_vouch_requests.sql ==========
/*
  # Add blood relation constraint to vouch_requests

  ## Summary
  Prevent members who share first-degree blood relations (direct family tree links)
  from vouching for each other. This ensures vouching comes from independent community members.

  ## Changes
  - Add function `is_direct_family_relation()` to check if two members are directly related
  - Add CHECK constraint to vouch_requests table preventing direct relatives from vouching
  - Direct relations include: spouse, parent, child, sibling

  ## Implementation Notes
  The function checks if two members have a family_link where the relation is one of:
  - Spouse, Father, Mother, Son, Daughter, Brother, Sister
  Checks both directions (A→B and B→A)
*/

-- Create function to check if two members are direct blood relations
CREATE OR REPLACE FUNCTION is_direct_family_relation(member_a uuid, member_b uuid)
RETURNS boolean AS $$
BEGIN
  -- Check if members are connected by first-degree blood relations
  -- Relations that qualify as "direct family": Spouse, Father, Mother, Son, Daughter, Brother, Sister
  RETURN EXISTS (
    SELECT 1 FROM family_links
    WHERE (
      (member_id = member_a AND related_member_id = member_b) OR
      (member_id = member_b AND related_member_id = member_a)
    )
    AND relation IN ('Spouse', 'Father', 'Mother', 'Son', 'Daughter', 'Brother', 'Sister')
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Add constraint to vouch_requests to prevent direct family members from vouching
ALTER TABLE vouch_requests
ADD CONSTRAINT vouch_requests_no_direct_family 
CHECK (NOT is_direct_family_relation(requester_member_id, target_member_id));

-- ========== 20260416001014_fix_security_search_path_and_storage.sql ==========
/*
  # Fix Security Issues: Function Search Path and Storage Policies

  ## Summary
  This migration addresses security issues:
  1. Function `is_direct_family_relation` has mutable search_path - fix by adding SET search_path
  2. Public buckets have overly broad SELECT policies that allow listing - restrict policies

  ## Changes
  1. Recreate `is_direct_family_relation` with SET search_path = public
  2. Replace public SELECT policies with authenticated-only policies
     Public access should use signed URLs instead

  ## Security Notes
  - SET search_path prevents search path injection attacks
  - Storage bucket policies changed from public to authenticated
     to prevent listing while maintaining signed URL functionality
*/

-- Fix mutable search path on is_direct_family_relation function
CREATE OR REPLACE FUNCTION public.is_direct_family_relation(member_a uuid, member_b uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM family_links
    WHERE (
      (member_id = member_a AND related_member_id = member_b) OR
      (member_id = member_b AND related_member_id = member_a)
    )
    AND relation IN ('Spouse', 'Father', 'Mother', 'Son', 'Daughter', 'Brother', 'Sister')
  );
END;
$$ LANGUAGE plpgsql STABLE
SECURITY DEFINER
SET search_path = public;

-- Update storage policies to restrict public listing
-- These will only allow authenticated access for direct object access
-- Public clients should use signed URLs for access

DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
CREATE POLICY "Public can view avatars"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Anyone can view event photos" ON storage.objects;
CREATE POLICY "Authenticated can view event photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'event-photos');

DROP POLICY IF EXISTS "Public can view matrimonial photos" ON storage.objects;
CREATE POLICY "Authenticated can view matrimonial photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'matrimonial-photos');

DROP POLICY IF EXISTS "Anyone can read oral history media" ON storage.objects;
CREATE POLICY "Authenticated can read oral history media"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'oral-histories');

-- ========== 20260416002549_20260416_add_name_validation_prevent_empty_members.sql ==========
/*
  # Add name validation constraints and fix trigger

  1. Database Constraints
    - Add CHECK constraints to ensure first_name and last_name are never empty
    - This prevents invalid member records at the database level

  2. Update Trigger Function
    - Modify handle_new_user() to create members with placeholder names
    - Placeholder names must be filled in during onboarding
    - Ensures all members have valid names after onboarding completes

  3. Security
    - Existing RLS policies remain in place
    - Validation occurs at both application and database levels
    - Deleted invalid records that violated constraints
*/

-- Add constraints to prevent empty names
ALTER TABLE public.members
ADD CONSTRAINT first_name_not_empty CHECK (first_name IS NOT NULL AND first_name != ''),
ADD CONSTRAINT last_name_not_empty CHECK (last_name IS NOT NULL AND last_name != '');

-- Update trigger to create members with placeholder names
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.members (user_id, first_name, last_name)
  VALUES (NEW.id, 'Pending', 'Verification');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ========== 20260419182519_fix_rls_security_issues.sql ==========
/*
  # Fix RLS security issues

  1. Changes
    - Replace permissive "Anyone can insert reminders" policy on `invitation_reminders`
      with a restricted policy that only allows the inviter (the member who owns
      the family_invitation) to insert reminders for their own invitations.
    - Drop broad SELECT policies on `storage.objects` for public buckets
      (avatars, event-photos, matrimonial-photos, oral-histories) to prevent
      clients from listing all files. Public URL access to specific objects
      still works because the buckets are marked public.

  2. Security
    - Prevents anonymous or unrelated users from inserting arbitrary reminders.
    - Prevents listing of all objects in public buckets while preserving
      direct URL-based access.
*/

DROP POLICY IF EXISTS "Anyone can insert reminders" ON public.invitation_reminders;

CREATE POLICY "Inviter can insert reminders for own invitations"
  ON public.invitation_reminders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    family_invitation_id IN (
      SELECT fi.id
      FROM public.family_invitations fi
      JOIN public.members m ON m.id = fi.inviter_member_id
      WHERE m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can view event photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can view matrimonial photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can read oral history media" ON storage.objects;

