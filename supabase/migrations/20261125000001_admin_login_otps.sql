-- Admin login email OTP challenges (service_role only; never readable by clients)
CREATE TABLE IF NOT EXISTS public.admin_login_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_login_otps_user_active
  ON public.admin_login_otps (user_id, created_at DESC)
  WHERE verified_at IS NULL;

ALTER TABLE public.admin_login_otps ENABLE ROW LEVEL SECURITY;

-- Four explicit policies scoped to authenticated; all deny direct client access.
-- Only the admin-login-otp Edge Function (service_role) reads/writes this table.
DROP POLICY IF EXISTS "No direct select on admin_login_otps" ON public.admin_login_otps;
CREATE POLICY "No direct select on admin_login_otps"
  ON public.admin_login_otps FOR SELECT TO authenticated USING (false);

DROP POLICY IF EXISTS "No direct insert on admin_login_otps" ON public.admin_login_otps;
CREATE POLICY "No direct insert on admin_login_otps"
  ON public.admin_login_otps FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "No direct update on admin_login_otps" ON public.admin_login_otps;
CREATE POLICY "No direct update on admin_login_otps"
  ON public.admin_login_otps FOR UPDATE TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "No direct delete on admin_login_otps" ON public.admin_login_otps;
CREATE POLICY "No direct delete on admin_login_otps"
  ON public.admin_login_otps FOR DELETE TO authenticated USING (false);
