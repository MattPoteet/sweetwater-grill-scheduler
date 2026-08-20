-- Run this once in the Supabase SQL editor for an existing Sweetwater Grill database.
alter table time_off_requests
  add column if not exists shift_part text not null default 'all_day';

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
