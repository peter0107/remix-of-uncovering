create table if not exists public.company_saved_applicants (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  applicant_id uuid,
  submission_id uuid references public.submissions(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.company_saved_applicants
add column if not exists applicant_id uuid;

alter table public.company_saved_applicants
add column if not exists submission_id uuid references public.submissions(id) on delete cascade;

alter table public.company_saved_applicants
alter column submission_id drop not null;

update public.company_saved_applicants
set applicant_id = submission_id
where applicant_id is null
  and submission_id is not null;

create index if not exists idx_company_saved_applicants_company_id
  on public.company_saved_applicants (company_id);

create index if not exists idx_company_saved_applicants_submission_id
  on public.company_saved_applicants (submission_id);

create index if not exists idx_company_saved_applicants_applicant_id
  on public.company_saved_applicants (applicant_id);

create unique index if not exists idx_company_saved_applicants_company_applicant
  on public.company_saved_applicants (company_id, applicant_id)
  where applicant_id is not null;

alter table public.company_saved_applicants enable row level security;

drop policy if exists "Block direct company saved applicant reads" on public.company_saved_applicants;
create policy "Block direct company saved applicant reads"
on public.company_saved_applicants
for select
using (false);

grant select, insert, delete, update on public.company_saved_applicants to anon;
grant select, insert, delete, update on public.company_saved_applicants to authenticated;
grant all on public.company_saved_applicants to service_role;

drop function if exists public.get_saved_applicant_ids_by_company_code(text);

create or replace function public.get_saved_applicant_ids_by_company_code(company_code text)
returns table (
  submission_id uuid
)
language sql
stable
security definer
set search_path = public
as $get_saved_applicants$
  select coalesce(saved.applicant_id, saved.submission_id) as submission_id
  from public.company_saved_applicants saved
  join public.companies c on c.id = saved.company_id
  where (c.code = company_code or c.unique_code = company_code)
    and coalesce(saved.applicant_id, saved.submission_id) is not null
  order by saved.created_at desc;
$get_saved_applicants$;

grant execute on function public.get_saved_applicant_ids_by_company_code(text) to anon;
grant execute on function public.get_saved_applicant_ids_by_company_code(text) to authenticated;

drop function if exists public.set_saved_applicant_by_company_code(text, uuid, boolean);

create or replace function public.set_saved_applicant_by_company_code(
  company_code text,
  applicant_id uuid,
  is_saved boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $set_saved_applicant$
declare
  target_company_id uuid;
  target_submission_id uuid;
begin
  select c.id
  into target_company_id
  from public.companies c
  where c.code = $1
     or c.unique_code = $1
  limit 1;

  if target_company_id is null then
    raise exception 'Invalid company code';
  end if;

  select s.id
  into target_submission_id
  from public.submissions s
  join public.job_simulations js on js.id = s.job_simulation_id
  where s.id = $2
    and js.company_id = target_company_id
    and s.submitted_at is not null
    and s.answer_transmission_consent = true
  limit 1;

  if target_submission_id is null and exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'applicants'
  ) then
    if not exists (
      select 1
      from public.applicants a
      where a.id = $2
        and a.company_id = target_company_id
    ) then
      raise exception 'Invalid company applicant';
    end if;
  elsif target_submission_id is null then
    raise exception 'Invalid company applicant';
  end if;

  if $3 then
    insert into public.company_saved_applicants (company_id, applicant_id, submission_id)
    values (target_company_id, $2, target_submission_id)
    on conflict (company_id, applicant_id)
    where applicant_id is not null
    do update set
      submission_id = excluded.submission_id,
      created_at = public.company_saved_applicants.created_at;
  else
    delete from public.company_saved_applicants saved
    where saved.company_id = target_company_id
      and coalesce(saved.applicant_id, saved.submission_id) = $2;
  end if;

  return $3;
end;
$set_saved_applicant$;

grant execute on function public.set_saved_applicant_by_company_code(text, uuid, boolean) to anon;
grant execute on function public.set_saved_applicant_by_company_code(text, uuid, boolean) to authenticated;
