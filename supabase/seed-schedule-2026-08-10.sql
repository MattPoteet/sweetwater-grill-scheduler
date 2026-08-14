-- Sweetwater Grill schedule for the week of 2026-08-10.
-- Matches names by full name or common schedule nickname.

with schedule_rows(schedule_name, work_date, start_time, end_time, station, notes) as (
  values
    ('Matthew', '2026-08-13'::date, '10:00'::time, '22:00'::time, 'General Manager', 'Open-Close'),
    ('Matthew', '2026-08-14'::date, '10:00'::time, '22:00'::time, 'General Manager', 'Open-Close'),
    ('Matthew', '2026-08-15'::date, '10:00'::time, '22:00'::time, 'General Manager', 'Open-Close'),

    ('Jim', '2026-08-12'::date, '10:00'::time, '15:00'::time, 'Cook', 'Open-3:00 PM'),
    ('Jim', '2026-08-13'::date, '15:00'::time, '22:00'::time, 'Cook', '3:00 PM-Close'),
    ('Jim', '2026-08-14'::date, '15:00'::time, '22:00'::time, 'Cook', '3:00 PM-Close'),
    ('Jim', '2026-08-15'::date, '10:00'::time, '22:00'::time, 'Cook', 'Open-Close'),
    ('Jim', '2026-08-16'::date, '10:00'::time, '22:00'::time, 'Cook', 'Open-Close'),

    ('Joan', '2026-08-10'::date, '15:00'::time, '22:00'::time, 'Cook', '3:00 PM-Close'),
    ('Joan', '2026-08-11'::date, '15:00'::time, '22:00'::time, 'Cook', '3:00 PM-Close'),
    ('Joan', '2026-08-12'::date, '15:00'::time, '22:00'::time, 'Cook', '3:00 PM-Close'),
    ('Joan', '2026-08-13'::date, '10:00'::time, '15:00'::time, 'Cook', 'Open-3:00 PM'),
    ('Joan', '2026-08-14'::date, '10:00'::time, '15:00'::time, 'Cook', 'Open-3:00 PM'),
    ('Joan', '2026-08-16'::date, '10:00'::time, '22:00'::time, 'Cook', 'Open-Close'),

    ('Richard', '2026-08-10'::date, '10:00'::time, '22:00'::time, 'Cook', 'Open-Close'),
    ('Richard', '2026-08-11'::date, '10:00'::time, '22:00'::time, 'Cook', 'Open-Close'),
    ('Richard', '2026-08-12'::date, '15:00'::time, '22:00'::time, 'Cook', '3:00 PM-Close'),
    ('Richard', '2026-08-16'::date, '10:00'::time, '22:00'::time, 'Cook', 'Open-Close'),

    ('Cindy', '2026-08-10'::date, '10:00'::time, '15:00'::time, 'Cook', 'Open-3:00 PM'),
    ('Cindy', '2026-08-11'::date, '10:00'::time, '15:00'::time, 'Cook', 'Open-3:00 PM'),
    ('Cindy', '2026-08-12'::date, '10:00'::time, '15:00'::time, 'Cook', 'Open-3:00 PM'),

    ('Taylor', '2026-08-10'::date, '15:00'::time, '22:00'::time, 'Server', '3:00 PM-Close'),
    ('Taylor', '2026-08-11'::date, '15:00'::time, '22:00'::time, 'Server', '3:00 PM-Close'),
    ('Taylor', '2026-08-12'::date, '10:00'::time, '15:00'::time, 'Server', 'Open-3:00 PM'),
    ('Taylor', '2026-08-13'::date, '15:00'::time, '22:00'::time, 'Server', '3:00 PM-Close'),

    ('Addie Beech', '2026-08-13'::date, '10:00'::time, '15:00'::time, 'Server', 'Open-3:00 PM'),
    ('Addie Beech', '2026-08-14'::date, '10:00'::time, '22:00'::time, 'Server', 'Open-Close'),
    ('Addie Beech', '2026-08-15'::date, '10:00'::time, '15:00'::time, 'Server', 'Open-3:00 PM'),
    ('Addie Beech', '2026-08-16'::date, '10:00'::time, '22:00'::time, 'Server', 'Open-Close'),

    ('Haylee', '2026-08-10'::date, '10:00'::time, '22:00'::time, 'Server', 'Open-Close'),
    ('Haylee', '2026-08-11'::date, '10:00'::time, '15:00'::time, 'Server', 'Open-3:00 PM'),
    ('Haylee', '2026-08-12'::date, '10:00'::time, '15:00'::time, 'Server', 'Open-3:00 PM'),
    ('Haylee', '2026-08-13'::date, '10:00'::time, '15:00'::time, 'Server', 'Open-3:00 PM'),

    ('jazmin', '2026-08-12'::date, '15:00'::time, '22:00'::time, 'Server', '3:00 PM-Close'),
    ('jazmin', '2026-08-14'::date, '15:00'::time, '22:00'::time, 'Server', '3:00 PM-Close'),
    ('jazmin', '2026-08-15'::date, '15:00'::time, '22:00'::time, 'Server', '3:00 PM-Close'),

    ('Patsy', '2026-08-12'::date, '15:00'::time, '22:00'::time, 'Server', '3:00 PM-Close'),
    ('Patsy', '2026-08-13'::date, '15:00'::time, '22:00'::time, 'Server', '3:00 PM-Close'),

    ('Cassidy', '2026-08-11'::date, '15:00'::time, '22:00'::time, 'Server', '3:00 PM-Close'),
    ('Cassidy', '2026-08-14'::date, '10:00'::time, '15:00'::time, 'Server', 'Open-3:00 PM'),
    ('Cassidy', '2026-08-15'::date, '10:00'::time, '22:00'::time, 'Server', 'Open-Close'),
    ('Cassidy', '2026-08-16'::date, '10:00'::time, '22:00'::time, 'Server', 'Open-Close'),

    ('Ivy', '2026-08-10'::date, '15:00'::time, '22:00'::time, 'Server', '3:00 PM-Close'),
    ('Ivy', '2026-08-14'::date, '15:00'::time, '22:00'::time, 'Server', '3:00 PM-Close'),
    ('Ivy', '2026-08-15'::date, '15:00'::time, '22:00'::time, 'Server', '3:00 PM-Close'),
    ('Ivy', '2026-08-16'::date, '10:00'::time, '22:00'::time, 'Server', 'Open-Close'),

    ('Grey', '2026-08-10'::date, '16:00'::time, '22:00'::time, 'Dish/Cook', '4:00 PM-Close'),
    ('Grey', '2026-08-11'::date, '12:00'::time, '14:00'::time, 'Dish/Cook', '12:00 PM-2:00 PM'),
    ('Grey', '2026-08-13'::date, '13:00'::time, '22:00'::time, 'Dish/Cook', '1:00 PM-Close'),
    ('Grey', '2026-08-14'::date, '13:00'::time, '22:00'::time, 'Dish/Cook', '1:00 PM-Close'),
    ('Grey', '2026-08-15'::date, '13:00'::time, '22:00'::time, 'Dish/Cook', '1:00 PM-Close'),
    ('Grey', '2026-08-16'::date, '10:00'::time, '22:00'::time, 'Dish/Cook', 'Whenever')
)
insert into shifts (employee_id, date, start_time, end_time, station, notes)
select
  employees.id,
  schedule_rows.work_date,
  schedule_rows.start_time,
  schedule_rows.end_time,
  schedule_rows.station,
  schedule_rows.notes
from schedule_rows
join employees on lower(employees.name) = lower(schedule_rows.schedule_name)
where not exists (
  select 1
  from shifts
  where shifts.employee_id = employees.id
    and shifts.date = schedule_rows.work_date
    and shifts.start_time = schedule_rows.start_time
    and shifts.end_time = schedule_rows.end_time
);
