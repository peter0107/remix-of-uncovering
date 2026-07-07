alter table public.job_simulations
add column if not exists is_public boolean not null default true;

update public.job_simulations
set is_public = true
where is_public is null;

drop policy if exists sim_read_auth on public.job_simulations;
drop policy if exists sim_read_public on public.job_simulations;

create policy sim_read_public on public.job_simulations
for select
using (is_public = true);

grant select on public.job_simulations to anon, authenticated;
grant all on public.job_simulations to service_role;
