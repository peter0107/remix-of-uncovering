ALTER TABLE public.missions
  ADD COLUMN IF NOT EXISTS material_blocks jsonb NOT NULL DEFAULT '[]'::jsonb;