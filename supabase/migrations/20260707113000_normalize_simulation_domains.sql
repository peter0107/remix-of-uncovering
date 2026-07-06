update public.job_simulations
set domain = case
  when title = '커머스 앱 구매 플로우 개편 후 전환율 하락 분석' then '기획·전략'
  when title = '외부감사 매출 인식 시점 이상 거래 분석' then '회계·세무'
  when title = 'Phase III 임상시험 이상반응 대응 판단' then '의료·바이오'
  when title = '여름 시즌 재고 소진 전략 수립' then '마케팅·광고·MD'
  when title = '마케팅 캠페인 A/B 테스트 결과 해석'
    and coalesce(role_label, '') = '마케팅 매니저' then '마케팅·광고·MD'
  when title = '마케팅 캠페인 A/B 테스트 결과 해석' then 'AI·개발·데이터'
  when title = '배터리 모듈 체결 불량 및 누수 원인 분석' then '엔지니어링·설계'
  when domain in (
    '기획·전략',
    '법무·사무·총무',
    '인사·HR',
    '회계·세무',
    '마케팅·광고·MD',
    'AI·개발·데이터',
    '디자인',
    '물류·무역',
    '운전·운송·배송',
    '영업',
    '고객상담·TM',
    '금융·보험',
    '식·음료',
    '고객서비스·리테일',
    '엔지니어링·설계',
    '제조·생산',
    '교육',
    '건축·시설',
    '의료·바이오',
    '미디어·문화·스포츠',
    '공공·복지'
  ) then domain
  else '기획·전략'
end;

alter table public.job_simulations
drop constraint if exists job_simulations_domain_allowed;

alter table public.job_simulations
add constraint job_simulations_domain_allowed
check (
  domain in (
    '기획·전략',
    '법무·사무·총무',
    '인사·HR',
    '회계·세무',
    '마케팅·광고·MD',
    'AI·개발·데이터',
    '디자인',
    '물류·무역',
    '운전·운송·배송',
    '영업',
    '고객상담·TM',
    '금융·보험',
    '식·음료',
    '고객서비스·리테일',
    '엔지니어링·설계',
    '제조·생산',
    '교육',
    '건축·시설',
    '의료·바이오',
    '미디어·문화·스포츠',
    '공공·복지'
  )
);
