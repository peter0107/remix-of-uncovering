alter table public.submissions
  add column if not exists ai_chat_log jsonb not null default '[]'::jsonb;

comment on column public.submissions.ai_chat_log is
  'AI 어시스트 대화 로그. 기업 담당자 화면에서 응시자의 AI 활용 내역 확인용.';