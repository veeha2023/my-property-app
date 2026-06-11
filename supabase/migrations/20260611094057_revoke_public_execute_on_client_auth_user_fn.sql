-- create_or_update_client_auth_user is an unused leftover (abandoned access-code
-- feature; no frontend references). As SECURITY DEFINER it lets anon create real
-- auth.users rows with an attacker-chosen password. Revoke public execution.
-- Applied to production 2026-06-11.

REVOKE EXECUTE ON FUNCTION public.create_or_update_client_auth_user(uuid, text) FROM anon, authenticated, public;
ALTER FUNCTION public.create_or_update_client_auth_user(uuid, text) SET search_path = '';

-- Unused helper; harmless but pin its search_path to clear the advisor warning.
ALTER FUNCTION public.set_client_id_session_variable(uuid) SET search_path = '';
