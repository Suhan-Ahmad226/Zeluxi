# Zeluxi

Zeluxi is a Bangladesh-focused single-store e-commerce application built with **Next.js App Router, React 19, TypeScript, Tailwind CSS 4, Supabase Auth/PostgreSQL, and Zod**. It includes a storefront, product detail pages, customer account flows, an admin interface, database-backed API handlers, Cloudinary media helpers, and a Pathao-specific server-side integration.

> [!IMPORTANT]
> **Do not treat a successful deployment or build as proof that every commerce flow is production-ready.** This repository has working foundations and safety checks, but several integrations are deliberately disabled or incomplete. Review the [production-readiness audit](./PRODUCTION_READINESS_AUDIT.md), configure the database, and complete the launch checklist below before accepting live orders.

## Contents

- [Architecture](#architecture)
- [Repository layout](#repository-layout)
- [Current implementation status](#current-implementation-status)
- [Requirements and local setup](#requirements-and-local-setup)
- [Environment variables](#environment-variables)
- [Database and migrations](#database-and-migrations)
- [Development checks](#development-checks)
- [Performance notes](#performance-notes)
- [Production launch checklist](#production-launch-checklist)
- [Security notes](#security-notes)

## Architecture

- **Application:** Next.js App Router and React. The existing storefront/admin experience is currently mounted through a client-rendered application shell while route-level pages provide entry points and product metadata.
- **Authentication:** Supabase Auth supports session-based identity and the configured email OTP/OAuth flows. Privileged API handlers must verify the bearer token and use trusted app_metadata.role for admin authorization.
- **Database:** Supabase PostgreSQL. SQL migrations define profile security, commerce/order functions, persistent catalog/content, media storage, SKU integrity, courier shipment records, and product-variant/invoice snapshots.
- **Catalog API:** /api/products serves published catalog pages and exposes authenticated admin CRUD. Public results intentionally omit procurement cost fields. Public catalog requests support limit and offset.
- **Content API:** /api/content reads and updates store content through the database-backed handler, including storefront CMS, settings, categories, pages, and coupons.
- **Order API:** /api/orders validates the authenticated customer and checkout payload, requires an idempotency key, and delegates order creation and stock/pricing checks to the database RPC. Checkout fails closed when the required variant/invoice schema is missing.
- **Courier:** The admin courier API and src/lib/shipping/pathao-server.ts contain a server-side Pathao integration path. The generic courier adapter in src/lib/shipping/couriers.ts remains a fail-closed placeholder for Pathao, Steadfast, and in-house shipping. Do not assume every courier UI/action is connected to a live provider.
- **Media:** Cloudinary server-side signing/deletion routes and image URL helpers support product media. Keep Cloudinary secrets server-only.
- **PWA:** Service-worker registration is production-only. The worker must not cache authentication/API responses or dynamic navigation HTML.
- **Styling:** Tailwind CSS 4 is processed through the PostCSS integration.

## Repository layout

| Path | Purpose |
| --- | --- |
| app/ | Next.js pages, metadata, not-found UI, and App Router API route wrappers |
| app/api/ | API routes for products, orders, content, Cloudinary media, and admin courier actions |
| api/ | Shared API handler implementations for content, orders, and products |
| src/components/ | Storefront, admin, account, tracking, and reusable UI components |
| src/context/ | Authentication and store state/context |
| src/lib/ | Supabase, validation, pricing, Cloudinary, payments, courier, email, notifications, and cache helpers |
| src/types/ | Shared TypeScript data types |
| supabase/migrations/ | Ordered SQL migrations |
| tests/unit/ | Offline unit/contract/safety tests |
| .env.example | Environment-variable template with placeholders |
| SUPABASE_SETUP.md | Supabase OTP/OAuth dashboard setup guide |
| PRODUCTION_READINESS_AUDIT.md | Historical security and production-readiness review |

## Current implementation status

The following is based on source inspection. It is not a live-provider test or proof that the migrations have been applied to a particular Supabase project.

| Area | Current status | Important caveat |
| --- | --- | --- |
| Storefront and responsive UI | Implemented in React components | Must still be checked in real browsers and on small/mobile screens |
| Supabase authentication | Integrated | Configure redirect URLs, OTP templates, OAuth providers, and admin provisioning in Supabase |
| Persistent product catalog | API and database migrations exist | Admin catalog retrieval and SKU uniqueness checks currently scan broad result sets; review scalability and enforce uniqueness in PostgreSQL |
| Store content/CMS | Database-backed API exists | Verify each CMS control persists and rehydrates correctly in the target database |
| Customer orders | Protected API and database RPC exist | Checkout is intentionally unavailable if required variant/invoice columns are not present |
| Invoice snapshots | SQL migrations add order-time product details | Apply migrations and test historical invoices after the live product changes |
| Stock and pricing | Server/database-side validation exists | Test concurrent purchases, variant stock, cancellation, returns, and refund behavior against a real database |
| COD | Order API requires shipping-fee configuration | Confirm the business shipping policy and order status flow before launch |
| Online payments | **Not ready** | bKash/Nagad/Rocket/SSLCommerz must remain disabled until a real server-side gateway, verified webhook/callback, idempotency, refund, and reconciliation flow exists |
| Pathao | Server-side integration code exists | Requires merchant credentials, correct store/area identifiers, applied migrations, sandbox verification, and production testing; this repository does not establish that a live booking succeeded |
| Steadfast / in-house courier | **Not ready** | Generic provider adapter explicitly fails closed; implement and test before enabling these options |
| Email delivery | **Not ready** | HTML template generation exists, but SMTP/Resend/SendGrid delivery is disabled |
| Telegram notifications | **Not ready** | Client-side delivery is disabled; add a secure server-side sender if required |
| Distributed cache/rate limiting | **Not ready** | src/lib/cache/redis.ts is an in-memory placeholder, not a Redis connection or distributed production rate limiter |
| Automated tests | Unit and contract tests exist | They do not replace E2E, browser, database migration, payment sandbox, or courier sandbox tests |
| Deployment | Vercel/Next.js configuration exists | A green deployment status does not validate external services or all customer journeys |

### Known performance/scalability follow-ups

- The product detail component can search the catalog in batches of 48 when a product is not already in the loaded list. For a large catalog, add a server-side lookup by slug so a detail page does not need to fetch successive catalog pages.
- Storefront state initially loads a small product page and later requests more products. Keep pagination and avoid fetching the full catalog on the first render.
- The admin products API currently returns the full admin catalog, and its SKU conflict check selects existing product IDs/SKUs into application memory. For larger catalogs, paginate admin reads and use a database unique index/constraint for normalized SKU uniqueness.
- The orders GET handler limits its returned list. Add cursor/page pagination plus status/date/order-number filters so older orders remain accessible as order volume grows.
- The cache helper is in-memory and per-process. Do not rely on it for shared cache consistency, distributed rate limiting, or serverless coordination.
- Optimize Cloudinary image widths/formats and lazy-load below-the-fold media. Measure Core Web Vitals on real mobile devices before setting performance claims.

## Requirements and local setup

Requirements: **Node.js 22+** and npm.

1. Clone the repository and enter the project directory.
2. Copy .env.example to .env.local.
3. Fill in the required values from one Supabase project and any services you are actively testing.
4. Install dependencies and start the development server.

    git clone https://github.com/Suhan-Ahmad226/Zeluxi.git
    cd Zeluxi
    cp .env.example .env.local
    npm install
    npm run dev

Open [http://localhost:3000](http://localhost:3000).

This repository does not currently include a committed npm lockfile, so CI uses npm install. For reproducible dependency installs, generate and commit the appropriate lockfile after verifying it with the team workflow, then consider switching CI to npm ci.

## Environment variables

Use .env.example as the source of truth for the current variable names. Keep local secrets in .env.local and configure deployment secrets in Vercel or the relevant GitHub Actions secret store. Never commit real credentials.

| Variable | Purpose | Required when |
| --- | --- | --- |
| NODE_ENV | Runtime environment; normally managed by Next.js/Vercel | Usually set automatically |
| NEXT_PUBLIC_SITE_URL | Canonical site origin and auth redirect fallback | All deployed environments |
| NEXT_PUBLIC_SUPABASE_URL | Browser-safe Supabase project URL | Supabase client is used |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Browser-safe Supabase anon/publishable key | Supabase client is used |
| SUPABASE_URL | Server-side Supabase project URL; may fall back to public URL | Server APIs |
| SUPABASE_ANON_KEY | Server-side anon key; may fall back to public key | Server APIs using Supabase Auth |
| SUPABASE_SERVICE_ROLE_KEY | Privileged server-side database/API access | Admin CRUD and other privileged server routes |
| SHIPPING_DHAKA_FEE | Dhaka COD shipping fee in BDT | Creating orders |
| SHIPPING_OUTSIDE_DHAKA_FEE | Outside-Dhaka COD shipping fee in BDT | Creating orders |
| FREE_SHIPPING_THRESHOLD | Free-shipping threshold in BDT; must be positive | Creating orders |
| CLOUDINARY_CLOUD_NAME | Cloudinary cloud identifier | Cloudinary media features |
| CLOUDINARY_API_KEY | Server-side Cloudinary API key | Signed media operations |
| CLOUDINARY_API_SECRET | Server-side Cloudinary secret | Signed media operations |
| PATHAO_MODE | sandbox or production mode | Pathao integration |
| PATHAO_BASE_URL | Pathao API base URL | Pathao integration |
| PATHAO_CLIENT_ID | Pathao merchant client ID | Pathao integration |
| PATHAO_CLIENT_SECRET | Pathao merchant client secret | Pathao integration |
| PATHAO_USERNAME | Pathao merchant username | Pathao integration |
| PATHAO_PASSWORD | Pathao merchant password | Pathao integration |
| PATHAO_STORE_ID | Approved Pathao store ID | Pathao booking |
| PATHAO_DEFAULT_ITEM_WEIGHT_KG | Fallback per-item parcel weight | Pathao booking when product weight is absent |
| PATHAO_TOKEN_ENCRYPTION_KEY | Random 32-byte key (base64 or 64 hex characters) used for token encryption | Pathao token storage |
| SUPABASE_DB_URL | Database connection string for the Supabase migration workflow | GitHub Actions migration job only; store as an Actions secret, not in Vercel |

Notes:

- All Supabase values must belong to the **same project**.
- Never prefix service-role keys, Cloudinary secrets, Pathao credentials, or database connection strings with NEXT_PUBLIC_.
- Online payment gateway variables are intentionally not listed as active configuration because real gateway verification is not implemented.
- Keep Pathao in sandbox mode until merchant access and the complete flow have been tested.
- Do not add VITE_* variables to this Next.js app.

## Database and migrations

The ordered migrations currently in supabase/migrations/ are:

1. 20261016000000_profiles.sql — profile and role security.
2. 20261016000100_production_commerce.sql — core commerce/order schema and database operations.
3. 20261016000200_persistent_catalog.sql — persistent product catalog.
4. 20261017000000_store_content.sql — persistent storefront content/settings.
5. 20261017000100_product_image_storage.sql — product media storage support.
6. 20261017010000_zelux_products_storage.sql — product storage/schema adjustments.
7. 20261017020000_product_sku_integrity.sql — SKU integrity constraints.
8. 20261018000000_pathao_courier.sql — courier shipment persistence.
9. 20261019000000_variant_order_invoice.sql — variant-aware order and invoice data.
10. 20261019010000_invoice_product_detail_snapshots.sql — order-time product detail snapshots for invoices.

**Important:** migration files existing in Git do not prove they have been applied to your live Supabase project. Review each migration, take a backup, test against a non-production project, then verify the schema and RLS policies after applying.

The workflow .github/workflows/supabase-migrations.yml runs on pushes to main that touch migration/config files, or via manual dispatch. It requires the GitHub Actions secret SUPABASE_DB_URL and runs supabase db push. Treat this as a database-changing production operation: protect main, review migrations, and ensure the secret points to the intended database before triggering it.

For Supabase dashboard settings, email OTP templates, OAuth providers, and redirect URLs, see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md).

## Development checks

    npm run lint       # TypeScript check (tsc --noEmit)
    npm run typecheck  # TypeScript check (tsc --noEmit)
    npm test           # Offline unit/contract/safety tests
    npm run build      # Next.js production build
    npm start          # Serve the production build locally

The GitHub Actions workflow runs install, lint/typecheck, unit tests, and production build on pushes and pull requests. Run the checks locally before opening a PR.

These checks do **not** by themselves verify live Supabase migrations, OAuth/email delivery, online payment gateways, courier sandbox calls, real tracking, mobile browser behavior, or production Core Web Vitals. Add/run end-to-end tests for those flows before launch.

## Performance notes

Targets for real-user measurements:

- **LCP:** 2.5 seconds or less.
- **INP:** 200 milliseconds or less.
- **CLS:** 0.1 or less.

These are goals, not measured results for this repository. Measure with Lighthouse and real mobile devices; profile the initial route, product detail, cart, checkout, and admin catalog separately. Prefer direct server-side product lookup by slug, paginated catalog/order queries, optimized Cloudinary images, minimal client JavaScript, and accessible loading/empty/error states.

## Production launch checklist

- [ ] Apply and verify all Supabase migrations on the intended project; inspect RLS and database function permissions.
- [ ] Configure auth email OTP templates, expiry, resend/rate limits, OAuth providers, site URL, and redirect allowlists.
- [ ] Provision the admin role securely through trusted server-side tooling; never allow users to self-promote through profile metadata.
- [ ] Verify catalog, product variants, SKU uniqueness, image upload/delete, categories, pages, announcement bar, Appearance/CMS, and Store Settings persist across sessions/devices.
- [ ] Test server-side order totals, shipping policy, coupon rules, idempotency, concurrent stock updates, variant selection, invoice snapshots, and historical invoices.
- [ ] Implement and sandbox-test each online payment gateway, signed webhook/callback verification, duplicate-event handling, refunds, and reconciliation before enabling it.
- [ ] Verify Pathao credentials, token encryption, store/city/zone/area identifiers, shipment booking, duplicate/retry recovery, status synchronization, and cancellation limitations with the actual merchant API. Do not enable Steadfast or in-house delivery until implemented.
- [ ] Add real server-side email and Telegram notification providers if those notifications are part of the launch requirements.
- [ ] Configure backups, monitoring, error reporting, alerting, privacy/legal/return policies, support details, and the correct domain.
- [ ] Run end-to-end tests on mobile and desktop, keyboard/accessibility checks, Lighthouse/Core Web Vitals measurements, and production smoke tests.
- [ ] Verify rollback procedures for both application deployment and database migrations.

## Security notes

- Never commit .env.local, credentials, service-role keys, Pathao secrets, Cloudinary secrets, or SUPABASE_DB_URL.
- Public Supabase keys are not substitutes for RLS. Check every table policy and security-definer function.
- Privileged routes must authenticate the user server-side and authorize using trusted role data.
- Treat all browser input, client-side state, prices, coupon values, and transaction references as untrusted.
- Do not mark a payment as paid based only on a customer-supplied reference or client callback.
- Do not invent consignment IDs, tracking events, notification success, or delivery status. Fail closed when a provider is unavailable.
- Never cache private order, account, authentication, or admin API responses in a public cache/service worker.

## Further documentation

- [Supabase setup](./SUPABASE_SETUP.md)
- [Production readiness audit](./PRODUCTION_READINESS_AUDIT.md)
- [Environment template](./.env.example)
