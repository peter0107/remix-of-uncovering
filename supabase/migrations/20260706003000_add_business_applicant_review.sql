-- ============================================================
-- 기업용 지원자 검토 페이지 스키마
-- /biz 페이지가 기대하는 companies.code, role_label, applicants, RPC를 추가한다.
-- 기존 unique_code 기반 구직자/시뮬레이션 스키마는 유지한다.
-- ============================================================

alter table public.companies
  add column if not exists code text,
  add column if not exists role_label text;

update public.companies
set code = unique_code
where code is null;

create unique index if not exists companies_code_key
  on public.companies (code);

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'applicant_status'
      and n.nspname = 'public'
  ) then
    create type public.applicant_status as enum ('submitted', 'in_review', 'completed');
  end if;
end $$;

create table if not exists public.applicants (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  role text not null,
  experience text not null,
  status public.applicant_status not null default 'submitted',
  submitted_at timestamptz not null default now(),
  email text not null,
  phone text not null,
  location text not null,
  headline text not null,
  education text not null,
  recent_job text not null,
  skills text[] not null default '{}',
  tools text[] not null default '{}',
  resume_url text not null default '#',
  portfolio jsonb not null default '[]'::jsonb,
  duration text not null,
  simulation jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_applicants_company_id
  on public.applicants (company_id);

create unique index if not exists idx_applicants_company_email
  on public.applicants (company_id, email);

alter table public.applicants enable row level security;

drop policy if exists "Block direct applicant reads by anon" on public.applicants;
create policy "Block direct applicant reads by anon"
on public.applicants
for select
to anon
using (false);

drop policy if exists "Allow authenticated applicant management" on public.applicants;
create policy "Allow authenticated applicant management"
on public.applicants
for all
to authenticated
using (true)
with check (true);

grant select on public.companies to anon, authenticated;
grant all on public.companies to service_role;
grant select on public.applicants to authenticated;
grant all on public.applicants to service_role;

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
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id,
    a.company_id,
    a.name,
    a.role,
    a.experience,
    a.status,
    a.submitted_at,
    a.email,
    a.phone,
    a.location,
    a.headline,
    a.education,
    a.recent_job,
    a.skills,
    a.tools,
    a.resume_url,
    a.portfolio,
    a.duration,
    a.simulation,
    a.created_at,
    a.updated_at
  from public.applicants a
  join public.companies c on c.id = a.company_id
  where c.code = company_code;
$$;

grant execute on function public.get_applicants_by_company_code(text) to anon;
grant execute on function public.get_applicants_by_company_code(text) to authenticated;

insert into public.companies (code, unique_code, name, role_label)
values ('BGNR-2024-A', 'BGNR-2024-A', 'A기업', '마케팅 매니저 채용')
on conflict (code) do update
set
  name = excluded.name,
  role_label = excluded.role_label,
  unique_code = excluded.unique_code;

with company as (
  select id from public.companies where code = 'BGNR-2024-A'
)
insert into public.applicants (
  company_id,
  name,
  role,
  experience,
  status,
  submitted_at,
  email,
  phone,
  location,
  headline,
  education,
  recent_job,
  skills,
  tools,
  resume_url,
  portfolio,
  duration,
  simulation
)
select
  company.id,
  d.name,
  d.role,
  d.experience,
  d.status::public.applicant_status,
  d.submitted_at,
  d.email,
  d.phone,
  d.location,
  d.headline,
  d.education,
  d.recent_job,
  d.skills,
  d.tools,
  d.resume_url,
  d.portfolio,
  d.duration,
  d.simulation
from company
cross join lateral (
  values
  (
    '김지은',
    '마케팅 매니저',
    '4년 2개월',
    'submitted',
    '2024-05-10 14:32:00+09'::timestamptz,
    'jieun.kim@email.com',
    '010-1234-5678',
    '서울특별시 강남구',
    '데이터 기반 의사결정으로 마케팅 성과를 만드는 마케터',
    '연세대학교 경영학과 (2016.02 졸업)',
    '(주)마케팅이노베이션 · 퍼포먼스 마케터 (2021.03 ~ 현재)',
    array['퍼포먼스 마케팅', '데이터 분석', 'A/B 테스트'],
    array['GA4', 'SQL', 'Looker Studio', 'Meta Ads', 'Tableau'],
    '#',
    '[{"title":"브랜드 캠페인 리뉴얼","url":"#","updatedAt":"2024.04"},{"title":"퍼포먼스 대시보드 구축","url":"#","updatedAt":"2024.02"},{"title":"앱 리텐션 개선 프로젝트","url":"#","updatedAt":"2023.11"}]'::jsonb,
    '1시간 12분',
    '[{"step":1,"title":"타깃 고객 정의","answer":"20대 후반 ~ 30대 초반의 서울/수도권 직장인, 자기계발과 커리어 성장을 중시하며 업무와 삶의 균형을 지향하는 실속형 성장 지향 고객입니다."},{"step":2,"title":"핵심 메시지","answer":"같은 강의도 더 스마트하게 - 시간과 비용을 절약하면서도 목표를 달성할 수 있는 합리적인 학습 경험을 강조합니다."},{"step":3,"title":"채널 운영 전략","answer":"인스타그램과 유튜브에서 트렌드 스토리와 교육 콘텐츠로 인지도를 높이고, 네이버 검색·카페에서 후기 및 성공 사례로 전환을 유도합니다."},{"step":4,"title":"실행 일정","answer":"1개월차: 인지도 확산, 2개월차: 관심 유도, 3개월차: 전환 극대화를 목표로 운영합니다. A/B 테스트로 메시지와 크리에이티브를 지속 최적화합니다."}]'::jsonb
  ),
  (
    '이준호',
    '마케팅 매니저',
    '3년 5개월',
    'in_review',
    '2024-05-10 12:08:00+09'::timestamptz,
    'junho.lee@email.com',
    '010-2345-6789',
    '서울특별시 마포구',
    '브랜드와 퍼포먼스를 함께 고민하는 마케터',
    '고려대학교 미디어학부 (2018.02 졸업)',
    '(주)브랜드랩 · 브랜드 마케터 (2022.01 ~ 현재)',
    array['브랜드 마케팅', '콘텐츠 기획', 'CRM'],
    array['GA4', 'HubSpot', 'Notion', 'Figma'],
    '#',
    '[{"title":"리브랜딩 프로젝트","url":"#","updatedAt":"2024.03"},{"title":"뉴스레터 그로스","url":"#","updatedAt":"2023.10"}]'::jsonb,
    '58분',
    '[{"step":1,"title":"타깃 고객 정의","answer":"브랜드 충성도가 높은 재구매 고객을 타깃으로 설정했습니다."},{"step":2,"title":"핵심 메시지","answer":"익숙함 속의 새로움을 핵심 메시지로 삼았습니다."},{"step":3,"title":"채널 운영 전략","answer":"오가닉 SNS + CRM 자동화 조합으로 접근했습니다."},{"step":4,"title":"실행 일정","answer":"4주 단위 스프린트로 캠페인을 실행하겠습니다."}]'::jsonb
  ),
  (
    '박민서',
    '마케팅 매니저',
    '2년 8개월',
    'submitted',
    '2024-05-09 18:22:00+09'::timestamptz,
    'minseo.park@email.com',
    '010-3456-7890',
    '경기도 성남시',
    '그로스 실험을 즐기는 주니어 마케터',
    '성균관대학교 경영학과 (2020.02 졸업)',
    '(주)그로스컴퍼니 · 그로스 마케터 (2022.06 ~ 현재)',
    array['그로스 해킹', 'SQL', '실험 설계'],
    array['Amplitude', 'Mixpanel', 'SQL', 'Notion'],
    '#',
    '[{"title":"온보딩 개선 실험","url":"#","updatedAt":"2024.01"}]'::jsonb,
    '1시간 24분',
    '[{"step":1,"title":"타깃 고객 정의","answer":"신규 가입 후 이탈률이 높은 사용자 세그먼트를 정의했습니다."},{"step":2,"title":"핵심 메시지","answer":"첫 성공을 3분 안에를 온보딩 핵심 메시지로 잡았습니다."},{"step":3,"title":"채널 운영 전략","answer":"인앱 메시지 + 이메일 리마인더 조합을 사용합니다."},{"step":4,"title":"실행 일정","answer":"2주 단위 A/B 테스트 사이클로 운영합니다."}]'::jsonb
  ),
  (
    '최유진',
    '디지털 마케팅 스페셜리스트',
    '5년 1개월',
    'completed',
    '2024-05-09 09:14:00+09'::timestamptz,
    'yujin.choi@email.com',
    '010-4567-8901',
    '서울특별시 송파구',
    '미디어 믹스 최적화 전문가',
    '한양대학교 광고홍보학과 (2015.02 졸업)',
    '(주)디지털애드 · 시니어 스페셜리스트 (2020.09 ~ 현재)',
    array['미디어 믹스', 'Paid Ads', '리포팅'],
    array['Google Ads', 'Meta Ads', 'GA4', 'Looker Studio'],
    '#',
    '[{"title":"커머스 캠페인 리뷰","url":"#","updatedAt":"2024.02"},{"title":"미디어 믹스 최적화 리포트","url":"#","updatedAt":"2023.12"}]'::jsonb,
    '1시간 05분',
    '[{"step":1,"title":"타깃 고객 정의","answer":"리타깃 가능한 고관여 고객군을 우선 순위로 두었습니다."},{"step":2,"title":"핵심 메시지","answer":"지금 놓치면 다음은 없다는 긴급성 메시지를 설계했습니다."},{"step":3,"title":"채널 운영 전략","answer":"검색 + 디스플레이 + 소셜의 삼각편대로 운영합니다."},{"step":4,"title":"실행 일정","answer":"6주 캠페인 기간 동안 주간 리포트를 발행합니다."}]'::jsonb
  ),
  (
    '한지민',
    '브랜드 마케팅 매니저',
    '6년 3개월',
    'in_review',
    '2024-05-08 20:47:00+09'::timestamptz,
    'jimin.han@email.com',
    '010-5678-9012',
    '서울특별시 용산구',
    '브랜드의 톤앤매너를 지키는 스토리텔러',
    '이화여자대학교 시각디자인학과 (2014.02 졸업)',
    '(주)브랜드하우스 · 브랜드 매니저 (2019.03 ~ 현재)',
    array['브랜드 전략', '카피라이팅', '협업 관리'],
    array['Figma', 'Notion', 'Adobe CC'],
    '#',
    '[{"title":"브랜드 가이드라인 개편","url":"#","updatedAt":"2024.03"},{"title":"런칭 캠페인 아카이브","url":"#","updatedAt":"2023.09"}]'::jsonb,
    '1시간 30분',
    '[{"step":1,"title":"타깃 고객 정의","answer":"브랜드 세계관에 공감하는 20-30대 여성으로 정의했습니다."},{"step":2,"title":"핵심 메시지","answer":"있는 그대로의 나를 지지하는 메시지를 중심으로 잡았습니다."},{"step":3,"title":"채널 운영 전략","answer":"인스타그램 브랜드 계정과 오프라인 팝업을 연동합니다."},{"step":4,"title":"실행 일정","answer":"분기별 캠페인 + 상시 브랜드 콘텐츠 운영으로 구성했습니다."}]'::jsonb
  )
) as d(
  name,
  role,
  experience,
  status,
  submitted_at,
  email,
  phone,
  location,
  headline,
  education,
  recent_job,
  skills,
  tools,
  resume_url,
  portfolio,
  duration,
  simulation
)
on conflict (company_id, email) do update
set
  name = excluded.name,
  role = excluded.role,
  experience = excluded.experience,
  status = excluded.status,
  submitted_at = excluded.submitted_at,
  phone = excluded.phone,
  location = excluded.location,
  headline = excluded.headline,
  education = excluded.education,
  recent_job = excluded.recent_job,
  skills = excluded.skills,
  tools = excluded.tools,
  resume_url = excluded.resume_url,
  portfolio = excluded.portfolio,
  duration = excluded.duration,
  simulation = excluded.simulation,
  updated_at = now();
