-- Available server shifts for staffing gaps in the week of 2026-08-17.
-- Uses an "Open Shift" placeholder employee plus coverage requests so employees can ask to work them.

insert into employees (name, email, role, position, active, login_code, must_change_password)
values ('Open Shift', 'open-shift@sweetwater.local', 'employee', 'Server', true, null, false)
on conflict (email) do update set
  name = excluded.name,
  role = excluded.role,
  position = excluded.position,
  active = true;

with manager_row as (
  select id
  from employees
  where role = 'manager' and active = true
  order by created_at
  limit 1
),
open_employee as (
  select id
  from employees
  where email = 'open-shift@sweetwater.local'
  limit 1
),
open_slots(work_date, start_time, end_time, station, notes) as (
  values
    ('2026-08-18'::date, '10:00'::time, '15:00'::time, 'Server', 'Open-3:00 PM'),
    ('2026-08-21'::date, '10:00'::time, '15:00'::time, 'Server', 'Open-3:00 PM'),
    ('2026-08-22'::date, '10:00'::time, '15:00'::time, 'Server', 'Open-3:00 PM')
),
inserted_shifts as (
  insert into shifts (employee_id, date, start_time, end_time, station, notes)
  select open_employee.id, open_slots.work_date, open_slots.start_time, open_slots.end_time, open_slots.station, open_slots.notes
  from open_slots
  cross join open_employee
  where not exists (
    select 1
    from shifts
    where shifts.employee_id = open_employee.id
      and shifts.date = open_slots.work_date
      and shifts.start_time = open_slots.start_time
      and shifts.end_time = open_slots.end_time
  )
  returning id
),
available_shifts as (
  select shifts.id
  from shifts
  cross join open_employee
  where shifts.employee_id = open_employee.id
    and shifts.date between '2026-08-17'::date and '2026-08-23'::date
)
insert into coverage_requests (shift_id, requester_id, target_employee_id, accepted_by_id, status, manager_note)
select available_shifts.id, manager_row.id, null, null, 'Pending', ''
from available_shifts
cross join manager_row
where not exists (
  select 1
  from coverage_requests
  where coverage_requests.shift_id = available_shifts.id
    and coverage_requests.status = 'Pending'
);
