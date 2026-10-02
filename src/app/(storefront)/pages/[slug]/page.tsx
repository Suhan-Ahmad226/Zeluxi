import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db/client";

type Props = { params: Promise<{ slug: string }> };

async function getPage(slug: string) {
  return db.page.findFirst({ where: { slug, isPublished: true } });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) return {};
  return {
    title: page.seoTitle || page.title,
    description: page.seoDescription || undefined,
  };
}

export default async function CmsPage({ params }: Props) {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) notFound();

  const content = page.content && typeof page.content === "object" ? page.content as { blocks?: unknown[] } : {};
  const blocks = Array.isArray(content.blocks) ? content.blocks : [];

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
      <article>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{page.title}</h1>
        <div className="mt-8 space-y-6 text-[15px] leading-7 text-slate-700">
          {blocks.length ? blocks.map((block, index) => {
            if (!block || typeof block !== "object") return null;
            const item = block as { type?: string; text?: string; title?: string; items?: unknown[] };
            if (item.type === "heading") return <h2 key={index} className="text-2xl font-bold text-slate-950">{item.text || item.title}</h2>;
            if (item.type === "list" && Array.isArray(item.items)) return <ul key={index} className="list-disc space-y-2 pl-6">{item.items.map((value, i) => <li key={i}>{String(value)}</li>)}</ul>;
            return <p key={index} className="whitespace-pre-wrap">{item.text || item.title || JSON.stringify(block)}</p>;
          }) : <p className="whitespace-pre-wrap">{JSON.stringify(page.content, null, 2)}</p>}
        </div>
      </article>
    </main>
  );
}
