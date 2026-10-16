-- ==============================================================================
-- Migration: 20261014140000_add_member_savings_table.sql
-- Adds member savings, DPS & Term Deposits (FDR, Sanchayapatra) table with RLS.
-- ==============================================================================

create table if not exists public.lifenest_member_savings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  family_member_id text not null default '',
  family_member_name text not null default '',
  title text not null default 'Monthly DPS',
  type text not null default 'DPS', -- DPS, FDR, Sanchayapatra, Mutual Fund, Other
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
