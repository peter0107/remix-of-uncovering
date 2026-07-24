
drop policy if exists "Users upload own simulation card assets" on storage.objects;
create policy "Authenticated upload simulation card assets"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'simulation-card-assets');

drop policy if exists "Users update own simulation card assets" on storage.objects;
create policy "Authenticated update simulation card assets"
on storage.objects
for update
to authenticated
using (bucket_id = 'simulation-card-assets')
with check (bucket_id = 'simulation-card-assets');

drop policy if exists "Users delete own simulation card assets" on storage.objects;
create policy "Authenticated delete simulation card assets"
on storage.objects
for delete
to authenticated
using (bucket_id = 'simulation-card-assets');
