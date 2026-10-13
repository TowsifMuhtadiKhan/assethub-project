-- ==============================================================================
-- Migration: 20261014000000_daily_expenses_and_loans.sql
-- Adds daily expenses and member loans & debt tracking tables with RLS policies.
-- Safe to run on shared Supabase projects (namespaced with lifenest_).
-- ==============================================================================

-- 1. DAILY EXPENSES TABLE
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

-- 2. MEMBER LOANS, DEBTS & EMI REPAYMENTS TABLE
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
