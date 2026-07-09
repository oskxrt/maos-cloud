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
