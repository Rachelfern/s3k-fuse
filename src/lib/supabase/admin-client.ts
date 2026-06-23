import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

export function createAdminClient(): SupabaseClient<Database> {
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
  const serverKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const serviceRoleKey = publicKey ?? serverKey;

  if (!serviceRoleKey) {
    throw new Error(
      "Missing Supabase service role key. Set NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY in .env.local for browser admin reads.",
    );
  }

  if (typeof window !== "undefined" && !publicKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is server-only. Set NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY for admin pages that fetch in the browser.",
    );
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
