# Production Readiness Audit — 2026-10-15

## Scope and method

Historical snapshot of the pre-migration source reviewed on 2026-10-15. The migration to Next.js App Router is tracked separately; this document records earlier production-readiness findings and is not a verification of the migrated build. This is a source-code review, not a live-browser, deployed-site, provider-sandbox, or database migration test.

## Confirmed blockers on the inspected source

- At the time of this audit, the app was a Vite + React SPA, not a Next.js server application. The migration adds Next.js App Router entrypoints, but `StoreContext` still persists business state in browser localStorage; shared server-side CRUD is not wired for products, inventory, orders, customers, coupons, reviews, or admin settings.
- Demo customer/admin login and a failed-login fallback that granted a demo admin profile existed in `AuthContext`.
- Auth state could be initialized from cached profile data without proving a valid Supabase session.
- The Supabase project URL/public key were hardcoded in the client module, and configuration detection therefore could not reliably detect missing deployment variables.
- The Supabase profile trigger promoted users based on a specific email or user-editable metadata. The profile update policy did not protect the role column from self-promotion.
- `PaymentService` manufactured successful PAID results for bKash/Nagad/Rocket/SSLCommerz from a customer-provided transaction reference, without calling a gateway.
- `StoreContext.createOrder` marked non-COD orders PAID immediately.
- Pathao and Steadfast courier adapters generated fabricated consignment/tracking identifiers and mock tracking events rather than calling courier APIs. `IN_HOUSE` was routed to Pathao by the factory.
- Webhook signature verification compared a supplied signature with itself.
- The Telegram module contained a bot token in browser source and returned success without sending a Telegram request.
- The Supabase auth test suite embedded credentials for a separate Supabase project and made live auth/resend calls.
- The GitHub Actions workflow used `npm ci` despite no committed `package-lock.json` being present in the inspected repository tree.
- The Prisma schema and seed file did not mean that the client-side store was using persistent database CRUD.

## Changes made on this branch

- Removed demo login buttons and bypasses; no default customer profile is considered authenticated.
- Admin UI role mapping now reads trusted `app_metadata.role`, not email matching or user-editable `user_metadata.role`.
- Removed seeded demo products, customers, orders, coupons, reviews, and fake courier history from the initial state. Bumped the local state namespace so prior V1 browser demo data is not reloaded.
- Required explicit Supabase environment variables instead of embedding a project URL/key in the client source.
- Changed online payment verification to fail closed until a real server-side gateway verifier exists; order creation keeps payment status UNPAID until authorized verification.
- Changed courier booking/cancellation/tracking adapters to fail closed instead of inventing successful bookings or live tracking.
- Changed webhook verification to reject until a real server-side HMAC verifier is implemented.
- Removed the Telegram bot token from browser code and disabled fake-success notification behavior.
- Removed fake-success email dispatch behavior, added HTML escaping for email-template data, and documented that a real server-side email provider adapter is still required.
- Replaced live Supabase integration tests with offline SDK smoke tests and added tests for fail-closed payment/courier behavior.
- Hardened the Supabase profile SQL: new users always receive CUSTOMER role; client updates cannot modify role/email/id; admin policies use a security-definer role helper.
- Removed the fake seed records and updated project documentation/CI workflow.

## Important limitations after these changes

The baseline reviewed in this historical audit was a **safety hardening step, not a complete production ecommerce backend**. The storefront starts with no products/orders until a real persistence layer is connected; admin changes are still browser-local and not shared across customers/devices. Online payment gateways, real courier APIs, server-side authorization, transactional order/stock persistence, email delivery, Telegram server notifications, and live tracking remain unimplemented. Provider credentials, verified business details, database access, and provider sandbox accounts are required to finish those integrations.

Do not merge/deploy this branch as a claim of full production readiness. Run CI and complete the backend/integration work first.
