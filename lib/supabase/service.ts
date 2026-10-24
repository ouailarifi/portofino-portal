import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente con la clave de servicio (service role): salta RLS por completo.
// Solo se usa en el webhook de Stripe, que no tiene sesión de usuario —
// nunca se importa desde código que corre en el navegador.
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
