
insert into storage.buckets (id, name, public)
values ('mission-materials', 'mission-materials', true)
on conflict (id) do nothing;

create policy "Mission materials are publicly readable"
on storage.objects for select
using (bucket_id = 'mission-materials');

create policy "Admins upload mission materials"
on storage.objects for insert
to authenticated
with check (bucket_id = 'mission-materials' and public.has_role(auth.uid(), 'admin'::public.app_role));

create policy "Admins update mission materials"
on storage.objects for update
to authenticated
using (bucket_id = 'mission-materials' and public.has_role(auth.uid(), 'admin'::public.app_role));

create policy "Admins delete mission materials"
on storage.objects for delete
to authenticated
using (bucket_id = 'mission-materials' and public.has_role(auth.uid(), 'admin'::public.app_role));
