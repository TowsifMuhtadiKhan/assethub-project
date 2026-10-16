-- ==============================================================================
-- LifeNest — Personal Life Operating System
-- All tables are namespaced with "lifenest_" for complete isolation on shared Supabase projects.
-- Run this entire script in Supabase Dashboard > SQL Editor > New query > Run.
-- ==============================================================================

-- 1. USER SETTINGS & REMINDER PREFERENCES
create table if not exists public.lifenest_user_settings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null default '',
  whatsapp_number text not null default '',
  country_code text not null default '+880',
  whatsapp_enabled boolean not null default true,
  reminder_days_before integer not null default 7,
  google_drive_folder_id text not null default '',
  callmebot_api_key text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lifenest_user_settings_owner_unique unique (owner_id)
);

alter table public.lifenest_user_settings add column if not exists callmebot_api_key text not null default '';
alter table public.lifenest_user_settings add column if not exists whatsapp_contacts jsonb not null default '[]'::jsonb;

alter table public.lifenest_user_settings enable row level security;
drop policy if exists "lifenest_user_settings_policy" on public.lifenest_user_settings;
create policy "lifenest_user_settings_policy"
  on public.lifenest_user_settings for all
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- 2. FAMILY PROFILES
create table if not exists public.lifenest_family_members (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  relationship text not null, -- Self, Spouse, Child, Parent, Sibling, Other
  date_of_birth date,
  phone text not null default '',
  email text not null default '',
  address text not null default '',
  nationality text not null default 'Bangladeshi',
  identification_info text not null default '', -- NID / Passport / Birth Reg No
  notes text not null default '',
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lifenest_family_members enable row level security;
drop policy if exists "lifenest_family_members_policy" on public.lifenest_family_members;
create policy "lifenest_family_members_policy"
  on public.lifenest_family_members for all
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create index if not exists lifenest_family_members_owner_idx
  on public.lifenest_family_members (owner_id, relationship);

-- 3. PERSONAL & FAMILY DOCUMENT VAULT
create table if not exists public.lifenest_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null, -- Identity, Academic, Employment, Tax/Financial, Health, Legal, Travel, Other
  document_number text not null default '',
  issue_date date,
  expiry_date date,
  issuing_authority text not null default '',
  family_member_id uuid references public.lifenest_family_members(id) on delete set null,
  asset_type text not null default '', -- 'vehicle', 'property', 'general'
  asset_id text not null default '',
  folder_name text not null default 'General',
  file_url text,
  file_type text not null default 'pdf',
  storage_provider text not null default 'supabase', -- 'google_drive', 'supabase', 'local'
  drive_file_id text default '',
  is_favorite boolean not null default false,
  requires_renewal boolean not null default false,
  reminder_date date,
  tags text[] default array[]::text[],
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lifenest_documents enable row level security;
drop policy if exists "lifenest_documents_policy" on public.lifenest_documents;
create policy "lifenest_documents_policy"
  on public.lifenest_documents for all
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create index if not exists lifenest_documents_owner_cat_idx
  on public.lifenest_documents (owner_id, category, expiry_date);

-- 3.1 DOCUMENT FOLDERS (Custom folders for family members and categories)
create table if not exists public.lifenest_document_folders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  parent_id uuid references public.lifenest_document_folders(id) on delete cascade,
  family_member_id uuid references public.lifenest_family_members(id) on delete set null,
  color text not null default 'indigo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lifenest_document_folders enable row level security;
drop policy if exists "lifenest_document_folders_policy" on public.lifenest_document_folders;
create policy "lifenest_document_folders_policy"
  on public.lifenest_document_folders for all
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create index if not exists lifenest_document_folders_owner_idx
  on public.lifenest_document_folders (owner_id, name);

-- 4. LICENSES & REGISTRATIONS
create table if not exists public.lifenest_licenses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  license_name text not null,
  license_number text not null default '',
  holder_name text not null default '',
  family_member_id uuid references public.lifenest_family_members(id) on delete set null,
  issuing_authority text not null default '',
  issue_date date,
  expiry_date date,
  renewal_period text not null default 'Annual',
  renewal_cost numeric(14, 2) not null default 0,
  reminder_date date,
  document_url text,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lifenest_licenses enable row level security;
drop policy if exists "lifenest_licenses_policy" on public.lifenest_licenses;
create policy "lifenest_licenses_policy"
  on public.lifenest_licenses for all
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create index if not exists lifenest_licenses_owner_idx
  on public.lifenest_licenses (owner_id, expiry_date);

-- 5. VEHICLES
create table if not exists public.lifenest_vehicles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('Car', 'Bike', 'Scooter', 'Commercial', 'Other')),
  brand text not null default '',
  model text not null default '',
  year integer not null default 2024,
  registration_number text not null default '',
  chassis_number text not null default '',
  engine_number text not null default '',
  mileage numeric(10, 2) not null default 0,
  purchase_date date,
  purchase_price numeric(14, 2) not null default 0,
  color text not null default '',
  ownership_info text not null default '',
  insurance_info text not null default '',
  tax_token_info text not null default '',
  fitness_expiry date,
  tax_token_expiry date,
  insurance_expiry date,
  route_permit_expiry date,
  notes text not null default '',
  image text not null default '',
  status text not null default 'GOOD' check (status in ('GOOD', 'DUE SOON', 'OVERDUE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lifenest_vehicles enable row level security;
drop policy if exists "lifenest_vehicles_policy" on public.lifenest_vehicles;
create policy "lifenest_vehicles_policy"
  on public.lifenest_vehicles for all
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create index if not exists lifenest_vehicles_owner_idx
  on public.lifenest_vehicles (owner_id, created_at desc);

-- 6. VEHICLE FUEL & EXPENSES
create table if not exists public.lifenest_vehicle_expenses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid not null references public.lifenest_vehicles(id) on delete cascade,
  date date not null default current_date,
  category text not null, -- Fuel, Repair, Insurance, Tax Token, Fitness, Parking, Toll, Wash, Fine, Accessories, Other
  fuel_type text not null default 'Octane', -- Octane, Petrol, Diesel, CNG, LPG, Electric
  fuel_liters numeric(10, 2),
  price_per_unit numeric(10, 2),
  amount numeric(14, 2) not null default 0,
  mileage numeric(10, 2) not null default 0,
  fuel_station text not null default '',
  description text not null default '',
  receipt_url text,
  payment_method text not null default '',
  created_at timestamptz not null default now()
);

alter table public.lifenest_vehicle_expenses enable row level security;
drop policy if exists "lifenest_vehicle_expenses_policy" on public.lifenest_vehicle_expenses;
create policy "lifenest_vehicle_expenses_policy"
  on public.lifenest_vehicle_expenses for all
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create index if not exists lifenest_vehicle_expenses_owner_idx
  on public.lifenest_vehicle_expenses (owner_id, vehicle_id, date desc);

-- 7. VEHICLE SERVICES & MAINTENANCE
create table if not exists public.lifenest_vehicle_services (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid not null references public.lifenest_vehicles(id) on delete cascade,
  service_type text not null,
  service_date date not null default current_date,
  mileage_at_service numeric(10, 2) not null default 0,
  workshop_name text not null default '',
  workshop_location text not null default '',
  mechanic_name text not null default '',
  parts_used text not null default '',
  cost numeric(14, 2) not null default 0,
  parts_cost numeric(14, 2) not null default 0,
  labor_cost numeric(14, 2) not null default 0,
  description text not null default '',
  notes text not null default '',
  next_service_date date,
  next_service_mileage numeric(10, 2) not null default 0,
  reminder_enabled boolean not null default true,
  receipt_url text,
  created_at timestamptz not null default now()
);

alter table public.lifenest_vehicle_services enable row level security;
drop policy if exists "lifenest_vehicle_services_policy" on public.lifenest_vehicle_services;
create policy "lifenest_vehicle_services_policy"
  on public.lifenest_vehicle_services for all
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create index if not exists lifenest_vehicle_services_owner_idx
  on public.lifenest_vehicle_services (owner_id, vehicle_id, service_date desc);

-- 8. PURCHASES, RECEIPTS & WARRANTIES
create table if not exists public.lifenest_warranties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  product_name text not null,
  category text not null, -- Electronics, Appliances, Furniture, Vehicle Parts, Gadgets, Home, Other
  purchase_date date not null default current_date,
  warranty_start_date date,
  warranty_duration_months integer not null default 12,
  expiry_date date,
  seller text not null default '',
  purchase_price numeric(14, 2) not null default 0,
  serial_number text not null default '',
  invoice_number text not null default '',
  receipt_url text,
  warranty_document_url text,
  related_asset_type text not null default '', -- 'vehicle', 'property', 'none'
  related_asset_id text not null default '',
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'EXPIRING SOON', 'EXPIRED', 'CLAIMED')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lifenest_warranties enable row level security;
drop policy if exists "lifenest_warranties_policy" on public.lifenest_warranties;
create policy "lifenest_warranties_policy"
  on public.lifenest_warranties for all
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create index if not exists lifenest_warranties_owner_idx
  on public.lifenest_warranties (owner_id, expiry_date);

