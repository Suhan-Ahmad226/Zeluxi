import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { getCurrentLocalUser } from "@/lib/auth/current-user";

const messageSchema = z.object({ body: z.string().trim().min(1).max(5000) });

export async function GET(_: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  const user = await getCurrentLocalUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { ticketId } = await params;
  const ticket = await db.supportTicket.findFirst({
    where: user.role === "ADMIN" ? { id: ticketId } : { id: ticketId, userId: user.id },
    include: { order: { select: { orderNumber: true } }, messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true, role: true } } } } },
  });
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  return NextResponse.json(ticket);
}

export async function POST(req: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  const user = await getCurrentLocalUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { ticketId } = await params;
  const parsed = messageSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid message" }, { status: 400 });
  const ticket = await db.supportTicket.findFirst({ where: user.role === "ADMIN" ? { id: ticketId } : { id: ticketId, userId: user.id }, select: { id: true, status: true } });
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  if (ticket.status === "CLOSED") return NextResponse.json({ error: "This ticket is closed." }, { status: 409 });
  const message = await db.$transaction(async tx => {
    const created = await tx.supportMessage.create({ data: { ticketId, authorUserId: user.id, body: parsed.data.body, isStaff: user.role === "ADMIN" } });
    await tx.supportTicket.update({ where: { id: ticketId }, data: { status: user.role === "ADMIN" ? "WAITING_FOR_CUSTOMER" : "OPEN" } });
    return created;
  });
  return NextResponse.json(message, { status: 201 });
}
