# Zeluxi Code Cleanup Audit

Base branch: `main`
Base commit: `98aa29f538eee8f9f937d365205d6445bcc588c5`
Working branch: `audit/remove-dead-code-2026-10`

## Safety rules

- Do not delete code only because a name looks old or duplicated.
- Preserve Next.js route adapters that delegate to shared handlers; they are not duplicate endpoints by themselves.
- Preserve tests that are wired into `npm test`; remove a test only if it is proven obsolete and replaced.
- Preserve SQL migrations, production docs, attribution files, PWA assets, and generated framework files unless a concrete runtime/build reference check proves removal is safe.
- Do not touch `main` or merge cleanup until build, typecheck, tests, route checks, and a focused production regression checklist pass.

## Findings from the first source review

| ID | Area | Finding | Classification | Action |
|---|---|---|---|---|
| UI-01 | `src/App.tsx`, `src/components/storefront/ProductGrid.tsx` | Featured products are not excluded from the All Products list, so the same products can appear in both homepage sections. | Confirmed behavior overlap; not dead code | Fix filtering separately from deletion; test featured and catalog lists. |
| UI-02 | `src/components/layout/Footer.tsx` | Privacy policy and Terms of service were shown in both Customer Care and the bottom Legal area. | Confirmed visible duplicate links | **Changed on audit branch:** removed the two Customer Care copies; bottom Legal links remain. Needs build/UI regression validation. |
| UI-03 | `src/components/layout/Navbar.tsx`, `src/components/layout/MobileBottomNav.tsx`, `src/App.tsx` | Navbar contains its own mobile bottom navigation; App.tsx does not import the standalone MobileBottomNav component. | Strong dead-code candidate, still needs full-repository reference check | Do not delete until import/reference check is conclusive and branch build/typecheck pass. |
| API-01 | `api/products.ts` | Product existence/duplicate-ID validation appeared twice in the same write flow, with no state mutation between the two checks. | Confirmed redundant validation block | **Changed on audit branch:** removed the second duplicate three-line validation block; the first check remains before SKU validation. Needs typecheck/test and POST/PATCH regression validation. |
| CHECKOUT-01 | `src/components/checkout/CheckoutModal.tsx` | Coupon handling returns early when a coupon is applied, making a later per-user coupon-limit check unreachable in that flow. | Confirmed unreachable/redundant path | Preserve secure fail-closed behavior; consolidate carefully, do not enable discounts without server-side pricing validation. |
| SHIP-01 | `src/context/StoreContext.tsx`, `src/utils/formatters.ts`, `src/server/orders-handler.ts`, `src/lib/shipping/couriers.ts`, `src/lib/shipping/pathao-booking.ts` | Checkout courier choice and persisted courier provider appear inconsistent; createOrder accepts a courier choice but the request/persisted order defaults to PATHAO. | Functional consistency risk, not merely dead code | Trace the entire order-to-booking flow before changing or removing adapters. |
| PAY-01 | `src/lib/payments/paymentService.ts` | Service explicitly has no live server-side gateway verification and uses process-local idempotency state. `tests/unit/production-safety.test.ts` imports it, but no production call site was established in this pass. | Test-used module; production-use status unresolved, and unsafe to rely on as payment verification | Do not delete while tests depend on it. First decide whether to retain as a fail-closed contract/test seam or relocate/replace the tests. Never use it to mark customer payments as paid. |
| BRAND-01 | `src/components/common/StoreBrandMark.tsx`, Navbar, Footer | Brand markup is implemented in more than one place. | Maintainability duplication; not proven to be a visual duplicate | Refactor only if it preserves each surface's layout and CMS settings. |
| ACCOUNT-01 | `src/components/account/CustomerAccountView.tsx` | Similar profile/address form markup appears in more than one section. | Possible markup duplication; likely different views/tabs | Check rendering conditions before refactoring. |
| ROUTE-01 | `app/api/*/route.ts` and `api/*.ts` | Some App Router route files delegate to shared handlers. | Intentional adapter architecture unless proven otherwise | Keep adapters; do not delete based on matching endpoint names. |
| PWA-01 | `app/api/brand/*` and `public/*` | Dynamic brand icon/manifest routes coexist with static PWA assets. | Could be fallback/compatibility assets | Check metadata references, manifest usage and service-worker behavior before removing any assets. |
| TEST-01 | `tests/unit/*.test.ts` | Unit tests are included by the package test script. | Not dead by default | Keep all tests until coverage/redundancy is assessed; never delete tests just to reduce file count. |
| LOG-01 | Repository tree | No standalone log files or obvious log directory appeared in the tracked file tree. GitHub code-search responses were incomplete, so they cannot prove there are no `console.log`/debug statements. | No tracked log files identified in tree inventory; source logging audit still open | Scan tracked source files directly and distinguish temporary debug output from intentional server-side error reporting. |

## Repository inventory

The recursive Git tree at the base commit contains 156 tracked files. The tracked inventory includes application source, API handlers, Next.js route adapters, Supabase migrations/schema, documentation, PWA assets, and 14 unit test files. No standalone `logs/` directory or obvious tracked runtime log files appeared in the inventory. `tests/unit/production-safety.test.ts` explicitly imports `PaymentService`, `SecurityService`, `getCourierProvider`, and `EmailService`, so those modules must not be deleted solely because they appear unused by a quick source search.

## Changes made on the audit branch so far

1. `api/products.ts`: removed only the second, repeated product existence/duplicate-ID validation block. The original validation remains in place before SKU uniqueness checks.
2. `src/components/layout/Footer.tsx`: removed the duplicate Privacy policy and Terms of service links from Customer Care; the bottom Legal links remain.

No files/folders or test files have been deleted yet. The old `MobileBottomNav.tsx` is still a candidate, not a confirmed deletion. `paymentService.ts` is imported by a unit test and must not be deleted without redesigning that test contract. Reviewed the 14 unit test files at the title/contract level: they cover Bangladesh address data, catalog API contracts, Cloudinary URLs, hero CMS, Next.js migration constraints, order numbers/orders/pricing, production contract/hardening/safety, rich text, Supabase auth, and validation. Some safety tests overlap in theme but cover distinct fail-closed behaviors; no test file is confirmed obsolete.

## Validation status

The audit is still in progress, not a claim that every line of all source files has been reviewed. Source files and line counts have been inspected for the core storefront, footer/navigation, checkout, product/content API, auth/store contexts, order handler, courier adapters, address validation, invoice builder, admin dashboard, image component, app layout, and selected tests. Debug-marker scan so far found no obvious `console.log`, `debugger`, TODO/FIXME markers in the sampled files; several `console.warn`/`console.error` calls in auth, data loading, checkout and invoice export appear to be intentional operational reporting and are not to be removed blindly. The unreachable coupon-validation block and its now-unused store binding were removed on the audit branch.

This environment could not clone the repository to run local commands because GitHub DNS/network access is unavailable to the shell. The latest Vercel status for the audit branch was **pending** when checked. Therefore `npm run typecheck`, `npm test`, `npm run build`, and browser-level UI checks have **not** been confirmed here. Continue full reference tracing and review the remaining files before deleting candidate modules or test folders. Do not merge to `main` until the branch can pass those checks and the order/checkout regression checklist.
