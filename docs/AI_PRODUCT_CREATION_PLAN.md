# AI-assisted Add Product: implementation plan

## Existing flow reviewed
- The admin product form lives in `src/components/admin/CreateProductModal.tsx` and supports both modal and full-page presentation.
- The form is already divided into Details & pricing, Media, Variants, Specs, and SEO sections; it includes live preview, completion progress, draft/publish actions, SKU/slug helpers, category creation, image compression, Cloudinary-backed media persistence, and variant handling.
- Product persistence continues through the existing `syncProduct` / product API flow. This feature should not bypass that flow or change the product schema.
- `app/api/products/route.ts` delegates to the existing validated `api/products.ts` handler. AI output must only prefill editable form fields and must never write a product directly.
- Admin API patterns use a Supabase access token and verify `app_metadata.role === 'ADMIN'`. Cloudinary uploads already use a server-signed flow and should remain unchanged.

## UX plan
1. Keep the existing product fields and save behavior intact.
2. Add a collapsible AI Product Assistant near the top of the Details & pricing tab.
3. Ask for a product name, existing category, verified product facts, and output language.
4. Generate a structured draft for title, short/long description, tags, SEO metadata, and only explicitly supported specifications.
5. Show a review preview, then let the admin apply it to the form. Never auto-publish and never invent price, stock, warranty, materials, dimensions, or product claims.
6. Keep image/video upload, Cloudinary persistence, variants, pricing, tax, shipping, SKU, and final save actions on the existing path.
7. Make the panel responsive, keyboard-friendly, and explicit about AI review.

## API and security plan
- Add `POST /api/admin/products/ai-draft`, protected by a valid Supabase session and trusted admin app metadata.
- Keep `GEMINI_API_KEY` server-only. Validate and bound request/response data with Zod, use structured JSON mode, avoid logging prompts or secrets, set no-store headers, and fail clearly when configuration/quota is missing.
- AI output is untrusted text and is validated before it reaches the UI. The existing product API remains responsible for final product validation and persistence.

## Validation plan
- Run TypeScript typecheck, unit tests, and production build in GitHub Actions.
- Review the preview for mobile/desktop layout and verify apply-to-form behavior.
- Test missing API key, non-admin/expired sessions, provider errors, and generated output validation.
- Confirm product save/edit, image upload/replacement, variants, draft/publish, and storefront rendering remain unchanged.
