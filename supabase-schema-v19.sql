-- MAOS Cloud v19 — migración para dashboard, pedidos, abonos, recibos e identidad.
-- Puedes ejecutarlo sobre la base v18; es seguro usar IF NOT EXISTS.

create extension if not exists pgcrypto;

-- Settings / brand identity
create table if not exists app_settings (
  id text primary key default 'main',
  brand_name text default 'MAOS',
  logo_url text,
  store_whatsapp text default '523112648451',
  currency text default 'MXN',
  updated_at timestamptz not null default now()
);

insert into app_settings (id, brand_name, store_whatsapp, currency)
values ('main', 'MAOS', '523112648451', 'MXN')
on conflict (id) do nothing;

-- Admin orders / payments / receipts
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  folio text unique,
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

create table if not exists order_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  payment_date date default current_date,
  payment_time text,
  amount numeric default 0,
  method text,
  created_at timestamptz not null default now()
);

alter table app_settings enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_payments enable row level security;

-- Public can read basic brand settings for logo/name/whatsapp.
drop policy if exists "public read app settings" on app_settings;
create policy "public read app settings" on app_settings
for select to anon, authenticated
using (true);

drop policy if exists "admin manage app settings" on app_settings;
create policy "admin manage app settings" on app_settings
for all to authenticated
using (true)
with check (true);

-- Admin order control is private.
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

-- Keep existing v18 storage bucket public for product and logo images.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

-- Storage policies are safe to recreate.
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
