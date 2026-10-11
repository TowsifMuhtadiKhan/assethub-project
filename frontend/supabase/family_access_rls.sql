-- =========================================================================
-- LIFENEST: MULTI-USER FAMILY WORKSPACE ACCESS & RLS POLICIES
-- =========================================================================
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- This allows invited family members (matching their email or phone in lifenest_family_members)
-- to view and collaborate on the family workspace (vehicles, maintenance, fuel, tasks, docs).

-- 1. Helper function: Returns the current user's UID + the UID of the head of household who invited them
create or replace function public.get_accessible_owner_ids()
returns setof uuid
language sql
security definer
stable
as $$
  -- 1. The user's own data
  select auth.uid()
  union
  -- 2. Data owned by any household owner who added this user's email or phone to lifenest_family_members
  select owner_id
  from public.lifenest_family_members
  where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
     or (phone <> '' and phone = coalesce(auth.jwt() ->> 'phone', ''));
$$;

-- Grant execution to all authenticated users
grant execute on function public.get_accessible_owner_ids() to authenticated;

-- =========================================================================
-- 2. UPDATE VEHICLES RLS
-- =========================================================================
drop policy if exists "lifenest_vehicles_policy" on public.lifenest_vehicles;
create policy "lifenest_vehicles_policy"
  on public.lifenest_vehicles for all
  to authenticated
  using (owner_id in (select public.get_accessible_owner_ids()))
  with check (owner_id in (select public.get_accessible_owner_ids()));

-- =========================================================================
-- 3. UPDATE VEHICLE FUEL & EXPENSES RLS
-- =========================================================================
drop policy if exists "lifenest_vehicle_expenses_policy" on public.lifenest_vehicle_expenses;
create policy "lifenest_vehicle_expenses_policy"
  on public.lifenest_vehicle_expenses for all
  to authenticated
  using (owner_id in (select public.get_accessible_owner_ids()))
  with check (owner_id in (select public.get_accessible_owner_ids()));

-- =========================================================================
-- 4. UPDATE VEHICLE SERVICES & MAINTENANCE RLS
-- =========================================================================
drop policy if exists "lifenest_vehicle_services_policy" on public.lifenest_vehicle_services;
create policy "lifenest_vehicle_services_policy"
  on public.lifenest_vehicle_services for all
  to authenticated
  using (owner_id in (select public.get_accessible_owner_ids()))
  with check (owner_id in (select public.get_accessible_owner_ids()));

-- =========================================================================
-- 5. UPDATE FAMILY MEMBERS RLS
-- =========================================================================
drop policy if exists "lifenest_family_members_policy" on public.lifenest_family_members;
create policy "lifenest_family_members_policy"
  on public.lifenest_family_members for all
  to authenticated
  using (owner_id in (select public.get_accessible_owner_ids()))
  with check (owner_id in (select public.get_accessible_owner_ids()));

-- =========================================================================
-- 6. UPDATE DOCUMENT VAULT RLS
-- =========================================================================
drop policy if exists "lifenest_documents_policy" on public.lifenest_documents;
create policy "lifenest_documents_policy"
  on public.lifenest_documents for all
  to authenticated
  using (owner_id in (select public.get_accessible_owner_ids()))
  with check (owner_id in (select public.get_accessible_owner_ids()));

drop policy if exists "lifenest_document_folders_policy" on public.lifenest_document_folders;
create policy "lifenest_document_folders_policy"
  on public.lifenest_document_folders for all
  to authenticated
  using (owner_id in (select public.get_accessible_owner_ids()))
  with check (owner_id in (select public.get_accessible_owner_ids()));

-- =========================================================================
-- 7. UPDATE TASKS & REMINDERS RLS
-- =========================================================================
drop policy if exists "lifenest_tasks_policy" on public.lifenest_tasks;
create policy "lifenest_tasks_policy"
  on public.lifenest_tasks for all
  to authenticated
  using (owner_id in (select public.get_accessible_owner_ids()))
  with check (owner_id in (select public.get_accessible_owner_ids()));

-- =========================================================================
-- 8. UPDATE WARRANTIES RLS
-- =========================================================================
drop policy if exists "lifenest_warranties_policy" on public.lifenest_warranties;
create policy "lifenest_warranties_policy"
  on public.lifenest_warranties for all
  to authenticated
  using (owner_id in (select public.get_accessible_owner_ids()))
  with check (owner_id in (select public.get_accessible_owner_ids()));

-- =========================================================================
-- 9. UPDATE PROPERTIES & RENTALS RLS
-- =========================================================================
drop policy if exists "lifenest_properties_policy" on public.lifenest_properties;
create policy "lifenest_properties_policy"
  on public.lifenest_properties for all
  to authenticated
  using (owner_id in (select public.get_accessible_owner_ids()))
  with check (owner_id in (select public.get_accessible_owner_ids()));
