create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do update set public = excluded.public;

create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.job_seekers(id) on delete cascade,
  title text not null default '새 이력서',
  memo text,
  target_role text,
  is_default boolean not null default false,
  source_type text not null default 'manual' check (source_type in ('manual', 'upload')),
  uploaded_file_path text,
  uploaded_file_name text,
  uploaded_file_type text,
  uploaded_file_size integer,
  basics jsonb not null default '{}'::jsonb,
  job_conditions jsonb not null default '{}'::jsonb,
  educations jsonb not null default '[]'::jsonb,
  experiences jsonb not null default '[]'::jsonb,
  skills text[] not null default '{}',
  tools text[] not null default '{}',
  portfolios jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists resumes_user_updated_idx
on public.resumes (user_id, updated_at desc);

create unique index if not exists resumes_one_default_per_user_idx
on public.resumes (user_id)
where is_default;

drop trigger if exists resumes_set_updated_at on public.resumes;
create trigger resumes_set_updated_at
before update on public.resumes
for each row
execute function public.set_updated_at();

alter table public.resumes enable row level security;

drop policy if exists "Users can manage own resumes" on public.resumes;
create policy "Users can manage own resumes"
on public.resumes
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant select, insert, update, delete on public.resumes to authenticated;
grant all on public.resumes to service_role;

drop policy if exists "Users can read own resume files" on storage.objects;
create policy "Users can read own resume files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'resumes'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can upload own resume files" on storage.objects;
create policy "Users can upload own resume files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'resumes'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can update own resume files" on storage.objects;
create policy "Users can update own resume files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'resumes'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'resumes'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can delete own resume files" on storage.objects;
create policy "Users can delete own resume files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'resumes'
  and auth.uid()::text = (storage.foldername(name))[1]
);
