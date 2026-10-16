# Zeluxi

Zeluxi is a Bangladesh-focused single-store e-commerce application built with **Next.js App Router, React 19, TypeScript, Tailwind CSS 4, and Supabase Auth**. The storefront experience is preserved while the application shell and API entry points move to Next.js.

> **Launch status: not production-ready yet.** This migration establishes the Next.js runtime and routes, but it does not magically finish the commerce backend. Product/admin state is still largely browser-storage-backed; checkout remains intentionally blocked until the live catalog and order flow are connected and verified. Payment gateway and courier adapters fail closed until real server-side integrations are configured.

## Application architecture

- Next.js App Router application shell and metadata in `app/`.
- Next.js route handlers expose `GET/POST/PATCH/DELETE /api/products` and `POST /api/orders`.
- Existing storefront, customer account, cart, and admin UI components remain in `src/` and are mounted client-side to preserve current interactions during migration.
- Supabase Auth supports email/password, 6-digit email OTP, and Google/Facebook OAuth flows.
- Supabase SQL migrations define the persistent commerce foundation; the UI is not yet fully connected to shared database CRUD.
- Zod validation and unit tests cover core validation and fail-closed payment/courier behavior.

## Security boundaries

- Public browser configuration uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. These are public identifiers, not secrets.
- Never expose `SUPABASE_SERVICE_ROLE_KEY`, payment secrets, courier secrets, SMTP credentials, or Telegram bot tokens in browser code or any `NEXT_PUBLIC_*` variable.
- Admin role assignment must be performed through trusted Supabase `app_metadata`/server-side administration, never an email heuristic or user-editable metadata.
- Customer-entered bKash/Nagad/Rocket transaction references are not payment proof. Online payment stays unverified until authorized gateway verification succeeds.
- Courier adapters fail closed until real server-side booking, cancellation, and tracking APIs are implemented.
- The in-memory cache is not a distributed Redis service or production rate limiter.

## Required before live launch

1. Connect storefront and Admin product/category/settings/order flows to persistent database CRUD.
2. Add server-side authorization for every admin mutation and verify database RLS policies.
3. Implement and sandbox-test payment initiation, signed webhook verification, idempotency, refunds, and reconciliation.
4. Implement and sandbox-test Pathao/Steadfast authentication, store/zone mappings, booking, cancellation, webhooks, and tracking.
5. Configure Supabase public variables, allowed redirect URLs, email OTP templates, expiry/resend/rate limits, and trusted admin provisioning.
6. Set real store policy values for shipping fees/free-shipping threshold and verify catalog, taxes, contact details, and legal pages.
7. Generate and commit a package lockfile, then switch CI to reproducible installation.
8. Run CI, mobile/desktop browser QA, monitoring/backups checks, and end-to-end order tests before enabling live sales.

## Local development

Requirements: Node.js 22+ and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Validation:

```bash
npm run lint
npm test
npm run build
```

A successful build does not prove that checkout, payments, admin access, courier booking, email, or tracking work in production. Do not enable live sales until the required server-side integrations and end-to-end checks are complete.
