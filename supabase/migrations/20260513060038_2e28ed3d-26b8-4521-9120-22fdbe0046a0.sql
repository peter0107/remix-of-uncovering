
CREATE TABLE public.mission_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_name TEXT NOT NULL,
  category_name TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.mission_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read all mission_requests"
ON public.mission_requests FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update mission_requests"
ON public.mission_requests FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete mission_requests"
ON public.mission_requests FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
