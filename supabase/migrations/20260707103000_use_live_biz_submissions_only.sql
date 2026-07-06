do '
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = ''public''
      and t.typname = ''applicant_status''
  ) then
    create type public.applicant_status as enum (''submitted'', ''in_review'', ''completed'');
  end if;
end;';

alter table public.job_simulations
add column if not exists role_label text;

drop table if exists public.job_simulation_requests cascade;

insert into public.companies (name, code, unique_code, role_label)
values ('A기업', 'BGNR-2024-A', 'BGNR-2024-A', '마케팅 매니저')
on conflict (unique_code) do update
set
  name = excluded.name,
  code = excluded.code,
  role_label = excluded.role_label;

with a_company as (
  select id as company_id
  from public.companies
  where code = 'BGNR-2024-A'
  order by created_at nulls last, id
  limit 1
),
existing_simulation as (
  select js.id
  from public.job_simulations js
  join a_company on a_company.company_id = js.company_id
  where coalesce(js.role_label, '') = '마케팅 매니저'
  order by js.created_at nulls last, js.id
  limit 1
),
source_simulation as (
  select
    a_company.company_id,
    source.title,
    '마케팅 매니저'::text as role_label,
    source.description,
    source.job_family,
    '마케팅·광고·MD'::text as domain,
    source.estimated_minutes,
    source.task_prompt
  from a_company
  join public.job_simulations source on true
  join public.companies source_company on source_company.id = source.company_id
  where source_company.code = 'BEGINNER-CONTENT-2026'
    and source.title = '마케팅 캠페인 A/B 테스트 결과 해석'
    and not exists (select 1 from existing_simulation)
  order by source.created_at nulls last, source.id
  limit 1
),
fallback_simulation as (
  select
    a_company.company_id,
    '마케팅 캠페인 A/B 테스트 결과 해석'::text as title,
    '마케팅 매니저'::text as role_label,
    '마케팅 캠페인 실험 결과를 해석하고 실행 전략을 제안하는 직무 시뮬레이션입니다.'::text as description,
    '마케팅'::text as job_family,
    '마케팅·광고·MD'::text as domain,
    72::integer as estimated_minutes,
    '# 마케팅 캠페인 A/B 테스트 결과 해석

## 상황
신규 고객 전환을 높이기 위한 캠페인 A/B 테스트 결과를 검토하고, 타깃 고객, 핵심 메시지, 채널 운영 전략, 실행 일정을 제안하세요.

## 제출 형식
1. 타깃 고객 정의
2. 핵심 메시지
3. 채널 운영 전략
4. 실행 일정'::text as task_prompt
  from a_company
  where not exists (select 1 from existing_simulation)
    and not exists (select 1 from source_simulation)
)
insert into public.job_simulations (
  company_id,
  title,
  role_label,
  description,
  job_family,
  domain,
  estimated_minutes,
  task_prompt
)
select
  company_id,
  title,
  role_label,
  description,
  job_family,
  domain,
  estimated_minutes,
  task_prompt
from source_simulation
union all
select
  company_id,
  title,
  role_label,
  description,
  job_family,
  domain,
  estimated_minutes,
  task_prompt
from fallback_simulation;

insert into public.job_seekers (
  id,
  email,
  one_line_intro,
  education_level,
  majors,
  job_interests,
  company_interests,
  work_regions,
  employment_types,
  discovery_consent,
  created_at
)
values (
  '00000000-0000-4000-8000-000000000101',
  'jieun.kim@email.com',
  '데이터 기반 의사결정으로 마케팅 성과를 만드는 마케터',
  '대학교 졸업',
  array['경영학'],
  array['마케팅 매니저'],
  array['A기업'],
  array['서울특별시 강남구'],
  array['정규직', '하이브리드'],
  true,
  '2024-05-10 13:00:00+09'
)
on conflict (id) do update
set
  email = excluded.email,
  one_line_intro = excluded.one_line_intro,
  education_level = excluded.education_level,
  majors = excluded.majors,
  job_interests = excluded.job_interests,
  company_interests = excluded.company_interests,
  work_regions = excluded.work_regions,
  employment_types = excluded.employment_types,
  discovery_consent = excluded.discovery_consent;

