-- Public storefront product images with admin-only write access.
-- Existing images are not deleted or migrated by this script.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'zelux-products',
  'zelux-products',
  TRUE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  public = TRUE,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Zelux admins upload product images" ON storage.objects;
CREATE POLICY "Zelux admins upload product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'zelux-products'
  AND UPPER(COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '')) = 'ADMIN'
);

DROP POLICY IF EXISTS "Zelux admins update product images" ON storage.objects;
CREATE POLICY "Zelux admins update product images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'zelux-products'
  AND UPPER(COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '')) = 'ADMIN'
)
WITH CHECK (
  bucket_id = 'zelux-products'
  AND UPPER(COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '')) = 'ADMIN'
);

DROP POLICY IF EXISTS "Zelux admins delete product images" ON storage.objects;
CREATE POLICY "Zelux admins delete product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'zelux-products'
  AND UPPER(COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '')) = 'ADMIN'
);
