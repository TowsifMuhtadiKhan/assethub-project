-- ==============================================================================
-- Migration: 20261014120000_add_renter_nid_files.sql
-- Adds nid_files JSONB column to lifenest_rental_tenancies for storing renter NID scans/photos
-- ==============================================================================

alter table public.lifenest_rental_tenancies
  add column if not exists nid_files jsonb not null default '[]'::jsonb;
