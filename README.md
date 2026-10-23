# Portofino Portal — Fase 1 (Cliente)

Portal de cliente para `customer.portofino.com`. Cada cliente entra con su usuario y ve su(s) vivienda(s), el historial de visitas y, de cada una, las fotos, el vídeo y el informe en PDF.

Stack: Next.js (App Router) + Supabase (Auth, Postgres, Storage). Desplegable en Vercel.

## Puesta en marcha

1. **Crea un proyecto en [supabase.com](https://supabase.com)** (plan gratuito vale para empezar).
2. En el panel de Supabase, abre **SQL Editor** y ejecuta el contenido de `supabase/schema.sql` — crea las tablas y las reglas de acceso (RLS) de la Fase 1.
3. En **Storage**, crea dos buckets privados: `visit-media` y `visit-reports` (no públicos — el acceso se controla por usuario, no por URL abierta).
4. Copia `.env.example` a `.env.local` y rellena:
   - `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`: en Supabase → Project Settings → API. La "anon key" es pública por diseño (va en el navegador); la seguridad real la da RLS, no esta clave.
5. `npm install` y `npm run dev` para probar en local.
6. Para desplegar: importa este repositorio en [Vercel](https://vercel.com), añade las mismas variables de entorno en su panel, y apunta el subdominio `customer.portofino.com` al despliegue (CNAME, lo indica Vercel al añadir el dominio).

## Cómo se cargan los datos

En la Fase 1 no hay panel de manager todavía: las filas de `properties`, `visits`, `visit_media` y `visit_reports` se crean a mano desde el **SQL Editor** o el **Table Editor** de Supabase, y los archivos se suben a mano en **Storage**. El panel de manager (Fase 4 de la arquitectura) es lo que automatiza esto.

## Qué falta para producción

- Crear las cuentas de cliente desde Supabase Auth (Authentication → Users → Invite user) hasta que exista el panel de manager que lo haga por ti.
- Revisar que los dos buckets de Storage queden como **privados** (no "Public bucket").
- Dominio y certificado: se gestionan desde Vercel al añadir `customer.portofino.com`.
