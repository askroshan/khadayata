
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
