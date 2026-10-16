# Zeluxi

Zeluxi is a Bangladesh-focused single-store e-commerce application using **Next.js App Router, React, TypeScript, Tailwind CSS 4, Supabase Auth/PostgreSQL, and Zod**.

> **Launch status: not production-ready yet.** This migration moves the existing UI into a Next.js application and adapts the existing protected API handlers to App Router route handlers. The current storefront and Admin state still contain browser-storage-backed flows; persistent catalog/admin CRUD and real payment/courier integrations must be completed and verified before live sales.

## Application architecture

- Next.js App Router: root layout, page metadata, security headers and server route handlers.
- Existing React storefront/Admin UI is preserved as a client-rendered application during migration.
- Supabase Auth handles user sessions, email OTP and Google/Facebook OAuth.
- POST /api/orders validates a verified Supabase user and delegates atomic COD order creation to the restricted Supabase database function.
- /api/products serves published products and protects mutations using trusted app_metadata.role.
- Tailwind CSS 4 is processed by the PostCSS integration.
- PWA service-worker registration is production-only. The worker never caches API/auth responses or dynamic navigation HTML.

## Environment variables

Copy .env.example to .env.local for local development. Set the same values in the Vercel project for the correct deployment environment.

- NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY: browser Supabase client configuration.
- SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY: server-side API configuration. Service-role keys must never use NEXT_PUBLIC_.
- NEXT_PUBLIC_SITE_URL: canonical site origin used for metadata and non-browser auth redirects.
- SHIPPING_DHAKA_FEE, SHIPPING_OUTSIDE_DHAKA_FEE, FREE_SHIPPING_THRESHOLD: required server-calculated COD delivery policy.

Never commit .env.local or put service-role, payment, courier, email, or Telegram secrets into browser code.

## Local development and validation

Requirements: Node.js 22+ and npm.

    npm install
    cp .env.example .env.local
    npm run dev

Validation:

    npm run lint
    npm test
    npm run build
    npm start

## Required before live launch

1. Connect storefront product/category/admin settings/order management to persistent database CRUD; localStorage is not shared business data or trusted inventory.
2. Complete server-side authorization for every admin mutation and enforce database RLS.
3. Implement and sandbox-test payment initiation, signed webhooks, idempotency, refunds and reconciliation before enabling online payments.
4. Implement and sandbox-test Pathao/Steadfast booking, cancellation, status webhooks and tracking using approved merchant credentials.
5. Configure Supabase redirect URLs, email OTP templates, expiry, resend/rate limits and trusted admin provisioning.
6. Verify the real domain, shipping fees, free-shipping policy, catalog, legal pages, backups and monitoring.
7. Run CI and real browser/mobile end-to-end tests against configured Supabase and provider sandboxes.

A successful Next.js build is not proof that orders, payments, admin access, courier booking, email or tracking are production-ready.
