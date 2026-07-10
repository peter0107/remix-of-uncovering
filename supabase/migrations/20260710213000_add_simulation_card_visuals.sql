alter table public.companies
add column if not exists logo_url text;

alter table public.job_simulations
add column if not exists card_image_url text;

comment on column public.companies.logo_url is '기업 시뮬레이션 카드에 표시할 기업 로고 이미지 URL';
comment on column public.job_simulations.card_image_url is '유저/관리자 시뮬레이션 카드 상단에 표시할 이미지 URL';
