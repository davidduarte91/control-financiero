import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let supabaseServerClient: SupabaseClient | null = null;

export function getSupabaseServerClient(): SupabaseClient {
  if (supabaseServerClient) {
    return supabaseServerClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecretKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Falta configurar SUPABASE_URL en el servidor.");
  }

  if (!supabaseSecretKey) {
    throw new Error(
      "Falta configurar SUPABASE_SECRET_KEY o SUPABASE_SERVICE_ROLE_KEY en el servidor.",
    );
  }

  supabaseServerClient = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  return supabaseServerClient;
}
