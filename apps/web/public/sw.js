const CACHE = 'homegraph-v3';
const ASSETS = [
  '/',
  '/docs/metrics.full.json',
  '/docs/metrics.json',
  '/assets/mock-scan.glb',
  '/assets/example.gif'
];

// IndexedDB helpers for a small write queue
const DB_NAME = 'homegraph-sw';
const STORE = 'queue';
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function putQueue(item) {
  const db = await openDB();
  await new Promise((res, rej) => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).add(item); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  db.close();
  broadcastQueueSize();
}
async function getAllQueue() {
  const db = await openDB();
  const items = await new Promise((res, rej) => { const tx = db.transaction(STORE, 'readonly'); const req = tx.objectStore(STORE).getAll(); req.onsuccess = () => res(req.result || []); req.onerror = () => rej(req.error); });
  db.close();
  return items;
}
async function clearQueue() {
  const db = await openDB();
  await new Promise((res, rej) => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).clear(); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  db.close();
  broadcastQueueSize();
}
async function queueSize() {
  const db = await openDB();
  const count = await new Promise((res, rej) => { const tx = db.transaction(STORE, 'readonly'); const req = tx.objectStore(STORE).count(); req.onsuccess = () => res(req.result || 0); req.onerror = () => rej(req.error); });
  db.close();
  return count;
}
async function broadcastQueueSize() {
  try {
    const size = await queueSize();
    const clientsList = await self.clients.matchAll();
    clientsList.forEach((c) => c.postMessage({ type: 'queueSize', size }));
  } catch {}
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

// Cache-first for assets; network-first for HTML
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  const isAsset = url.pathname.startsWith('/assets/') || url.pathname.startsWith('/textures/') || url.pathname.startsWith('/docs/') || url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/basis/');

  // Queue writes while offline
  if (req.method !== 'GET' && url.pathname.startsWith('/api/')) {
    event.respondWith((async () => {
      try {
        const res = await fetch(req.clone());
        return res;
      } catch (e) {
        try {
          const body = await req.clone().text();
          await putQueue({ url: req.url, method: req.method, headers: Array.from(req.headers.entries()), body });
          // Attempt to register background sync
          try { const reg = await self.registration.sync.register('flush-writes'); } catch {}
        } catch {}
        return new Response(JSON.stringify({ ok: false, queued: true }), { status: 202, headers: { 'content-type': 'application/json' } });
      }
    })());
    return;
  }

  if (req.method !== 'GET') return;

  if (isAsset) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }))
    );
  } else if (url.pathname.startsWith('/api/')) {
    // Runtime cache for API GETs: network-first with cache fallback
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req))
    );
  } else if (req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match('/'))
    );
  }
});

// Background sync to flush queued writes
self.addEventListener('sync', (event) => {
  if (event.tag === 'flush-writes') {
    event.waitUntil(flushQueue());
  }
});

async function flushQueue() {
  const items = await getAllQueue();
  if (!items.length) return;
  for (const it of items) {
    try {
      const headers = new Headers(it.headers || []);
      await fetch(it.url, { method: it.method, headers, body: it.body });
    } catch {}
  }
  await clearQueue();
}

self.addEventListener('message', (event) => {
  const msg = event.data || {};
  if (msg && msg.type === 'warmCache' && Array.isArray(msg.urls)) {
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE);
      for (const u of msg.urls) {
        try { const res = await fetch(u, { credentials: 'omit' }); await cache.put(u, res); } catch {}
      }
    })());
  } else if (msg && msg.type === 'flushQueue') {
    event.waitUntil(flushQueue());
  } else if (msg && msg.type === 'getQueueSize') {
    event.waitUntil(broadcastQueueSize());
  }
});
