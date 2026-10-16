-- Public product image bucket with administrator-only writes.
-- Apply this migration in the linked Supabase project before uploading product photos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'zelux-products',
  'zelux-products',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Zelux product images are publicly readable" on storage.objects;
create policy "Zelux product images are publicly readable"
on storage.objects for select
using (bucket_id = 'zelux-products');

drop policy if exists "Zelux admins upload product images" on storage.objects;
create policy "Zelux admins upload product images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'zelux-products'
  and upper(coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')) = 'ADMIN'
);

drop policy if exists "Zelux admins update product images" on storage.objects;
create policy "Zelux admins update product images"
on storage.objects for update to authenticated
using (
  bucket_id = 'zelux-products'
  and upper(coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')) = 'ADMIN'
)
with check (
  bucket_id = 'zelux-products'
  and upper(coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')) = 'ADMIN'
);

drop policy if exists "Zelux admins delete product images" on storage.objects;
create policy "Zelux admins delete product images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'zelux-products'
  and upper(coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')) = 'ADMIN'
);
