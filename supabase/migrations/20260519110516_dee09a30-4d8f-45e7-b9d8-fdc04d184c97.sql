ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS fit_narrative text,
  ADD COLUMN IF NOT EXISTS fit_points text[] NOT NULL DEFAULT '{}'::text[];