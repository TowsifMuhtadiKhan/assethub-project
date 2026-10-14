-- ==============================================================================
-- Migration: 20261014110000_fix_vehicles_and_user_pins.sql
-- 1. Adds member_pins JSONB column to lifenest_user_settings for cross-device PIN persistence.
-- 2. Removes restrictive type check constraint on lifenest_vehicles so all vehicle types save cleanly.
-- 3. Ensures vehicle paper expiry columns exist on lifenest_vehicles.
-- ==============================================================================

-- 1. MEMBER PIN STORAGE IN USER SETTINGS
alter table public.lifenest_user_settings
  add column if not exists member_pins jsonb not null default '{}'::jsonb;

-- 2. RELAX VEHICLE TYPE CHECK (Allow Car, Bike, Motorcycle, Van, Bicycle, EV, Commercial, Other, etc.)
alter table public.lifenest_vehicles
  drop constraint if exists lifenest_vehicles_type_check;

-- 3. ENSURE ALL VEHICLE EXPIRY & INFO COLUMNS EXIST
alter table public.lifenest_vehicles
  add column if not exists ownership_info text not null default '',
  add column if not exists tax_token_expiry date,
  add column if not exists insurance_expiry date,
  add column if not exists route_permit_expiry date;
