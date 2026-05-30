grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on employees to anon, authenticated;
grant select, insert, update, delete on shifts to anon, authenticated;
grant select, insert, update, delete on time_off_requests to anon, authenticated;
grant select, insert, update, delete on coverage_requests to anon, authenticated;
grant select, insert, update, delete on notifications to anon, authenticated;

alter table employees add column if not exists login_code text;
alter table employees add column if not exists password_hash text;
alter table employees add column if not exists password_salt text;
alter table employees add column if not exists must_change_password boolean not null default true;
alter table employees add column if not exists last_login_at timestamptz;

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
values ('Matthew', 'matthewpoteet1@gmail.com', 'manager', 'General Manager', true, 'SWG-MANAGER-2026', true)
on conflict (email) do update set
  name = excluded.name,
  role = excluded.role,
  position = excluded.position,
  active = excluded.active,
  login_code = coalesce(employees.login_code, excluded.login_code),
  must_change_password = coalesce(employees.must_change_password, excluded.must_change_password);
