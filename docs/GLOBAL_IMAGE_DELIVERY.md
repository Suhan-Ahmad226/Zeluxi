# Global responsive image delivery

Zeluxi uses \`src/components/common/StoreImage.tsx\` as the shared image rendering component. It keeps existing media URLs intact while applying provider-aware delivery optimization.

## How it works

- Cloudinary images use transformation URLs with responsive width candidates, automatic format selection (\`f_auto\`) and automatic quality (\`q_auto\`).
- Unsplash URLs receive width/height and format query parameters.
- Supabase Storage and other hosted URLs are not rewritten. They continue to render as-is.
- Empty, invalid, or broken sources fall back to a local inline SVG placeholder.
- Use the \`preset\` prop to match the actual image container. Presets define transformation dimensions, crop behavior, candidate widths and the browser \`sizes\` hint.
- The system transforms delivery URLs only. It does not overwrite or re-upload original media files and does not change CMS/product database records.

## Presets

| Preset | Intended use | Behavior |
| --- | --- | --- |
| \`product-card\` | Product grids and cards | 4:3 crop with automatic focal point and smaller responsive candidates |
| \`product-detail\` | Main product gallery | Fit within a portrait-oriented target without forced fill cropping |
| \`thumbnail\` | Gallery thumbnails | Small square image candidates |
| \`category\` | Category/collection cards | Square crop |
| \`hero\` | Hero banners | Wide responsive candidates with automatic focal point |
| \`logo\` | Store and brand logos | Fit without forced cropping |
| \`avatar\` | Profile/avatar images | Small square crop |
| \`content\` | General editorial/CMS imagery | Preserve aspect ratio and deliver responsive widths (default) |

Example:

\`\`\`tsx
<StoreImage
  src={product.images?.[0]}
  preset="product-card"
  alt={product.name}
  loading="lazy"
  decoding="async"
  className="h-full w-full object-cover"
/>
\`\`\`

Pass an explicit \`sizes\` value when the layout differs from the preset's default, especially for unusual grids or nested layouts. The browser uses \`sizes\` with \`srcSet\` to choose the smallest suitable source for the rendered slot and device pixel ratio.

## Rollout notes

The shared component defaults to the general \`content\` preset, so existing StoreImage call sites gain responsive delivery without a large, risky migration. High-traffic product cards and the homepage hero explicitly use tailored presets. As additional admin/gallery layouts are touched, assign \`product-detail\`, \`thumbnail\`, \`category\`, or \`logo\` as appropriate.

## Verification

Run:

\`\`\`sh
npm run typecheck
npm test
npm run build
\`\`\`

Cloudinary transforms only work for public delivery URLs on \`res.cloudinary.com\`. Existing provider configuration and server-side upload credentials remain unchanged.
