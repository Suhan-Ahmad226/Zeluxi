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
| UI-02 | `src/components/layout/Footer.tsx` | Privacy policy and Terms of service are shown in both Customer Care and the bottom Legal area. | Confirmed visible duplicate links | Keep one intentional legal-link location after checking CMS/page link behavior. |
| UI-03 | `src/components/layout/Navbar.tsx`, `src/components/layout/MobileBottomNav.tsx`, `src/App.tsx` | Navbar contains its own mobile bottom navigation; App.tsx does not import the standalone MobileBottomNav component. | Strong dead-code candidate, still needs full-repository reference check | Do not delete until import/reference check is conclusive and branch build/typecheck pass. |
| API-01 | `api/products.ts` | Product existence/duplicate-ID validation appears twice in the same write flow. | Confirmed redundant validation block | Simplify only after checking POST/PATCH behavior and tests. |
| CHECKOUT-01 | `src/components/checkout/CheckoutModal.tsx` | Coupon handling returns early when a coupon is applied, making a later per-user coupon-limit check unreachable in that flow. | Confirmed unreachable/redundant path | Preserve secure fail-closed behavior; consolidate carefully, do not enable discounts without server-side pricing validation. |
| SHIP-01 | `src/context/StoreContext.tsx`, `src/utils/formatters.ts`, `src/server/orders-handler.ts`, `src/lib/shipping/couriers.ts`, `src/lib/shipping/pathao-booking.ts` | Checkout courier choice and persisted courier provider appear inconsistent; createOrder accepts a courier choice but the request/persisted order defaults to PATHAO. | Functional consistency risk, not merely dead code | Trace the entire order-to-booking flow before changing or removing adapters. |
| PAY-01 | `src/lib/payments/paymentService.ts` | Service explicitly has no live server-side gateway verification and uses process-local idempotency state; no usage was found in the reviewed call paths. | Dead-code candidate and unsafe-to-rely-on as payment verification | Verify all references and intended contract before deletion. Do not use this module to mark customer payments as paid. |
| BRAND-01 | `src/components/common/StoreBrandMark.tsx`, Navbar, Footer | Brand markup is implemented in more than one place. | Maintainability duplication; not proven to be a visual duplicate | Refactor only if it preserves each surface's layout and CMS settings. |
| ACCOUNT-01 | `src/components/account/CustomerAccountView.tsx` | Similar profile/address form markup appears in more than one section. | Possible markup duplication; likely different views/tabs | Check rendering conditions before refactoring. |
| ROUTE-01 | `app/api/*/route.ts` and `api/*.ts` | Some App Router route files delegate to shared handlers. | Intentional adapter architecture unless proven otherwise | Keep adapters; do not delete based on matching endpoint names. |
| PWA-01 | `app/api/brand/*` and `public/*` | Dynamic brand icon/manifest routes coexist with static PWA assets. | Could be fallback/compatibility assets | Check metadata references, manifest usage and service-worker behavior before removing any assets. |
| TEST-01 | `tests/unit/*.test.ts` | Unit tests are included by the package test script. | Not dead by default | Keep all tests until coverage/redundancy is assessed; never delete tests just to reduce file count. |
| LOG-01 | Repository tree | No standalone log files or obvious log directory appeared in the tracked file tree. | No tracked log files identified in tree inventory | Continue source scan for noisy console/debug logging; do not remove operational error reporting. |

## Repository inventory

The recursive Git tree at the base commit contains 156 tracked files. The tracked inventory includes application source, API handlers, Next.js route adapters, Supabase migrations/schema, documentation, PWA assets, and 14 unit test files. No standalone `logs/` directory or obvious tracked runtime log files appeared in the inventory.

## Validation status

This is a working audit register, not a claim that every line of all source files has been reviewed. The next audit pass must finish cross-file reference tracing and inspect API/auth/order/invoice/address/image/admin paths. No cleanup deletion is authorized by this report alone. Before any removal, record the exact path, reference evidence, reason, tests affected, and validation results here.
