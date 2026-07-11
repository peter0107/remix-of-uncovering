-- 새로 등록하는 직무 시뮬레이션은 관리자가 공개할 때까지 유저 화면에 노출하지 않습니다.
-- 기존 시뮬레이션의 공개 상태는 변경하지 않습니다.

alter table public.job_simulations
  alter column is_public set default false;
