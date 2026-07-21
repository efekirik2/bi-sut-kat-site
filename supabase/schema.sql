-- Bi Üst Kat — Masa bazlı sipariş sistemi veritabanı şeması
-- Bu dosyayı Supabase projenizde SQL Editor'e yapıştırıp çalıştırın.

create table tables (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references tables(id) on delete cascade,
  status text not null default 'open' check (status in ('open','closed')),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  total numeric(10,2)
);

-- Bir masada aynı anda sadece bir açık sipariş olabilir
create unique index one_open_order_per_table on orders (table_id) where status = 'open';

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  name text not null,
  price numeric(10,2) not null,
  quantity int not null default 1,
  note text,
  created_at timestamptz not null default now()
);

alter table tables enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
-- Kasıtlı olarak hiç policy eklenmedi: anon/public erişim tamamen kapalı,
-- sadece service_role anahtarını kullanan Netlify Functions okuyup yazabilir.
