ALTER TABLE public.missions
  ADD COLUMN IF NOT EXISTS content_mode text NOT NULL DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS wizard_intro_blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS wizard_steps jsonb NOT NULL DEFAULT '[]'::jsonb;

GRANT SELECT (content_mode, wizard_intro_blocks, wizard_steps) ON public.missions TO anon, authenticated;