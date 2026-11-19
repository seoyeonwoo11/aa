// 하루수능 서비스 워커: 인터넷이 없어도 앱 화면이 열리게 한다.
//
// - 페이지(HTML): 네트워크를 먼저 쓰고(새 배포를 바로 받도록), 안 되면 저장해 둔 사본
// - 앱 파일(js·css·아이콘): 저장해 둔 사본을 먼저 쓴다. 파일 이름에 버전이 들어 있어 내용이 바뀌면 이름도 바뀐다.
// - 다른 주소(Supabase 등)는 건드리지 않는다. 데이터는 앱의 저장 방식(브라우저 사본 + 동기화)이 처리한다.

const CACHE = 'haru-suneung-v1';
const SHELL = ['./', './manifest.webmanifest', './favicon.svg', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// 새 페이지가 쓰는 앱 파일만 남기고, 예전 배포의 파일은 지운다.
async function pruneOldAssets(html) {
  const used = new Set([...html.matchAll(/assets\/[\w.-]+/g)].map((m) => m[0]));
  const cache = await caches.open(CACHE);
  for (const request of await cache.keys()) {
    const path = new URL(request.url).pathname;
    const match = path.match(/assets\/[\w.-]+$/);
    if (match && !used.has(match[0])) await cache.delete(request);
  }
}

async function handlePage(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put('./', response.clone());
      response.clone().text().then(pruneOldAssets).catch(() => {});
    }
    return response;
  } catch {
    return (await cache.match('./')) || Response.error();
  }
}

async function handleFile(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  const refresh = () => fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  });
  if (!hit) return refresh();
  // 버전이 붙은 앱 파일(assets/)은 사본 그대로. 아이콘·매니페스트처럼 이름이 고정된 파일은
  // 사본을 먼저 보여주고 뒤에서 새로 받아 둔다.
  if (!new URL(request.url).pathname.includes('/assets/')) refresh().catch(() => {});
  return hit;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase 등 바깥 주소는 그대로 통과

  if (request.mode === 'navigate') event.respondWith(handlePage(request));
  else event.respondWith(handleFile(request));
});
