import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey);

if (!hasSupabaseEnv) {
  console.error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in frontend/.env. " +
      "Auth and progress features will not work until these are set.",
  );
}

// Keep the app rendering even when env vars are missing, so users see a usable
// page and clear errors instead of a blank screen caused by a startup crash.
export const supabase = createClient(
  supabaseUrl || "https://example.invalid",
  supabaseAnonKey || "missing-anon-key",
  {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  },
);