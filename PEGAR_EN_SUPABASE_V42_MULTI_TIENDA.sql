-- MAOS CLOUD — TODO INTEGRADO
-- Copia TODO este archivo en Supabase > SQL Editor > New query > Run.
-- Es seguro ejecutarlo sobre tu base actual: NO borra productos, clientes, pedidos ni fotos.
-- Integra: productos, variantes, imágenes, catálogo público, pedidos web,
-- dashboard/admin, pedidos internos, abonos, recibos, logo/ajustes, clientes y permisos para eliminar pedidos.

create extension if not exists pgcrypto;

-- =========================================================
-- PRODUCTOS / INVENTARIO
-- =========================================================
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text unique,
  category text,
  supplier text,
  cost numeric default 0,
  price numeric default 0,
  status text not null default 'Disponible',
  description text,
  variants_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table products add column if not exists name text;
alter table products add column if not exists sku text;
alter table products add column if not exists category text;
alter table products add column if not exists supplier text;
alter table products add column if not exists cost numeric default 0;
alter table products add column if not exists price numeric default 0;
alter table products add column if not exists status text not null default 'Disponible';
alter table products add column if not exists description text;
alter table products add column if not exists variants_text text;
alter table products add column if not exists created_at timestamptz not null default now();
alter table products add column if not exists updated_at timestamptz not null default now();

create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  size text,
  color text,
  stock integer not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table product_variants add column if not exists product_id uuid references products(id) on delete cascade;
alter table product_variants add column if not exists size text;
alter table product_variants add column if not exists color text;
alter table product_variants add column if not exists stock integer not null default 0;
alter table product_variants add column if not exists sort_order integer not null default 0;
alter table product_variants add column if not exists created_at timestamptz not null default now();

create table if not exists product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  url text not null,
  path text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table product_images add column if not exists product_id uuid references products(id) on delete cascade;
alter table product_images add column if not exists url text;
alter table product_images add column if not exists path text;
alter table product_images add column if not exists sort_order integer not null default 0;
alter table product_images add column if not exists created_at timestamptz not null default now();

-- =========================================================
-- PEDIDOS WEB DEL CATÁLOGO PÚBLICO
-- =========================================================
create table if not exists catalog_orders (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'Nuevo',
  total_reference numeric default 0,
  message text,
  created_at timestamptz not null default now()
);

alter table catalog_orders add column if not exists status text not null default 'Nuevo';
alter table catalog_orders add column if not exists total_reference numeric default 0;
alter table catalog_orders add column if not exists message text;
alter table catalog_orders add column if not exists created_at timestamptz not null default now();

create table if not exists catalog_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references catalog_orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name text,
  sku text,
  variant text,
  qty integer not null default 1,
  unit_price numeric default 0,
  line_total numeric default 0,
  created_at timestamptz not null default now()
);

alter table catalog_order_items add column if not exists order_id uuid references catalog_orders(id) on delete cascade;
alter table catalog_order_items add column if not exists product_id uuid references products(id) on delete set null;
alter table catalog_order_items add column if not exists product_name text;
alter table catalog_order_items add column if not exists sku text;
alter table catalog_order_items add column if not exists variant text;
alter table catalog_order_items add column if not exists qty integer not null default 1;
alter table catalog_order_items add column if not exists unit_price numeric default 0;
alter table catalog_order_items add column if not exists line_total numeric default 0;
alter table catalog_order_items add column if not exists created_at timestamptz not null default now();

-- =========================================================
-- CONFIGURACIÓN / LOGO / MARCA
-- =========================================================
create table if not exists app_settings (
  id text primary key default 'main',
  brand_name text default 'MAOS',
  logo_url text,
  store_whatsapp text default '523112648451',
  currency text default 'MXN',
  updated_at timestamptz not null default now()
);

alter table app_settings add column if not exists brand_name text default 'MAOS';
alter table app_settings add column if not exists logo_url text;
alter table app_settings add column if not exists store_whatsapp text default '523112648451';
alter table app_settings add column if not exists currency text default 'MXN';
alter table app_settings add column if not exists updated_at timestamptz not null default now();

insert into app_settings (id, brand_name, store_whatsapp, currency)
values ('main', 'MAOS', '523112648451', 'MXN')
on conflict (id) do nothing;

