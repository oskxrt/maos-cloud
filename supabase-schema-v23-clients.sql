-- MAOS Cloud v23 — Clientes
-- Ejecuta esto una sola vez en Supabase SQL Editor.

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

create index if not exists customers_phone_normalized_idx on customers(phone_normalized);
create index if not exists customers_name_idx on customers(name);

alter table customers enable row level security;

drop policy if exists "admin manage customers" on customers;
create policy "admin manage customers" on customers
for all to authenticated
using (true)
with check (true);

-- Opcional: deja preparada una relación futura entre pedidos y clientes.
alter table orders add column if not exists customer_id uuid references customers(id) on delete set null;
create index if not exists orders_customer_id_idx on orders(customer_id);
