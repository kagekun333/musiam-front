// Service Worker for 伯爵 MUSIAM PWA
// キャッシュ戦略: Network First + Offline Fallback

const CACHE_VERSION = 'v1';
const CACHE_NAME = `musiam-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline';

// 事前キャッシュするアセット
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/brand/abi-seal.webp',
  '/favicon.ico',
];

// =========================================
// Install: 事前キャッシュ
// =========================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS.map((url) => new Request(url, { cache: 'reload' })));
    })
  );
  self.skipWaiting();
});

// =========================================
// Activate: 古いキャッシュを削除
// =========================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name.startsWith('musiam-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// =========================================
// Fetch: キャッシュ戦略
// =========================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // APIリクエストはキャッシュしない
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  // _next/static は Cache First
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // ページナビゲーションは Network First + キャッシュフォールバック
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            return caches.match('/');
          });
        })
    );
    return;
  }

  // 画像・フォント等は Stale While Revalidate
  if (['image', 'font'].includes(request.destination)) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(request).then((cached) => {
          const networkFetch = fetch(request).then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          });
          return cached || networkFetch;
        })
      )
    );
    return;
  }

  // その他は Network First
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// =========================================
// Push: プッシュ通知
// =========================================
self.addEventListener('push', (event) => {
  let data = {
    title: '伯爵 MUSIAM',
    body: '館からのお知らせがあります。',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    data: { url: '/' },
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      data: data.data,
      vibrate: [200, 100, 200],
      tag: 'musiam-notification',
      renotify: true,
    })
  );
});

// =========================================
// Notification Click: 通知クリック
// =========================================
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url === targetUrl && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// =========================================
// Message: クライアントからのメッセージ
// =========================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});