-- =========================================================
-- CLIENTES
-- =========================================================
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  phone_normalized text,
  social text,
  email text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table customers add column if not exists name text;
alter table customers add column if not exists phone text;
alter table customers add column if not exists phone_normalized text;
alter table customers add column if not exists social text;
alter table customers add column if not exists email text;
alter table customers add column if not exists address text;
alter table customers add column if not exists notes text;
alter table customers add column if not exists created_at timestamptz not null default now();
alter table customers add column if not exists updated_at timestamptz not null default now();

create index if not exists customers_phone_normalized_idx on customers(phone_normalized);
create index if not exists customers_name_idx on customers(name);

-- =========================================================
-- PEDIDOS INTERNOS / ABONOS / RECIBOS
-- =========================================================
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  folio text unique,
  customer_id uuid references customers(id) on delete set null,
  customer_name text,
  customer_phone text,
  customer_social text,
  status text not null default 'Pendiente',
  order_date date default current_date,
  order_time text,
  due_date date,
  delivery text,
  discount numeric default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table orders add column if not exists folio text;
alter table orders add column if not exists customer_id uuid references customers(id) on delete set null;
alter table orders add column if not exists customer_name text;
alter table orders add column if not exists customer_phone text;
alter table orders add column if not exists customer_social text;
alter table orders add column if not exists status text not null default 'Pendiente';
alter table orders add column if not exists order_date date default current_date;
alter table orders add column if not exists order_time text;
alter table orders add column if not exists due_date date;
alter table orders add column if not exists delivery text;
alter table orders add column if not exists discount numeric default 0;
alter table orders add column if not exists notes text;
alter table orders add column if not exists created_at timestamptz not null default now();
alter table orders add column if not exists updated_at timestamptz not null default now();
create index if not exists orders_customer_id_idx on orders(customer_id);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name text,
  sku text,
  variant_id uuid references product_variants(id) on delete set null,
  variant_label text,
  qty integer not null default 1,
  price numeric default 0,
  cost numeric default 0,
  created_at timestamptz not null default now()
);

alter table order_items add column if not exists order_id uuid references orders(id) on delete cascade;
alter table order_items add column if not exists product_id uuid references products(id) on delete set null;
alter table order_items add column if not exists product_name text;
alter table order_items add column if not exists sku text;
alter table order_items add column if not exists variant_id uuid references product_variants(id) on delete set null;
alter table order_items add column if not exists variant_label text;
alter table order_items add column if not exists qty integer not null default 1;
alter table order_items add column if not exists price numeric default 0;
alter table order_items add column if not exists cost numeric default 0;
alter table order_items add column if not exists created_at timestamptz not null default now();

create table if not exists order_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  payment_date date default current_date,
  payment_time text,
  amount numeric default 0,
  method text,
  created_at timestamptz not null default now()
);

alter table order_payments add column if not exists order_id uuid references orders(id) on delete cascade;
alter table order_payments add column if not exists payment_date date default current_date;
alter table order_payments add column if not exists payment_time text;
alter table order_payments add column if not exists amount numeric default 0;
alter table order_payments add column if not exists method text;
alter table order_payments add column if not exists created_at timestamptz not null default now();

-- =========================================================
-- STORAGE PARA FOTOS Y LOGO
-- =========================================================
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

-- =========================================================
-- RLS / PERMISOS
-- =========================================================
alter table products enable row level security;
alter table product_variants enable row level security;
alter table product_images enable row level security;
alter table catalog_orders enable row level security;
alter table catalog_order_items enable row level security;
alter table app_settings enable row level security;
alter table customers enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_payments enable row level security;

-- Catálogo público: lectura de productos disponibles.
drop policy if exists "public read available products" on products;
create policy "public read available products" on products
for select to anon, authenticated
using (status = 'Disponible' or auth.role() = 'authenticated');

drop policy if exists "public read variants for available products" on product_variants;
create policy "public read variants for available products" on product_variants
for select to anon, authenticated
using (exists (select 1 from products p where p.id = product_id and (p.status = 'Disponible' or auth.role() = 'authenticated')));

