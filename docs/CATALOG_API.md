# Persistent catalog API (Phase 1 foundation)

This change adds `GET /api/products` for published catalog items and administrator-only `POST`, `PATCH`, and `DELETE` operations.

## Required setup

1. Apply migrations in order in the intended Supabase project:
   - `202610160001_production_commerce.sql`
   - `202610160002_persistent_catalog.sql`
2. Configure `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` in the server deployment environment. The service-role key must never be prefixed with `VITE_` or bundled into browser code.
3. Grant administrator status only through trusted Supabase `app_metadata.role = "ADMIN"`. Never trust client-editable `user_metadata` or an email-address heuristic.

## API behavior

- `GET /api/products`: public published catalog; procurement `costPrice` is removed from the response.
- `POST /api/products`: creates/upserts a validated product for an authenticated administrator.
- `PATCH /api/products`: updates an existing product for an authenticated administrator.
- `DELETE /api/products?id=...`: archives the product rather than deleting a row referenced by historical orders.

The endpoint derives canonical checkout price and stock fields from dedicated database columns. Product metadata is stored in `product_data`. Row-level security remains enabled on the underlying table.

## Important limitations

This is an API foundation, not a completed storefront/Admin integration or launch certification. The current React StoreContext and Admin UI still use browser storage. Before removing the checkout safety gate, wire the existing product list, admin create/edit/publish/archive forms, category workflow, inventory actions and order-management screens to server APIs; add request rate limiting, audit logs and browser E2E tests; verify RLS and Admin role provisioning against a non-production Supabase project. Do not import localStorage mock records as live catalog data without reviewing each product, price and inventory count.
