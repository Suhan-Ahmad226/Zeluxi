const CACHE_NAME = 'store-pwa-v3-offline-screen';
// Brand icons are resolved dynamically from Admin Settings. Do not pin old static logo files.
const STATIC_ASSETS = ['/manifest.webmanifest'];

const offlinePage = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#0f172a">
  <title>You’re offline | Zeluxi</title>
  <style>
    *{box-sizing:border-box}
    body{margin:0;min-height:100vh;min-height:100dvh;padding:24px;display:grid;place-items:center;background:#f8fafc;color:#0f172a;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    main{width:100%;max-width:420px;text-align:center;background:#fff;border:1px solid #e2e8f0;border-radius:28px;padding:36px 26px;box-shadow:0 24px 70px rgba(15,23,42,.09)}
    .brand{font-size:14px;letter-spacing:.22em;font-weight:900;color:#0f172a;margin-bottom:34px}
    .icon{margin:0 auto 22px;width:76px;height:76px;display:grid;place-items:center;border-radius:24px;background:#fff7ed;color:#b45309}
    h1{font-size:26px;line-height:1.2;letter-spacing:-.04em;margin:0 0 12px}
    p{font-size:14px;line-height:1.7;color:#64748b;margin:0 auto 24px;max-width:310px}
    button{width:100%;min-height:48px;border:0;border-radius:14px;background:#0f172a;color:#fff;font-size:14px;font-weight:750;cursor:pointer}
    button:focus-visible{outline:3px solid #818cf8;outline-offset:3px}
    .hint{font-size:12px;color:#94a3b8;margin:18px 0 0}
    @media(prefers-reduced-motion:no-preference){button{transition:background .2s,transform .2s}button:hover{background:#4338ca}button:active{transform:scale(.99)}}
  </style>
</head>
<body>
  <script src="/offline-reconnect.js" defer></script>
  <main>
    <div class="brand">ZELUXI</div>
    <div class="icon" aria-hidden="true">
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18"/><path d="M8.5 8.5A9.7 9.7 0 0 1 12 8c3.2 0 6.1 1.5 8 4"/><path d="M5 12a10 10 0 0 1 2.2-1.8"/><path d="M2 8.8A15.5 15.5 0 0 1 12 5c1.1 0 2.2.1 3.2.3"/><path d="M9.5 15.5a4 4 0 0 1 5 0"/><path d="M12 19h.01"/></svg>
    </div>
    <h1>You’re offline</h1>
    <p>Your internet connection seems to be unavailable. Reconnect to the internet, then try again.</p>
    <button type="button" onclick="window.location.reload()">Try again</button>
    <p class="hint">Your cart may be available again when the connection returns.</p>
  </main>
</body>
</html>`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.all(STATIC_ASSETS.map(async (asset) => {
        try { await cache.add(asset); } catch { /* A missing optional asset must not block installation. */ }
      }));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.includes('/auth/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => new Response(offlinePage, {
      status: 503,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
      }
    })));
    return;
  }

  if (!/\.(png|jpg|jpeg|svg|webp|ico|woff2?)$/i.test(url.pathname)) return;
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok && response.type === 'basic') {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    }))
  );
});
