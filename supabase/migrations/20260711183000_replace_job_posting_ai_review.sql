-- 채용 공고 적합도 평가를 중단하고, 시뮬레이션/AI 활용 평가를 별도로 저장합니다.

create table if not exists public.company_simulation_ai_reviews (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  applicant_id uuid not null references public.submissions(id) on delete cascade,
  analysis jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, applicant_id)
);

create index if not exists idx_company_simulation_ai_reviews_company_applicant
  on public.company_simulation_ai_reviews (company_id, applicant_id);

alter table public.company_simulation_ai_reviews enable row level security;

grant all on public.company_simulation_ai_reviews to service_role;

create table if not exists public.ai_prompt_settings (
  key text primary key,
  prompt text not null,
  updated_at timestamptz not null default now()
);

alter table public.ai_prompt_settings enable row level security;

grant all on public.ai_prompt_settings to service_role;

insert into public.ai_prompt_settings (key, prompt)
values (
  'company_simulation_ai_review',
  $prompt$
당신은 채용 담당자를 돕는 평가 보조자입니다. 아래 지원자의 직무 시뮬레이션 결과물과 AI 어시스트 대화 로그를 검토하세요.

규칙:
- 보호 특성(나이, 성별, 출신, 건강, 가족상태 등)을 추정하거나 판단 근거로 사용하지 마세요.
- 채용 합격/불합격을 결정하지 말고, 근거 기반의 검토 포인트만 제시하세요.
- 점수는 0~100 정수로, 근거는 제공된 자료 안에서만 작성하세요.
- AI 활용 능력은 제공된 AI 어시스트 대화 로그에서 확인되는 질문의 구체성, 검증, 반복 개선을 기준으로만 평가하세요. 대화 로그가 없다면 활용 기록이 없다고 명시하고 점수는 0점으로 작성하세요.
- 반드시 JSON만 반환하세요.

반환 JSON 형식:
{
  "simulation": { "score": 0, "summary": "", "strengths": [""], "concerns": [""] },
  "aiUtilization": { "score": 0, "summary": "", "strengths": [""], "improvements": [""] },
  "interviewQuestions": [
    { "category": "시뮬레이션 결과물", "question": "", "intent": "" },
    { "category": "AI 활용", "question": "", "intent": "" }
  ]
}
$prompt$
)
on conflict (key) do nothing;