-- 9. REAL ESTATE & PROPERTIES
create table if not exists public.lifenest_properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null, -- Flat, House, Land, Plot, Commercial, Shop, Office, Warehouse, Factory, Other
  address text not null default '',
  location text not null default '',
  land_area text not null default '',
  floor_area text not null default '',
  size_sqft integer not null default 0,
  ownership_percentage numeric(5, 2) not null default 100.0,
  purchase_date date,
  purchase_value numeric(14, 2) not null default 0,
  estimated_current_value numeric(14, 2) not null default 0,
  units_count integer not null default 0,
  occupancy_rate integer not null default 0,
  description text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lifenest_properties enable row level security;
drop policy if exists "lifenest_properties_policy" on public.lifenest_properties;
create policy "lifenest_properties_policy"
  on public.lifenest_properties for all
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create index if not exists lifenest_properties_owner_idx
  on public.lifenest_properties (owner_id, created_at desc);

-- 10. PROPERTY RENTAL UNITS
create table if not exists public.lifenest_property_units (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid not null references public.lifenest_properties(id) on delete cascade,
  unit_number text not null default '',
  unit_name text not null default '',
  unit_type text not null default 'Flat', -- Room, Shop, Flat, Office, Floor, Warehouse, Commercial Space, Other
  floor text not null default '',
  size_sqft integer not null default 0,
  monthly_rent numeric(14, 2) not null default 0,
  security_deposit numeric(14, 2) not null default 0,
  current_tenant text not null default '',
  tenant_name text not null default '',
  tenant_phone text not null default '',
  tenant_email text not null default '',
  tenant_nid text not null default '',
  emergency_contact text not null default '',
  agreement_start_date date,
  agreement_end_date date,
  agreement_doc_url text,
  status text not null default 'Vacant', -- Occupied, Vacant, Reserved, Under Maintenance
  created_at timestamptz not null default now()
);

