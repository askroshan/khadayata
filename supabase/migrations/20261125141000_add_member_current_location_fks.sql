-- Single Source of Truth for member's current country & city,
-- referencing master seed tables (countries, cities) to prevent typos.

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS current_country_id uuid REFERENCES public.countries(id),
  ADD COLUMN IF NOT EXISTS current_city_id uuid REFERENCES public.cities(id);

CREATE INDEX IF NOT EXISTS idx_members_current_country_id
  ON public.members (current_country_id);

CREATE INDEX IF NOT EXISTS idx_members_current_city_id
  ON public.members (current_city_id);
