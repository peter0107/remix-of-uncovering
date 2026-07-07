update public.job_simulations js
set
  is_public = false,
  deleted_at = coalesce(js.deleted_at, now())
from public.companies c
where js.company_id = c.id
  and c.unique_code = 'BEGINNER-CONTENT-2026'
  and js.id = '940c71e9-af8d-447a-8ce5-342e29ef7981'
  and js.title = '여름 시즌 재고 소진 전략 수립'
  and js.role_label = 'MD·바이어';
