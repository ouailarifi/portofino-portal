import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Protege todo /dashboard: sin sesión, redirige a /login.
// Refresca el token de sesión en cada petición (necesario con @supabase/ssr).
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && request.nextUrl.pathname.startsWith("/dashboard")) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Hasta que el cliente no complete el alta de pago de todas sus viviendas
  // (verificar tarjeta), no puede usar el resto de la webapp — lo mandamos
  // directo a completarla. No afecta a manager ni a profesional.
  if (user && request.nextUrl.pathname.startsWith("/dashboard") && !request.nextUrl.pathname.startsWith("/dashboard/alta")) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || (profile.role !== "manager" && profile.role !== "profesional")) {
      const { data: pending } = await supabase
        .from("properties")
        .select("id")
        .eq("client_id", user.id)
        .eq("payment_setup_completed", false)
        .limit(1)
        .maybeSingle();
      if (pending) {
        return NextResponse.redirect(new URL(`/dashboard/alta/${pending.id}`, request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
