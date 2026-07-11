-- ============================================================
-- Beginner MVP · Supabase / PostgreSQL 스키마
-- 사이트 2개 분리:
--   - 구직자 사이트  beginner.today (시뮬 수행)
--   - 기업 사이트    Beginner biz (고유코드로 지원자 열람)
--   - groupby 는 외부 채용사이트 → 링크만, DB 없음
-- 결정 반영: A안(답안 원문 전송) + 동의 절차 / 룰 기반 추천 / 11축 자동채점 미사용
-- ============================================================

-- ------------------------------------------------------------
-- 1) 구직자
-- ------------------------------------------------------------
create table job_seekers (
  id              uuid primary key default gen_random_uuid(),
  email           text unique not null,

  -- 사전질문(온보딩) — Forage 흐름 대응
  education_level text,                       -- 학력 (단일)
  majors          text[],                     -- 전공 (복수)
  academic_mark   numeric,                    -- 학점 % (optional)
  job_interests   text[],                     -- 관심 직무 (복수) · 추천 핵심 시그널
  company_interests text[],                   -- 관심 기업 (복수)
  work_regions    text[],                     -- 근무 가능 지역
  employment_types text[],                    -- 관심 고용형태 (인턴/신입/계약)
  willing_to_relocate boolean,

  -- 프로필(이력서) — MVP: 자동이력 + 한줄소개 + 외부링크
  one_line_intro  text,                       -- 한줄소개
  external_links  jsonb default '{}'::jsonb,  -- { github, portfolio, linkedin }

  -- 동의 (1): 기업 발견·이메일 제안 허용
  discovery_consent boolean default false,

  created_at      timestamptz default now()
);

-- ------------------------------------------------------------
-- 2) 기업
-- ------------------------------------------------------------
create table companies (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  unique_code  text unique not null,          -- 기업 사이트 접속 고유코드
  created_at   timestamptz default now()
);

-- ------------------------------------------------------------
-- 3) 직무 시뮬레이션 (기업 소유)
-- ------------------------------------------------------------
create table job_simulations (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  title         text not null,                -- 직무명
  description   text,
  job_family    text,                         -- 직무군 (추천 매칭 키)
  domain        text,                         -- 산업/도메인
  estimated_minutes int,                      -- 예상 소요 시간
  task_prompt   text,                         -- 미션 내용
  created_at    timestamptz default now()
);

-- ------------------------------------------------------------
-- 4) 수행·제출
-- ------------------------------------------------------------
create table submissions (
  id                uuid primary key default gen_random_uuid(),
  job_seeker_id     uuid not null references job_seekers(id) on delete cascade,
  job_simulation_id uuid not null references job_simulations(id) on delete cascade,

  response_text     text,                     -- 답안 원문 (기업 전송 대상)
  started_at        timestamptz,
  submitted_at      timestamptz,
  duration_sec      int,                      -- 제출 시간 추적 (검증 원천)
  paste_detected    boolean default false,    -- 복붙 감지 (검증 원천, 나중 사용)

  -- 동의 (2): 이 답안을 기업에 전송 (A안). true 여야 기업 사이트에 노출
  answer_transmission_consent boolean default false,

  score_json        jsonb,                    -- 11축 채점 자리 (MVP 미사용, null)
  created_at        timestamptz default now()
);

-- ------------------------------------------------------------
-- 인덱스
-- ------------------------------------------------------------
create index idx_sim_company        on job_simulations(company_id);
create index idx_sub_simulation      on submissions(job_simulation_id);
create index idx_sub_seeker          on submissions(job_seeker_id);

-- ------------------------------------------------------------
-- 기업 사이트 열람 뷰 : 동의된 답안만 기업에게 보임
--   기업 사이트는 unique_code 로 company_id 를 찾은 뒤 이 뷰를 조회
-- ------------------------------------------------------------
create view company_visible_submissions as
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
  seeker.discovery_consent   -- 이메일 제안 가능 여부
from submissions s
join job_simulations js on js.id = s.job_simulation_id
join job_seekers seeker on seeker.id = s.job_seeker_id
where s.answer_transmission_consent = true;

-- ------------------------------------------------------------
-- 추천 (룰 기반, 테이블 불필요 — 런타임 계산 예시)
--   관심 직무 × 관심 기업/도메인 으로 필터 → 3개
-- ------------------------------------------------------------
-- select * from job_simulations
-- where job_family = any (:job_interests)
--    or domain     = any (:domain_interests)
-- order by (job_family = any(:job_interests)) desc  -- 직무 일치 우선
-- limit 3;

-- ------------------------------------------------------------
-- RLS (권장) — 두 사이트/두 청중 분리
--   실제 정책은 Supabase auth 연결 방식에 맞춰 채워야 함
-- ------------------------------------------------------------
alter table job_seekers  enable row level security;
alter table submissions  enable row level security;
alter table job_simulations enable row level security;

-- 예시: 구직자는 본인 데이터만
-- create policy seeker_self on job_seekers
--   for all using (auth.uid() = id);

-- 예시: 구직자는 본인 제출물만
-- create policy sub_self on submissions
--   for all using (auth.uid() = job_seeker_id);

-- 기업 사이트는 서버(고유코드 검증) 뒤에서 service_role 로 조회 권장
