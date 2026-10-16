# Zeluxi backend setup (required before enabling live checkout)

The app uses the Next.js App Router on Vercel. API handlers live under app/api/; shared validation and business logic remains in api/. Never put service-role or provider secrets in NEXT_PUBLIC_* variables.

## 1. Supabase database

1. Open the correct Supabase project and run the checked-in migrations in timestamp order.
2. In Vercel, configure NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY for the correct environment.
3. Set SHIPPING_DHAKA_FEE, SHIPPING_OUTSIDE_DHAKA_FEE, and FREE_SHIPPING_THRESHOLD to the store's approved policy. The order API returns 503 if these are missing or invalid.
4. Populate public.store_products from the approved catalog. The existing admin/catalog UI still contains browser-storage-backed operations, so checkout must remain disabled until those records are persisted and synchronized.

## 2. Order API contract

POST /api/orders requires a Supabase access token in Authorization: Bearer <token>, a unique Idempotency-Key (at least 16 characters), verified email, customer address, product IDs and quantities. The server derives prices from the database, calculates delivery fees from server-only environment values, validates stock, and delegates order creation/stock decrement to the restricted database function. COD is the only supported method; customer-provided transaction IDs are not payment proof.

## 3. Next.js/Vercel deployment

- Use the repository's Next.js framework detection; do not set a static output directory or rewrite every route to an HTML shell.
- Configure NEXT_PUBLIC_SITE_URL to the verified canonical domain and align Supabase OAuth/email redirect allowlists.
- Run npm run lint, npm test, and npm run build before deployment.
- Verify /api/products and /api/orders in a non-production environment before accepting real traffic.

## 4. Still required before launch

- Persist admin-managed products, inventory, settings and all order operations; do not trust localStorage as inventory.
- Add rate limiting and operational alerts for order API failures.
- Add server-side admin authorization for order management and every privileged mutation.
- Implement and sandbox-test a real payment gateway and signed webhook/reconciliation flow.
- Implement and sandbox-test approved courier booking, cancellation, webhook and tracking integrations.
- Test end-to-end flows with real Supabase configuration and provider sandboxes.

Until these are complete, checkout must remain blocked. A passing frontend build does not mean the store is ready for live sales.