alter table public.lifenest_property_units enable row level security;
drop policy if exists "lifenest_property_units_policy" on public.lifenest_property_units;
create policy "lifenest_property_units_policy"
  on public.lifenest_property_units for all
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create index if not exists lifenest_property_units_owner_idx
  on public.lifenest_property_units (owner_id, property_id);

-- 11. RENT PAYMENTS & COLLECTIONS
create table if not exists public.lifenest_rent_payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  unit_id uuid not null references public.lifenest_property_units(id) on delete cascade,
  month text not null, -- '2026-10', 'October 2026'
  amount_payable numeric(14, 2) not null default 0,
  amount_paid numeric(14, 2) not null default 0,
  payment_date timestamptz not null default now(),
  payment_method text not null default 'Bank Transfer', -- Cash, bKash, Nagad, Bank Transfer, Cheque
  transaction_id text not null default '',
  notes text not null default '',
  receipt_url text,
  status text not null default 'PAID' check (status in ('PAID', 'PARTIALLY PAID', 'UNPAID', 'OVERDUE')),
  created_at timestamptz not null default now()
);

alter table public.lifenest_rent_payments enable row level security;
drop policy if exists "lifenest_rent_payments_policy" on public.lifenest_rent_payments;
create policy "lifenest_rent_payments_policy"
  on public.lifenest_rent_payments for all
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create index if not exists lifenest_rent_payments_owner_idx
  on public.lifenest_rent_payments (owner_id, unit_id, month);

-- 12. PERSONAL TASKS & TO-DO MANAGEMENT
create table if not exists public.lifenest_tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  priority text not null default 'Medium' check (priority in ('Low', 'Medium', 'High', 'Urgent')),
  due_date date,
  due_time text not null default '',
  category text not null default 'General', -- Personal, Vehicle, Property, Family, Bills, Renewal, Work, Health, Other
  recurrence text not null default 'None' check (recurrence in ('None', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly')),
  family_member_id uuid references public.lifenest_family_members(id) on delete set null,
  vehicle_id uuid references public.lifenest_vehicles(id) on delete set null,
  property_id uuid references public.lifenest_properties(id) on delete set null,
  document_id uuid references public.lifenest_documents(id) on delete set null,
  status text not null default 'Pending' check (status in ('Pending', 'In Progress', 'Completed', 'Cancelled', 'Overdue')),
  reminder_whatsapp boolean not null default true,
  reminder_date date,
  notes text not null default '',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lifenest_tasks enable row level security;
drop policy if exists "lifenest_tasks_policy" on public.lifenest_tasks;
create policy "lifenest_tasks_policy"
  on public.lifenest_tasks for all
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create index if not exists lifenest_tasks_owner_idx
  on public.lifenest_tasks (owner_id, due_date, status);

-- 13. NOTIFICATIONS & ALERTS
create table if not exists public.lifenest_notifications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'system' check (type in ('document', 'vehicle', 'property', 'rent', 'warranty', 'task', 'system')),
  link text not null default '',
  status text not null default 'new' check (status in ('new', 'read', 'dismissed')),
  date timestamptz not null default now()
);

alter table public.lifenest_notifications enable row level security;
drop policy if exists "lifenest_notifications_policy" on public.lifenest_notifications;
create policy "lifenest_notifications_policy"
  on public.lifenest_notifications for all
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create index if not exists lifenest_notifications_owner_idx
  on public.lifenest_notifications (owner_id, date desc);

-- 14. STORAGE BUCKET FOR LIFENEST (DOCUMENTS, RECEIPTS, PHOTOS)
insert into storage.buckets (id, name, public)
values ('lifenest-files', 'lifenest-files', true)
on conflict (id) do nothing;

drop policy if exists "lifenest_storage_upload_policy" on storage.objects;
create policy "lifenest_storage_upload_policy"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'lifenest-files');

