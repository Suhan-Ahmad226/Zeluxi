import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { Prisma } from "@prisma/client";
import { getPaymentProvider } from "@/modules/payments/registry";
import { markPaymentFailed, markPaymentPaid } from "@/modules/payments/service";

async function handle(request: Request) {
  const url = new URL(request.url);
  const values: Record<string, string> = {};
  if (request.method === "POST") {
    const form = await request.formData();
    for (const [k, v] of form.entries()) values[k] = String(v);
  } else url.searchParams.forEach((v, k) => { values[k] = v; });

  const tranId = values.tran_id?.trim();
  const status = (values.status || "").toUpperCase();
  if (!tranId) return NextResponse.redirect(new URL("/payment/callback?status=INVALID", url));

  const payment = await db.payment.findFirst({
    where: { provider: "SSLCOMMERZ", providerReference: tranId },
    include: { order: { select: { orderNumber: true } } },
  });
  if (!payment) return NextResponse.redirect(new URL("/payment/callback?status=NOT_FOUND", url));

  try {
    const provider = getPaymentProvider("SSLCOMMERZ");
    const verified = await provider.verifyPayment(tranId);
    if (verified.status === "PAID") {
      if (!verified.amount || Number(verified.amount) !== Number(payment.amount)) throw new Error("Gateway amount validation failed.");
      await markPaymentPaid(tranId);
    } else if (verified.status === "FAILED") {
      await markPaymentFailed(tranId);
    }
    const result = verified.status === "PAID" ? "success" : verified.status === "FAILED" ? "failed" : status === "CANCELLED" ? "cancelled" : "pending";
    return NextResponse.redirect(new URL(`/payment/callback?status=${result}&order=${encodeURIComponent(payment.order.orderNumber)}`, url));
  } catch {
    return NextResponse.redirect(new URL(`/payment/callback?status=ERROR&order=${encodeURIComponent(payment.order.orderNumber)}`, url));
  }
}
export async function GET(req: Request) { return handle(req); }
export async function POST(req: Request) { return handle(req); }