import { createClient } from '@supabase/supabase-js';

// Helper to get env vars safely
const getEnv = (key: string) => {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env) {
     // @ts-ignore
     return import.meta.env[key];
  }
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env) {
     // @ts-ignore
     return process.env[key];
  }
  return '';
}

// Try to get URL and Key from common environment variable names
const envUrl = getEnv('VITE_SUPABASE_URL') || getEnv('REACT_APP_SUPABASE_URL') || getEnv('NEXT_PUBLIC_SUPABASE_URL');
const envKey = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('REACT_APP_SUPABASE_ANON_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

// Use placeholders if variables are missing (prevents crash on load)
const supabaseUrl = envUrl ? envUrl : 'https://placeholder.supabase.co';
const supabaseKey = envKey ? envKey : 'placeholder';

if (supabaseUrl === 'https://placeholder.supabase.co') {
  console.warn('Supabase credentials missing. Features requiring database/realtime will be disabled.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);