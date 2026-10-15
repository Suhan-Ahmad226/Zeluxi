# ZELUX — Production-Grade Bangladesh Single-Store E-Commerce Platform

ZELUX is an atelier-grade, single-store e-commerce platform engineered specifically for the Bangladesh market. It combines quiet-luxury design aesthetics with robust commercial infrastructure, including BDT financial precision, Cash on Delivery (COD), Mobile Financial Services (bKash, Nagad, DBBL Rocket), SSLCommerz gateway architecture, and courier logistics dispatch (Pathao Hermes & Steadfast Networks).

---

## 1. Architecture & Tech Stack

| Layer | Technology |
|---|---|
| **Framework & UI** | Next.js 16 App Router / React 19 / Vite runtime |
| **Language** | TypeScript strict mode |
| **Styling & Icons** | Tailwind CSS 4, shadcn/ui primitives, Lucide React, Motion |
| **Database & ORM** | PostgreSQL with Prisma (`prisma/schema.prisma`) |
| **Authentication** | Supabase Auth (`src/lib/supabase.ts`) |
| **Logistics Integration** | Pathao Hermes Logistics (`https://api-hermes.pathao.com`) & Steadfast Courier Network |
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
   - Fill `VITE_PATHAO_CLIENT_ID` and store credentials in `.env.local`.
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

## 6. Production Launch Checklist

- [x] Strict TypeScript compilation passes with 0 errors (`npm run lint`).
- [x] All unit test suites pass (Pricing, Validation, Order State Machine).
- [x] Production bundle generates without warnings or bundle failures (`npm run build`).
- [x] SEO robots.txt and sitemap.xml configured for `https://zelux.vercel.app`.
- [x] Vercel routing and security headers configured (`vercel.json`).
- [x] PWA manifest and icons active (`public/manifest.webmanifest`).
- [x] Bangladeshi Taka (BDT) integer money precision verified.
- [x] Cash on Delivery (COD) and MFS payment flows verified.
- [x] Pathao & Steadfast logistics adapters implemented.
