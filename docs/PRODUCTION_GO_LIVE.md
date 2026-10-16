# Zeluxi production go-live checklist

The application is Next.js-only. Do not accept real orders until the environment and database checks below pass.

## Required Vercel environment variables

Set these for **Production** (and Preview if you test there):

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase publishable/anon key.
- `SUPABASE_URL` — same project URL, server-side.
- `SUPABASE_ANON_KEY` — anon key for server-side token validation.
- `SUPABASE_SERVICE_ROLE_KEY` — service-role key, server-side only; never prefix with `NEXT_PUBLIC_`.
- `SHIPPING_DHAKA_FEE` — approved server-calculated Dhaka delivery fee in BDT.
- `SHIPPING_OUTSIDE_DHAKA_FEE` — approved server-calculated fee outside Dhaka in BDT.
- `FREE_SHIPPING_THRESHOLD` — approved free-shipping threshold in BDT; must be greater than zero.
- `NEXT_PUBLIC_SITE_URL` — canonical production origin.

Product photo upload uses the public `zelux-products` Supabase Storage bucket. The bucket and its administrator-only write policies are defined in `supabase/migrations/20261017000100_product_image_storage.sql`.

## Apply database migrations

Apply every SQL migration in `supabase/migrations/` in timestamp order to the correct Supabase project before enabling checkout. The GitHub Actions migration workflow requires the repository Actions secret `SUPABASE_DB_URL`; without it, the workflow intentionally fails rather than pretending that the live database was migrated.

## Admin authorization

The product and order administration APIs require the authenticated user's server-managed Supabase `app_metadata.role` to equal `ADMIN` (case-insensitive). Do not rely on editable `user_metadata` for authorization.

## Required acceptance tests

1. Confirm the public catalog endpoint returns the published database products and does not return drafts or procurement costs.
2. Sign in as an administrator; create a product with uploaded photos, reload the page, edit it, publish/unpublish it, and archive it. Confirm each change persists in Supabase.
3. Sign in with a verified customer account; place a COD order. Confirm the order and item snapshots are in `store_orders` / `store_order_items`, stock is reduced once, and retrying the same request does not duplicate it.
4. Sign in as an administrator; load orders and update an order status. Confirm the change survives a page reload.
5. Verify non-admin users cannot use product administration or order administration APIs.
6. Keep bKash/Nagad/Rocket/SSLCommerz and courier booking disabled until their actual server-side payment/courier integrations, credentials, webhook verification, and end-to-end tests are complete.

A successful Vercel build alone is not proof that Supabase credentials are configured or that these acceptance tests have passed.
