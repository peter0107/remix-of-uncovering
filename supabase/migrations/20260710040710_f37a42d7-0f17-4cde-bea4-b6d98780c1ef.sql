REVOKE ALL ON FUNCTION public.get_applicants_by_company_code(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_saved_applicant_ids_by_company_code(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_saved_applicant_by_company_code(text, uuid, boolean) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_applicants_by_company_code(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_saved_applicant_ids_by_company_code(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_saved_applicant_by_company_code(text, uuid, boolean) TO service_role;