insert into public.resumes (
  id,
  user_id,
  title,
  source_type,
  target_role,
  basics,
  job_conditions,
  educations,
  experiences,
  skills,
  tools,
  portfolios,
  memo,
  is_default,
  created_at,
  updated_at
)
values (
  '00000000-0000-4000-8000-000000000103',
  '00000000-0000-4000-8000-000000000101',
  '김지은 마케팅 매니저 지원 이력서',
  'manual',
  '마케팅 매니저',
  jsonb_build_object(
    'name', '김지은',
    'email', 'jieun.kim@email.com',
    'phone', '010-1234-5678',
    'location', '서울특별시 강남구',
    'headline', '데이터 기반 의사결정으로 마케팅 성과를 만드는 마케터'
  ),
  jsonb_build_object(
    'desired_salary', '5,000만원 협의 가능',
    'preferred_region', '서울, 강남구',
    'employment_type', '정규직, 하이브리드'
  ),
  jsonb_build_array(
    jsonb_build_object('description', '연세대학교 경영학과 (2016.02 졸업)')
  ),
  jsonb_build_array(
    jsonb_build_object(
      'company', '(주)마케팅이노베이션',
      'role', '퍼포먼스 마케터',
      'period', '4년 2개월'
    )
  ),
  array['퍼포먼스 마케팅', '데이터 분석', 'A/B 테스트'],
  array['GA4', 'SQL', 'Looker Studio', 'Meta Ads', 'Tableau'],
  jsonb_build_array(
    jsonb_build_object('title', '브랜드 캠페인 리뉴얼', 'url', '#', 'updatedAt', '2024.04'),
    jsonb_build_object('title', '퍼포먼스 대시보드 구축', 'url', '#', 'updatedAt', '2024.02'),
    jsonb_build_object('title', '앱 리텐션 개선 프로젝트', 'url', '#', 'updatedAt', '2023.11')
  ),
  null,
  true,
  '2024-05-10 13:00:00+09',
  '2024-05-10 14:32:00+09'
)
on conflict (id) do update
set
  title = excluded.title,
  source_type = excluded.source_type,
  target_role = excluded.target_role,
  basics = excluded.basics,
  job_conditions = excluded.job_conditions,
  educations = excluded.educations,
  experiences = excluded.experiences,
  skills = excluded.skills,
  tools = excluded.tools,
  portfolios = excluded.portfolios,
  memo = excluded.memo,
  is_default = excluded.is_default,
  updated_at = excluded.updated_at;

with target_simulation as (
  select js.id
  from public.job_simulations js
  join public.companies c on c.id = js.company_id
  where c.code = 'BGNR-2024-A'
    and coalesce(js.role_label, '') = '마케팅 매니저'
  order by js.created_at nulls last, js.id
  limit 1
)
insert into public.submissions (
  id,
  job_seeker_id,
  job_simulation_id,
  response_text,
  duration_sec,
  paste_detected,
  answer_transmission_consent,
  score_json,
  started_at,
  submitted_at,
  created_at
)
select
  '00000000-0000-4000-8000-000000000102',
  '00000000-0000-4000-8000-000000000101',
  target_simulation.id,
  '1. 타깃 고객 정의
20대 후반 ~ 30대 초반의 서울/수도권 직장인, 자기계발과 커리어 성장을 중시하며 업무와 삶의 균형을 지향하는 실속형 성장 지향 고객입니다.

2. 핵심 메시지
''같은 강의도 더 스마트하게'' - 시간과 비용을 절약하면서도 목표를 달성할 수 있는 합리적인 학습 경험을 강조합니다.

3. 채널 운영 전략
인스타그램과 유튜브에서는 트렌드 스토리와 교육 콘텐츠로 인지도를 높이고, 네이버 검색·카페에서 후기 및 성공 사례로 전환을 유도합니다.

4. 실행 일정
1개월차: 인지도 확산, 2개월차: 관심 유도, 3개월차: 전환 극대화를 목표로 운영합니다. A/B 테스트로 메시지와 크리에이티브를 지속 최적화합니다.',
  4320,
  false,
  true,
  jsonb_build_object('source', 'seeded_live_submission', 'fit', 'sample'),
  '2024-05-10 13:20:00+09',
  '2024-05-10 14:32:00+09',
  '2024-05-10 13:20:00+09'
from target_simulation
on conflict (id) do update
set
  job_seeker_id = excluded.job_seeker_id,
  job_simulation_id = excluded.job_simulation_id,
  response_text = excluded.response_text,
  duration_sec = excluded.duration_sec,
  paste_detected = excluded.paste_detected,
  answer_transmission_consent = excluded.answer_transmission_consent,
  score_json = excluded.score_json,
  started_at = excluded.started_at,
  submitted_at = excluded.submitted_at,
  created_at = excluded.created_at;

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
  where c.code = company_code
    and s.submitted_at is not null
    and s.answer_transmission_consent = true
    and seeker.discovery_consent = true
  order by coalesce(s.submitted_at, s.created_at) desc;
$get_applicants$;

grant execute on function public.get_applicants_by_company_code(text) to anon;
grant execute on function public.get_applicants_by_company_code(text) to authenticated;
