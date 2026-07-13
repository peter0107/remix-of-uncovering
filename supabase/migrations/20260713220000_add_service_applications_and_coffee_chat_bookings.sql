-- ============================================================
-- 기업 서비스 가입 신청 + 커피챗 예약 테이블 추가
--
-- /biz 코드 입력 화면의 "코드가 없으신가요?" 진입부에서 연결되는
-- 두 공개 폼의 저장소:
--   - service_applications: Beginner 기업 서비스 가입 신청
--   - coffee_chat_bookings: 30분 구글미트 커피챗 예약 (고정 슬롯)
--
-- 두 테이블 모두 기업 열람 데이터 유형(§5-3): RLS enable +
-- 직접 select 차단(using(false)) + service_role grant.
-- 쓰기/읽기는 전부 service role 서버 함수(supabaseAdmin)로만.
-- 커피챗 슬롯 중복 예약은 unique(slot_date, slot_time)로 DB 레벨 방지.
-- ============================================================

create table if not exists public.service_applications (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text not null,
  contact_title text,                                  -- 직함: 선택
  email text not null,
  phone text not null,
  privacy_consent boolean not null default false,
  wants_intro_meeting boolean not null default false,  -- "15분 온라인 미팅" 희망
  created_at timestamptz not null default now()
);

create table if not exists public.coffee_chat_bookings (
  id uuid primary key default gen_random_uuid(),
  slot_date date not null,                 -- KST 달력 날짜
  slot_time text not null,                 -- 'HH:MM' 24시간제
  name text not null,
  email text not null,
  phone text not null,
  company_name text not null,
  hiring_concern text,                     -- 채용 고민: 선택
  privacy_consent boolean not null default false,
  created_at timestamptz not null default now(),
  constraint coffee_chat_bookings_slot_time_format check (slot_time ~ '^\d{2}:\d{2}$'),
  constraint coffee_chat_bookings_slot_unique unique (slot_date, slot_time)
);

create index if not exists idx_coffee_chat_bookings_slot_date
  on public.coffee_chat_bookings (slot_date);

-- ── RLS: 직접 select 차단 + service_role 전용 ─────────────────
alter table public.service_applications enable row level security;

drop policy if exists "Block direct service application reads"
  on public.service_applications;
create policy "Block direct service application reads"
on public.service_applications
for select
using (false);

grant all on public.service_applications to service_role;

alter table public.coffee_chat_bookings enable row level security;

drop policy if exists "Block direct coffee chat booking reads"
  on public.coffee_chat_bookings;
create policy "Block direct coffee chat booking reads"
on public.coffee_chat_bookings
for select
using (false);

grant all on public.coffee_chat_bookings to service_role;
