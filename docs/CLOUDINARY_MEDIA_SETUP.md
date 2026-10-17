# Zeluxi Cloudinary media setup

Zeluxi stores new product images, product videos, category images, and storefront hero/mobile banner images in Cloudinary. Supabase stores product/CMS metadata and media URLs/public IDs. Existing Supabase Storage URLs remain readable and are cleaned up only when the record has been saved successfully and the URL is inside the owning record's managed folder.

## Required environment variables

Set these on local development in `.env.local` and on Vercel in Project Settings → Environment Variables:

- `CLOUDINARY_CLOUD_NAME`: Cloudinary cloud name (the current Zeluxi cloud is `lc8fsuka`).
- `CLOUDINARY_API_KEY`: Cloudinary API key.
- `CLOUDINARY_API_SECRET`: Cloudinary API secret. Server-only; never add a `NEXT_PUBLIC_` prefix or commit the real value.
- Existing Supabase variables must also be configured: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or server fallbacks `SUPABASE_URL`, `SUPABASE_ANON_KEY`).

After changing Vercel variables, redeploy the production deployment.

## Security model

- The signature endpoint validates the Supabase access token with `auth.getUser` and checks trusted `app_metadata.role === 'ADMIN'`.
- The API secret is used only on the server to sign short-lived upload/delete requests.
- Uploads are scoped to `zelux/<scope>/<record-id>/`; the supported scopes are products, storefront, categories, pages, settings, and media.
- The deletion endpoint is admin-only and validates the asset's owner/scope prefix before calling Cloudinary's destroy API with CDN invalidation.
- Upload new media and save its database reference first. Only then clean up replaced media. If database saving fails, newly uploaded media is cleaned up best-effort and the old record remains unchanged.
- Assets referenced by a different product are not deleted when a product is duplicated or updated.

## Supported media

- Images: JPEG, PNG, WebP, AVIF, GIF; product/storefront upload limits depend on the relevant UI and helper (up to 20 MB in the shared helper).
- Videos: MP4, WebM, MOV; shared helper maximum 100 MB. The product media editor currently limits videos to 80 MB.
- New product records store `imagePublicIds` and `videoPublicId` in product metadata. Category and storefront CMS records store public IDs next to their URLs. Existing records continue to work without a migration because these records are held in the existing JSON metadata/content fields.

## Go-live verification checklist

1. Add the three Cloudinary environment variables to Vercel Production and Preview as appropriate.
2. Sign in with a Supabase user whose trusted `app_metadata.role` is `ADMIN`.
3. Upload a product image and video, save the product, reload the admin screen, and verify the media still displays.
4. Replace the image/video, save, and confirm the new URLs/public IDs are persisted before old managed assets are removed.
5. Upload a category image and a desktop/mobile hero banner image, save the CMS, reload, and verify.
6. Try the signature and delete endpoints without an admin token; both must reject the request.
7. Check GitHub Actions and the Vercel deployment for typecheck/build failures before considering the rollout complete.

## Notes

Cloudinary delivery transformations (for example `f_auto,q_auto`) apply to Cloudinary assets. Existing Supabase or third-party URLs are preserved and are not silently rewritten. The application does not automatically migrate historical media in bulk; old URLs remain compatible until those assets are explicitly replaced.
