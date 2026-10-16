type LegacyHandler = (req: any, res: any) => unknown | Promise<unknown>;

/** Bridges the existing fail-closed API handlers to the Next.js App Router Request/Response contract. */
export async function runLegacyApi(request: Request, handler: LegacyHandler): Promise<Response> {
  const headers: Record<string, string | string[] | undefined> = {};
  request.headers.forEach((value, key) => { headers[key.toLowerCase()] = value; });

  const url = new URL(request.url);
  const query: Record<string, string | string[] | undefined> = {};
  url.searchParams.forEach((value, key) => {
    const previous = query[key];
    query[key] = previous === undefined ? value : Array.isArray(previous) ? [...previous, value] : [previous, value];
  });

  let body: unknown;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const raw = await request.text();
    if (raw) {
      try { body = JSON.parse(raw); } catch { body = raw; }
    }
  }

  let statusCode = 200;
  let payload: unknown = { error: 'The API handler returned no response.' };
  const responseHeaders = new Headers();
  const response = {
    setHeader(name: string, value: string) { responseHeaders.set(name, value); },
    status(code: number) { statusCode = code; return response; },
    json(value: unknown) { payload = value; },
  };

  try {
    await handler({ method: request.method, headers, query, body }, response);
  } catch {
    statusCode = 500;
    payload = { error: 'Unexpected API error.' };
  }

  responseHeaders.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(payload), { status: statusCode, headers: responseHeaders });
}
