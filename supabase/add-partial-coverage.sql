-- Enables open-to-close employees to request coverage for either half of a shift.
alter table coverage_requests add column if not exists coverage_start_time time;
alter table coverage_requests add column if not exists coverage_end_time time;
