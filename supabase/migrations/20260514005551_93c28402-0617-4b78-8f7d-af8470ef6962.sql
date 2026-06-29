-- Custom jobs managed by admin (within job categories)
CREATE TABLE public.custom_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id text NOT NULL,
  name text NOT NULL,
  description text,
  slug text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read custom_jobs"
ON public.custom_jobs FOR SELECT
USING (true);

CREATE POLICY "Admins insert custom_jobs"
ON public.custom_jobs FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update custom_jobs"
ON public.custom_jobs FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete custom_jobs"
ON public.custom_jobs FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_custom_jobs_updated_at
BEFORE UPDATE ON public.custom_jobs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();