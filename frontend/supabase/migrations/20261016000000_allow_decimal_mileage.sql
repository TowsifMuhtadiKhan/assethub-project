-- ==============================================================================
-- Migration: 20261016000000_allow_decimal_mileage.sql
-- Allow decimal odometer / mileage readings (e.g. 8153.5 km) across vehicle tables.
-- ==============================================================================

alter table if exists public.lifenest_vehicle_expenses
  alter column mileage type numeric(10, 2);

alter table if exists public.lifenest_vehicles
  alter column mileage type numeric(10, 2);

alter table if exists public.lifenest_vehicle_services
  alter column mileage_at_service type numeric(10, 2),
  alter column next_service_mileage type numeric(10, 2);
