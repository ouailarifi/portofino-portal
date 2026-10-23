-- Portofino Portal — esquema Fase 1 (acceso de cliente)
-- Ejecutar completo en el SQL Editor de Supabase, una sola vez.

create extension if not exists "uuid-ossp";

-- Un registro por persona, con su rol. El id coincide con auth.users.id.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('cliente', 'partner', 'profesional', 'manager')),
  full_name text not null,
  email text not null,
  phone text,
  status text not null default 'activo' check (status in ('activo', 'inactivo')),
  created_at timestamptz not null default now()
);

create table if not exists properties (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references profiles(id) on delete cascade,
  address text not null,
  property_type text not null check (property_type in ('apartment', 'house', 'villa', 'luxury_villa')),
  zone text,
  plan text not null check (plan in ('essential', 'comfort', 'premium')),
  billing_mode text not null default 'annual' check (billing_mode in ('annual', 'flexible')),
  created_at timestamptz not null default now()
);

create table if not exists visits (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id) on delete cascade,
  professional_id uuid references profiles(id),
  scheduled_date date,
  completed_date date,
  status text not null default 'programada' check (status in ('programada', 'hecha', 'fallida')),
  checklist jsonb,
  created_at timestamptz not null default now()
);

create table if not exists visit_media (
  id uuid primary key default uuid_generate_v4(),
  visit_id uuid not null references visits(id) on delete cascade,
  media_type text not null check (media_type in ('foto', 'video')),
  storage_path text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists visit_reports (
  id uuid primary key default uuid_generate_v4(),
  visit_id uuid not null references visits(id) on delete cascade,
  storage_path text not null,
  summary text,
  created_at timestamptz not null default now()
);

-- Row Level Security: cada cliente ve solo lo suyo; el manager lo ve todo.
alter table profiles enable row level security;
alter table properties enable row level security;
alter table visits enable row level security;
alter table visit_media enable row level security;
alter table visit_reports enable row level security;

create or replace function is_manager()
returns boolean language sql stable as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'manager');
$$;

create policy "El usuario ve su propio perfil; el manager ve todos"
  on profiles for select
  using (id = auth.uid() or is_manager());

create policy "El cliente ve sus propias viviendas; el manager todas"
  on properties for select
  using (client_id = auth.uid() or is_manager());

create policy "El cliente ve las visitas de sus viviendas; el manager todas"
  on visits for select
  using (
    is_manager()
    or exists (select 1 from properties p where p.id = property_id and p.client_id = auth.uid())
  );

create policy "El cliente ve las fotos/vídeos de sus visitas; el manager todas"
  on visit_media for select
  using (
    is_manager()
    or exists (
      select 1 from visits v join properties p on p.id = v.property_id
      where v.id = visit_id and p.client_id = auth.uid()
    )
  );

create policy "El cliente ve los informes de sus visitas; el manager todos"
  on visit_reports for select
  using (
    is_manager()
    or exists (
      select 1 from visits v join properties p on p.id = v.property_id
      where v.id = visit_id and p.client_id = auth.uid()
    )
  );

-- Solo el manager puede escribir en estas tablas desde el panel (Fase 4);
-- en la Fase 1 se escribe desde el SQL/Table Editor con la service role, que salta RLS.
create policy "Solo el manager inserta/edita viviendas"
  on properties for all using (is_manager()) with check (is_manager());

create policy "Solo el manager inserta/edita visitas"
  on visits for all using (is_manager()) with check (is_manager());

create policy "Solo el manager inserta/edita media"
  on visit_media for all using (is_manager()) with check (is_manager());

create policy "Solo el manager inserta/edita informes"
  on visit_reports for all using (is_manager()) with check (is_manager());