drop policy if exists "public read images for available products" on product_images;
create policy "public read images for available products" on product_images
for select to anon, authenticated
using (exists (select 1 from products p where p.id = product_id and (p.status = 'Disponible' or auth.role() = 'authenticated')));

-- Pedidos web: clientes pueden crear, admin puede gestionar.
drop policy if exists "public create catalog orders" on catalog_orders;
create policy "public create catalog orders" on catalog_orders
for insert to anon, authenticated
with check (true);

drop policy if exists "public create catalog order items" on catalog_order_items;
create policy "public create catalog order items" on catalog_order_items
for insert to anon, authenticated
with check (true);

drop policy if exists "admin read catalog orders" on catalog_orders;
create policy "admin read catalog orders" on catalog_orders
for select to authenticated
using (true);

drop policy if exists "admin read catalog order items" on catalog_order_items;
create policy "admin read catalog order items" on catalog_order_items
for select to authenticated
using (true);

drop policy if exists "admin update catalog orders" on catalog_orders;
create policy "admin update catalog orders" on catalog_orders
for update to authenticated
using (true)
with check (true);

drop policy if exists "admin manage catalog orders" on catalog_orders;
create policy "admin manage catalog orders" on catalog_orders
for all to authenticated
using (true)
with check (true);

drop policy if exists "admin manage catalog order items" on catalog_order_items;
create policy "admin manage catalog order items" on catalog_order_items
for all to authenticated
using (true)
with check (true);

-- Admin productos.
drop policy if exists "admin manage products" on products;
create policy "admin manage products" on products
for all to authenticated
using (true)
with check (true);

drop policy if exists "admin manage variants" on product_variants;
create policy "admin manage variants" on product_variants
for all to authenticated
using (true)
with check (true);

drop policy if exists "admin manage images" on product_images;
create policy "admin manage images" on product_images
for all to authenticated
using (true)
with check (true);

-- Settings públicos de marca.
drop policy if exists "public read app settings" on app_settings;
create policy "public read app settings" on app_settings
for select to anon, authenticated
using (true);

drop policy if exists "admin manage app settings" on app_settings;
create policy "admin manage app settings" on app_settings
for all to authenticated
using (true)
with check (true);

-- Admin clientes.
drop policy if exists "admin manage customers" on customers;
create policy "admin manage customers" on customers
for all to authenticated
using (true)
with check (true);

-- Admin pedidos internos / abonos / recibos, incluyendo eliminar.
drop policy if exists "admin manage orders" on orders;
create policy "admin manage orders" on orders
for all to authenticated
using (true)
with check (true);

drop policy if exists "admin manage order items" on order_items;
create policy "admin manage order items" on order_items
for all to authenticated
using (true)
with check (true);

drop policy if exists "admin manage order payments" on order_payments;
create policy "admin manage order payments" on order_payments
for all to authenticated
using (true)
with check (true);

-- Storage policies.
drop policy if exists "public read product images" on storage.objects;
create policy "public read product images" on storage.objects
for select to anon, authenticated
using (bucket_id = 'product-images');

drop policy if exists "admin upload product images" on storage.objects;
create policy "admin upload product images" on storage.objects
for insert to authenticated
with check (bucket_id = 'product-images');

drop policy if exists "admin update product images" on storage.objects;
create policy "admin update product images" on storage.objects
for update to authenticated
using (bucket_id = 'product-images')
with check (bucket_id = 'product-images');

drop policy if exists "admin delete product images" on storage.objects;
create policy "admin delete product images" on storage.objects
for delete to authenticated
using (bucket_id = 'product-images');

-- Listo.

-- ============================================================
-- V28 EXTRA: relación de pedidos con clientes registrados
-- Seguro para ejecutar muchas veces. No borra datos.
-- ============================================================

alter table orders add column if not exists customer_id uuid references customers(id) on delete set null;
create index if not exists orders_customer_id_idx on orders(customer_id);

-- Relaciona pedidos viejos con clientes existentes usando teléfono normalizado o nombre.
update orders o
set customer_id = c.id
from customers c
where o.customer_id is null
  and (
    (c.phone_normalized is not null and c.phone_normalized <> '' and regexp_replace(coalesce(o.customer_phone,''), '[^0-9]', '', 'g') = c.phone_normalized)
    or (
      lower(trim(coalesce(o.customer_name,''))) <> ''
      and lower(trim(o.customer_name)) = lower(trim(c.name))
    )
  );

