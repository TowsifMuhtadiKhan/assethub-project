-- AssetHub production vehicle storage
-- Run this script in Supabase Dashboard > SQL Editor.

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('Car', 'Bike')),
  brand text not null,
  model text not null,
  year integer not null,
  registration_number text not null default '',
  chassis_number text not null default '',
  engine_number text not null default '',
  mileage integer not null default 0,
  purchase_date date,
  purchase_price numeric(14, 2) not null default 0,
  color text not null default '',
  insurance_info text not null default '',
  tax_token_info text not null default '',
  fitness_expiry date,
  notes text not null default '',
  image text not null default '',
  status text not null default 'GOOD' check (status in ('GOOD', 'DUE SOON', 'OVERDUE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.vehicles enable row level security;

drop policy if exists "Users can view their vehicles" on public.vehicles;
create policy "Users can view their vehicles"
  on public.vehicles for select
  to authenticated
  using (auth.uid() = owner_id);

drop policy if exists "Users can create their vehicles" on public.vehicles;
create policy "Users can create their vehicles"
  on public.vehicles for insert
  to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists "Users can update their vehicles" on public.vehicles;
create policy "Users can update their vehicles"
  on public.vehicles for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Users can delete their vehicles" on public.vehicles;
create policy "Users can delete their vehicles"
  on public.vehicles for delete
  to authenticated
  using (auth.uid() = owner_id);

create index if not exists vehicles_owner_id_created_at_idx
  on public.vehicles (owner_id, created_at desc);

create table if not exists public.vehicle_expenses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  date date not null,
  category text not null,
  amount numeric(14, 2) not null default 0,
  mileage integer not null default 0,
  description text not null default '',
  receipt_url text,
  payment_method text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.vehicle_services (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  service_type text not null,
  service_date date not null,
  mileage_at_service integer not null default 0,
  workshop_name text not null default '',
  workshop_location text not null default '',
  mechanic_name text not null default '',
  cost numeric(14, 2) not null default 0,
  parts_cost numeric(14, 2) not null default 0,
  labor_cost numeric(14, 2) not null default 0,
  description text not null default '',
  notes text not null default '',
  next_service_date date,
  next_service_mileage integer not null default 0,
  reminder_enabled boolean not null default true,
  receipt_url text,
  created_at timestamptz not null default now()
);

alter table public.vehicle_expenses enable row level security;
alter table public.vehicle_services enable row level security;

create policy "Users can manage their vehicle expenses"
  on public.vehicle_expenses for all to authenticated
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "Users can manage their vehicle services"
  on public.vehicle_services for all to authenticated
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

insert into storage.buckets (id, name, public)
values ('vehicle-files', 'vehicle-files', true)
on conflict (id) do nothing;

drop policy if exists "Users can upload vehicle files" on storage.objects;
create policy "Users can upload vehicle files"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'vehicle-files' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can view vehicle files" on storage.objects;
create policy "Users can view vehicle files"
  on storage.objects for select to authenticated
  using (bucket_id = 'vehicle-files' and (storage.foldername(name))[1] = auth.uid()::text);

-- Configure Email sign-in in Authentication > Providers before using the app.
