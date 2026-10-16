import { createClient } from '@supabase/supabase-js';

// Values come from frontend/.env (never hardcode keys)
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
