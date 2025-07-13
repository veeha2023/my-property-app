// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// IMPORTANT: Use environment variables provided by Vercel for security.
// Ensure these environment variables are set in your deployment environment.
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are not set properly');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
