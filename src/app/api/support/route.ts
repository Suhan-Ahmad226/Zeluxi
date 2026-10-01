import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { getCurrentLocalUser } from "@/lib/auth/current-user";

const createSchema = z.object({
  subject: z.string().trim().min(3).max(160),
  category: z.enum(["GENERAL","ORDER","PAYMENT","SHIPPING","RETURN","PRODUCT","ACCOUNT"]).default("GENERAL"),
  priority: z.enum(["LOW","NORMAL","HIGH"]).default("NORMAL"),
  orderId: z.string().trim().optional(),
  message: z.string().trim().min(5).max(5000),
});

export async function GET() {
  const user = await getCurrentLocalUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tickets = await db.supportTicket.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { order: { select: { orderNumber: true } }, messages: { orderBy: { createdAt: "asc" }, take: 1 } },
  });
  return NextResponse.json(tickets);
}

export async function POST(req: Request) {
  const user = await getCurrentLocalUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  if (parsed.data.orderId) {
    const order = await db.order.findFirst({ where: { id: parsed.data.orderId, userId: user.id }, select: { id: true } });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  const ticketNumber = "ZLX-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
  const ticket = await db.supportTicket.create({
    data: {
      ticketNumber,
      userId: user.id,
      orderId: parsed.data.orderId || null,
      subject: parsed.data.subject,
      category: parsed.data.category,
      priority: parsed.data.priority,
      messages: { create: { authorUserId: user.id, body: parsed.data.message, isStaff: false } },
    },
    include: { messages: true },
  });
  return NextResponse.json(ticket, { status: 201 });
}
