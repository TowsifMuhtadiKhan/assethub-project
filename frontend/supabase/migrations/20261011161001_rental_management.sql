begin;
create extension if not exists btree_gist with schema extensions;
set local search_path = public, extensions;

alter table public.lifenest_property_units add column if not exists parent_unit_id uuid references public.lifenest_property_units(id);
alter table public.lifenest_property_units add column if not exists rental_mode text not null default 'whole' check (rental_mode in ('whole','rooms'));
create index if not exists rental_units_parent_idx on public.lifenest_property_units(parent_unit_id);

create table public.lifenest_rental_tenancies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  unit_id uuid not null references public.lifenest_property_units(id),
  tenant_name text not null check (length(trim(tenant_name)) > 0),
  tenant_phone text not null check (length(trim(tenant_phone)) >= 6),
  tenant_nid text not null default '',
  start_month date not null check (extract(day from start_month) = 1),
  end_month date check (extract(day from end_month) = 1 and end_month >= start_month),
  created_at timestamptz not null default now(),
  exclude using gist (unit_id with =, daterange(start_month, (end_month + interval '1 month')::date, '[)') with &&)
);
create index rental_tenancies_owner_idx on public.lifenest_rental_tenancies(owner_id,unit_id);
alter table public.lifenest_rental_tenancies enable row level security;
create policy rental_tenancies_owner on public.lifenest_rental_tenancies for all to authenticated
using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()) and exists (
 select 1 from public.lifenest_property_units u where u.id = unit_id and u.owner_id = (select auth.uid()) and u.rental_mode = 'whole'
));

create table public.lifenest_rent_schedules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  tenancy_id uuid not null references public.lifenest_rental_tenancies(id),
  from_month date not null check (extract(day from from_month) = 1),
  to_month date check (extract(day from to_month) = 1 and to_month >= from_month),
  base_rent numeric(14,2) not null check (base_rent >= 0),
  charges jsonb not null default '[]'::jsonb check (jsonb_typeof(charges) = 'array'),
  created_at timestamptz not null default now(),
  exclude using gist (tenancy_id with =, daterange(from_month, (to_month + interval '1 month')::date, '[)') with &&)
);
create index rental_schedules_owner_idx on public.lifenest_rent_schedules(owner_id,tenancy_id);
alter table public.lifenest_rent_schedules enable row level security;
create policy rental_schedules_owner on public.lifenest_rent_schedules for all to authenticated
using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()) and exists (
 select 1 from public.lifenest_rental_tenancies t where t.id = tenancy_id and t.owner_id = (select auth.uid())
));

create function public.validate_rental_schedule() returns trigger language plpgsql security invoker set search_path = '' as $$
declare charge jsonb;
begin
  for charge in select value from jsonb_array_elements(new.charges) loop
    if jsonb_typeof(charge->'amount') is distinct from 'number' or coalesce(trim(charge->>'label'),'') = '' then
      raise exception 'Each charge needs a label and numeric amount';
    end if;
    if (charge->>'amount')::numeric < 0 or round((charge->>'amount')::numeric,2) <> (charge->>'amount')::numeric then
      raise exception 'Charge amounts must be non-negative with at most two decimals';
    end if;
  end loop;
  return new;
end $$;
create trigger rental_schedule_validation before insert or update on public.lifenest_rent_schedules for each row execute function public.validate_rental_schedule();

alter table public.lifenest_rent_payments add column if not exists tenancy_id uuid references public.lifenest_rental_tenancies(id);
alter table public.lifenest_rent_payments add column if not exists voided_at timestamptz;
create index if not exists rental_payments_tenancy_idx on public.lifenest_rent_payments(tenancy_id,month) where voided_at is null;

-- Payment writes are serialized per tenancy and remain auditable when unchecked.
create function public.set_rental_payment(p_tenancy uuid, p_month date, p_paid boolean, p_amount numeric default null, p_date date default current_date)
returns void language plpgsql security invoker set search_path = '' as $$
declare t public.lifenest_rental_tenancies; s public.lifenest_rent_schedules; expected numeric; received numeric; amount numeric;
begin
 select * into t from public.lifenest_rental_tenancies where id = p_tenancy and owner_id = auth.uid() for update;
 if not found then raise exception 'Tenancy not found'; end if;
 if extract(day from p_month) <> 1 or p_month < t.start_month or (t.end_month is not null and p_month > t.end_month) then raise exception 'Month is outside this tenancy'; end if;
 if p_paid then
   select * into s from public.lifenest_rent_schedules where tenancy_id = t.id and from_month <= p_month and (to_month is null or to_month >= p_month);
   if not found then raise exception 'Set a rent rate for this month first'; end if;
   expected := s.base_rent + coalesce((select sum((value->>'amount')::numeric) from jsonb_array_elements(s.charges)),0);
   select coalesce(sum(amount_paid),0) into received from public.lifenest_rent_payments
    where owner_id = auth.uid() and unit_id = t.unit_id and (tenancy_id = t.id or tenancy_id is null)
      and month = to_char(p_month,'YYYY-MM') and voided_at is null;
   amount := coalesce(p_amount, greatest(0,expected-received));
   if amount < 0 or round(amount,2) <> amount then raise exception 'Invalid payment amount'; end if;
   if amount > 0 then
    insert into public.lifenest_rent_payments(owner_id,unit_id,tenancy_id,month,amount_payable,amount_paid,payment_date,status)
    values(auth.uid(),t.unit_id,t.id,to_char(p_month,'YYYY-MM'),expected,amount,p_date,case when received+amount >= expected then 'PAID' else 'PARTIALLY PAID' end);
   end if;
 else
   update public.lifenest_rent_payments set voided_at = now()
    where owner_id = auth.uid() and unit_id = t.unit_id and (tenancy_id = t.id or tenancy_id is null)
      and month = to_char(p_month,'YYYY-MM') and voided_at is null;
 end if;
