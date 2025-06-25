// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// IMPORTANT: Replace 'YOUR_SUPABASE_PROJECT_URL' and 'YOUR_SUPABASE_ANON_PUBLIC_KEY'
// with your actual Supabase project URL and anon public key.
// Ensure you keep the single quotes around the values!
const supabaseUrl = 'https://zocwwjiduqopmfdqiggr.supabase.co'; 
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvY3d3amlkdXFvcG1mZHFpZ2dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4MDcxNzIsImV4cCI6MjA2NjM4MzE3Mn0.zwhO9q_CSdOu2Ai-z70oPbtdQ77hWE5kiOV8x-yJWAQ'; 

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
