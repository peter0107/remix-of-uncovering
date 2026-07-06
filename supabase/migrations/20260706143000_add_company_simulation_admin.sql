-- ============================================================
-- A기업 직무 시뮬레이션 연동 + 관리자 요청함
-- Lovable/Supabase SQL Editor에 직접 적용해야 /biz 드롭다운과 관리자 페이지가 동작한다.
-- ============================================================

alter table public.job_simulations
  add column if not exists role_label text;

update public.job_simulations
set role_label = coalesce(role_label, job_family, title)
where role_label is null;

create table if not exists public.job_simulation_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  requested_role text not null,
  request_note text not null default '',
  contact_email text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_simulation_requests_status_check
    check (status in ('pending', 'in_progress', 'completed', 'rejected'))
);

create index if not exists idx_job_simulation_requests_company_id
  on public.job_simulation_requests (company_id);

create index if not exists idx_job_simulation_requests_status_created
  on public.job_simulation_requests (status, created_at desc);

alter table public.job_simulation_requests enable row level security;

drop policy if exists "Allow public simulation request insert" on public.job_simulation_requests;
create policy "Allow public simulation request insert"
on public.job_simulation_requests
for insert
to anon, authenticated
with check (true);

drop policy if exists "Block public simulation request reads" on public.job_simulation_requests;
create policy "Block public simulation request reads"
on public.job_simulation_requests
for select
to anon, authenticated
using (false);

grant insert on public.job_simulation_requests to anon, authenticated;
grant all on public.job_simulation_requests to service_role;

-- A기업 코드가 아직 없는 환경에서도 안전하게 보강한다.
insert into public.companies (code, unique_code, name, role_label)
values ('BGNR-2024-A', 'BGNR-2024-A', 'A기업', '마케팅 매니저 채용')
on conflict (code) do update
set
  name = excluded.name,
  role_label = excluded.role_label,
  unique_code = excluded.unique_code;

-- 기존 제공 시뮬레이션 중 마케팅 과제를 A기업에 연결한다.
with source_simulation as (
  select js.title, js.description, js.job_family, js.domain, js.estimated_minutes, js.task_prompt
  from public.job_simulations js
  join public.companies c on c.id = js.company_id
  where c.unique_code = 'BEGINNER-CONTENT-2026'
    and js.title = '마케팅 캠페인 A/B 테스트 결과 해석'
  limit 1
),
target_company as (
  select id
  from public.companies
  where code = 'BGNR-2024-A'
  limit 1
)
insert into public.job_simulations (
  company_id,
  title,
  description,
  role_label,
  job_family,
  domain,
  estimated_minutes,
  task_prompt
)
select
  target_company.id,
  source_simulation.title,
  source_simulation.description,
  '마케팅 매니저',
  source_simulation.job_family,
  source_simulation.domain,
  source_simulation.estimated_minutes,
  source_simulation.task_prompt
from source_simulation, target_company
where not exists (
  select 1
  from public.job_simulations existing
  where existing.company_id = target_company.id
    and existing.title = source_simulation.title
    and coalesce(existing.role_label, '') = '마케팅 매니저'
);
