alter table public.job_simulations
add column if not exists deleted_at timestamptz;

create index if not exists idx_job_simulations_visible
on public.job_simulations(company_id, created_at desc)
where deleted_at is null and is_public = true;

drop policy if exists sim_read_public on public.job_simulations;

create policy sim_read_public on public.job_simulations
for select
using (is_public = true and deleted_at is null);

grant select on public.job_simulations to anon, authenticated;
grant all on public.job_simulations to service_role;
