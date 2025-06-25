// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// Use environment variables provided by Vercel
// These variables will be set in your Vercel project settings
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL; // Correctly accesses a named environment variable
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
