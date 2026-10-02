import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentLocalUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/client";

const schema = z.object({
  inventoryId: z.string().min(1),
  available: z.coerce.number().int().min(0),
  lowStockThreshold: z.coerce.number().int().min(0).max(100000),
  reason: z.string().trim().min(2).max(200).optional(),
});

export async function GET() {
  const user = await getCurrentLocalUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rows = await db.inventory.findMany({
    orderBy: { updatedAt: "desc" },
    include: { product: { select: { id: true, name: true, sku: true, isPublished: true } }, variant: { select: { id: true, name: true, sku: true } } },
  });
  return NextResponse.json(rows);
}

export async function PATCH(req: Request) {
  const user = await getCurrentLocalUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid inventory data" }, { status: 400 });

  const updated = await db.$transaction(async (tx) => {
    const current = await tx.inventory.findUnique({ where: { id: parsed.data.inventoryId } });
    if (!current || parsed.data.available < current.reserved) return null;
    const next = await tx.inventory.update({
      where: { id: parsed.data.inventoryId },
      data: { available: parsed.data.available, lowStockThreshold: parsed.data.lowStockThreshold },
    });
    if (current.available !== next.available || current.lowStockThreshold !== next.lowStockThreshold) {
      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          action: "INVENTORY_ADJUSTED",
          entityType: "INVENTORY",
          entityId: current.id,
          before: { available: current.available, reserved: current.reserved, lowStockThreshold: current.lowStockThreshold },
          after: { available: next.available, reserved: next.reserved, lowStockThreshold: next.lowStockThreshold },
        },
      });
    }
    if (current.available !== next.available) {
      await tx.inventoryAdjustment.create({
        data: {
          inventoryId: current.id,
          actorUserId: user.id,
          quantityDelta: next.available - current.available,
          previousAvailable: current.available,
          newAvailable: next.available,
          reason: parsed.data.reason ?? "Manual stock adjustment",
        },
      });
    }
    return next;
  });

  if (!updated) return NextResponse.json({ error: "Inventory not found or available stock cannot be below reserved stock." }, { status: 409 });
  return NextResponse.json(updated);
}
