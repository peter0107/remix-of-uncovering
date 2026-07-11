-- 유저 시뮬레이션 카드에 표시할 기업 한 줄 설명입니다.

alter table public.companies
  add column if not exists description text not null default '';
