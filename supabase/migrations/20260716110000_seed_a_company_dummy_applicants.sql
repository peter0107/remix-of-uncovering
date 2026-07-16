-- A기업(BGNR-2024-A) 기업용 화면 확인을 위한 더미 지원자 3명입니다.
-- A기업에 등록된 직무 시뮬레이션 순서에 맞춰 연결하며, 직무가 3개보다 적으면
-- 첫 번째 시뮬레이션에 연결합니다.

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
values
  (
    '00000000-0000-4000-8000-000000000201'::uuid,
    'seoyeon.oh@example.com',
    '고객 데이터에서 실행 가능한 인사이트를 만드는 데이터 분석가',
    '학부',
    array['통계학'],
    array['AI·개발·데이터'],
    array['A기업'],
    array['서울'],
    array['경력직'],
    true,
    '2026-07-16 09:10:00+09'::timestamptz
  ),
  (
    '00000000-0000-4000-8000-000000000202'::uuid,
    'doyoon.lee@example.com',
    '문제를 구조화해 제품 개선으로 연결하는 서비스 기획자',
    '학부',
    array['경영학'],
    array['기획·전략'],
    array['A기업'],
    array['경기·인천'],
    array['신입'],
    true,
    '2026-07-16 09:20:00+09'::timestamptz
  ),
  (
    '00000000-0000-4000-8000-000000000203'::uuid,
    'minseo.choi@example.com',
    '브랜드 경험을 일관된 화면과 콘텐츠로 설계하는 BX 디자이너',
    '학부',
    array['시각디자인'],
    array['디자인'],
    array['A기업'],
    array['서울', '경기·인천'],
    array['계약직'],
    true,
    '2026-07-16 09:30:00+09'::timestamptz
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
values
  (
    '00000000-0000-4000-8000-000000000211'::uuid,
    '00000000-0000-4000-8000-000000000201'::uuid,
    '데이터 분석 지원 이력서',
    'manual',
    '데이터 분석',
    jsonb_build_object(
      'name', '오서연',
      'email', 'seoyeon.oh@example.com',
      'phone', '010-4831-9274',
      'location', '서울특별시 마포구',
      'headline', '고객 데이터에서 실행 가능한 인사이트를 만드는 데이터 분석가'
    ),
    jsonb_build_object(
      'desired_salary', '5500만원 이상',
      'preferred_region', array['서울'],
      'employment_type', array['경력직']
    ),
    jsonb_build_array(
      jsonb_build_object(
        'category', '학사',
        'school', '서울시립대학교',
        'major', '통계학',
        'status', '졸업',
        'description', '학점 4.1/4.5'
      )
    ),
    jsonb_build_array(
      jsonb_build_object(
        'company', '데이터웨이브',
        'role', '데이터 분석가',
        'period', '2022.03 ~ 2025.06',
        'duration', '3년 4개월',
        'durationMonths', 40,
        'description', 'CRM과 광고 데이터를 통합 분석해 고객 세그먼트와 캠페인 개선안을 제시했습니다.'
      )
    ),
    array['SQL', '데이터 분석', 'A/B 테스트', '고객 세그먼트'],
    array['BigQuery', 'Tableau', 'GA4', 'Python'],
    jsonb_build_array(
      jsonb_build_object(
        'title', '재구매 고객 분석 프로젝트',
        'description', '구매 주기와 상품군을 기준으로 재구매 고객군을 정의하고 리텐션 지표를 개선했습니다.',
        'updatedAt', '2026.06'
      )
    ),
    'A기업 더미 지원자',
    true,
    '2026-07-16 09:10:00+09'::timestamptz,
    '2026-07-16 09:10:00+09'::timestamptz
  ),
  (
    '00000000-0000-4000-8000-000000000212'::uuid,
    '00000000-0000-4000-8000-000000000202'::uuid,
    '서비스 기획 지원 이력서',
    'manual',
    '서비스 기획',
    jsonb_build_object(
      'name', '이도윤',
      'email', 'doyoon.lee@example.com',
      'phone', '010-6152-3089',
      'location', '경기도 성남시',
      'headline', '문제를 구조화해 제품 개선으로 연결하는 서비스 기획자'
    ),
    jsonb_build_object(
      'desired_salary', '4500만원 이상',
      'preferred_region', array['경기·인천', '서울'],
      'employment_type', array['신입']
    ),
    jsonb_build_array(
      jsonb_build_object(
        'category', '학사',
        'school', '경희대학교',
        'major', '경영학',
        'status', '졸업',
        'description', '학점 3.9/4.5'
      )
    ),
    jsonb_build_array(
      jsonb_build_object(
        'company', '프로덕트랩',
        'role', '서비스 기획 인턴',
        'period', '2023.09 ~ 2024.08',
        'duration', '1년',
        'durationMonths', 12,
        'description', '사용자 인터뷰와 퍼널 분석을 바탕으로 신규 온보딩 흐름을 기획했습니다.'
      ),
      jsonb_build_object(
        'company', '캠퍼스 프로젝트',
        'role', 'PM',
        'period', '2022.03 ~ 2023.02',
        'duration', '1년',
        'durationMonths', 12,
        'description', '팀 프로젝트의 일정과 요구사항을 관리하며 웹 서비스 출시를 이끌었습니다.'
      )
    ),
    array['서비스 기획', '사용자 리서치', '데이터 해석', '문서화'],
    array['Figma', 'Notion', 'GA4', 'Slack'],
    jsonb_build_array(
      jsonb_build_object(
        'title', '대학생 협업 서비스 기획',
        'description', '사용자 조사부터 와이어프레임, 출시 후 지표 점검까지 수행했습니다.',
        'updatedAt', '2026.05'
      )
    ),
    'A기업 더미 지원자',
    true,
    '2026-07-16 09:20:00+09'::timestamptz,
    '2026-07-16 09:20:00+09'::timestamptz
  ),
  (
    '00000000-0000-4000-8000-000000000213'::uuid,
    '00000000-0000-4000-8000-000000000203'::uuid,
    'BX 디자인 지원 이력서',
    'manual',
    'BX 디자이너',
    jsonb_build_object(
      'name', '최민서',
      'email', 'minseo.choi@example.com',
      'phone', '010-7284-1563',
      'location', '서울특별시 성동구',
      'headline', '브랜드 경험을 일관된 화면과 콘텐츠로 설계하는 BX 디자이너'
    ),
    jsonb_build_object(
      'desired_salary', '6000만원 이상',
      'preferred_region', array['서울', '경기·인천'],
      'employment_type', array['계약직']
    ),
    jsonb_build_array(
      jsonb_build_object(
        'category', '학사',
        'school', '홍익대학교',
        'major', '시각디자인',
        'status', '졸업',
        'description', '학점 4.2/4.5'
      )
    ),
    jsonb_build_array(
      jsonb_build_object(
        'company', '브랜드스튜디오',
        'role', 'BX 디자이너',
        'period', '2024.09 ~ 2026.06',
        'duration', '1년 10개월',
        'durationMonths', 22,
        'description', '브랜드 가이드와 디지털 캠페인 비주얼을 설계하고 제작했습니다.'
      )
    ),
    array['브랜드 디자인', 'UI 디자인', '콘텐츠 디자인', '디자인 시스템'],
    array['Figma', 'Adobe Illustrator', 'Adobe Photoshop', 'After Effects'],
    jsonb_build_array(
      jsonb_build_object(
        'title', '리브랜딩 디자인 시스템',
        'description', '브랜드 톤앤매너를 정의하고 서비스 화면에 적용 가능한 컴포넌트를 구축했습니다.',
        'updatedAt', '2026.07'
      )
    ),
    'A기업 더미 지원자',
    true,
    '2026-07-16 09:30:00+09'::timestamptz,
    '2026-07-16 09:30:00+09'::timestamptz
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

with available_simulations as (
  select
    js.id,
    row_number() over (order by js.created_at, js.id) as position
  from public.job_simulations js
  join public.companies c on c.id = js.company_id
  where c.code = 'BGNR-2024-A'
    and js.deleted_at is null
),
candidate_submissions as (
  select *
  from (
    values
      (
        '00000000-0000-4000-8000-000000000221'::uuid,
        '00000000-0000-4000-8000-000000000201'::uuid,
        1::bigint,
        '고객 이탈 구간을 먼저 확인한 뒤, 신규 고객과 재구매 고객을 분리해 전환율을 비교하겠습니다. 이후 채널별 CAC와 구매 주기를 함께 분석해 우선순위가 높은 개선안을 제안하겠습니다.',
        4320,
        '2026-07-16 10:10:00+09'::timestamptz
      ),
      (
        '00000000-0000-4000-8000-000000000222'::uuid,
        '00000000-0000-4000-8000-000000000202'::uuid,
        2::bigint,
        '문제의 범위를 사용자, 비즈니스, 운영 관점으로 나누겠습니다. 핵심 사용 흐름을 정의하고 가설별 검증 지표를 설정한 후, 영향도와 구현 난이도를 기준으로 실행 순서를 제안하겠습니다.',
        3980,
        '2026-07-16 10:20:00+09'::timestamptz
      ),
      (
        '00000000-0000-4000-8000-000000000223'::uuid,
        '00000000-0000-4000-8000-000000000203'::uuid,
        3::bigint,
        '브랜드의 핵심 인상을 일관되게 전달할 수 있도록 고객 접점별 문제를 정리하겠습니다. 우선순위 화면부터 레이아웃과 메시지 톤을 제안하고, 운영 과정에서 재사용할 수 있는 디자인 기준을 함께 만들겠습니다.',
        4650,
        '2026-07-16 10:30:00+09'::timestamptz
      )
  ) as candidate_submissions (
    id,
    job_seeker_id,
    preferred_position,
    response_text,
    duration_sec,
    submitted_at
  )
),
mapped_submissions as (
  select
    candidate_submissions.*,
    coalesce(
      (
        select id
        from available_simulations
        where position = candidate_submissions.preferred_position
      ),
      (
        select id
        from available_simulations
        order by position
        limit 1
      )
    ) as job_simulation_id
  from candidate_submissions
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
  id,
  job_seeker_id,
  job_simulation_id,
  response_text,
  duration_sec,
  false,
  true,
  jsonb_build_object('seed', true, 'source', 'a-company-dummy-applicant'),
  submitted_at - interval '75 minutes',
  submitted_at,
  submitted_at
from mapped_submissions
where job_simulation_id is not null
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
  submitted_at = excluded.submitted_at;
