// supabase/functions/_shared/cors.ts
// Version 1.0: Standard CORS headers for Supabase functions.

export const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
      