-- Close the public-read hole: enable RLS on clients and client_share_tokens.
-- Token RPCs become SECURITY DEFINER (with pinned search_path) so client share
-- links keep working through the RPCs while direct anon table access is blocked.
-- Applied to production 2026-06-11.

-- 1. Token RPCs must bypass RLS (they self-validate via the share token).
ALTER FUNCTION public.get_client_data_with_token(uuid, text)
  SECURITY DEFINER SET search_path = '';
ALTER FUNCTION public.update_client_data_with_token(uuid, text, jsonb)
  SECURITY DEFINER SET search_path = '';
-- Already SECURITY DEFINER; pin its search_path too.
ALTER FUNCTION public.generate_client_share_token(uuid)
  SET search_path = '';

-- 2. Enable RLS. clients already has owner-scoped policies for authenticated
--    (auth.uid() = user_id, plus global-settings row policies); they all match
--    the current data (every row owned by the single admin user).
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_share_tokens ENABLE ROW LEVEL SECURITY;

-- 3. Admin dashboard reads tokens directly (select only); scope to own clients.
CREATE POLICY "Admins can read tokens for their clients"
  ON public.client_share_tokens
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_share_tokens.client_id
        AND c.user_id = (SELECT auth.uid())
    )
  );

-- 4. Defense in depth: anon should never touch these tables directly.
REVOKE ALL ON public.clients FROM anon;
REVOKE ALL ON public.client_share_tokens FROM anon;
