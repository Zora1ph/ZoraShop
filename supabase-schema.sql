-- ============================================================
-- ZORA shop — paste this WHOLE file into Supabase SQL Editor
-- ============================================================
-- How to run:
-- 1. Open https://supabase.com/dashboard
-- 2. Open your project (the one used in config.js)
-- 3. Left sidebar: SQL Editor → New query
-- 4. Paste this entire file
-- 5. Click Run (bottom right)
-- 6. You should see "Success. No rows returned"
--
-- Safe to run more than once.
-- ============================================================

create table if not exists products (
  id text primary key,
  name text not null,
  subtitle text,
  description text,
  details text,
  category text not null default 'rings',
  price numeric(10,2) not null default 0,
  stock integer not null default 0,
  requires_size boolean not null default false,
  sizes jsonb not null default '[]'::jsonb,
  colors jsonb not null default '[]'::jsonb,
  discount_active boolean not null default false,
  discount_percent integer not null default 0,
  images jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table products add column if not exists colors jsonb not null default '[]'::jsonb;
alter table products add column if not exists discount_active boolean not null default false;
alter table products add column if not exists discount_percent integer not null default 0;
alter table products add column if not exists images jsonb not null default '[]'::jsonb;
alter table products add column if not exists details text not null default '';
alter table products add column if not exists description text not null default '';

create table if not exists store_settings (
  id text primary key default 'store',
  instagram text not null default 'zora.ph_',
  facebook text not null default 'Zora.Official.ph',
  facebook_url text not null default 'https://www.facebook.com/share/1EtKmbeuGo/?mibextid=wwXIfr',
  promos jsonb not null default '[]'::jsonb,
  admin_password text not null default 'zora2024',
  updated_at timestamptz default now()
);

alter table store_settings add column if not exists facebook text not null default 'Zora.Official.ph';
alter table store_settings add column if not exists facebook_url text not null default 'https://www.facebook.com/share/1EtKmbeuGo/?mibextid=wwXIfr';
alter table store_settings add column if not exists admin_password text not null default 'zora2024';
alter table store_settings add column if not exists promos jsonb not null default '[]'::jsonb;
alter table store_settings add column if not exists hero_slides jsonb not null default '[]'::jsonb;
alter table store_settings add column if not exists collections jsonb not null default '[]'::jsonb;
alter table store_settings add column if not exists payment_qrs jsonb not null default '{}'::jsonb;
alter table store_settings add column if not exists category_cards jsonb not null default '[]'::jsonb;
alter table store_settings add column if not exists blogs jsonb not null default '[]'::jsonb;

insert into store_settings (id, admin_password)
values ('store', 'zora2024')
on conflict (id) do nothing;

create table if not exists accounts (
  email text primary key,
  password_hash text not null,
  name text,
  phone text,
  address text,
  created_at timestamptz default now()
);

create table if not exists orders (
  id text primary key,
  items jsonb not null default '[]'::jsonb,
  total numeric(10,2) not null default 0,
  user_email text,
  payment_method text,
  status text not null default 'pending',
  name text,
  phone text,
  address text,
  notes text,
  created_at timestamptz default now()
);

alter table orders add column if not exists user_email text;
alter table orders add column if not exists payment_method text;
alter table orders add column if not exists status text not null default 'pending';
alter table orders add column if not exists name text;
alter table orders add column if not exists phone text;
alter table orders add column if not exists address text;
alter table orders add column if not exists notes text;
alter table orders add column if not exists paymongo_intent_id text;
alter table store_settings add column if not exists paymongo_public_key text not null default '';
alter table store_settings add column if not exists shipping_text text not null default '';
alter table store_settings add column if not exists returns_text text not null default '';
alter table accounts add column if not exists reset_code_hash text;
alter table accounts add column if not exists reset_expires timestamptz;

create table if not exists support_messages (
  id text primary key,
  name text,
  email text,
  message text,
  created_at timestamptz default now()
);

alter table products enable row level security;
alter table store_settings enable row level security;
alter table accounts enable row level security;
alter table orders enable row level security;
alter table support_messages enable row level security;

drop policy if exists "Allow public read access" on products;
drop policy if exists "Allow public insert access" on products;
drop policy if exists "Allow public update access" on products;
drop policy if exists "Allow public delete access" on products;
create policy "Allow public read access" on products for select using (true);
create policy "Allow public insert access" on products for insert with check (true);
create policy "Allow public update access" on products for update using (true) with check (true);
create policy "Allow public delete access" on products for delete using (true);

drop policy if exists "Allow public read access" on store_settings;
drop policy if exists "Allow public insert access" on store_settings;
drop policy if exists "Allow public update access" on store_settings;
drop policy if exists "Allow public delete access" on store_settings;
create policy "Allow public read access" on store_settings for select using (true);
create policy "Allow public insert access" on store_settings for insert with check (true);
create policy "Allow public update access" on store_settings for update using (true) with check (true);
create policy "Allow public delete access" on store_settings for delete using (true);

drop policy if exists "Allow public read access" on accounts;
drop policy if exists "Allow public insert access" on accounts;
drop policy if exists "Allow public update access" on accounts;
create policy "Allow public read access" on accounts for select using (true);
create policy "Allow public insert access" on accounts for insert with check (true);
create policy "Allow public update access" on accounts for update using (true) with check (true);

drop policy if exists "Allow public read access" on orders;
drop policy if exists "Allow public insert access" on orders;
drop policy if exists "Allow public update access" on orders;
create policy "Allow public read access" on orders for select using (true);
create policy "Allow public insert access" on orders for insert with check (true);
create policy "Allow public update access" on orders for update using (true) with check (true);

drop policy if exists "Allow public read access" on support_messages;
drop policy if exists "Allow public insert access" on support_messages;
create policy "Allow public read access" on support_messages for select using (true);
create policy "Allow public insert access" on support_messages for insert with check (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on products to anon, authenticated;
grant select, insert, update, delete on store_settings to anon, authenticated;
grant select, insert, update on accounts to anon, authenticated;
grant select, insert, update on orders to anon, authenticated;
grant select, insert on support_messages to anon, authenticated;

create table if not exists site_presence (
  visitor_id text primary key,
  last_seen timestamptz not null default now(),
  account_email text
);
alter table site_presence enable row level security;
drop policy if exists "Allow public read access" on site_presence;
drop policy if exists "Allow public insert access" on site_presence;
drop policy if exists "Allow public update access" on site_presence;
create policy "Allow public read access" on site_presence for select using (true);
create policy "Allow public insert access" on site_presence for insert with check (true);
create policy "Allow public update access" on site_presence for update using (true) with check (true);
grant select, insert, update, delete on site_presence to anon, authenticated;