-- Reasegura permisos para admin sobre clientes y pedidos.
alter table customers enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_payments enable row level security;

drop policy if exists "admin manage customers" on customers;
create policy "admin manage customers" on customers
for all to authenticated
using (true)
with check (true);

drop policy if exists "admin manage orders" on orders;
create policy "admin manage orders" on orders
for all to authenticated
using (true)
with check (true);

drop policy if exists "admin manage order items" on order_items;
create policy "admin manage order items" on order_items
for all to authenticated
using (true)
with check (true);

drop policy if exists "admin manage order payments" on order_payments;
create policy "admin manage order payments" on order_payments
for all to authenticated
using (true)
with check (true);


-- v29: No requiere cambios extra de base de datos; este archivo conserva el schema completo integrado por si necesitas volver a correrlo.



-- =========================================================
-- V42 MULTI-TIENDA / MEMBRESÍAS BASE
-- =========================================================
-- Esta sección convierte la base actual en multi-tienda sin borrar datos.
-- Oscar queda como super usuario de plataforma.

create extension if not exists pgcrypto;

-- Tiendas de la plataforma.
create table if not exists stores (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  owner_email text,
  plan text not null default 'pro',
  status text not null default 'activa',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table stores add column if not exists slug text;
alter table stores add column if not exists name text;
alter table stores add column if not exists owner_email text;
alter table stores add column if not exists plan text not null default 'pro';
alter table stores add column if not exists status text not null default 'activa';
alter table stores add column if not exists created_at timestamptz not null default now();
alter table stores add column if not exists updated_at timestamptz not null default now();

insert into stores (id, slug, name, owner_email, plan, status)
values ('00000000-0000-0000-0000-000000000001', 'maos', 'MAOS', 'oskxrt@gmail.com', 'full', 'activa')
on conflict (id) do update set
  slug = coalesce(stores.slug, excluded.slug),
  name = coalesce(stores.name, excluded.name),
  owner_email = coalesce(stores.owner_email, excluded.owner_email),
  plan = coalesce(stores.plan, excluded.plan),
  status = coalesce(stores.status, excluded.status);

-- Super usuarios de plataforma.
create table if not exists platform_admins (
  email text primary key,
  role text not null default 'super_admin',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into platform_admins (email, role, is_active)
values ('oskxrt@gmail.com', 'super_admin', true)
on conflict (email) do update set role = excluded.role, is_active = excluded.is_active;

-- Usuarios asignados a tiendas.
create table if not exists store_members (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  email text not null,
  role text not null default 'admin',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(store_id, email)
);

alter table store_members add column if not exists store_id uuid references stores(id) on delete cascade;
alter table store_members add column if not exists email text;
alter table store_members add column if not exists role text not null default 'admin';
alter table store_members add column if not exists is_active boolean not null default true;
alter table store_members add column if not exists created_at timestamptz not null default now();

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'store_members_store_email_unique') then
    alter table store_members add constraint store_members_store_email_unique unique (store_id, email);
  end if;
end $$;

insert into store_members (store_id, email, role, is_active)
values ('00000000-0000-0000-0000-000000000001', 'oskxrt@gmail.com', 'owner', true)
on conflict (store_id, email) do update set role = excluded.role, is_active = excluded.is_active;

-- Agregar store_id a tablas principales existentes.
alter table products add column if not exists store_id uuid references stores(id) on delete cascade;
alter table customers add column if not exists store_id uuid references stores(id) on delete cascade;
alter table orders add column if not exists store_id uuid references stores(id) on delete cascade;
alter table catalog_orders add column if not exists store_id uuid references stores(id) on delete cascade;
alter table app_settings add column if not exists store_id uuid references stores(id) on delete cascade;

update products set store_id = '00000000-0000-0000-0000-000000000001' where store_id is null;
update customers set store_id = '00000000-0000-0000-0000-000000000001' where store_id is null;
update orders set store_id = '00000000-0000-0000-0000-000000000001' where store_id is null;
update catalog_orders set store_id = '00000000-0000-0000-0000-000000000001' where store_id is null;
update app_settings set store_id = '00000000-0000-0000-0000-000000000001' where store_id is null;

-- Índices para mantener rápido cada tienda.
create index if not exists idx_products_store_id on products(store_id);
create index if not exists idx_customers_store_id on customers(store_id);
create index if not exists idx_orders_store_id on orders(store_id);
create index if not exists idx_catalog_orders_store_id on catalog_orders(store_id);
create index if not exists idx_store_members_email on store_members(lower(email));
create index if not exists idx_stores_slug on stores(slug);

-- Permitir que dos tiendas usen el mismo SKU sin conflicto.
alter table products drop constraint if exists products_sku_key;
create unique index if not exists products_store_sku_unique on products(store_id, sku) where sku is not null and sku <> '';


-- Asegurar una sola configuración por tienda.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'app_settings_store_id_unique') then
    alter table app_settings add constraint app_settings_store_id_unique unique (store_id);
  end if;
