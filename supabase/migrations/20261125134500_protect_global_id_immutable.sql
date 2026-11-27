-- Enforce Khadayata One ID (Global ID) immutability for life:
-- Once a member is issued an official KHD-... Global ID, it stays with them
-- permanently even if they transfer chapters.

CREATE OR REPLACE FUNCTION public.prevent_global_id_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.global_id IS NOT NULL
     AND OLD.global_id LIKE 'KHD-%'
     AND NEW.global_id IS DISTINCT FROM OLD.global_id THEN
    RAISE EXCEPTION 'Khadayata One ID (global_id) is permanent and cannot be modified once issued (% -> %)', OLD.global_id, NEW.global_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_global_id_change ON public.members;
CREATE TRIGGER trg_prevent_global_id_change
  BEFORE UPDATE OF global_id ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_global_id_change();
