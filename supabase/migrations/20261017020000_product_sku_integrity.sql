-- Enforce case-insensitive SKU uniqueness at the database layer.
-- This is additive and does not rewrite or delete product data.
-- If legacy duplicates exist, stop with an actionable error instead of silently changing records.

DO $$
DECLARE
  duplicate_skus TEXT;
BEGIN
  SELECT string_agg(format('%s (%s rows)', sku_key, row_count), ', ')
    INTO duplicate_skus
  FROM (
    SELECT lower(btrim(sku)) AS sku_key, count(*) AS row_count
    FROM public.store_products
    WHERE sku IS NOT NULL AND btrim(sku) <> ''
    GROUP BY lower(btrim(sku))
    HAVING count(*) > 1
    ORDER BY lower(btrim(sku))
    LIMIT 10
  ) AS duplicates;

  IF duplicate_skus IS NOT NULL THEN
    RAISE EXCEPTION
      'Cannot enforce case-insensitive SKU uniqueness. Resolve duplicate store_products SKUs first: %',
      duplicate_skus
      USING ERRCODE = '23505';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS store_products_sku_normalized_unique
  ON public.store_products (lower(btrim(sku)))
  WHERE sku IS NOT NULL AND btrim(sku) <> '';

COMMENT ON INDEX public.store_products_sku_normalized_unique IS
  'Prevents duplicate product SKUs regardless of surrounding whitespace or letter case.';
