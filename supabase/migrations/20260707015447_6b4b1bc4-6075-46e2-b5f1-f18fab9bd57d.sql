DROP FUNCTION IF EXISTS public.set_saved_applicant_by_company_code(text, uuid, boolean);

CREATE OR REPLACE FUNCTION public.set_saved_applicant_by_company_code(p_company_code text, p_applicant_id uuid, p_is_saved boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  target_company_id uuid;
  target_submission_id uuid;
begin
  select c.id
  into target_company_id
  from public.companies c
  where c.code = p_company_code
     or c.unique_code = p_company_code
  limit 1;

  if target_company_id is null then
    raise exception 'Invalid company code';
  end if;

  select s.id
  into target_submission_id
  from public.submissions s
  join public.job_simulations js on js.id = s.job_simulation_id
  where s.id = p_applicant_id
    and js.company_id = target_company_id
    and s.submitted_at is not null
    and s.answer_transmission_consent = true
  limit 1;

  if target_submission_id is null then
    raise exception 'Invalid company applicant';
  end if;

  if p_is_saved then
    insert into public.company_saved_applicants as csa (company_id, applicant_id, submission_id)
    values (target_company_id, p_applicant_id, target_submission_id)
    on conflict (company_id, applicant_id) where (applicant_id is not null)
    do update set
      submission_id = excluded.submission_id,
      created_at = csa.created_at;
  else
    delete from public.company_saved_applicants saved
    where saved.company_id = target_company_id
      and coalesce(saved.applicant_id, saved.submission_id) = p_applicant_id;
  end if;

  return p_is_saved;
end;
$function$;

GRANT EXECUTE ON FUNCTION public.set_saved_applicant_by_company_code(text, uuid, boolean) TO anon, authenticated, service_role;