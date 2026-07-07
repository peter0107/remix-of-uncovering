CREATE OR REPLACE FUNCTION public.set_saved_applicant_by_company_code(company_code text, applicant_id uuid, is_saved boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  target_company_id uuid;
  target_submission_id uuid;
  target_applicant_id uuid := applicant_id;
  should_save boolean := is_saved;
begin
  select c.id
  into target_company_id
  from public.companies c
  where c.code = company_code
     or c.unique_code = company_code
  limit 1;

  if target_company_id is null then
    raise exception 'Invalid company code';
  end if;

  select s.id
  into target_submission_id
  from public.submissions s
  join public.job_simulations js on js.id = s.job_simulation_id
  where s.id = target_applicant_id
    and js.company_id = target_company_id
    and s.submitted_at is not null
    and s.answer_transmission_consent = true
  limit 1;

  if target_submission_id is null and exists (
    select 1
    from information_schema.tables t
    where t.table_schema = 'public'
      and t.table_name = 'applicants'
  ) then
    if not exists (
      select 1
      from public.applicants a
      where a.id = target_applicant_id
        and a.company_id = target_company_id
    ) then
      raise exception 'Invalid company applicant';
    end if;
  elsif target_submission_id is null then
    raise exception 'Invalid company applicant';
  end if;

  if should_save then
    insert into public.company_saved_applicants as csa (company_id, applicant_id, submission_id)
    values (target_company_id, target_applicant_id, target_submission_id)
    on conflict (company_id, applicant_id) where (applicant_id is not null)
    do update set
      submission_id = excluded.submission_id,
      created_at = csa.created_at;
  else
    delete from public.company_saved_applicants saved
    where saved.company_id = target_company_id
      and coalesce(saved.applicant_id, saved.submission_id) = target_applicant_id;
  end if;

  return should_save;
end;
$function$;