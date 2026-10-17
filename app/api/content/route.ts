import { NextRequest, NextResponse } from 'next/server';
import contentHandler from '@/api/content';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function invoke(request: NextRequest) {
  let body: unknown;

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'A valid JSON request body is required.' }, { status: 400 });
    }
  }

  const headers = Object.fromEntries(request.headers.entries());
  let status = 200;
  const responseHeaders = new Headers();
  let payload: unknown = { error: 'Content service did not return a response.' };

  const responseAdapter = {
    setHeader(name: string, value: string) {
      responseHeaders.set(name, value);
    },
    status(code: number) {
      status = code;
      return this;
    },
    json(data: unknown) {
      payload = data;
    },
  };

  await contentHandler({ method: request.method, headers, body }, responseAdapter);
  return NextResponse.json(payload, { status, headers: responseHeaders });
}

export async function GET(request: NextRequest) {
  return invoke(request);
}

export async function PUT(request: NextRequest) {
  return invoke(request);
}
