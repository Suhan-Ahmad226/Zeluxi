# Zeluxi AI-first product creation

## Product entry experience
- Use the existing Add Product page and the same admin layout, typography, spacing, colors, and responsive behavior as the rest of Zeluxi Admin.
- Keep the first pass intentionally small: product name, selling price, regular/discount price, category, photos/video, and optional variants.
- Show one primary AI action after the essentials. Avoid asking the admin to manually fill long descriptions, product specifications, tags, or SEO fields.
- Render the existing image/video upload and variant controls in the same creation workspace; keep variant setup optional.
- On AI generation, apply generated product copy directly to the form and show a preview plus the sources used. Regenerate replaces the generated copy and metadata without saving or publishing the product.
- Keep final save/publish as an explicit admin action. Never fabricate price, discount, stock, warranty, origin, compatibility, materials, measurements, reviews, or delivery promises.

## AI research and content
- Research the exact name/model using Google Search grounding. Prefer manufacturer documentation and reliable retailers or technical publications; use English and Bangla search context when useful.
- Generate short and long descriptions, only evidence-supported specifications, product tags, SEO title, SEO description, and SEO keywords in Bangla + English.
- Display available source titles and URLs so the admin can check the claims before publishing.
- If the exact model cannot be verified, use cautious generic copy and omit unsupported specifications. Do not copy source text verbatim or keyword-stuff.
- AI is allowed to replace generated text and metadata on regeneration; it does not overwrite price, discount, photos, video, variants, stock, or save state in the database.

## Existing integration and data safety
- Preserve the existing syncProduct / product API save flow, Cloudinary upload and replacement logic, category mapping, SKU/slug generation, variant handling, and edit-product workflow.
- AI only pre-fills editable state. It does not write directly to Supabase and does not auto-publish.
- Do not seed new products with fake example specifications, warranty, origin, brand, or marketing tags.
- Keep GEMINI_API_KEY server-only and validate requests/responses with Zod.
- Verify the signed-in user via Supabase Auth, then check the authoritative profiles.role === ADMIN using the server-only service role key.
- Set no-store headers, bound input/output sizes, handle provider failures clearly, and do not log secrets or complete user prompts.

## Release checks
- GitHub Actions lint/typecheck, unit tests, and production build must pass.
- Check Add Product on phone and desktop, including AI generation/regeneration, source links, image/video upload, optional variants, save/publish, and edit-product regression.
- Verify missing Gemini key, expired session, non-admin profile, provider quota/error, and malformed AI output.
- Confirm the Vercel preview has GEMINI_API_KEY configured before end-to-end AI testing.


## Zero-budget quota fallback
- Keep the Google Search-grounded Gemini model as the primary route when its free-tier quota is available.
- If the primary request returns HTTP 429 or a transient 5xx, retry once with `GEMINI_FALLBACK_MODEL` (default `gemini-3.5-flash-lite`) without Search grounding. This does not add a paid provider or require a second API key.
- A fallback draft returns `researchMode: text-only-fallback`, no research sources, and an explicit admin warning. Do not present fallback output as web-verified.
- The fallback uses the same Gemini API project, so it cannot bypass an exhausted project-wide quota. If both model quotas are exhausted, wait for reset; do not silently switch to a paid API.
- Admin must review all generated claims and specifications before saving or publishing. AI generation never saves/publishes automatically.
- Keep provider attempts bounded to one primary call and at most one fallback call per user action.


## Manual entry and low-friction product creation
- New product creation starts in Manual Entry mode, so AI quota is never a blocker for catalog work.
- Offer two explicit modes: Manual Entry (always available, no API call) and AI Assistant (uses the available Gemini quota). Switching modes must not clear already-entered form values.
- In AI mode, place the assistant near the top of the form; generated copy remains editable in the existing fields. Manual mode uses the same fields and save flow without invoking AI.
- Keep the quick path focused on product name, selling price, category, primary image, stock, and short/long description. Make regular price, brand, tags, specifications, variants, shipping details, warranty/return policy, and SEO available in the existing sections.
- Generate slug and SKU automatically but allow editing. Never invent a cost price, barcode, warranty, origin, specs, or shipping claims; keep optional fields optional.
- Validate only truly required values before save, show errors beside the relevant field, and keep Draft / Publish actions explicit.


## Draft-first workflow improvements

- Saving a draft requires a product name; the admin can finish price, category, and images later.
- Publishing remains strict: a valid selling price, category, and at least one product image are required.
- The API enforces publish requirements server-side, so bypassing the UI cannot publish an incomplete listing.
- The "Save & Add Another" action is available on mobile as well as desktop.
- Drafts are not visible in the public catalog because the persisted `published` flag remains false.
