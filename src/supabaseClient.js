// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// IMPORTANT: Use environment variables provided by Vercel for security.
// Ensure these variables (REACT_APP_SUPABASE_URL, REACT_APP_SUPABASE_ANON_KEY)
// are set in your Vercel project settings.
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
