ALTER TABLE public.missions
  ADD COLUMN IF NOT EXISTS expert_comment_html text,
  ADD COLUMN IF NOT EXISTS offline_activity_html text;
