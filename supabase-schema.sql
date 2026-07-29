-- Supabase schema for Zora.ph
-- Run these SQL statements in the Supabase SQL editor.

create table if not exists products (
  id text primary key,
  name text not null,
  subtitle text,
  category text not null default 'rings',
  price numeric(10,2) not null default 0,
  stock integer not null default 0,
  requires_size boolean not null default false,
  sizes jsonb not null default '[]'::jsonb,
  discount_active boolean not null default false,
  discount_percent integer not null default 0,
  images jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists store_settings (
  id text primary key default 'store',
  instagram text not null default 'zora.ph_',
  promos jsonb not null default '[]'::jsonb,
  admin_password text not null default 'zora2024',
  updated_at timestamptz default now()
);

alter table products enable row level security;
alter table store_settings enable row level security;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'products' AND policyname = 'Allow public read access'
  ) THEN
    EXECUTE 'create policy "Allow public read access" on products for select using (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'products' AND policyname = 'Allow public insert access'
  ) THEN
    EXECUTE 'create policy "Allow public insert access" on products for insert with check (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'products' AND policyname = 'Allow public update access'
  ) THEN
    EXECUTE 'create policy "Allow public update access" on products for update using (true) with check (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'products' AND policyname = 'Allow public delete access'
  ) THEN
    EXECUTE 'create policy "Allow public delete access" on products for delete using (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'store_settings' AND policyname = 'Allow public read access'
  ) THEN
    EXECUTE 'create policy "Allow public read access" on store_settings for select using (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'store_settings' AND policyname = 'Allow public insert access'
  ) THEN
    EXECUTE 'create policy "Allow public insert access" on store_settings for insert with check (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'store_settings' AND policyname = 'Allow public update access'
  ) THEN
    EXECUTE 'create policy "Allow public update access" on store_settings for update using (true) with check (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'store_settings' AND policyname = 'Allow public delete access'
  ) THEN
    EXECUTE 'create policy "Allow public delete access" on store_settings for delete using (true)';
  END IF;
END $$;
