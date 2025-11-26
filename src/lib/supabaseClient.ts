// lib/supabaseClient.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

declare global {
  // eslint-disable-next-line no-var
  var __supabaseClient: SupabaseClient | undefined;
}

function createBrowserClient() {
  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
}

let client: SupabaseClient;

if (typeof window === "undefined") {
  // SERVER — no persisted session, no auto-refresh
  client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
} else {
  // BROWSER — reuse the SAME client across reloads + HMR
  if (!globalThis.__supabaseClient) {
    globalThis.__supabaseClient = createBrowserClient();
  }
  client = globalThis.__supabaseClient;
}

export const supabase = client;
