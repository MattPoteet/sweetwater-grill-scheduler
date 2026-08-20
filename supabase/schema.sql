create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text unique not null,
  role text not null check (role in ('manager', 'employee')),
  position text not null default 'Team Member',
  active boolean not null default true,
  login_code text,
  password_hash text,
  password_salt text,
  must_change_password boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);

alter table employees add column if not exists login_code text;
alter table employees add column if not exists password_hash text;
alter table employees add column if not exists password_salt text;
alter table employees add column if not exists must_change_password boolean not null default true;
alter table employees add column if not exists last_login_at timestamptz;

create table if not exists shifts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  station text not null,
  notes text not null default '',
  publication_status text not null default 'published' check (publication_status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now()
);

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

create table if not exists time_off_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  shift_part text not null default 'all_day' check (shift_part in ('opening', 'closing', 'all_day')),
  reason text not null default '',
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Denied')),
  manager_note text not null default '',
  created_at timestamptz not null default now()
);

alter table time_off_requests add column if not exists shift_part text not null default 'all_day';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'time_off_requests_shift_part_check'
      and conrelid = 'public.time_off_requests'::regclass
  ) then
    alter table time_off_requests
      add constraint time_off_requests_shift_part_check
      check (shift_part in ('opening', 'closing', 'all_day'));
  end if;
end;
$$;

create table if not exists coverage_requests (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references shifts(id) on delete cascade,
  requester_id uuid not null references employees(id) on delete cascade,
  target_employee_id uuid references employees(id) on delete set null,
  accepted_by_id uuid references employees(id) on delete set null,
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Denied')),
  manager_note text not null default '',
  coverage_start_time time,
  coverage_end_time time,
  created_at timestamptz not null default now()
);

alter table coverage_requests add column if not exists coverage_start_time time;
alter table coverage_requests add column if not exists coverage_end_time time;

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  title text not null,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function enforce_server_for_available_serving_shift()
returns trigger
language plpgsql
as $$
begin
  if new.accepted_by_id is not null and exists (
    select 1
    from shifts s
    join employees open_employee on open_employee.id = s.employee_id
    join employees requesting_employee on requesting_employee.id = new.accepted_by_id
    where s.id = new.shift_id
      and lower(trim(open_employee.name)) = 'open shift'
      and lower(trim(s.station)) = 'server'
      and lower(trim(requesting_employee.position)) <> 'server'
  ) then
    raise exception 'Only servers can request an available serving shift.';
  end if;

  return new;
end;
$$;

drop trigger if exists coverage_requests_server_only on coverage_requests;
create trigger coverage_requests_server_only
before insert or update of accepted_by_id on coverage_requests
for each row execute function enforce_server_for_available_serving_shift();

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on employees to anon, authenticated;
grant select, insert, update, delete on shifts to anon, authenticated;
grant select, insert, update, delete on employee_availability to anon, authenticated;
grant select, insert, update, delete on time_off_requests to anon, authenticated;
grant select, insert, update, delete on coverage_requests to anon, authenticated;
grant select, insert, update, delete on notifications to anon, authenticated;

alter table employees enable row level security;
alter table shifts enable row level security;
alter table employee_availability enable row level security;
alter table time_off_requests enable row level security;
alter table coverage_requests enable row level security;
alter table notifications enable row level security;

drop policy if exists "scheduler_public_access" on employees;
drop policy if exists "scheduler_public_access" on shifts;
drop policy if exists "scheduler_public_access" on employee_availability;
drop policy if exists "scheduler_public_access" on time_off_requests;
drop policy if exists "scheduler_public_access" on coverage_requests;
drop policy if exists "scheduler_public_access" on notifications;

create policy "scheduler_public_access" on employees
  for all to anon, authenticated
  using (true)
  with check (true);

create policy "scheduler_public_access" on shifts
  for all to anon, authenticated
  using (true)
  with check (true);

create policy "scheduler_public_access" on employee_availability
  for all to anon, authenticated
  using (true)
  with check (true);

create policy "scheduler_public_access" on time_off_requests
  for all to anon, authenticated
  using (true)
  with check (true);

create policy "scheduler_public_access" on coverage_requests
  for all to anon, authenticated
  using (true)
  with check (true);

create policy "scheduler_public_access" on notifications
  for all to anon, authenticated
  using (true)
  with check (true);

insert into employees (name, email, role, position, active, login_code, must_change_password)
values ('Matthew', 'matthewpoteet1@gmail.com', 'manager', 'General Manager', true, 'SWG-MANAGER-2026', true)
on conflict (email) do update set
  name = excluded.name,
  role = excluded.role,
  position = excluded.position,
  active = excluded.active,
  login_code = coalesce(employees.login_code, excluded.login_code),
  must_change_password = coalesce(employees.must_change_password, excluded.must_change_password);
