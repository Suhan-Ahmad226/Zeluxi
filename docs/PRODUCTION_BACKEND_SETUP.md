# Zeluxi backend setup (required before enabling live checkout)

The application runs on Next.js App Router and is deployed to Vercel. API handlers are exposed through `app/api/`; reusable commerce handler logic remains in `api/`. Never place service-role or provider secrets in browser code or `NEXT_PUBLIC_*` variables.

## 1. Supabase database

1. Open the Supabase project for this store and apply the migrations in order, including `supabase/migrations/202610160001_production_commerce.sql` and `202610160002_persistent_catalog.sql`.
2. In Vercel, set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` for the correct environment. The service-role key must never be exposed to the browser.
3. Set `SHIPPING_DHAKA_FEE`, `SHIPPING_OUTSIDE_DHAKA_FEE`, and `FREE_SHIPPING_THRESHOLD` using the actual approved store policy. The API returns `503` if any are missing or invalid; do not invent prices.
4. Populate `public.store_products` from the approved catalog. The existing admin/catalog UI currently saves products in browser storage, so checkout cannot safely use those records until catalog persistence/synchronization is implemented. Do not seed fake inventory.

## 2. Order API contract

`POST /api/orders` requires a Supabase access token in `Authorization: Bearer <token>`, a unique `Idempotency-Key` (at least 16 characters), verified email, customer address, product IDs, and quantities. The server derives product prices from the database, calculates shipping from server-side environment values, validates stock, and creates the order/decrements inventory atomically through a restricted database function. Only COD is accepted; customer-submitted transaction references are not payment proof.

## 3. Still required before launch

- Persist admin-managed products and catalog changes in the database; never trust browser storage as inventory.
- Add rate limiting and operational alerts for order API failures.
- Add server-side admin role checks and secure order-management endpoints before exposing admin operations.
- Configure and verify the production domain, OAuth redirect URLs, and RLS.
- Add real payment gateway flows and signed webhook/reconciliation before enabling online payment methods.
- Configure approved courier credentials and verify booking/tracking against provider sandbox/live responses.
- Run end-to-end tests with real Supabase/Vercel configuration and test orders before enabling sales.

Until these are complete, checkout remains intentionally blocked. A passing frontend build does not mean the store is ready for live sales.
