import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentLocalUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/client";
import { OrderStatus } from "@prisma/client";

const schema = z.object({ action: z.enum(["CANCEL", "RETURN"]) });

export async function POST(req: Request, { params }: { params: Promise<{ orderNumber: string }> }) {
  const user = await getCurrentLocalUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid order action" }, { status: 400 });
  const { orderNumber } = await params;

  try {
    const result = await db.$transaction(async (tx) => {
      const order = await tx.order.findFirst({ where: { orderNumber, userId: user.id }, include: { items: true } });
      if (!order) throw new Error("Order not found");
      const next = parsed.data.action === "CANCEL" ? OrderStatus.CANCELLED : OrderStatus.RETURN_REQUESTED;
      const canCancel = [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PROCESSING].includes(order.status);
      const canReturn = order.status === OrderStatus.DELIVERED;
      if ((next === OrderStatus.CANCELLED && !canCancel) || (next === OrderStatus.RETURN_REQUESTED && !canReturn)) throw new Error("This order is not eligible for that action.");

      if (next === OrderStatus.CANCELLED) {
        for (const item of order.items) {
          const where = item.variantId ? { variantId: item.variantId } : { productId: item.productId };
          const result = order.status === OrderStatus.PENDING
            ? await tx.inventory.updateMany({ where: { ...where, reserved: { gte: item.quantity } }, data: { available: { increment: item.quantity }, reserved: { decrement: item.quantity } } })
            : await tx.inventory.updateMany({ where, data: { available: { increment: item.quantity } } });
          if (result.count !== 1) throw new Error("Inventory record is inconsistent for this order.");
        }
      }

      const updated = await tx.order.update({ where: { id: order.id }, data: { status: next } });
      await tx.orderStatusHistory.create({ data: { orderId: order.id, fromStatus: order.status, toStatus: next, note: parsed.data.action === "CANCEL" ? "Customer cancellation" : "Customer return request" } });
      await tx.auditLog.create({ data: { actorUserId: user.id, action: parsed.data.action === "CANCEL" ? "CUSTOMER_ORDER_CANCEL" : "CUSTOMER_RETURN_REQUEST", entityType: "Order", entityId: order.id, before: { status: order.status }, after: { status: next } } });
      return updated;
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update order" }, { status: 409 });
  }
}
