-- Sweetwater Grill kitchen schedule for August 31-September 6, 2026.
-- This includes manager, cooks, and dish/cook coverage; server shifts are untouched.
-- Joan is off the entire week, so she has no shift rows.
-- The script is safe to rerun: an identical shift will not be inserted twice.

with schedule_rows(schedule_name, work_date, start_time, end_time, station, notes) as (
  values
    ('Matthew', '2026-09-02'::date, '10:00'::time, '14:30'::time, 'General Manager', 'Open-2:30 PM'),
    ('Matthew', '2026-09-03'::date, '10:00'::time, '22:00'::time, 'General Manager', 'Open-Close'),
    ('Matthew', '2026-09-04'::date, '10:00'::time, '22:00'::time, 'General Manager', 'Open-Close'),
    ('Matthew', '2026-09-05'::date, '10:00'::time, '22:00'::time, 'General Manager', 'Open-Close'),
    ('Matthew', '2026-09-06'::date, '10:00'::time, '22:00'::time, 'General Manager', 'Open-Close'),

    ('Jim', '2026-08-31'::date, '15:00'::time, '22:00'::time, 'Cook', '3:00 PM-Close'),
    ('Jim', '2026-09-02'::date, '14:30'::time, '22:00'::time, 'Cook', '2:30 PM-Close'),
    ('Jim', '2026-09-04'::date, '15:00'::time, '22:00'::time, 'Cook', '3:00 PM-Close'),
    ('Jim', '2026-09-05'::date, '10:00'::time, '22:00'::time, 'Cook', 'Open-Close'),

    ('Richard', '2026-08-31'::date, '10:00'::time, '22:00'::time, 'Cook', 'Open-Close'),
    ('Richard', '2026-09-02'::date, '15:00'::time, '22:00'::time, 'Cook', '3:00 PM-Close'),
    ('Richard', '2026-09-03'::date, '15:00'::time, '22:00'::time, 'Cook', '3:00 PM-Close'),
    ('Richard', '2026-09-06'::date, '10:00'::time, '22:00'::time, 'Cook', 'Open-Close'),

    ('Cindy', '2026-08-31'::date, '10:00'::time, '15:00'::time, 'Cook', 'Open-3:00 PM'),
    ('Cindy', '2026-09-02'::date, '10:00'::time, '15:00'::time, 'Cook', 'Open-3:00 PM'),
    ('Cindy', '2026-09-04'::date, '10:00'::time, '15:00'::time, 'Cook', 'Open-3:00 PM'),

    ('Grey', '2026-09-03'::date, '16:00'::time, '22:00'::time, 'Dish/Cook', '4:00 PM-Close'),
    ('Grey', '2026-09-04'::date, '16:00'::time, '22:00'::time, 'Dish/Cook', '4:00 PM-Close'),
    ('Grey', '2026-09-05'::date, '16:00'::time, '22:00'::time, 'Dish/Cook', '4:00 PM-Close'),
    ('Grey', '2026-09-06'::date, '10:00'::time, '22:00'::time, 'Dish/Cook', 'Whenever')
)
insert into shifts (employee_id, date, start_time, end_time, station, notes)
select employees.id, schedule_rows.work_date, schedule_rows.start_time,
  schedule_rows.end_time, schedule_rows.station, schedule_rows.notes
from schedule_rows
join employees on lower(employees.name) = lower(schedule_rows.schedule_name)
where not exists (
  select 1 from shifts
  where shifts.employee_id = employees.id
    and shifts.date = schedule_rows.work_date
    and shifts.start_time = schedule_rows.start_time
    and shifts.end_time = schedule_rows.end_time
);
