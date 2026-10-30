# PeloMart Social Media Studio setup

The Social Studio enhancement is being developed on `feat/ai-social-marketing-system`. Keep it in Preview until database, Meta permissions, scheduler and real Page acceptance checks pass. It is not enabled in production until the migration, server environment variables, Meta app and scheduler have been configured and tested.

## What it includes

- Product Boost button in Admin > Products > All Products.
- AI caption generation from the server-side product catalog and previous published captions, with six marketing goals: product showcase, education, new arrival, offer campaign, customer trust and engagement.
- Editable marketing goal, language and writing tone; responsive dashboard, content calendar, post history, recurring campaign controls and internal publishing-status overview.
- Editable drafts, product media preview, direct product URL, Post Now and one-time scheduling.
- Facebook Page OAuth connection and encrypted Page access-token storage.
- Recurring product promotion rules, configurable day interval, approval-first default, pause/resume, publishing history and error logs.
- Protected dispatch endpoint at `POST /api/internal/social/dispatch`.

## Required environment variables

Add these to the server-side Vercel project environment (Preview first; Production only after acceptance testing):

- `SOCIAL_META_APP_ID`: Meta App ID.
- `SOCIAL_META_APP_SECRET`: Meta App Secret. Server-only.
- `SOCIAL_META_REDIRECT_URI`: exact callback URL, e.g. `https://pelomart.com/api/admin/social/oauth/callback`.
- `SOCIAL_TOKEN_ENCRYPTION_KEY`: 32 random bytes encoded as 64 hexadecimal characters. Keep it stable and back it up securely; rotating it without re-encrypting stored tokens makes saved tokens unreadable.
- `CRON_SECRET`: a long random secret for the internal dispatch route.
- `GEMINI_API_KEY`: server-side Gemini API key for caption generation.
- Existing Supabase server values: `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
- `NEXT_PUBLIC_SITE_URL`: canonical public storefront origin.

Generate secrets locally, do not commit them:
- Encryption key: `openssl rand -hex 32`
- Cron secret: `openssl rand -base64 48`

Never use `NEXT_PUBLIC_` for Meta App Secret, service-role key, Gemini API key, encryption key, or cron secret.

## Supabase migrations

Review and apply these additive migrations to the intended Preview Supabase project using the normal migration workflow:

- `20261023000000_social_product_boost.sql`
- `20261024160000_social_oauth_one_time_state.sql`
- `20261031100000_social_content_goals.sql`

The new content-goal migration adds a constrained `content_goal` column and index to existing social posts. The social tables keep RLS enabled and direct client grants revoked. Do not apply to production until the branch and SQL have been reviewed and backed up.

The server APIs expect the existing `store_products.product_data` JSON column and dedicated `published`, `archived`, `price`, and `stock` columns.

## Meta app setup

1. Create/configure a Meta app with the Facebook Login / relevant Page API products available to the app.
2. Add the exact OAuth callback URL to Valid OAuth Redirect URIs.
3. Request only the permissions required for Page selection and publishing, including `pages_show_list`, `pages_read_engagement`, and `pages_manage_posts` as required by the current Meta review rules.
4. Use a test Page and test administrator first. The user must have sufficient Page task permissions to publish.
5. Meta App Review, business verification, app mode, and access-level requirements vary. A connected Page is not proof that publishing permissions are approved.
6. OAuth callback exchanges the code and saves Page access tokens encrypted with AES-256-GCM. Client APIs never return the encrypted token or plaintext token.

## Scheduler setup

Automatic scheduling requires an external scheduled caller. Do not rely on an open browser tab or a client-side timer.

Recommended: use Supabase Cron with the HTTP extension and Vault to call the protected dispatch endpoint every five minutes. Configure the secret in Vault and do not hardcode it into a migration or source file. Adapt this example to the installed extensions and Vault schema in the target Supabase project:

```sql
select cron.schedule(
  'pelomart-social-dispatch',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://pelomart.com/api/internal/social/dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'pelomart_cron_secret'
        limit 1
      )
    ),
    body := '{}'::jsonb
  );
  $$
);
```

Before scheduling, ensure the `pg_cron`, `pg_net`, and Vault features are available and enabled in the target Supabase project. Store the exact same value as `CRON_SECRET` in Vault under `pelomart_cron_secret`. Test the endpoint manually in Preview using an authenticated server-side request. Check Cron run history and application logs. Do not schedule production until a real Page test succeeds.

## Operational behavior

- Recurring promotions are created with a next-run time after the selected interval. The first recurring post is created when that cycle becomes due; an immediate post is a separate action.
- Approval is required by default for every recurring post. A recurring cycle waits for admin approval before publishing and the next cycle is calculated after a successful publish.
- Auto-publish should remain disabled until multiple approval-based posts, scheduler reliability, token revocation handling and duplicate prevention have been tested.
- Unpublished, archived, out-of-stock products or disconnected accounts cause recurring promotions to pause.
- Posts are marked Published only after a successful Graph API response with a provider post identifier.
- If Meta's response is uncertain, investigate the Page and publishing-attempt log before retrying; retrying blindly can duplicate a post.
- Current media publishing supports a single selected public HTTPS image or video URL per post. Multi-image carousels, Instagram publishing, paid ads/boosting, Meta Insights metrics and personal-profile publishing are not included in this iteration. The UI labels Instagram and platform analytics as unavailable until their integrations are implemented and tested.
- The Analytics view currently reports internal publishing counts only. It does not claim to show Reach, Impressions, Engagement, Watch Time, Clicks or attributed Orders until the relevant Meta Insights and store-attribution integrations are completed.
- Post links are appended to the caption when not already present. Confirm product URLs, media access, Open Graph rendering, and post format with a real Page before release.

## Acceptance checklist

- [ ] Migration applied to Preview Supabase.
- [ ] Admin-only API checks verified for non-admin and expired sessions.
- [ ] Meta OAuth connects only expected Pages and reconnect behavior tested.
- [ ] AI captions contain no fabricated prices, discounts or stock claims.
- [ ] Save/edit/delete draft works.
- [ ] Post Now succeeds on a real test Page and records the Meta post ID.
- [ ] One-time scheduling succeeds through Cron.
- [ ] Three-day recurring promotion creates a distinct caption and correct product link.
- [ ] Approval, pause, resume, max-post count and out-of-stock pause work.
- [ ] Duplicate and uncertain API-response cases have been exercised.
- [ ] Checkout, product editing, customer/admin orders and storefront regression checks pass.
- [ ] Only after all checks pass, open a PR and deploy to production.


## Marketing content goals

The composer stores one of these validated goals on each post:
- `PRODUCT_SHOWCASE`
- `PRODUCT_EDUCATION`
- `NEW_ARRIVAL`
- `OFFER_CAMPAIGN`
- `CUSTOMER_TRUST`
- `ENGAGEMENT`

The AI prompt must use only catalog facts. Customer-trust content must not fabricate reviews or testimonials. A discount may be mentioned only when the current product data contains a verified discount. The admin must review the generated copy before publishing.

## Current UI scope

- Responsive overview with connected Page and post-status counts.
- Product composer with goal, language, tone, product media and Facebook preview.
- Content calendar list for scheduled and approval-pending posts.
- Publishing history with status filtering and safe retry warning for uncertain outcomes.
- Recurring campaign pause/resume.
- Analytics page with internal status counts and explicit notice that Meta platform metrics are not connected yet.
- Instagram is shown as unavailable, not as a working publishing destination.
