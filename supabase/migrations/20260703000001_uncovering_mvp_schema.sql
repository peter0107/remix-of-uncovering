-- ============================================================
-- 언커버링 MVP 스키마 마이그레이션
-- 사이트 2개 분리:
--   구직자 사이트  uncovering.com
--   기업 사이트    uncoveringforcompany.com
-- 결정: A안(답안 원문 전송) + 동의 절차 / 룰 기반 추천 / 11축 자동채점 미사용
-- ============================================================

-- ------------------------------------------------------------
-- 1) 구직자
--    id = auth.users.id 를 그대로 사용 (RLS 연동)
-- ------------------------------------------------------------
create table if not exists job_seekers (
  id              uuid primary key default gen_random_uuid(),
  email           text unique not null,

  -- 사전질문(온보딩) — Forage 흐름
  education_level text,
  majors          text[],
  academic_mark   numeric,
  job_interests   text[],
  company_interests text[],
  work_regions    text[],
  employment_types text[],
  willing_to_relocate boolean,

  -- 프로필 — 자동이력 + 한줄소개 + 외부링크만
  one_line_intro  text,
  external_links  jsonb default '{}'::jsonb,

  -- 동의 (1): 기업 발견·이메일 제안 허용 (온보딩 5단계)
  discovery_consent boolean default false,

  created_at      timestamptz default now()
);

-- ------------------------------------------------------------
-- 2) 기업
-- ------------------------------------------------------------
create table if not exists companies (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  unique_code  text unique not null,
  created_at   timestamptz default now()
);

-- ------------------------------------------------------------
-- 3) 직무 시뮬레이션
-- ------------------------------------------------------------
create table if not exists job_simulations (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references companies(id) on delete cascade,
  title            text not null,
  description      text,
  job_family       text,   -- 추천 매칭 키 (job_interests와 대조)
  domain           text,   -- 산업/도메인
  estimated_minutes int,
  task_prompt      text,
  created_at       timestamptz default now()
);

-- ------------------------------------------------------------
-- 4) 제출물
-- ------------------------------------------------------------
create table if not exists submissions (
  id                uuid primary key default gen_random_uuid(),
  job_seeker_id     uuid not null references job_seekers(id) on delete cascade,
  job_simulation_id uuid not null references job_simulations(id) on delete cascade,

  response_text     text,
  started_at        timestamptz,
  submitted_at      timestamptz,
  duration_sec      int,
  paste_detected    boolean default false,

  -- 동의 (2): 답안을 기업에 전송 — true 여야 기업 사이트에 노출
  answer_transmission_consent boolean default false,

  score_json        jsonb,  -- 11축 채점 자리 (MVP 미사용, null)
  created_at        timestamptz default now()
);

-- ------------------------------------------------------------
-- 인덱스
-- ------------------------------------------------------------
create index if not exists idx_sim_company   on job_simulations(company_id);
create index if not exists idx_sub_simulation on submissions(job_simulation_id);
create index if not exists idx_sub_seeker     on submissions(job_seeker_id);

-- ------------------------------------------------------------
-- 기업 사이트 열람 뷰: answer_transmission_consent = true 만 노출
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table job_seekers       enable row level security;
alter table submissions       enable row level security;
alter table job_simulations   enable row level security;
alter table companies         enable row level security;

-- 구직자: 본인 데이터만 읽기/쓰기
create policy seeker_self_all on job_seekers
  for all using (auth.uid() = id);

-- 제출물: 구직자는 본인 제출물만
create policy sub_self_all on submissions
  for all using (auth.uid() = job_seeker_id);

-- job_simulations: 비로그인 방문자도 둘러볼 수 있어야 하므로 전체 공개 읽기 허용
create policy sim_read_public on job_simulations
  for select using (true);

-- companies: job_simulations 조인 시 기업명 노출용, 전체 공개 읽기 허용
create policy company_read_public on companies
  for select using (true);
