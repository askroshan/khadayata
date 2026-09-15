-- Security audit fixes (2026-09-15)

-- 1. Block anonymous spam via SECURITY DEFINER notification functions.
--    The app only calls these from authenticated sessions (ChapterContact.tsx).
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_notifications_batch(uuid[], text, text, text, text, text) FROM anon;

-- 2. Missing covering indexes on foreign keys (performance advisor).
CREATE INDEX IF NOT EXISTS idx_fundraising_campaigns_chapter_id ON public.fundraising_campaigns (chapter_id);
CREATE INDEX IF NOT EXISTS idx_fundraising_campaigns_created_by ON public.fundraising_campaigns (created_by);

-- 3. Remove duplicate index on sms_messages.
DROP INDEX IF EXISTS public.idx_sms_messages_recipient_member_id;