-- 1. Column-level: hide sample_answer from anonymous users
REVOKE SELECT (sample_answer) ON public.missions FROM anon;

-- 2. Lock down SECURITY DEFINER functions
-- has_role: only authenticated needs it (used inside admin RLS checks)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;

-- handle_new_user: trigger function, should not be directly callable
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- set_updated_at: trigger helper, not user-callable
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- 3. Drop broad SELECT policy on public storage bucket (public URLs still work)
DROP POLICY IF EXISTS "Mission materials are publicly readable" ON storage.objects;
