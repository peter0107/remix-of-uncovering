
-- 1) Applicants: drop overly permissive policy (server code uses service_role)
DROP POLICY IF EXISTS "Allow authenticated applicant management" ON public.applicants;

-- 2) company_saved_applicants: no direct client access; server code uses service_role
--    (existing "Block direct company saved applicant reads" policy remains)

-- 3) Revoke EXECUTE on SECURITY DEFINER RPCs from anon/authenticated/PUBLIC
REVOKE ALL ON FUNCTION public.get_applicants_by_company_code(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_saved_applicant_ids_by_company_code(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_saved_applicant_by_company_code(text, uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_applicants_by_company_code(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_saved_applicant_ids_by_company_code(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_saved_applicant_by_company_code(text, uuid, boolean) TO service_role;

-- 4) Rebuild the SECURITY DEFINER-flagged view as security_invoker
DROP VIEW IF EXISTS public.company_visible_submissions;
CREATE VIEW public.company_visible_submissions
WITH (security_invoker = true) AS
SELECT s.id,
       js.company_id,
       js.title AS simulation_title,
       s.response_text,
       s.submitted_at,
       s.duration_sec,
       s.paste_detected,
       seeker.one_line_intro,
       seeker.external_links,
       seeker.job_interests,
       seeker.discovery_consent
FROM public.submissions s
JOIN public.job_simulations js ON js.id = s.job_simulation_id
JOIN public.job_seekers seeker ON seeker.id = s.job_seeker_id
WHERE s.answer_transmission_consent = true;

GRANT SELECT ON public.company_visible_submissions TO authenticated, service_role;

-- 5) Public bucket listing: drop broad SELECT policies. Files remain reachable
--    via their direct public URLs (public buckets serve objects without RLS);
--    only bucket-wide listing/enumeration is removed.
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;

-- Attempt to drop a similarly named mission-materials listing policy if present
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND qual LIKE '%mission-materials%'
      AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;
