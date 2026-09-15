-- EXECUTE is granted to PUBLIC by default in Postgres; revoke broadly, re-grant to authenticated.
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_notifications_batch(uuid[], text, text, text, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_notifications_batch(uuid[], text, text, text, text, text) TO authenticated, service_role;