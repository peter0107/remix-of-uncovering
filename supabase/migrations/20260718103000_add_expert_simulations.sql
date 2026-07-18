-- 현직자 제시 직무 시뮬레이션
-- Lovable/Supabase SQL Editor에서 이 파일을 실행해야 현직자 시뮬레이션 페이지와
-- 관리자 입력 화면이 실제 데이터와 연결됩니다.

alter table public.job_simulations
  add column if not exists simulation_source text not null default 'company',
  add column if not exists expert_nickname text,
  add column if not exists expert_company_type text,
  add column if not exists expert_experience_band text,
  add column if not exists expert_job_title text,
  add column if not exists card_background_color text not null default '#ffffff',
  add column if not exists card_text_color text not null default '#18181b',
  add column if not exists expert_model_answer text,
  add column if not exists expert_ai_feedback text;

update public.job_simulations
set simulation_source = 'company'
where simulation_source is null;

alter table public.job_simulations
  drop constraint if exists job_simulations_simulation_source_check;

alter table public.job_simulations
  add constraint job_simulations_simulation_source_check
  check (simulation_source in ('company', 'expert'));

create index if not exists idx_job_simulations_source_public
  on public.job_simulations (simulation_source, is_public, created_at desc)
  where deleted_at is null;

insert into public.companies (name, code, unique_code, role_label, description)
values (
  '현직자 제시 시뮬레이션',
  'EXPERT-SIMULATIONS-2026',
  'EXPERT-SIMULATIONS-2026',
  '현직자 제시',
  ''
)
on conflict (unique_code) do update
set
  code = excluded.code,
  name = excluded.name,
  role_label = excluded.role_label;
