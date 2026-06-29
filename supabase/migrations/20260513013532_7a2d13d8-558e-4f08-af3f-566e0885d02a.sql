ALTER TABLE public.missions
  ADD COLUMN IF NOT EXISTS summary_title text,
  ADD COLUMN IF NOT EXISTS summary_description text,
  ADD COLUMN IF NOT EXISTS recommended_for text,
  ADD COLUMN IF NOT EXISTS included_results text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS mission_steps text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preview_notice text,
  ADD COLUMN IF NOT EXISTS locked_preview_text text;