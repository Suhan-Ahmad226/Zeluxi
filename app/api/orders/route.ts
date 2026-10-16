import { NextRequest, NextResponse } from 'next/server';
import orderHandler from '@/api/orders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function invoke(request: NextRequest) {
  let body: unknown;
  try {
    if (request.method !== 'GET' && request.method !== 'HEAD') body = await request.json();
  } catch {
    body = undefined;
  }

  const headers = Object.fromEntries(request.headers.entries());
  let status = 200;
  const responseHeaders = new Headers();
  let payload: unknown = { error: 'Order service did not return a response.' };

  const responseAdapter = {
    setHeader(name: string, value: string) { responseHeaders.set(name, value); },
    status(code: number) { status = code; return this; },
    json(data: unknown) { payload = data; },
  };

  await orderHandler({ method: request.method, headers, body }, responseAdapter);
  return NextResponse.json(payload, { status, headers: responseHeaders });
}

export async function POST(request: NextRequest) {
  return invoke(request);
}

export async function GET(request: NextRequest) {
  return invoke(request);
}

export async function PATCH(request: NextRequest) {
  return invoke(request);
}
