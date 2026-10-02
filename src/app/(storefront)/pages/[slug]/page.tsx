import { notFound } from "next/navigation";
import { db } from "@/lib/db/client";

export default async function CmsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await db.page.findFirst({ where: { slug, isPublished: true } });
  if (!page) notFound();

  const content = page.content && typeof page.content === "object" ? page.content as { blocks?: unknown[] } : {};
  const blocks = Array.isArray(content.blocks) ? content.blocks : [];

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
      <article>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{page.title}</h1>
        <div className="prose prose-slate mt-8 max-w-none">
          {blocks.length ? blocks.map((block, index) => {
            if (!block || typeof block !== "object") return null;
            const item = block as { type?: string; text?: string; title?: string; items?: unknown[] };
            if (item.type === "heading") return <h2 key={index}>{item.text || item.title}</h2>;
            if (item.type === "list" && Array.isArray(item.items)) return <ul key={index}>{item.items.map((value, i) => <li key={i}>{String(value)}</li>)}</ul>;
            if (item.type === "html") return <div key={index} dangerouslySetInnerHTML={{ __html: item.text || "" }} />;
            return <p key={index}>{item.text || item.title || JSON.stringify(block)}</p>;
          }) : <p className="whitespace-pre-wrap">{JSON.stringify(page.content, null, 2)}</p>}
        </div>
      </article>
    </main>
  );
}
