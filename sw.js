// sw.js
const CACHE_NAME = 'cycletimer-v11';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './sw.js',
  // ここに自前のファイルを足す（CSS/JS/画像などを別ファイル化した場合）
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-180.png'
];

// インストール：App Shellをキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// 有効化：古いキャッシュを掃除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 取得：ナビゲーションはネット優先→失敗したらキャッシュ、その他の静的ファイルはキャッシュ優先
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 同一オリジンのみ扱う（CDN等はスルー）
  if (url.origin !== location.origin) return;

  if (req.mode === 'navigate') {
    // 画面遷移はネット優先
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        return fresh;
      } catch (e) {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match('./index.html')) || Response.error();
      }
    })());
  } else {
    // 静的ファイルはキャッシュ優先
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      if (cached) return cached;
      const fresh = await fetch(req);
      // 成功した静的リソースのみキャッシュ（POST等は除外）
      if (req.method === 'GET' && fresh.ok) cache.put(req, fresh.clone());
      return fresh;
    })());
  }
});

// 任意：クライアントから更新指示を受け取ったら即時更新
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
