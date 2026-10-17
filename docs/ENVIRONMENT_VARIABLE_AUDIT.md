# Zeluxi environment variable audit

Scope: current main branch and checked-in Next.js/server integrations. This lists variables referenced by code or deployment workflows; it cannot inspect actual values in local .env.local, GitHub Actions Secrets, or Vercel settings.

## Application variables

| Variable | Required when | Purpose | Sensitivity |
|---|---|---|---|
| NODE_ENV | Normally set by Next.js/Vercel; development default locally | Runtime environment checks | Public/non-secret |
| NEXT_PUBLIC_SITE_URL | All deployments | Canonical URL and auth redirect fallback | Public |
| NEXT_PUBLIC_SUPABASE_URL | All deployments | Browser Supabase URL and server fallback | Public |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | All deployments | Browser publishable/anon key | Public key only |
| SUPABASE_URL | Server APIs; can fall back to NEXT_PUBLIC_SUPABASE_URL | Server Supabase URL | Non-secret |
| SUPABASE_ANON_KEY | Server APIs; can fall back to NEXT_PUBLIC_SUPABASE_ANON_KEY | User-token verification | Public key only |
| SUPABASE_SERVICE_ROLE_KEY | Privileged admin, content, order, media and courier operations | Supabase service-role client | SECRET, server-only |
| SHIPPING_DHAKA_FEE | COD orders enabled | Dhaka delivery fee in BDT | Non-secret |
| SHIPPING_OUTSIDE_DHAKA_FEE | COD orders enabled | Outside-Dhaka delivery fee in BDT | Non-secret |
| FREE_SHIPPING_THRESHOLD | COD orders enabled | Free-shipping threshold in BDT; must be positive | Non-secret |
| CLOUDINARY_CLOUD_NAME | Cloudinary media enabled | Cloudinary account identifier | Non-secret |
| CLOUDINARY_API_KEY | Signed upload/delete enabled | Cloudinary API key | Credential |
| CLOUDINARY_API_SECRET | Signed upload/delete enabled | Request signing and deletion | SECRET, server-only |
| PATHAO_MODE | Pathao integration enabled | sandbox or production | Non-secret |
| PATHAO_BASE_URL | Pathao integration enabled | Must match selected mode | Non-secret |
| PATHAO_CLIENT_ID | Pathao integration enabled | Merchant API client ID | Credential |
| PATHAO_CLIENT_SECRET | Pathao integration enabled | Merchant API client secret | SECRET |
| PATHAO_USERNAME | Pathao integration enabled | Merchant account username | Credential |
| PATHAO_PASSWORD | Pathao integration enabled | Merchant account password | SECRET |
| PATHAO_STORE_ID | Store-specific Pathao operations | Approved merchant store ID | Non-secret identifier |
| PATHAO_TOKEN_ENCRYPTION_KEY | Pathao token storage enabled | 32-byte AES-256-GCM encryption key | SECRET, server-only |

## GitHub Actions-only secret

SUPABASE_DB_URL is consumed by .github/workflows/supabase-migrations.yml as secrets.SUPABASE_DB_URL. Configure it under repository Settings > Secrets and variables > Actions. Do not add it to .env.example, browser code, or Vercel unless another reviewed workflow explicitly requires it.

## Required groups

- Site/auth/server APIs: NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, server fallbacks SUPABASE_URL and SUPABASE_ANON_KEY, plus SUPABASE_SERVICE_ROLE_KEY for privileged operations.
- COD orders: the Supabase values above plus SHIPPING_DHAKA_FEE, SHIPPING_OUTSIDE_DHAKA_FEE and FREE_SHIPPING_THRESHOLD.
- Cloudinary signed media routes: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET and Supabase auth configuration.
- Pathao: PATHAO_MODE, PATHAO_BASE_URL, PATHAO_CLIENT_ID, PATHAO_CLIENT_SECRET, PATHAO_USERNAME, PATHAO_PASSWORD, PATHAO_TOKEN_ENCRYPTION_KEY, Supabase server credentials, and PATHAO_STORE_ID for store-specific operations. Apply supabase/migrations/20261018000000_pathao_courier.sql before using token storage.

## Findings

1. NODE_ENV was missing from .env.example and has now been added.
2. SUPABASE_DB_URL belongs in GitHub Actions Secrets only, not the app template.
3. Do not add VITE_* variables: this is a Next.js app.
4. Do not add payment gateway keys yet. The README says real server-side payment verification/webhooks are not implemented and COD is the supported checkout method.
5. Firebase is a package dependency, but that alone does not prove Firebase environment variables are needed. Add none unless the code actually reads them.
6. Environment variables alone do not make the app production-ready. Persistent admin CRUD, payment verification and complete courier lifecycle handling remain separate implementation tasks.

## Deployment checklist
- [ ] Public and server Supabase URLs/anon keys point to the same project.
- [ ] Keep SUPABASE_SERVICE_ROLE_KEY, CLOUDINARY_API_SECRET and Pathao secrets server-only.
- [ ] Configure approved shipping fees and free-shipping threshold.
- [ ] Configure Cloudinary credentials for signed media operations.
- [ ] Keep Pathao in sandbox until merchant approval and successful end-to-end sandbox validation.
- [ ] Switch Pathao mode, base URL and credentials together.
- [ ] Store SUPABASE_DB_URL only in GitHub Actions Secrets if migration automation is used.
- [ ] Never commit .env.local or real credentials.
