drop function if exists public.get_applicants_by_company_code(text);

create or replace function public.get_applicants_by_company_code(company_code text)
returns table (
  id uuid,
  company_id uuid,
  name text,
  role text,
  experience text,
  status public.applicant_status,
  submitted_at timestamptz,
  email text,
  phone text,
  location text,
  headline text,
  education text,
  recent_job text,
  skills text[],
  tools text[],
  resume_url text,
  portfolio jsonb,
  duration text,
  simulation jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  desired_salary text,
  preferred_region text,
  employment_type text,
  resume_title text,
  resume_source_type text
)
language sql
stable
security definer
set search_path = public
as $get_applicants$
  select
    s.id,
    js.company_id,
    coalesce(nullif(r.basics->>'name', ''), split_part(seeker.email, '@', 1), '이름 미입력') as name,
    coalesce(nullif(js.role_label, ''), nullif(r.target_role, ''), nullif(js.job_family, ''), js.title, '지원 직무 미입력') as role,
    coalesce(nullif(r.experiences->0->>'period', ''), '경력 미입력') as experience,
    'submitted'::public.applicant_status as status,
    coalesce(s.submitted_at, s.created_at) as submitted_at,
    coalesce(nullif(r.basics->>'email', ''), seeker.email) as email,
    coalesce(nullif(r.basics->>'phone', ''), '연락처 미입력') as phone,
    coalesce(
      nullif(r.basics->>'location', ''),
      nullif(array_to_string(seeker.work_regions, ', '), ''),
      '거주 지역 미입력'
    ) as location,
    coalesce(nullif(r.basics->>'headline', ''), nullif(seeker.one_line_intro, ''), '소개 미입력') as headline,
    coalesce(
      nullif(r.educations->0->>'description', ''),
      nullif(concat_ws(' / ', seeker.education_level, array_to_string(seeker.majors, ', ')), ''),
      '학력 미입력'
    ) as education,
    coalesce(
      nullif(
        concat_ws(
          ' · ',
          nullif(r.experiences->0->>'company', ''),
          nullif(r.experiences->0->>'role', ''),
          nullif(r.experiences->0->>'period', '')
        ),
        ''
      ),
      '경력 미입력'
    ) as recent_job,
    coalesce(r.skills, '{}'::text[]) as skills,
    coalesce(r.tools, '{}'::text[]) as tools,
    coalesce(nullif(r.uploaded_file_path, ''), '#') as resume_url,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'title', coalesce(nullif(item.value->>'title', ''), '포트폴리오'),
            'url', coalesce(nullif(item.value->>'url', ''), '#'),
            'updatedAt', coalesce(nullif(item.value->>'updatedAt', ''), to_char(r.updated_at, 'YYYY.MM'))
          )
        )
        from jsonb_array_elements(coalesce(r.portfolios, '[]'::jsonb)) as item(value)
      ),
      '[]'::jsonb
    ) as portfolio,
    case
      when s.duration_sec is null then '소요 시간 미입력'
      when s.duration_sec >= 3600 then (s.duration_sec / 3600)::int::text || '시간 ' || ((s.duration_sec % 3600) / 60)::int::text || '분'
      when s.duration_sec >= 60 then (s.duration_sec / 60)::int::text || '분 ' || (s.duration_sec % 60)::text || '초'
      else s.duration_sec::text || '초'
    end as duration,
    jsonb_build_array(
      jsonb_build_object(
        'step', 1,
        'title', js.title,
        'answer', coalesce(s.response_text, '답변 없음')
      )
    ) as simulation,
    s.created_at,
    coalesce(r.updated_at, s.created_at) as updated_at,
    coalesce(nullif(r.job_conditions->>'desired_salary', ''), '희망 연봉 미입력') as desired_salary,
    coalesce(
      nullif(r.job_conditions->>'preferred_region', ''),
      nullif(array_to_string(seeker.work_regions, ', '), ''),
      '희망 지역 미입력'
    ) as preferred_region,
    coalesce(
      nullif(r.job_conditions->>'employment_type', ''),
      nullif(array_to_string(seeker.employment_types, ', '), ''),
      '근무 형태 미입력'
    ) as employment_type,
    coalesce(nullif(r.title, ''), '기본 프로필') as resume_title,
    coalesce(nullif(r.source_type, ''), 'profile') as resume_source_type
  from public.submissions s
  join public.job_simulations js on js.id = s.job_simulation_id
  join public.companies c on c.id = js.company_id
  join public.job_seekers seeker on seeker.id = s.job_seeker_id
  left join lateral (
    select resume.*
    from public.resumes resume
    where resume.user_id = seeker.id
    order by resume.is_default desc, resume.updated_at desc
    limit 1
  ) r on true
  where (c.code = company_code or c.unique_code = company_code)
    and s.submitted_at is not null
    and s.answer_transmission_consent = true
  order by coalesce(s.submitted_at, s.created_at) desc;
$get_applicants$;

grant execute on function public.get_applicants_by_company_code(text) to anon;
grant execute on function public.get_applicants_by_company_code(text) to authenticated;