end $$;
revoke all on function public.set_rental_payment(uuid,date,boolean,numeric,date) from public,anon;
grant execute on function public.set_rental_payment(uuid,date,boolean,numeric,date) to authenticated;

-- Normalize only unambiguous historical month labels; preserve amounts and dates.
update public.lifenest_rent_payments set month = to_char(to_date(month,'FMMonth YYYY'),'YYYY-MM')
 where month ~* '^(January|February|March|April|May|June|July|August|September|October|November|December) [0-9]{4}$';

create function public.add_rental_flat(p_property uuid,p_name text,p_rooms integer default 0)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare flat_id uuid; i integer;
begin
 perform 1 from public.lifenest_properties where id = p_property and owner_id = auth.uid() for update;
 if not found then raise exception 'Property not found'; end if;
 if trim(p_name) = '' or p_rooms < 0 or p_rooms > 100 then raise exception 'Invalid flat name or room count'; end if;
 insert into public.lifenest_property_units(owner_id,property_id,unit_number,unit_type,rental_mode)
 values(auth.uid(),p_property,trim(p_name),'Flat',case when p_rooms > 0 then 'rooms' else 'whole' end) returning id into flat_id;
 for i in 1..p_rooms loop
  insert into public.lifenest_property_units(owner_id,property_id,parent_unit_id,unit_number,unit_type)
  values(auth.uid(),p_property,flat_id,trim(p_name)||' / Room '||i,'Room');
 end loop;
 update public.lifenest_properties set units_count = (select count(*) from public.lifenest_property_units where property_id=p_property and parent_unit_id is null) where id=p_property;
 return flat_id;
end $$;
revoke all on function public.add_rental_flat(uuid,text,integer) from public,anon;
grant execute on function public.add_rental_flat(uuid,text,integer) to authenticated;

create function public.create_rental_property(p_name text,p_location text,p_type text,p_flat_name text,p_rooms integer default 0)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare property_id uuid;
begin
 if auth.uid() is null or trim(p_name) = '' or trim(p_location) = '' then raise exception 'Property name and address are required'; end if;
 insert into public.lifenest_properties(owner_id,name,location,type) values(auth.uid(),trim(p_name),trim(p_location),p_type) returning id into property_id;
 perform public.add_rental_flat(property_id,p_flat_name,p_rooms);
 return property_id;
end $$;
revoke all on function public.create_rental_property(text,text,text,text,integer) from public,anon;
grant execute on function public.create_rental_property(text,text,text,text,integer) to authenticated;

create table if not exists public.lifenest_property_expenses (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 property_id uuid not null references public.lifenest_properties(id), date date not null,
 category text not null default 'Maintenance', amount numeric(14,2) not null check(amount >= 0),
 vendor text not null default '', description text not null default '', payment_method text not null default 'Cash',
 receipt_url text, created_at timestamptz not null default now()
);
alter table public.lifenest_property_expenses add column if not exists unit_id uuid references public.lifenest_property_units(id);
alter table public.lifenest_property_expenses add column if not exists files jsonb not null default '[]';
alter table public.lifenest_property_expenses add column if not exists extracted_text text not null default '';
alter table public.lifenest_property_expenses enable row level security;
drop policy if exists rental_expenses_owner on public.lifenest_property_expenses;
create policy rental_expenses_owner on public.lifenest_property_expenses for all to authenticated
using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()) and exists (
 select 1 from public.lifenest_properties p where p.id = property_id and p.owner_id = (select auth.uid())
) and (unit_id is null or exists(select 1 from public.lifenest_property_units u where u.id = unit_id and u.property_id = lifenest_property_expenses.property_id and u.owner_id=(select auth.uid()))));
create index if not exists rental_expenses_owner_idx on public.lifenest_property_expenses(owner_id,property_id,date);

create table public.lifenest_property_documents (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 property_id uuid not null references public.lifenest_properties(id), category text not null, name text not null,
 document_number text not null default '', issue_date date, expiry_date date,
 notes text not null default '', files jsonb not null default '[]', created_at timestamptz not null default now()
);
alter table public.lifenest_property_documents enable row level security;
create policy rental_documents_owner on public.lifenest_property_documents for all to authenticated
using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()) and exists (
 select 1 from public.lifenest_properties p where p.id = property_id and p.owner_id = (select auth.uid())
));
create index rental_documents_owner_idx on public.lifenest_property_documents(owner_id,property_id);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('rental-private','rental-private',false,20971520,array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
create policy rental_files_owner on storage.objects for all to authenticated
using (bucket_id='rental-private' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id='rental-private' and (storage.foldername(name))[1] = (select auth.uid())::text);

grant select,insert,update,delete on public.lifenest_rental_tenancies,public.lifenest_rent_schedules,public.lifenest_property_documents,public.lifenest_property_expenses to authenticated;
revoke all on function public.validate_rental_schedule() from public,anon;
commit;