end $$;

-- Sembrar settings de MAOS si aún no existe.
insert into app_settings (id, store_id, brand_name, store_whatsapp, currency, theme_id, accent_color, background_color, text_color, show_featured, featured_title)
values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'MAOS', '', 'MXN', 'minimal-street', '#111111', '#f8f7f3', '#111111', false, 'Novedades')
on conflict (store_id) do update set
  brand_name = coalesce(app_settings.brand_name, excluded.brand_name),
  theme_id = coalesce(app_settings.theme_id, excluded.theme_id),
  accent_color = coalesce(app_settings.accent_color, excluded.accent_color),
  background_color = coalesce(app_settings.background_color, excluded.background_color),
  text_color = coalesce(app_settings.text_color, excluded.text_color),
  featured_title = coalesce(app_settings.featured_title, excluded.featured_title);

-- RLS base para tablas nuevas.
alter table stores enable row level security;
alter table store_members enable row level security;
alter table platform_admins enable row level security;

-- Funciones auxiliares para políticas.
create or replace function is_platform_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from platform_admins pa
    where lower(pa.email) = lower(auth.jwt()->>'email') and pa.is_active = true
  );
$$;

create or replace function is_store_member(target_store_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from store_members sm
    where sm.store_id = target_store_id
      and lower(sm.email) = lower(auth.jwt()->>'email')
      and sm.is_active = true
  );
$$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='stores' and policyname='Public read active stores') then
    create policy "Public read active stores" on stores for select using (status = 'activa' or is_platform_admin() or is_store_member(id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='stores' and policyname='Platform admins manage stores') then
    create policy "Platform admins manage stores" on stores for all using (is_platform_admin()) with check (is_platform_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='store_members' and policyname='Members read own memberships') then
    create policy "Members read own memberships" on store_members for select using (lower(email) = lower(auth.jwt()->>'email') or is_platform_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='store_members' and policyname='Platform admins manage store members') then
    create policy "Platform admins manage store members" on store_members for all using (is_platform_admin()) with check (is_platform_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='platform_admins' and policyname='Platform admins read self') then
    create policy "Platform admins read self" on platform_admins for select using (lower(email) = lower(auth.jwt()->>'email'));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='platform_admins' and policyname='Platform admins manage platform admins') then
    create policy "Platform admins manage platform admins" on platform_admins for all using (is_platform_admin()) with check (is_platform_admin());
  end if;
end $$;

-- Políticas permisivas existentes siguen activas para las tablas operativas.
-- La separación real en esta v42 base se aplica desde la app usando store_id.



-- =========================================================
-- V42 POLÍTICAS STORE-AWARE PARA TABLAS OPERATIVAS
-- =========================================================
-- Reemplaza políticas amplias de versiones anteriores para que cada usuario gestione solo sus tiendas.

drop policy if exists "public read available products" on products;
create policy "public read available products" on products
for select to anon, authenticated
using (status = 'Disponible' or is_platform_admin() or is_store_member(store_id));

drop policy if exists "admin manage products" on products;
create policy "admin manage products" on products
for all to authenticated
using (is_platform_admin() or is_store_member(store_id))
with check (is_platform_admin() or is_store_member(store_id));

