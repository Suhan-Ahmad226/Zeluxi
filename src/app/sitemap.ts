import type { MetadataRoute } from "next";
import { db } from "@/lib/db/client";
const base = process.env.NEXT_PUBLIC_SITE_URL || "https://zelux.vercel.app";
const staticEntries: MetadataRoute.Sitemap = [
  { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
  { url: base + "/shop", lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
  { url: base + "/about", changeFrequency: "monthly", priority: 0.4 },
  { url: base + "/contact", changeFrequency: "monthly", priority: 0.4 },
  { url: base + "/faq", changeFrequency: "monthly", priority: 0.5 },
];
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const [products, categories, pages] = await Promise.all([
      db.product.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } }),
      db.category.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
      db.page.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } }),
    ]);
    return [
      ...staticEntries,
      ...pages.map((x) => ({ url: base + "/" + x.slug, lastModified: x.updatedAt, changeFrequency: "monthly" as const, priority: 0.5 })),
      ...categories.map((x) => ({ url: base + "/category/" + x.slug, lastModified: x.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })),
      ...products.map((x) => ({ url: base + "/product/" + x.slug, lastModified: x.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })),
    ];
  } catch {
    return staticEntries;
  }
}