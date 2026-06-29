ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS competency_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS strengths text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS improvements text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS next_actions text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS expert_comment text;