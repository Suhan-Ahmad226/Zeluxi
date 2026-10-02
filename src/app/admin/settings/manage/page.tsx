import { redirect } from "next/navigation";
import { getCurrentLocalUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/client";
import { SettingsManager } from "@/components/admin/settings-manager";

const DEFAULT_KEYS = [
  "store.name", "store.phone", "store.email", "store.currency",
  "checkout.codEnabled", "checkout.onlineEnabled",
  "shipping.insideDhaka", "shipping.outsideDhaka", "shipping.freeThreshold",
  "seo.defaultTitle", "seo.defaultDescription",
];

export default async function SettingsManagePage() {
  const user = await getCurrentLocalUser();
  if (!user) redirect("/login?next=/admin/settings/manage");
  if (user.role !== "ADMIN") redirect("/account");
  const settings = await db.siteSetting.findMany({ orderBy: { key: "asc" } });
  const existing = new Map(settings.map((item) => [item.key, item.value]));
  const initial = DEFAULT_KEYS.map((key) => ({ key, value: existing.get(key) ?? null }));
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
      <p className="text-sm font-semibold text-indigo-600">Admin · Settings</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Operational settings</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">Manage store, checkout, shipping and SEO defaults from one responsive workspace.</p>
      <div className="mt-7"><SettingsManager initial={initial} /></div>
    </main>
  );
}
