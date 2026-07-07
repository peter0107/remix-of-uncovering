alter table public.job_seekers
add column if not exists display_name text;

update public.job_seekers
set display_name = split_part(email, '@', 1)
where display_name is null
  and email is not null
  and email <> '';
