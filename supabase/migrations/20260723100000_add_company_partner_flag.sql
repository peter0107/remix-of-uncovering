-- ============================================================
-- companies.is_partner 컬럼 추가.
-- 기업이 Beginner에 공식 참여했는지를 표시한다.
--   - true  = 공식 참여. 구직자 화면에 로고와 함께 정식 노출되고, 답안이 기업에 전달된다.
--   - false = 미참여(기본값). 공개 채용공고 기반 '지원 대비' 시뮬레이션으로만 노출되며,
--             로고 없이 "지원 대비 · 비공식"으로 표기되고 답안은 아직 기업에 전달되지 않는다.
-- 기존 기업은 전부 false(미참여)로 시작하므로 별도 backfill 불필요.
-- ============================================================

alter table public.companies
  add column if not exists is_partner boolean not null default false;
