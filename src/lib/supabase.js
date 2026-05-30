import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const hasSecretKey = supabaseAnonKey?.startsWith('sb_secret');
const hasPlaceholderKey = !supabaseAnonKey || supabaseAnonKey === 'replace-with-your-supabase-anon-public-key' || supabaseAnonKey === 'your-anon-key';

export const supabaseConfigError = hasSecretKey
  ? 'VITE_SUPABASE_ANON_KEY is using a secret key. Browser apps must use the Supabase anon public key.'
  : hasPlaceholderKey
    ? 'Add your Supabase anon public key to VITE_SUPABASE_ANON_KEY, then restart npm run dev.'
    : '';

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey && !supabaseConfigError);

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
