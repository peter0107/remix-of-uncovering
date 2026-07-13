-- ============================================================
-- service_applications: 기업 정보 상세 컬럼 추가
--
-- 가입 신청 폼에서 기업을 더 자세히 파악하기 위해 총 직원 수·개발자 수·
-- 서비스 링크를 추가로 수집한다. 값은 자유 입력(text)으로 저장한다
-- ("50", "약 20명", "준비중" 등 유연하게 받기 위함).
-- 기존 행 호환을 위해 전부 nullable (default 없음, 신규 제출부터 채워짐).
-- ============================================================

alter table public.service_applications add column if not exists total_employees text;
alter table public.service_applications add column if not exists developer_count text;
alter table public.service_applications add column if not exists service_link text;
