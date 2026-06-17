import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Try build-time (Vite) first, then runtime (server-injected via window.__ENV__)
const BUILD_URL = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
const BUILD_ANON = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined;
const RUNTIME_URL = (typeof window !== "undefined" && (window as any).__ENV__?.VITE_SUPABASE_URL) as string | undefined;
const RUNTIME_ANON = (typeof window !== "undefined" && (window as any).__ENV__?.VITE_SUPABASE_ANON_KEY) as string | undefined;

const URL = BUILD_URL || RUNTIME_URL;
const ANON = BUILD_ANON || RUNTIME_ANON;

export const SUPABASE_CONFIGURED = Boolean(URL && ANON);

let _client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (_client) return _client;
  if (!URL || !ANON) {
    throw new Error(
      "VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set — add them to your Render env vars (as Build Env Vars), or set them in .env locally.",
    );
  }
  _client = createClient(URL, ANON, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
      storageKey: "badr.supabase.session",
    },
  });
  return _client;
}

/** Force the singleton to be recreated on next call. Used after sign-out. */
export function resetSupabaseClient(): void {
  _client = null;
}
