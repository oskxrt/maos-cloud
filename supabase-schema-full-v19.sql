-- MAOS Cloud v18 — Supabase schema
-- Ejecuta esto en Supabase SQL Editor.
-- Después ve a Storage y confirma que existe el bucket product-images.

create extension if not exists pgcrypto;

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

create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  size text,
  color text,
  stock integer not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  url text not null,
  path text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists catalog_orders (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'Nuevo',
  total_reference numeric default 0,
  message text,
  created_at timestamptz not null default now()
);

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

-- Storage bucket for product photos.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

alter table products enable row level security;
alter table product_variants enable row level security;
alter table product_images enable row level security;
alter table catalog_orders enable row level security;
alter table catalog_order_items enable row level security;

-- Public catalog can read available products only.
drop policy if exists "public read available products" on products;
create policy "public read available products" on products
for select to anon, authenticated
using (status = 'Disponible' or auth.role() = 'authenticated');

-- Public can read variants/images for visible products.
drop policy if exists "public read variants for available products" on product_variants;
create policy "public read variants for available products" on product_variants
for select to anon, authenticated
using (exists (select 1 from products p where p.id = product_id and (p.status = 'Disponible' or auth.role() = 'authenticated')));

drop policy if exists "public read images for available products" on product_images;
create policy "public read images for available products" on product_images
for select to anon, authenticated
using (exists (select 1 from products p where p.id = product_id and (p.status = 'Disponible' or auth.role() = 'authenticated')));

-- Public catalog can create order requests. Admin can read/update them.
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

-- Admins: any authenticated Supabase user can manage data.
-- Recomendación: en Authentication > Providers, desactiva signups públicos y crea solo tu usuario admin.
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

drop policy if exists "admin update catalog orders" on catalog_orders;
create policy "admin update catalog orders" on catalog_orders
for update to authenticated
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
