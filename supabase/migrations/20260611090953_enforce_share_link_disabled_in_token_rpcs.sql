-- Enforce clients.share_link_disabled in the token-based RPCs so that
-- disabling a share link actually blocks client access (read and write).
-- Applied to production 2026-06-11.

CREATE OR REPLACE FUNCTION public.get_client_data_with_token(p_client_id uuid, p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  raw_client_data JSONB;
  client_name_text TEXT;
  global_logo_url_text TEXT;
  final_client_data JSONB;
  link_disabled BOOLEAN;
BEGIN
  IF EXISTS (SELECT 1 FROM public.client_share_tokens WHERE client_id = p_client_id AND token = p_token) THEN
    SELECT
      client_properties,
      client_name,
      COALESCE(share_link_disabled, FALSE)
    INTO
      raw_client_data,
      client_name_text,
      link_disabled
    FROM
      public.clients
    WHERE
      id = p_client_id;

    -- Disabled link: return only the flag, never the itinerary data.
    IF link_disabled THEN
      RETURN jsonb_build_object('share_link_disabled', TRUE);
    END IF;

    SELECT
      custom_logo_url
    INTO
      global_logo_url_text
    FROM
      public.clients
    WHERE
      id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

    IF raw_client_data IS NOT NULL AND jsonb_typeof(raw_client_data) = 'string' THEN
      final_client_data := (raw_client_data #>> '{}')::jsonb;
    ELSE
      final_client_data := COALESCE(raw_client_data, '{}'::jsonb);
    END IF;

    UPDATE public.client_share_tokens SET last_used_at = NOW() WHERE client_share_tokens.token = p_token;

    RETURN jsonb_build_object(
      'clientName', client_name_text,
      'globalLogoUrl', global_logo_url_text,
      'data', final_client_data
    );
  ELSE
    RAISE EXCEPTION 'Invalid or expired share link. Please request a new one from your administrator.';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_client_data_with_token(p_client_id uuid, p_token text, new_properties jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.client_share_tokens cst
    JOIN public.clients c ON c.id = cst.client_id
    WHERE cst.client_id = p_client_id
      AND cst.token = p_token
      AND COALESCE(c.share_link_disabled, FALSE) = FALSE
  ) THEN
    UPDATE public.clients
    SET client_properties = new_properties,
        last_updated = now()
    WHERE id = p_client_id;
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$function$;
