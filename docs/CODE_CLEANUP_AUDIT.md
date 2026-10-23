# Zeluxi Code Cleanup Audit

Base branch: `main`
Base commit: `98aa29f538eee8f9f937d365205d6445bcc588c5`
Working branch: `audit/remove-dead-code-2026-10`

## Safety rules

- Do not delete code only because a name looks old or duplicated.
- Preserve Next.js route adapters that delegate to shared handlers; matching endpoint names alone do not make them duplicates.
- Preserve tests wired into `npm test`; remove tests only if proven obsolete and replaced.
- Preserve SQL migrations, production docs, attribution files, PWA assets, and generated framework files unless concrete reference checks prove removal is safe.
- Keep all cleanup on this branch until the new branch head passes CI and the relevant preview/regression checks.

## Confirmed changes on this branch

1. `api/products.ts`: removed a second copy of product existence/duplicate-ID error checks after the SKU uniqueness check. The same database lookup and all three checks remain before SKU validation; the removal does not remove the original validation.
2. `src/components/layout/MobileBottomNav.tsx`: deleted after reviewing the tracked TypeScript/TSX application files and unit tests for references. The active responsive mobile navigation is implemented inside `src/components/layout/Navbar.tsx`; the standalone component had no remaining imports/usages in the reviewed source/test set.
3. `docs/CODE_CLEANUP_AUDIT.md`: records the findings and decisions.

No test files, migrations, API route adapters, PWA assets, or production data/schema files have been deleted. The Footer and checkout coupon observations below were not changed by this PR; they are recorded as findings only.

## Findings and decisions

| ID | Area | Finding | Classification | Decision |
|---|---|---|---|---|
| UI-01 | `src/App.tsx`, `src/components/storefront/ProductGrid.tsx` | Featured products can also appear in the home page's All Products section. | Visible product-list overlap; not dead code | Keep as a separate behavior change until the desired catalog semantics and regression tests are defined. |
| UI-02 | `src/components/layout/Footer.tsx` | Privacy/Terms links should be checked for duplication between Customer Care and Legal footer sections. | UI duplication candidate | Not changed in this PR; verify the current rendered footer before modifying further. |
| UI-03 | `src/components/layout/Navbar.tsx`, `src/components/layout/MobileBottomNav.tsx` | Navbar owns the active responsive mobile navigation; standalone component had no usages in the reviewed application/test source. | Confirmed unused component in reviewed source | Deleted the standalone component on this branch. |
| API-01 | `api/products.ts` | Product existence/duplicate-ID validation was repeated after SKU validation. | Confirmed redundant validation | Removed the repeated checks only; original validation remains before SKU validation. |
| CHECKOUT-01 | `src/components/checkout/CheckoutModal.tsx`, `src/context/StoreContext.tsx` | Coupon flow and per-user coupon-use validation need a control-flow review. | Potential unreachable logic; security-sensitive | No checkout logic changed in this PR. Keep coupon discounts fail-closed unless server-side pricing and eligibility validation are proven. |
| SHIP-01 | `src/context/StoreContext.tsx`, `src/utils/formatters.ts`, `src/server/orders-handler.ts`, `src/lib/shipping/couriers.ts`, `src/lib/shipping/pathao-booking.ts` | Checkout courier choice, stored provider, and booking flow may not align in every path. | Functional consistency risk | Do not remove adapters; trace order creation through admin booking and persisted shipment state before changing. |
| PAY-01 | `src/lib/payments/paymentService.ts` | Uses process-local idempotency state and explicitly refuses unconfigured online gateway verification. Unit tests import it. | Test-used module; not safe as live gateway verification | Retain until its test contract and production payment flow are deliberately redesigned. Never treat customer-supplied TrxID as verified payment. |
| BRAND-01 | `src/components/common/StoreBrandMark.tsx`, Navbar, Footer | Brand markup is implemented in multiple surfaces. | Maintainability duplication, not proven visual duplication | Do not refactor until CMS behavior and each layout's distinct requirements are preserved. |
| ACCOUNT-01 | `src/components/account/CustomerAccountView.tsx` | Similar profile/address form markup appears in different sections. | Possible duplication | Check visibility conditions and shared validation before refactoring. |
| ROUTE-01 | `app/api/*/route.ts`, `api/*.ts` | Some App Router files delegate to shared API handlers. | Intentional adapter architecture | Keep route adapters. |
| PWA-01 | `app/api/brand/*`, `app/layout.tsx`, `public/*` | Dynamic brand icon/manifest routes coexist with static PWA assets and a service worker. | Compatibility/fallback risk | Keep until metadata, manifest, and service-worker references are fully validated. |
| TEST-01 | `tests/unit/*.test.ts` | Fourteen unit test files are wired into `npm test`; some print progress to stdout. | Active tests, not debug logging by default | No test file removed. Test `console.log` progress output is intentional unless proven otherwise. |
| LOG-01 | Tracked source | Marker scans found no obvious `console.log`, `console.debug`, `debugger`, TODO or FIXME in the sampled application source. Several auth/data-loading/error paths use `console.warn`/`console.error` intentionally. | No confirmed production debug log cleanup candidate yet | Do not remove operational error reporting blindly. Continue review for remaining files. |

## Repository inventory and test coverage

The recursive Git tree at the audited head contains 157 tracked files. It includes app/source code, API handlers and route adapters, Supabase migrations/schema, documentation, PWA assets, and 14 unit tests. No standalone tracked `logs/` directory or obvious runtime log files were found. The test suite covers Bangladesh address data, catalog API contracts, Cloudinary, hero banners, Next migration constraints, order numbers/orders/pricing, production contracts/hardening/safety, rich text, Supabase auth, and validation. The production hardening and safety tests overlap in theme but exercise distinct fail-closed contracts; no test file was proven obsolete.

## Validation status

At commit `3598a2e79359662524e5082a29eb564083c47e7b`, GitHub Actions completed successfully: TypeScript lint/typecheck, unit tests, and Next.js production build. Vercel also reported a completed deployment for that commit. The standalone navigation component was deleted afterward in commit `53d3dc515b5289a5bc59f7980585f85efdd2b736`, so those successful checks do not validate the current head. Re-check CI and Vercel on the latest head before considering the PR ready.

This is a careful cleanup pass, not a claim that every line of every tracked file has received a full manual A-to-Z audit. The source-reference and marker scans covered the main app, components, contexts, utilities, API handlers, route adapters, and unit tests. A live browser review and order/checkout regression test have not been performed here. Do not merge to `main` until the latest head passes CI and the production-sensitive flows have been checked.
