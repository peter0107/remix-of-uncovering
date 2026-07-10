-- 관리자에서 단일형/선택형 시뮬레이션을 명시적으로 관리하고,
-- 단일형의 답변 질문을 별도로 저장합니다.

alter table public.job_simulations
  add column if not exists simulation_format text not null default 'single',
  add column if not exists single_answer_question text;

alter table public.job_simulations
  drop constraint if exists job_simulations_format_allowed;

alter table public.job_simulations
  add constraint job_simulations_format_allowed
  check (simulation_format in ('single', 'selection'));

-- 기존 단계별 시뮬레이션은 선택형으로 보존하고,
-- 나머지 시뮬레이션은 단일형으로 분류합니다.
update public.job_simulations
set simulation_format = case
  when jsonb_array_length(coalesce(steps, '[]'::jsonb)) > 0 then 'selection'
  else 'single'
end;

