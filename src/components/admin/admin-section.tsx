import Link from "next/link";

const routes: Record<string, string> = {
  "General": "/admin/settings/manage",
  "Store": "/admin/settings/manage",
  "Currency": "/admin/settings/manage",
  "Checkout": "/admin/settings/manage",
  "Shipping": "/admin/settings/manage",
  "Payments": "/admin/settings/manage",
  "Tax": "/admin/settings/manage",
  "Notifications": "/admin/notifications",
  "Email": "/admin/settings/manage",
  "SMS": "/admin/settings/manage",
  "Social": "/admin/settings/manage",
  "SEO": "/admin/seo",
  "Security": "/admin/security",
  "API": "/admin/settings/manage",
  "Integrations": "/admin/settings/manage",
  "Shipments": "/admin/logistics/dashboard",
  "Tracking": "/admin/logistics/dashboard",
  "Delivery Zones": "/admin/logistics/dashboard",
  "Courier Settings": "/admin/settings/manage",
};

export function AdminSection({ title, description, items }: { title: string; description: string; items: string[] }) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-indigo-600">Admin</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{title}</h1>
        <p className="mt-2 text-slate-600">{description}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const href = routes[item];
            const content = (
              <>
                <p className="font-semibold text-slate-900">{item}</p>
                <p className="mt-1 text-sm text-slate-500">Open the management workspace →</p>
              </>
            );
            return href ? <Link key={item} href={href} className="rounded-xl border border-slate-200 p-4 transition hover:border-indigo-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">{content}</Link> : <div key={item} className="rounded-xl border border-slate-200 p-4">{content}</div>;
          })}
        </div>
      </div>
    </main>
  );
}
