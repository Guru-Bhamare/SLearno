import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * Service-role client for edge functions. SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY are auto-injected by the Supabase runtime —
 * no extra secret configuration needed.
 */
export function createAdminClient() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, serviceRoleKey);
}
