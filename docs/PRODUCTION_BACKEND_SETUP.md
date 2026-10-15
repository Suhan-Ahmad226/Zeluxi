# Zeluxi backend setup (required before enabling live checkout)

The app is a Vite SPA hosted on Vercel. Server-side routes live under `api/`; never put service-role or provider secrets in `VITE_*` variables.

## 1. Supabase database

1. Open the Supabase project for this store and run `supabase/migrations/202610160001_production_commerce.sql` in the SQL Editor.
2. In Vercel, set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` for the correct Production environment. Never expose the service-role key in browser variables.
3. Set `SHIPPING_DHAKA_FEE`, `SHIPPING_OUTSIDE_DHAKA_FEE`, and `FREE_SHIPPING_THRESHOLD` using the actual approved store policy. The API returns `503` if any are missing or invalid; do not invent prices.
4. Populate `public.store_products` from the approved catalog. The existing admin/catalog UI currently saves products in browser storage, so checkout intentionally cannot use those records until catalog persistence/synchronization is implemented. Do not manually seed fake inventory.

## 2. Order API contract

`POST /api/orders` requires a Supabase access token in `Authorization: Bearer <token>`, a unique `Idempotency-Key` (at least 16 characters), verified email, customer address, product IDs and quantities. The server derives product prices from the database, calculates shipping using server-only environment values, validates stock and creates the order/decrements inventory atomically through a restricted database function. Only COD is accepted; customer-submitted TrxIDs are not payment proof.

## 3. Still required before launch

- Persist admin-managed products and catalog changes in the database; never trust localStorage as inventory.
- Add rate limiting/abuse controls and operational alerts for order API failures before accepting meaningful traffic.
- Add server-side admin role checks and secure order-management endpoints before exposing admin operations.
- Configure and verify the actual production domain, OAuth redirect URLs and RLS.
- Add a real payment gateway flow and signed webhook/reconciliation before enabling online payment methods.
- Configure approved courier merchant credentials and verify booking/tracking against provider sandbox/live responses.
- Run end-to-end tests with real Supabase/Vercel configuration and test orders before enabling sales.

Until these are completed, checkout remains intentionally blocked. A passing frontend build does not mean the store is ready for live sales.
