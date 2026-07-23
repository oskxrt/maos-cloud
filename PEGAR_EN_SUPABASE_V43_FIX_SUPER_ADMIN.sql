-- =========================================================
-- MAOS / OSKI Store v43
-- FIX SUPER ADMIN + RLS SIN RECURSION
-- =========================================================
-- Este SQL corrige el error:
-- infinite recursion detected in policy for relation "platform_admins"
-- No borra productos, pedidos, clientes ni imágenes.

begin;

-- Asegura tablas base de multi-tienda por si faltan.
create extension if not exists pgcrypto;

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  owner_email text,
  plan text not null default 'pro',
  status text not null default 'activa',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_admins (
  email text primary key,
  role text not null default 'super_admin',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.store_members (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  email text not null,
  role text not null default 'admin',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(store_id, email)
);

-- Oscar como super usuario principal.
insert into public.platform_admins (email, role, is_active)
values ('oskxrt@gmail.com', 'super_admin', true)
on conflict (email) do update set
  role = excluded.role,
  is_active = true;

-- Tienda principal MAOS por compatibilidad.
insert into public.stores (id, slug, name, owner_email, plan, status)
values ('00000000-0000-0000-0000-000000000001', 'maos', 'MAOS', 'oskxrt@gmail.com', 'pro', 'activa')
on conflict (id) do update set
  slug = coalesce(public.stores.slug, excluded.slug),
  name = coalesce(public.stores.name, excluded.name),
  owner_email = coalesce(public.stores.owner_email, excluded.owner_email),
  plan = coalesce(public.stores.plan, excluded.plan),
  status = coalesce(public.stores.status, excluded.status),
  updated_at = now();

insert into public.store_members (store_id, email, role, is_active)
values ('00000000-0000-0000-0000-000000000001', 'oskxrt@gmail.com', 'owner', true)
on conflict (store_id, email) do update set
  role = excluded.role,
  is_active = true;

-- Activa RLS.
alter table public.stores enable row level security;
alter table public.store_members enable row level security;
alter table public.platform_admins enable row level security;

-- Limpia políticas recursivas o viejas.
drop policy if exists "Public read active stores" on public.stores;
drop policy if exists "Platform admins manage stores" on public.stores;
drop policy if exists "Members read own memberships" on public.store_members;
drop policy if exists "Platform admins manage store members" on public.store_members;
drop policy if exists "Platform admins read self" on public.platform_admins;
drop policy if exists "Platform admins manage platform admins" on public.platform_admins;
drop policy if exists "Platform admins read platform admins" on public.platform_admins;

-- Función segura: evita recursion porque corre como SECURITY DEFINER.
create or replace function public.is_platform_admin()
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  ok boolean;
begin
  select exists (
    select 1
    from public.platform_admins pa
    where lower(pa.email) = lower(auth.jwt()->>'email')
      and pa.is_active = true
  ) into ok;
  return coalesce(ok, false);
end;
$$;

create or replace function public.is_store_member(target_store_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  ok boolean;
begin
  select exists (
    select 1
    from public.store_members sm
    where sm.store_id = target_store_id
      and lower(sm.email) = lower(auth.jwt()->>'email')
      and sm.is_active = true
  ) into ok;
  return coalesce(ok, false);
end;
$$;

grant execute on function public.is_platform_admin() to anon, authenticated;
grant execute on function public.is_store_member(uuid) to anon, authenticated;

-- Políticas nuevas sin recursion.
create policy "Public read active stores"
on public.stores
for select
using (
  status = 'activa'
  or public.is_platform_admin()
  or public.is_store_member(id)
);

create policy "Platform admins manage stores"
on public.stores
for all
using (public.is_platform_admin())
with check (public.is_platform_admin());

create policy "Members read own memberships"
on public.store_members
for select
using (
  lower(email) = lower(auth.jwt()->>'email')
  or public.is_platform_admin()
);

create policy "Platform admins manage store members"
on public.store_members
for all
using (public.is_platform_admin())
with check (public.is_platform_admin());

create policy "Platform admins read self"
on public.platform_admins
for select
using (
  lower(email) = lower(auth.jwt()->>'email')
  or public.is_platform_admin()
);

create policy "Platform admins manage platform admins"
on public.platform_admins
for all
using (public.is_platform_admin())
with check (public.is_platform_admin());

-- Asegura columnas store_id si ya estás en v42.
alter table public.products add column if not exists store_id uuid references public.stores(id) on delete cascade;
alter table public.customers add column if not exists store_id uuid references public.stores(id) on delete cascade;
alter table public.orders add column if not exists store_id uuid references public.stores(id) on delete cascade;
alter table public.catalog_orders add column if not exists store_id uuid references public.stores(id) on delete cascade;
alter table public.app_settings add column if not exists store_id uuid references public.stores(id) on delete cascade;

-- Asigna datos existentes a MAOS si aún no tenían tienda.
update public.products set store_id = '00000000-0000-0000-0000-000000000001' where store_id is null;
update public.customers set store_id = '00000000-0000-0000-0000-000000000001' where store_id is null;
update public.orders set store_id = '00000000-0000-0000-0000-000000000001' where store_id is null;
update public.catalog_orders set store_id = '00000000-0000-0000-0000-000000000001' where store_id is null;
update public.app_settings set store_id = '00000000-0000-0000-0000-000000000001' where store_id is null;

commit;

-- Después de correr esto, refresca /admin y debe aparecer el menú Super Admin.
