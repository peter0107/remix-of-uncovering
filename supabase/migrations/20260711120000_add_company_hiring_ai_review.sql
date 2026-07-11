-- 기업별 채용 공고, AI 평가 결과, 지원 단계/결과 상태를 저장합니다.

alter table public.company_applicant_review_states
  add column if not exists review_stage text not null default 'document_review',
  add column if not exists decision_status text not null default 'undecided';

alter table public.company_applicant_review_states
  drop constraint if exists company_applicant_review_states_review_stage_check;

alter table public.company_applicant_review_states
  add constraint company_applicant_review_states_review_stage_check
  check (review_stage in (
    'document_review',
    'interview_proposed',
    'interview_scheduled',
    'interview_in_progress',
    'final_review'
  ));

alter table public.company_applicant_review_states
  drop constraint if exists company_applicant_review_states_decision_status_check;

alter table public.company_applicant_review_states
  add constraint company_applicant_review_states_decision_status_check
  check (decision_status in ('undecided', 'passed', 'rejected'));

create table if not exists public.company_job_postings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  role_label text not null,
  source_url text not null,
  title text not null default '',
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, role_label)
);

create index if not exists idx_company_job_postings_company_role
  on public.company_job_postings (company_id, role_label);

create table if not exists public.company_applicant_ai_reviews (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  applicant_id uuid not null references public.submissions(id) on delete cascade,
  job_posting_id uuid not null references public.company_job_postings(id) on delete cascade,
  analysis jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, applicant_id, job_posting_id)
);

create index if not exists idx_company_applicant_ai_reviews_company_applicant
  on public.company_applicant_ai_reviews (company_id, applicant_id);

alter table public.company_job_postings enable row level security;
alter table public.company_applicant_ai_reviews enable row level security;

grant all on public.company_job_postings to service_role;
grant all on public.company_applicant_ai_reviews to service_role;
