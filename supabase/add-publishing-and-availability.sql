-- Run once for an existing Sweetwater Grill database.
alter table shifts add column if not exists publication_status text not null default 'published';
alter table shifts add column if not exists published_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'shifts_publication_status_check'
      and conrelid = 'public.shifts'::regclass
  ) then
    alter table shifts add constraint shifts_publication_status_check
      check (publication_status in ('draft', 'published'));
  end if;
end;
$$;

create table if not exists employee_availability (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  unavailable_start time not null default '00:00',
  unavailable_end time not null default '23:59',
  note text not null default '',
  created_at timestamptz not null default now(),
  check (unavailable_start < unavailable_end)
);

grant select, insert, update, delete on employee_availability to anon, authenticated;
alter table employee_availability enable row level security;
drop policy if exists "scheduler_public_access" on employee_availability;
create policy "scheduler_public_access" on employee_availability
  for all to anon, authenticated using (true) with check (true);
