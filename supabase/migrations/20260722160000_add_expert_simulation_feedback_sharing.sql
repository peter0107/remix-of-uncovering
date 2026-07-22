-- 로그인 없이 현직자 시뮬레이션 검토 링크를 공유하고 피드백을 받는다.

alter table public.job_simulations
  add column if not exists feedback_share_token uuid unique;

create table if not exists public.expert_simulation_share_feedback (
  id uuid primary key default gen_random_uuid(),
  simulation_id uuid not null references public.job_simulations(id) on delete cascade,
  reviewer_name text,
  feedback text not null check (char_length(trim(feedback)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists expert_simulation_share_feedback_simulation_id_idx
  on public.expert_simulation_share_feedback (simulation_id, created_at desc);

alter table public.expert_simulation_share_feedback enable row level security;
