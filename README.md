# ZELUX — Production-Grade Bangladesh Single-Store E-Commerce Platform

ZELUX is an atelier-grade, single-store e-commerce platform engineered specifically for the Bangladesh market. It combines quiet-luxury design aesthetics with robust commercial infrastructure, including BDT financial precision, Cash on Delivery (COD), Mobile Financial Services (bKash, Nagad, DBBL Rocket), SSLCommerz gateway architecture, and courier logistics dispatch (Pathao Hermes & Steadfast Networks).

---

## 1. Architecture & Tech Stack

| Layer | Technology |
|---|---|
| **Framework & UI** | React 19 / Vite SPA (not Next.js App Router) |
| **Language** | TypeScript strict mode |
| **Styling & Icons** | Tailwind CSS 4, shadcn/ui primitives, Lucide React, Motion |
| **Database & ORM** | Prisma/PostgreSQL schema present; production CRUD is not yet wired to the SPA |
| **Authentication** | Supabase Auth (`src/lib/supabase.ts`) |
| **Logistics Integration** | Adapter interfaces only; real server-side booking/tracking integration remains incomplete |
| **Validation** | Zod schemas (`src/lib/validation/schemas.ts`) |
| **Instant Alerts** | Telegram Dispatch Service (`src/lib/notifications/telegram.ts`) |
| **Caching & Rate Limiting** | Redis Cache & Sliding Window Limiter (`src/lib/cache/redis.ts`) |
| **Media Transformation** | Cloudinary Responsive Adapter (`src/lib/cloudinary/index.ts`) |
| **Security** | XSS sanitization & timing-safe webhook verifier (`src/lib/security/index.ts`) |
| **Testing** | Unit & validation test suites (`tests/unit/`) |

---

## 2. Key Modules & Features

### Customer Storefront
- **Dual-Tier Navigation:** Sticky desktop & mobile header with instant live catalog search, language switcher (English / বাংলা), wishlist counter, shopping bag slide-over drawer, and authenticated account portal.
- **Curated Collections:** Vegetable-tanned full-grain leather goods, European organic linen shirts, mechanical timepieces, and studio desk essentials.
- **Product Details & Comparison:** High-resolution zoom gallery, variant selector (Size/Color), live inventory stock indicator, size guide modal, side-by-side product compare drawer, customer star reviews, and interactive Q&A.
- **Shopping Cart & Checkout:** Zod-validated 11-digit Bangladesh phone numbers (`013-019`), division-level shipping computation (Dhaka: ৳60, Outside Dhaka: ৳120, Free above ৳3,500), coupon engine (`WELCOME10`, `DHAKA100`, `EID2026`), and multiple payment methods (COD, bKash Direct, Nagad, Rocket, SSLCommerz).

### Courier Tracking & Transparency
- **Public & Authenticated Order Tracking:** Live waybill tracking with Pathao/Steadfast consignment IDs and event milestones (`PENDING` → `CONFIRMED` → `PROCESSING` → `SHIPPED` → `OUT_FOR_DELIVERY` → `DELIVERED`).
- **Printable Invoices:** 1-click printable receipt layout with Bangladesh VAT breakdown.

### Centralized Admin Console (`/admin`)
- **KPI Metrics:** Total Revenue, Total Orders, Average Order Value (AOV), Active Products, and Pending Shipments.
- **Catalog & Stock Control:** Add, edit, adjust stock, manage variants, and publish/unpublish products.
- **Order Lifecycle Operations:** Step-by-step stage advances, courier reassignments, and CSV order exports (`zelux_orders_YYYY-MM-DD.csv`).
- **Promotions & Audit Trail:** Dynamic coupon builder and chronological administrative action log.

---

## 3. Local Development Setup

### Prerequisites
- Node.js 20+
- PostgreSQL database instance
- Git

### Installation (Windows PowerShell)
```powershell
# 1. Clone repository and install dependencies
git clone https://github.com/your-username/zelux.git
cd zelux
npm install

# 2. Copy environment file
Copy-Item .env.example .env.local

# 3. Generate Prisma client & run database migrations
npx prisma generate
npx prisma migrate dev
npx tsx prisma/seed.ts

# 4. Start local development server
npm run dev
```

### Installation (macOS / Linux)
```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local

# 3. Generate Prisma client
npx prisma generate
npx prisma migrate dev
npx tsx prisma/seed.ts

# 4. Start dev server
npm run dev
```

---

## 4. External Services Setup

1. **Supabase Authentication & 6-Digit Numeric Email OTP:**
   - Full setup guide and exact dashboard email template changes documented in [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md).
   - Configure Email provider and enable "Confirm email" under **Authentication** > **Providers**.
   - Update **Confirm signup** email template with `{{ .Token }}` instead of `{{ .ConfirmationURL }}` (no clickable link).
   - Dedicated `/verify-email` screen with 6-digit OTP input, paste support, and resend cooldown.
   - Copy Project URL and Anon Public Key to `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
2. **Pathao Hermes Courier Logistics:**
   - Register merchant account at `merchant.pathao.com`.
   - Generate API keys in Developer Settings (`CLIENT_ID` and `CLIENT_SECRET`).
   - Keep credentials server-side only. Do not expose merchant secrets in `VITE_*` variables; this SPA currently does not perform real Pathao bookings.
3. **Steadfast Logistics:**
   - Register account at `steadfast.com.bd`.
   - Copy API Key and Secret Key to `STEADFAST_API_KEY` and `STEADFAST_SECRET_KEY`.
4. **Mobile Financial Services (MFS) & Payment Gateways:**
   - Register merchant accounts with bKash, Nagad, and SSLCommerz.
   - Test sandbox credentials before switching to live credentials.

---

## 5. Automated Tests & Quality Gates

Run all automated test suites:
```bash
npx tsx tests/unit/pricing.test.ts
npx tsx tests/unit/validation.test.ts
npx tsx tests/unit/orders.test.ts
```

Static checks and build verification:
```bash
npm run lint
npm run build
```

---

## 6. Production Readiness — Not Yet Approved for Live Orders

The repository is a frontend prototype with some real Supabase Auth calls and several integration interfaces. It is **not yet a complete production e-commerce backend**. Do not interpret the UI, schema, or adapter classes as proof that an external service is connected.

### Verified blockers to resolve before launch
- [ ] Replace `src/data/mockData.ts` sample catalog/orders/customers/coupons with real database-backed data.
- [ ] Replace `StoreContext` LocalStorage-only catalog, inventory, customer, order, coupon, review, and CMS persistence with authenticated server APIs and PostgreSQL transactions.
- [ ] Add server-side authorization for every admin operation; never rely on client-side `isAdmin` alone.
- [ ] Configure Supabase URL/public key and test signup OTP, login, OAuth, logout, recovery OTP, and expired sessions against the production project.
- [ ] Integrate and verify a real online payment gateway. Until then, only COD can be offered; client-entered TrxIDs are not payment proof.
- [ ] Implement server-side Pathao/Steadfast booking, cancellation, webhook signature verification, idempotency, and live tracking using real merchant credentials.
- [ ] Implement Telegram/email notifications through server-side endpoints and secrets.
- [ ] Add a committed dependency lockfile, run the full CI suite, and complete end-to-end tests on a staging deployment.
- [ ] Rotate any credentials that were ever committed to Git history, including the Telegram bot token.

### Current safe behavior
The hardening branch removes demo authentication bypasses and prevents several integrations from falsely reporting success when no real server-side provider call exists. This deliberately blocks unsupported payment, courier, and refund operations instead of fabricating success. It is a security step, not a claim that all production integrations are complete.
