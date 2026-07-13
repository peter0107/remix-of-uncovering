-- 관리자 카드 배경/기업 로고 업로드용 Storage RLS 정책을 다시 보장한다.
-- 업로드 경로는 {로그인 사용자 UUID}/{logo|cardImage}/파일명 형식을 사용한다.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'simulation-card-assets',
  'simulation-card-assets',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Simulation card assets are publicly readable" on storage.objects;
create policy "Simulation card assets are publicly readable"
on storage.objects
for select
using (bucket_id = 'simulation-card-assets');

drop policy if exists "Users upload own simulation card assets" on storage.objects;
create policy "Users upload own simulation card assets"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'simulation-card-assets'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users update own simulation card assets" on storage.objects;
create policy "Users update own simulation card assets"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'simulation-card-assets'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'simulation-card-assets'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users delete own simulation card assets" on storage.objects;
create policy "Users delete own simulation card assets"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'simulation-card-assets'
  and auth.uid()::text = (storage.foldername(name))[1]
);
