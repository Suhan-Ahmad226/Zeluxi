# Zeluxi

Zeluxi is a Bangladesh-focused single-store e-commerce frontend built with Vite, React, TypeScript, Tailwind CSS, and Supabase Auth.

> **Launch status: not production-ready yet.** This repository currently contains a client-side storefront/admin prototype. The storefront state and admin operations still use browser storage; there is not yet a complete server-side commerce API connecting products, inventory, orders, payments, courier bookings, and tracking to a shared database.

## Current implementation

- Vite + React SPA; Vercel serves the generated `dist` directory.
- Supabase Auth client integration for email/password, email OTP, and Google/Facebook OAuth flows.
- Client-side cart, product, coupon, order, and admin UI state.
- Zod input validation and unit tests.
- Courier and payment adapter interfaces, which must not be treated as live integrations until server-side provider implementations are configured and verified.

## Security and integration boundaries

- Demo accounts and seeded demo commerce records have been removed from the production-hardening branch.
- Authentication requires a real Supabase session; cached profile data alone is not considered proof of login.
- Admin role assignment must be performed through trusted Supabase `app_metadata`/server-side administration. Never promote users based on email text or user-editable metadata.
- Customer-entered bKash/Nagad/Rocket transaction references are not payment proof. Online payment stays unverified until an authorized manual review or a real server-side gateway verification succeeds.
- Pathao, Steadfast, and in-house courier adapters fail closed until real server-side booking, cancellation, and tracking APIs are implemented.
- Telegram delivery is disabled in the browser. Bot tokens must be stored only as server-side secrets and notifications must go through an authenticated server endpoint.
- The in-memory cache implementation is not a distributed Redis service or a production rate limiter.

## Required before live launch

1. Implement server-side API routes and persistent database CRUD. The Prisma schema alone does not persist the current React context state.
2. Add server-side authentication and authorization for every admin mutation; enforce database RLS policies.
3. Implement and sandbox-test real payment gateway initiation, callback/webhook signature verification, idempotency, refund handling, and reconciliation.
4. Implement and sandbox-test Pathao/Steadfast OAuth/token handling, valid city/zone/store mappings, booking, cancellation, webhooks, and live tracking.
5. Configure Supabase URL/public key, allowed redirect URLs, email OTP templates, expiry, resend/rate limits, and trusted admin provisioning.
6. Configure verified store contact details, delivery fees, policies, product catalog, taxes, and legal pages.
7. Add a committed npm lockfile and use `npm ci` for reproducible CI builds.
8. Run CI, perform browser-based mobile/desktop QA, verify backups/monitoring, and test end-to-end order flows against provider sandboxes before enabling production credentials.

## Local development

Requirements: Node.js 20+ and npm.

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

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for client authentication. Never place service-role keys, payment secrets, courier secrets, SMTP credentials, or Telegram bot tokens in `VITE_*` variables or browser code.

## Deployment note

A successful static build is not proof that orders, payments, admin access, courier booking, email, or tracking work in production. Do not switch live payments or courier dispatch on until the required server-side integrations and end-to-end checks above are complete.
