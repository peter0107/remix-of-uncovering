-- ============================================================
-- 스텝 위저드: 제출 답안을 스텝(질문)별로 구조화 저장
--   response_json = { format: "step_wizard_v1",
--                     answers: [{ id, num, title, answer }] }
--   response_text 에는 기존처럼 평문 합본을 계속 저장하므로
--   기업 사이트(company_visible_submissions / RPC)는 변경 없이 동작한다.
-- Lovable/Supabase SQL Editor에 그대로 붙여 실행.
-- ============================================================

alter table public.submissions
  add column if not exists response_json jsonb;
