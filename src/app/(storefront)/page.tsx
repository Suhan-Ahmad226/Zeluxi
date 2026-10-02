import Image from "next/image";
import Link from "next/link";
import { Truck, ShieldCheck, RotateCcw, BadgePercent } from "lucide-react";
import { db } from "@/lib/db/client";
import { CatalogGrid } from "@/components/product/catalog-grid";

export const revalidate = 60;

const money = (value: unknown) =>
  Number(value).toLocaleString("en-BD", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

export default async function HomePage() {
  const bestSellerGroups = await db.orderItem.groupBy({
    by: ["productId"],
    where: {
      order: {
        status: {
          notIn: ["CANCELLED", "RETURNED", "REFUNDED"],
        },
      },
    },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 8,
  });

  const bestSellerIds = bestSellerGroups.map((item) => item.productId);

  const [featured, categories, banners, newArrivals, deals, bestSellerProducts] =
    await Promise.all([
      db.product.findMany({
        where: { isPublished: true, isFeatured: true },
        include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, inventory: true },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      db.category.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        take: 8,
      }),
      db.banner.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        take: 3,
      }),
      db.product.findMany({
        where: { isPublished: true },
        include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, inventory: true },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      db.product.findMany({
        where: {
          isPublished: true,
          compareAtPrice: { not: null },
        },
        include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, inventory: true },
        orderBy: { updatedAt: "desc" },
        take: 8,
      }),
      bestSellerIds.length
        ? db.product.findMany({
            where: { id: { in: bestSellerIds }, isPublished: true },
            include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, inventory: true },
          })
        : Promise.resolve([]),
    ]);

  const bestSellerRank = new Map(bestSellerIds.map((id, index) => [id, index]));
  bestSellerProducts.sort(
    (a, b) =>
      (bestSellerRank.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
      (bestSellerRank.get(b.id) ?? Number.MAX_SAFE_INTEGER),
  );

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://zelux.vercel.app";
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Zelux",
    url: siteUrl,
  };
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Zelux",
    url: siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <main className="min-h-screen bg-slate-50 pb-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteJsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <section className="border-b bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:py-14 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:gap-12">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 sm:text-sm">
              Zelux Bangladesh
            </p>
            <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Simple shopping. Better everyday.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              Discover quality products with transparent BDT pricing, secure checkout,
              COD support and reliable delivery across Bangladesh.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/shop"
                className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Shop now
              </Link>
              <Link
                href="/deals"
                className="rounded-xl border bg-white px-5 py-3 text-sm font-bold text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                View offers
              </Link>
            </div>
          </div>

          <div className="rounded-3xl bg-indigo-600 p-6 text-white shadow-sm sm:p-8">
            <p className="text-sm font-semibold text-indigo-100">Why shop with Zelux?</p>
            <div className="mt-6 grid gap-5 sm:grid-cols-3 lg:grid-cols-1">
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <b>Secure checkout</b>
                  <p className="mt-1 text-sm text-indigo-100">Server-validated orders and protected accounts.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Truck className="mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <b>Reliable delivery</b>
                  <p className="mt-1 text-sm text-indigo-100">Bangladesh-ready delivery and tracking support.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <RotateCcw className="mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <b>Customer-first support</b>
                  <p className="mt-1 text-sm text-indigo-100">Clear order, return and refund flows.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {banners.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-6 sm:pt-8" aria-label="Promotions">
          <div className="grid gap-4 md:grid-cols-3">
            {banners.map((banner) => (
              <Link
                key={banner.id}
                href={banner.href || "/shop"}
                className="group overflow-hidden rounded-2xl border bg-white transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative aspect-[16/8] bg-slate-100">
                  <Image
                    src={banner.imageUrl}
                    alt={banner.title}
                    fill
                    sizes="(max-width:768px) 100vw, 33vw"
                    className="object-cover transition duration-300 group-hover:scale-[1.02]"
                  />
                </div>
                <div className="flex items-center justify-between gap-3 p-4">
                  <p className="font-bold text-slate-900">{banner.title}</p>
                  <span className="text-sm font-semibold text-indigo-600">Shop →</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {categories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10" aria-labelledby="categories-heading">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-indigo-600">Explore</p>
              <h2 id="categories-heading" className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
                Shop by category
              </h2>
            </div>
            <Link href="/shop" className="text-sm font-semibold text-indigo-600 hover:underline">
              View all →
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/category/${category.slug}`}
                className="group overflow-hidden rounded-2xl border bg-white transition hover:-translate-y-0.5 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {category.imageUrl ? (
                  <div className="relative aspect-[16/9] bg-slate-100">
                    <Image
                      src={category.imageUrl}
                      alt=""
                      fill
                      sizes="(max-width:640px) 50vw, 25vw"
                      className="object-cover transition duration-300 group-hover:scale-[1.03]"
                    />
                  </div>
                ) : null}
                <div className="p-4 font-semibold text-slate-900">{category.name}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 pb-10" aria-labelledby="featured-heading">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-indigo-600">Curated for you</p>
            <h2 id="featured-heading" className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
              Featured products
            </h2>
          </div>
          <Link href="/featured" className="text-sm font-semibold text-indigo-600 hover:underline">
            View all →
          </Link>
        </div>
        <div className="mt-5">
          <CatalogGrid products={featured} empty="Featured products will appear here soon." />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-10" aria-labelledby="new-arrivals-heading">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-indigo-600">Just added</p>
            <h2 id="new-arrivals-heading" className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
              New arrivals
            </h2>
          </div>
          <Link href="/new-arrivals" className="text-sm font-semibold text-indigo-600 hover:underline">
            See more →
          </Link>
        </div>
        <div className="mt-5">
          <CatalogGrid products={newArrivals} empty="New products will appear here soon." />
        </div>
      </section>

      {deals.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-10" aria-labelledby="deals-heading">
          <div className="rounded-3xl bg-amber-50 p-5 sm:p-7">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-amber-700">
                  <BadgePercent size={17} aria-hidden="true" /> Save more
                </p>
                <h2 id="deals-heading" className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
                  Deals & discounts
                </h2>
              </div>
              <Link href="/deals" className="text-sm font-semibold text-indigo-600 hover:underline">
                View deals →
              </Link>
            </div>
            <div className="mt-5">
              <CatalogGrid products={deals} />
            </div>
          </div>
        </section>
      )}

      {bestSellerProducts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-10" aria-labelledby="best-sellers-heading">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-indigo-600">Customer favorites</p>
              <h2 id="best-sellers-heading" className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
                Best sellers
              </h2>
            </div>
            <Link href="/best-sellers" className="text-sm font-semibold text-indigo-600 hover:underline">
              See all →
            </Link>
          </div>
          <div className="mt-5">
            <CatalogGrid products={bestSellerProducts} />
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 pb-10">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["Free & transparent pricing", "No hidden product pricing surprises."],
            ["COD available", "Pay on delivery where the service is available."],
            ["Easy order tracking", "Follow your order from confirmation to delivery."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl border bg-white p-5">
              <p className="font-bold text-slate-900">{title}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
