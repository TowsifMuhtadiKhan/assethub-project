-- ==============================================================================
-- Migration: 20261014150000_add_tenure_months_to_loans.sql
-- Adds tenure_months to lifenest_member_loans table.
-- ==============================================================================

alter table public.lifenest_member_loans
  add column if not exists tenure_months integer;
