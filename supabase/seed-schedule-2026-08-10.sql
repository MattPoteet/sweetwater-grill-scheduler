-- Sweetwater Grill schedule for the week of 2026-08-10.
-- Matches names by full name or common schedule nickname.

with schedule_rows(schedule_name, work_date, start_time, end_time, station, notes) as (
  values
    ('Matthew', '2026-08-13'::date, '10:00'::time, '22:00'::time, 'General Manager', 'PDF label: Matt open-close'),
    ('Matthew', '2026-08-14'::date, '10:00'::time, '22:00'::time, 'General Manager', 'PDF label: Matt open-close'),
    ('Matthew', '2026-08-15'::date, '10:00'::time, '22:00'::time, 'General Manager', 'PDF label: Matt open-close'),

    ('Jim', '2026-08-12'::date, '10:00'::time, '15:00'::time, 'Cook', 'PDF label: Jim open-3'),
    ('Jim', '2026-08-13'::date, '15:00'::time, '22:00'::time, 'Cook', 'PDF label: Jim 3-close'),
    ('Jim', '2026-08-14'::date, '15:00'::time, '22:00'::time, 'Cook', 'PDF label: Jim 3-close'),
    ('Jim', '2026-08-15'::date, '10:00'::time, '22:00'::time, 'Cook', 'PDF label: Jim open-close'),
    ('Jim', '2026-08-16'::date, '10:00'::time, '22:00'::time, 'Cook', 'PDF label: Jim open-close'),

    ('Joan', '2026-08-10'::date, '15:00'::time, '22:00'::time, 'Cook', 'PDF label: Joan 3-close'),
    ('Joan', '2026-08-11'::date, '15:00'::time, '22:00'::time, 'Cook', 'PDF label: Joan 3-close'),
    ('Joan', '2026-08-12'::date, '15:00'::time, '22:00'::time, 'Cook', 'PDF label: Joan 3-close'),
    ('Joan', '2026-08-13'::date, '10:00'::time, '15:00'::time, 'Cook', 'PDF label: Joan open-3'),
    ('Joan', '2026-08-14'::date, '10:00'::time, '15:00'::time, 'Cook', 'PDF label: Joan open-3'),
    ('Joan', '2026-08-16'::date, '10:00'::time, '22:00'::time, 'Cook', 'PDF label: Joan open-close'),

    ('Richard', '2026-08-10'::date, '10:00'::time, '22:00'::time, 'Cook', 'PDF label: Richard open-close'),
    ('Richard', '2026-08-11'::date, '10:00'::time, '22:00'::time, 'Cook', 'PDF label: Richard open-close'),
    ('Richard', '2026-08-12'::date, '15:00'::time, '22:00'::time, 'Cook', 'PDF label: Richard 3-close'),
    ('Richard', '2026-08-16'::date, '10:00'::time, '22:00'::time, 'Cook', 'PDF label: Richard open-close'),

    ('Cindy', '2026-08-10'::date, '10:00'::time, '15:00'::time, 'Cook', 'PDF label: Cindy open-3'),
    ('Cindy', '2026-08-11'::date, '10:00'::time, '15:00'::time, 'Cook', 'PDF label: Cindy open-3'),
    ('Cindy', '2026-08-12'::date, '10:00'::time, '15:00'::time, 'Cook', 'PDF label: Cindy open-3'),

    ('Taylor', '2026-08-10'::date, '15:00'::time, '22:00'::time, 'Server', 'PDF label: Taylor 3-close'),
    ('Taylor', '2026-08-11'::date, '15:00'::time, '22:00'::time, 'Server', 'PDF label: Taylor 3-close'),
    ('Taylor', '2026-08-12'::date, '10:00'::time, '15:00'::time, 'Server', 'PDF label: Taylor open-3'),
    ('Taylor', '2026-08-13'::date, '15:00'::time, '22:00'::time, 'Server', 'PDF label: Taylor 3-close'),

    ('Addie Beech', '2026-08-13'::date, '10:00'::time, '15:00'::time, 'Server', 'PDF label: Addie open-3'),
    ('Addie Beech', '2026-08-14'::date, '10:00'::time, '22:00'::time, 'Server', 'PDF label: Addie open-close'),
    ('Addie Beech', '2026-08-15'::date, '10:00'::time, '15:00'::time, 'Server', 'PDF label: Addie open-3'),
    ('Addie Beech', '2026-08-16'::date, '10:00'::time, '22:00'::time, 'Server', 'PDF label: Addie open-close'),

    ('Haylee', '2026-08-10'::date, '10:00'::time, '22:00'::time, 'Server', 'PDF label: Haylee open-close'),
    ('Haylee', '2026-08-11'::date, '10:00'::time, '15:00'::time, 'Server', 'PDF label: Haylee open-3'),
    ('Haylee', '2026-08-12'::date, '10:00'::time, '15:00'::time, 'Server', 'PDF label: Haylee open-3'),
    ('Haylee', '2026-08-13'::date, '10:00'::time, '15:00'::time, 'Server', 'PDF label: Haylee open-3'),

    ('jazmin', '2026-08-12'::date, '15:00'::time, '22:00'::time, 'Server', 'PDF label: Jazmin 3-close'),
    ('jazmin', '2026-08-14'::date, '15:00'::time, '22:00'::time, 'Server', 'PDF label: Jazmin 3-close'),
    ('jazmin', '2026-08-15'::date, '15:00'::time, '22:00'::time, 'Server', 'PDF label: Jazmin 3-close'),

    ('Patsy', '2026-08-12'::date, '15:00'::time, '22:00'::time, 'Server', 'PDF label: Patsy 3-close'),
    ('Patsy', '2026-08-13'::date, '15:00'::time, '22:00'::time, 'Server', 'PDF label: Patsy 3-close'),

    ('Cassidy', '2026-08-11'::date, '15:00'::time, '22:00'::time, 'Server', 'PDF label: Cassidy 3-close'),
    ('Cassidy', '2026-08-14'::date, '10:00'::time, '15:00'::time, 'Server', 'PDF label: Cassidy open-3'),
    ('Cassidy', '2026-08-15'::date, '10:00'::time, '22:00'::time, 'Server', 'PDF label: Cassidy open-close'),
    ('Cassidy', '2026-08-16'::date, '10:00'::time, '22:00'::time, 'Server', 'PDF label: Cassidy open-close'),

    ('Ivy', '2026-08-10'::date, '15:00'::time, '22:00'::time, 'Server', 'PDF label: IV 3-close'),
    ('Ivy', '2026-08-14'::date, '15:00'::time, '22:00'::time, 'Server', 'PDF label: IV 3-close'),
    ('Ivy', '2026-08-15'::date, '15:00'::time, '22:00'::time, 'Server', 'PDF label: IV 3-close'),
    ('Ivy', '2026-08-16'::date, '10:00'::time, '22:00'::time, 'Server', 'PDF label: IV open-close'),

    ('Grey', '2026-08-10'::date, '16:00'::time, '22:00'::time, 'Dish/Cook', 'PDF label: Grey 4-close'),
    ('Grey', '2026-08-11'::date, '12:00'::time, '14:00'::time, 'Dish/Cook', 'PDF label: Grey 12-2'),
    ('Grey', '2026-08-13'::date, '13:00'::time, '22:00'::time, 'Dish/Cook', 'PDF label: Grey 1-close'),
    ('Grey', '2026-08-14'::date, '13:00'::time, '22:00'::time, 'Dish/Cook', 'PDF label: Grey 1-close'),
    ('Grey', '2026-08-15'::date, '13:00'::time, '22:00'::time, 'Dish/Cook', 'PDF label: Grey 1-close'),
    ('Grey', '2026-08-16'::date, '10:00'::time, '22:00'::time, 'Dish/Cook', 'PDF label: Grey whenever')
)
insert into shifts (employee_id, date, start_time, end_time, station, notes)
select
  employees.id,
  schedule_rows.work_date,
  schedule_rows.start_time,
  schedule_rows.end_time,
  schedule_rows.station,
  case
    when schedule_rows.notes like '% open-close' then 'Open-Close'
    when schedule_rows.notes like '% open-3' then 'Open-3:00 PM'
    when schedule_rows.notes like '% 3-close' then '3:00 PM-Close'
    when schedule_rows.notes like '% 4-close' then '4:00 PM-Close'
    when schedule_rows.notes like '% 12-2' then '12:00 PM-2:00 PM'
    when schedule_rows.notes like '% 1-close' then '1:00 PM-Close'
    when schedule_rows.notes like '% whenever' then 'Whenever'
    else ''
  end
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