drop policy if exists "public read variants for available products" on product_variants;
create policy "public read variants for available products" on product_variants
for select to anon, authenticated
using (exists (select 1 from products p where p.id = product_id and (p.status = 'Disponible' or is_platform_admin() or is_store_member(p.store_id))));

drop policy if exists "admin manage variants" on product_variants;
create policy "admin manage variants" on product_variants
for all to authenticated
using (exists (select 1 from products p where p.id = product_id and (is_platform_admin() or is_store_member(p.store_id))))
with check (exists (select 1 from products p where p.id = product_id and (is_platform_admin() or is_store_member(p.store_id))));

drop policy if exists "public read images for available products" on product_images;
create policy "public read images for available products" on product_images
for select to anon, authenticated
using (exists (select 1 from products p where p.id = product_id and (p.status = 'Disponible' or is_platform_admin() or is_store_member(p.store_id))));

drop policy if exists "admin manage images" on product_images;
create policy "admin manage images" on product_images
for all to authenticated
using (exists (select 1 from products p where p.id = product_id and (is_platform_admin() or is_store_member(p.store_id))))
with check (exists (select 1 from products p where p.id = product_id and (is_platform_admin() or is_store_member(p.store_id))));

drop policy if exists "public read app settings" on app_settings;
create policy "public read app settings" on app_settings
for select to anon, authenticated
using (true);

drop policy if exists "admin manage app settings" on app_settings;
create policy "admin manage app settings" on app_settings
for all to authenticated
using (is_platform_admin() or is_store_member(store_id))
with check (is_platform_admin() or is_store_member(store_id));

drop policy if exists "admin manage customers" on customers;
create policy "admin manage customers" on customers
for all to authenticated
using (is_platform_admin() or is_store_member(store_id))
with check (is_platform_admin() or is_store_member(store_id));

drop policy if exists "admin manage orders" on orders;
create policy "admin manage orders" on orders
for all to authenticated
using (is_platform_admin() or is_store_member(store_id))
with check (is_platform_admin() or is_store_member(store_id));

drop policy if exists "admin manage order items" on order_items;
create policy "admin manage order items" on order_items
for all to authenticated
using (exists (select 1 from orders o where o.id = order_id and (is_platform_admin() or is_store_member(o.store_id))))
with check (exists (select 1 from orders o where o.id = order_id and (is_platform_admin() or is_store_member(o.store_id))));

drop policy if exists "admin manage order payments" on order_payments;
create policy "admin manage order payments" on order_payments
for all to authenticated
using (exists (select 1 from orders o where o.id = order_id and (is_platform_admin() or is_store_member(o.store_id))))
with check (exists (select 1 from orders o where o.id = order_id and (is_platform_admin() or is_store_member(o.store_id))));

drop policy if exists "public create catalog orders" on catalog_orders;
create policy "public create catalog orders" on catalog_orders
for insert to anon, authenticated
with check (exists (select 1 from stores s where s.id = store_id and s.status = 'activa'));

drop policy if exists "admin read catalog orders" on catalog_orders;
drop policy if exists "admin update catalog orders" on catalog_orders;
drop policy if exists "admin manage catalog orders" on catalog_orders;
create policy "admin manage catalog orders" on catalog_orders
for all to authenticated
using (is_platform_admin() or is_store_member(store_id))
with check (is_platform_admin() or is_store_member(store_id));

drop policy if exists "public create catalog order items" on catalog_order_items;
create policy "public create catalog order items" on catalog_order_items
for insert to anon, authenticated
with check (true);

drop policy if exists "admin read catalog order items" on catalog_order_items;
drop policy if exists "admin manage catalog order items" on catalog_order_items;
create policy "admin manage catalog order items" on catalog_order_items
for all to authenticated
using (exists (select 1 from catalog_orders co where co.id = order_id and (is_platform_admin() or is_store_member(co.store_id))))
with check (exists (select 1 from catalog_orders co where co.id = order_id and (is_platform_admin() or is_store_member(co.store_id))));

-- IMPORTANTE:
-- Para una tienda nueva:
-- 1) El super usuario la crea desde el panel.
-- 2) El dueño crea cuenta en signup.html con el mismo email o tú lo creas en Supabase Auth.
-- 3) Al entrar, solo verá las tiendas donde su email esté en store_members.
