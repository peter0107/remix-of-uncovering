-- ============================================================
-- 언커버링 MVP 스키마 마이그레이션
-- ============================================================

create table if not exists job_seekers (
  id              uuid primary key default gen_random_uuid(),
  email           text unique not null,
  education_level text,
  majors          text[],
  academic_mark   numeric,
  job_interests   text[],
  company_interests text[],
  work_regions    text[],
  employment_types text[],
  willing_to_relocate boolean,
  one_line_intro  text,
  external_links  jsonb default '{}'::jsonb,
  discovery_consent boolean default false,
  created_at      timestamptz default now()
);

create table if not exists companies (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  unique_code  text unique not null,
  created_at   timestamptz default now()
);

create table if not exists job_simulations (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references companies(id) on delete cascade,
  title            text not null,
  description      text,
  job_family       text,
  domain           text,
  estimated_minutes int,
  task_prompt      text,
  created_at       timestamptz default now()
);

create table if not exists submissions (
  id                uuid primary key default gen_random_uuid(),
  job_seeker_id     uuid not null references job_seekers(id) on delete cascade,
  job_simulation_id uuid not null references job_simulations(id) on delete cascade,
  response_text     text,
  started_at        timestamptz,
  submitted_at      timestamptz,
  duration_sec      int,
  paste_detected    boolean default false,
  answer_transmission_consent boolean default false,
  score_json        jsonb,
  created_at        timestamptz default now()
);

create index if not exists idx_sim_company    on job_simulations(company_id);
create index if not exists idx_sub_simulation on submissions(job_simulation_id);
create index if not exists idx_sub_seeker     on submissions(job_seeker_id);

create or replace view company_visible_submissions as
select
  s.id,
  js.company_id,
  js.title            as simulation_title,
  s.response_text,
  s.submitted_at,
  s.duration_sec,
  s.paste_detected,
  seeker.one_line_intro,
  seeker.external_links,
  seeker.job_interests,
  seeker.discovery_consent
from submissions s
join job_simulations js on js.id = s.job_simulation_id
join job_seekers seeker on seeker.id = s.job_seeker_id
where s.answer_transmission_consent = true;

alter table job_seekers       enable row level security;
alter table submissions       enable row level security;
alter table job_simulations   enable row level security;
alter table companies         enable row level security;

create policy seeker_self_all on job_seekers
  for all using (auth.uid() = id);

create policy sub_self_all on submissions
  for all using (auth.uid() = job_seeker_id);

create policy sim_read_public on job_simulations
  for select using (true);

create policy company_read_public on companies
  for select using (true);

grant select, insert, update, delete on public.job_seekers to authenticated;
grant all on public.job_seekers to service_role;
grant select on public.companies to anon, authenticated;
grant all on public.companies to service_role;
grant select on public.job_simulations to anon, authenticated;
grant all on public.job_simulations to service_role;
grant select, insert, update, delete on public.submissions to authenticated;
grant all on public.submissions to service_role;
grant select on public.company_visible_submissions to anon, authenticated, service_role;

-- ============================================================
-- 기존 결제형 서비스(beginner) 스키마 제거
-- ============================================================
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;

drop table if exists public.orders cascade;
drop table if exists public.missions cascade;
drop table if exists public.custom_jobs cascade;
drop table if exists public.mission_requests cascade;
drop table if exists public.user_roles cascade;
drop table if exists public.profiles cascade;
drop table if exists public.admin_emails cascade;

drop function if exists public.has_role(uuid, public.app_role) cascade;
drop type if exists public.app_role;
