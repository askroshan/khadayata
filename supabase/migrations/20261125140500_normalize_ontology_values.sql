-- Normalize legacy capitalization/snake_case ontology values across members
-- and matrimonial_profiles so filters and facets have zero duplicate labels.

UPDATE public.members
SET gender = 'Male'
WHERE lower(btrim(gender)) = 'male' AND gender <> 'Male';

UPDATE public.members
SET gender = 'Female'
WHERE lower(btrim(gender)) = 'female' AND gender <> 'Female';

UPDATE public.matrimonial_profiles
SET diet = 'Vegetarian'
WHERE lower(btrim(diet)) = 'vegetarian' AND diet <> 'Vegetarian';

UPDATE public.matrimonial_profiles
SET marital_status = 'Never Married'
WHERE lower(btrim(marital_status)) IN ('never_married', 'never married')
  AND marital_status <> 'Never Married';
