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