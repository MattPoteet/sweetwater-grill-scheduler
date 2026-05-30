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
  created_at timestamptz not null default now()
);

create table if not exists time_off_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text not null default '',
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Denied')),
  manager_note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists coverage_requests (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references shifts(id) on delete cascade,
  requester_id uuid not null references employees(id) on delete cascade,
  target_employee_id uuid references employees(id) on delete set null,
  accepted_by_id uuid references employees(id) on delete set null,
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Denied')),
  manager_note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  title text not null,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on employees to anon, authenticated;
grant select, insert, update, delete on shifts to anon, authenticated;
grant select, insert, update, delete on time_off_requests to anon, authenticated;
grant select, insert, update, delete on coverage_requests to anon, authenticated;
grant select, insert, update, delete on notifications to anon, authenticated;

alter table employees enable row level security;
alter table shifts enable row level security;
alter table time_off_requests enable row level security;
alter table coverage_requests enable row level security;
alter table notifications enable row level security;

drop policy if exists "scheduler_public_access" on employees;
drop policy if exists "scheduler_public_access" on shifts;
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
values ('Matthew', 'manager@sweetwatergrill.local', 'manager', 'General Manager', true, 'SWG-MANAGER-2026', true)
on conflict (email) do update set
  name = excluded.name,
  role = excluded.role,
  position = excluded.position,
  active = excluded.active,
  login_code = coalesce(employees.login_code, excluded.login_code),
  must_change_password = coalesce(employees.must_change_password, excluded.must_change_password);
