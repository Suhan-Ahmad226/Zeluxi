import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [featured, categories, banners] = await Promise.all([
    db.product.findMany({
      where: { isPublished: true, isFeatured: true },
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
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
  ]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://zelux.vercel.app";
  const organizationJsonLd = { "@context": "https://schema.org", "@type": "Organization", name: "Zelux", url: siteUrl };
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Zelux",
    url: siteUrl,
    potentialAction: { "@type": "SearchAction", target: siteUrl + "/search?q={search_term_string}", "query-input": "required name=search_term_string" },
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd).replace(/</g, "\\u003c") }} />
      <section className="border-b bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:py-16 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600">Zelux Bangladesh</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-6xl">Simple shopping.<br />Better everyday.</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">Discover quality products with transparent pricing, secure checkout, COD support and reliable delivery across Bangladesh.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/shop" className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white">Shop now</Link>
              <Link href="/track-order" className="rounded-xl border bg-white px-5 py-3 text-sm font-bold text-slate-800">Track order</Link>
            </div>
          </div>
          <div className="rounded-3xl bg-indigo-600 p-7 text-white shadow-sm">
            <p className="text-sm font-semibold text-indigo-100">Why Zelux?</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <div><b>Secure</b><p className="mt-1 text-sm text-indigo-100">Server-validated checkout and protected accounts.</p></div>
              <div><b>Fast</b><p className="mt-1 text-sm text-indigo-100">Lightweight, mobile-first experience.</p></div>
              <div><b>Bangladesh-ready</b><p className="mt-1 text-sm text-indigo-100">BDT, COD and courier-ready ordering.</p></div>
            </div>
          </div>
        </div>
      </section>
      {banners.length > 0 && <section className="mx-auto max-w-7xl px-4 pt-8"><div className="grid gap-4 md:grid-cols-3">{banners.map((b) => <Link key={b.id} href={b.href || "/shop"} className="rounded-2xl border bg-white p-5"><p className="font-bold">{b.title}</p></Link>)}</div></section>}
      {categories.length > 0 && <section className="mx-auto max-w-7xl px-4 py-10"><div className="flex items-end justify-between"><div><p className="text-sm font-semibold text-indigo-600">Explore</p><h2 className="mt-1 text-2xl font-bold">Shop by category</h2></div><Link href="/shop" className="text-sm font-semibold text-indigo-600">View all →</Link></div><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{categories.map((c) => <Link key={c.id} href={"/category/" + c.slug} className="rounded-2xl border bg-white p-5 font-semibold transition hover:-translate-y-0.5 hover:shadow-sm">{c.name}</Link>)}</div></section>}
      <section className="mx-auto max-w-7xl px-4 pb-14">
        <div className="flex items-end justify-between"><div><p className="text-sm font-semibold text-indigo-600">Featured</p><h2 className="mt-1 text-2xl font-bold">Popular products</h2></div><Link href="/shop" className="text-sm font-semibold text-indigo-600">Browse all →</Link></div>
        {featured.length > 0 ? <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{featured.map((p) => <Link key={p.id} href={"/product/" + p.slug} className="overflow-hidden rounded-2xl border bg-white transition hover:-translate-y-0.5 hover:shadow-sm">{p.images[0] && <div className="relative aspect-square w-full"><Image src={p.images[0].url} alt={p.images[0].altText || p.name} fill sizes="(max-width:640px) 50vw,(max-width:1024px) 33vw,25vw" className="object-cover" /></div>}<div className="p-4"><p className="line-clamp-2 text-sm font-semibold">{p.name}</p><p className="mt-2 font-bold">৳{Number(p.price).toLocaleString("en-BD")}</p></div></Link>)}</div> : <div className="mt-5 rounded-2xl border bg-white p-8 text-slate-600">Featured products will appear here soon.</div>}
      </section>
    </main>
  );
}