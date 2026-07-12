
-- Revoke direct execute from anon/authenticated on company-code helpers.
-- All app callers go through server functions using the service role.
REVOKE ALL ON FUNCTION public.get_applicants_by_company_code(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_saved_applicant_ids_by_company_code(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_saved_applicant_by_company_code(text, uuid, boolean) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_applicants_by_company_code(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_saved_applicant_ids_by_company_code(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_saved_applicant_by_company_code(text, uuid, boolean) TO service_role;

-- Drop the broad public SELECT policy on simulation-card-assets.
-- Bucket remains public: files stay accessible via getPublicUrl.
-- Removing the policy prevents listing objects via the Storage API.
DROP POLICY IF EXISTS "Simulation card assets are publicly readable" ON storage.objects;