drop policy if exists "lifenest_storage_select_policy" on storage.objects;
create policy "lifenest_storage_select_policy"
  on storage.objects for select
  to public
  using (bucket_id = 'lifenest-files');

-- 15. DAILY & FAMILY EXPENSES
create table if not exists public.lifenest_daily_expenses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  family_member_id text not null default '',
  family_member_name text not null default '',
  date date not null default current_date,
  amount numeric(14,2) not null check (amount >= 0),
  category text not null,
  payment_method text not null default 'Cash',
  description text not null default '',
  merchant text not null default '',
  receipt_url text,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lifenest_daily_expenses enable row level security;
drop policy if exists "lifenest_daily_expenses_policy" on public.lifenest_daily_expenses;
create policy "lifenest_daily_expenses_policy"
  on public.lifenest_daily_expenses for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create index if not exists lifenest_daily_expenses_owner_date_idx
  on public.lifenest_daily_expenses (owner_id, date desc);

create index if not exists lifenest_daily_expenses_member_idx
  on public.lifenest_daily_expenses (owner_id, family_member_id);

-- 16. MEMBER LOANS, DEBTS & EMI REPAYMENTS
create table if not exists public.lifenest_member_loans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  family_member_id text not null default '',
  family_member_name text not null default '',
  loan_title text not null default 'Personal Loan',
  loan_type text not null default 'Car Loan',
  lender_name text not null default '',
  principal_amount numeric(14,2) not null check (principal_amount >= 0),
  total_repayable_amount numeric(14,2) not null check (total_repayable_amount >= 0),
  interest_rate numeric(8,2),
  tenure_months integer,
  start_date date not null default current_date,
  target_end_date date,
  monthly_emi_amount numeric(14,2),
  repayments jsonb not null default '[]'::jsonb check (jsonb_typeof(repayments) = 'array'),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'PAID_OFF', 'DEFAULTED')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lifenest_member_loans enable row level security;
drop policy if exists "lifenest_member_loans_policy" on public.lifenest_member_loans;
create policy "lifenest_member_loans_policy"
  on public.lifenest_member_loans for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create index if not exists lifenest_member_loans_owner_status_idx
  on public.lifenest_member_loans (owner_id, status);

create index if not exists lifenest_member_loans_member_idx
  on public.lifenest_member_loans (owner_id, family_member_id);

-- 17. MEMBER PINS & EXTENDED VEHICLE SPECS MIGRATION
alter table public.lifenest_user_settings
  add column if not exists member_pins jsonb not null default '{}'::jsonb;

alter table public.lifenest_vehicles
  drop constraint if exists lifenest_vehicles_type_check;

alter table public.lifenest_vehicles
  add column if not exists ownership_info text not null default '',
  add column if not exists tax_token_expiry date,
  add column if not exists insurance_expiry date,
  add column if not exists route_permit_expiry date;

-- 18. MEMBER SAVINGS, DPS & TERM DEPOSITS (FDR, Sanchayapatra)
create table if not exists public.lifenest_member_savings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  family_member_id text not null default '',
  family_member_name text not null default '',
  title text not null default 'Monthly DPS',
  type text not null default 'DPS',
  institution_name text not null default '',
  account_number text not null default '',
  monthly_installment numeric(14,2),
  principal_amount numeric(14,2),
  tenure_years numeric(6,2),
  tenure_months integer,
  start_date date not null default current_date,
  maturity_date date,
  interest_rate numeric(8,2),
  maturity_amount numeric(14,2),
  deposit_day_of_month integer,
  profit_payout_frequency text not null default 'Monthly',
  deposit_logs jsonb not null default '[]'::jsonb check (jsonb_typeof(deposit_logs) = 'array'),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'MATURED', 'CLOSED')),
  nominee_name text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lifenest_member_savings enable row level security;
drop policy if exists "lifenest_member_savings_policy" on public.lifenest_member_savings;
create policy "lifenest_member_savings_policy"
  on public.lifenest_member_savings for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create index if not exists lifenest_member_savings_owner_status_idx
  on public.lifenest_member_savings (owner_id, status);

create index if not exists lifenest_member_savings_member_idx
  on public.lifenest_member_savings (owner_id, family_member_id);

