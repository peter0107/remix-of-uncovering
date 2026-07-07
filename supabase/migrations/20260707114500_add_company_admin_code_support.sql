alter table public.companies
add column if not exists code text;

alter table public.companies
add column if not exists role_label text;

update public.companies
set code = unique_code
where code is null
   or btrim(code) = '';

update public.companies
set role_label = name
where role_label is null
   or btrim(role_label) = '';

create unique index if not exists companies_code_unique_not_null
on public.companies (code)
where code is not null;
