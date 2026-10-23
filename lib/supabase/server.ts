import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente de Supabase para usar en Server Components, route handlers y el
// middleware — lee/escribe la sesión del usuario a partir de las cookies.
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Se puede ignorar: ocurre al llamar desde un Server Component
            // que no puede escribir cookies; el middleware se encarga de
            // refrescar la sesión en esos casos.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Ver nota anterior.
          }
        },
      },
    }
  );
}
