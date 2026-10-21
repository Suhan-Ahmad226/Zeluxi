import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { formatOrderNumber } from '@/src/lib/orders/order-number';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function maskPhone(phone: unknown): string {
  if (typeof phone !== 'string') return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 6) return '01*********';
  return digits.slice(0, 3) + '*****' + digits.slice(-3);
}

function maskName(name: unknown): string {
  if (typeof name !== 'string' || !name.trim()) return 'Customer';
  const parts = name.trim().split(/\s+/);
  return parts.map((p) => p.length > 2 ? p[0] + '*'.repeat(p.length - 2) + p[p.length - 1] : p[0] + '*').join(' ');
}

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get('q') || '').trim();
  if (!q || q.length < 2 || q.length > 80) {
    return NextResponse.json({ error: 'Please enter a valid order number or tracking code.' }, { status: 400 });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Tracking service is temporarily unavailable.' }, { status: 503 });
  }

  try {
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

    // 1. Check if q is formatted order number (e.g. ZLX-000123) or plain numeric
    let numericOrderNumber: number | null = null;
    const zlxMatch = q.match(/^ZLX-(\d+)$/i);
    if (zlxMatch) {
      numericOrderNumber = Number(zlxMatch[1]);
    } else if (/^\d+$/.test(q) && q.length <= 12) {
      numericOrderNumber = Number(q);
    }

    // 2. Check if UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q);

    let query = admin.from('store_orders').select('id,order_number,status,customer,created_at,subtotal,shipping_fee,discount,grand_total,store_order_items(product_name,quantity),courier_shipments(*)');

    if (numericOrderNumber !== null && Number.isSafeInteger(numericOrderNumber)) {
      query = query.eq('order_number', numericOrderNumber);
    } else if (isUuid) {
      query = query.eq('id', q);
    } else {
      // Check courier_shipments for consignment_id
      const { data: shipmentRow } = await admin
        .from('courier_shipments')
        .select('order_id')
        .eq('consignment_id', q)
        .maybeSingle();

      if (shipmentRow?.order_id) {
        query = query.eq('id', shipmentRow.order_id);
      } else {
        return NextResponse.json({ error: 'No order found with the provided identifier.' }, { status: 404 });
      }
    }

    const { data: orderRow, error: orderError } = await query.maybeSingle();
    if (orderError || !orderRow) {
      return NextResponse.json({ error: 'No order found with the provided identifier.' }, { status: 404 });
    }

    const customer = (orderRow.customer && typeof orderRow.customer === 'object') ? orderRow.customer as Record<string, any> : {};
    const shipments = Array.isArray(orderRow.courier_shipments) ? orderRow.courier_shipments : [];
    const activeShipment = shipments[0] || null;

    const maskedCustomer = {
      fullName: maskName(customer.fullName),
      phone: maskPhone(customer.phone),
      email: '',
      division: customer.division || '',
      district: customer.district || '',
      thanaCity: customer.thanaCity || '',
      addressDetails: `${customer.district || customer.division || ''} (Protected delivery)`,
    };

    const courier = {
      provider: activeShipment?.provider || 'PATHAO',
      trackingCode: activeShipment?.consignment_id || '',
      consignmentId: activeShipment?.consignment_id || '',
      estimatedDelivery: customer.division?.toLowerCase().includes('dhaka') ? '24–48 hours' : '2–4 days',
      bookingStatus: activeShipment?.status || 'NOT_BOOKED',
    };

    const statusHistory = [
      { status: orderRow.status, timestamp: orderRow.created_at, note: 'Order verified in central logistics system.' },
    ];

    const safeOrder = {
      id: orderRow.id,
      orderNumber: formatOrderNumber(orderRow.order_number),
      createdAt: orderRow.created_at,
      status: orderRow.status,
      customer: maskedCustomer,
      items: (orderRow.store_order_items || []).map((item: any) => ({
        productName: item.product_name,
        quantity: item.quantity,
      })),
      subtotal: Number(orderRow.subtotal),
      shippingFee: Number(orderRow.shipping_fee),
      discount: Number(orderRow.discount || 0),
      grandTotal: Number(orderRow.grand_total),
      courier,
      statusHistory,
    };

    return NextResponse.json({ order: safeOrder }, { headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch (error) {
    return NextResponse.json({ error: 'Unable to track order at this moment.' }, { status: 500 });
  }
}
