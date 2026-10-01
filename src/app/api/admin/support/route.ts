import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getCurrentLocalUser } from "@/lib/auth/current-user";

export async function GET() {
  const user = await getCurrentLocalUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await db.supportTicket.findMany({
    orderBy: { updatedAt: "desc" }, take: 200,
    include: { user: { select: { name: true, email: true } }, order: { select: { orderNumber: true } }, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
  }));
}
