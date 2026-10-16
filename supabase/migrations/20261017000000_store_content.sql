-- Durable admin-managed storefront content. No business records are seeded.
CREATE TABLE IF NOT EXISTS public.store_content (
  content_key TEXT PRIMARY KEY CHECK (content_key IN ('storefront_cms', 'settings', 'categories', 'pages', 'coupons')),
  content_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.store_content ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated policies: access is through the server API using service role.
REVOKE ALL ON TABLE public.store_content FROM anon, authenticated;
GRANT ALL ON TABLE public.store_content TO service_role;
