-- Apply this to an existing SweetWater Grill database to ensure only employees
-- whose position is Server can request an available serving shift.
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
