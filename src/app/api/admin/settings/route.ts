import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentLocalUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/client";

const ALLOWED_KEYS = new Set([
  "store.name",
  "store.phone",
  "store.email",
  "store.currency",
  "checkout.codEnabled",
  "checkout.onlineEnabled",
  "shipping.insideDhaka",
  "shipping.outsideDhaka",
  "shipping.freeThreshold",
  "seo.defaultTitle",
  "seo.defaultDescription",
]);

const schema = z.object({
  key: z.string().min(1).max(100),
  value: z.union([z.string().max(1000), z.number().finite(), z.boolean()]),
});

export async function GET() {
  const user = await getCurrentLocalUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const settings = await db.siteSetting.findMany({ orderBy: { key: "asc" } });
  return NextResponse.json(settings);
}

export async function PATCH(req: Request) {
  const user = await getCurrentLocalUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !ALLOWED_KEYS.has(parsed.data.key)) return NextResponse.json({ error: "Invalid setting" }, { status: 400 });

  const setting = await db.$transaction(async (tx) => {
    const previous = await tx.siteSetting.findUnique({ where: { key: parsed.data.key } });
    const next = await tx.siteSetting.upsert({
      where: { key: parsed.data.key },
      create: { key: parsed.data.key, value: parsed.data.value },
      update: { value: parsed.data.value },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: user.id,
        action: "SETTING_UPDATED",
        entityType: "SITE_SETTING",
        entityId: next.id,
        before: previous?.value ?? null,
        after: next.value,
        context: { key: next.key },
      },
    });
    return next;
  });

  return NextResponse.json(setting);
}
