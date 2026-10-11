// Offline support: network-first for pages, cache-first for static files and dish photos.
// API responses (TheMealDB JSON, /api/*) are never cached here; the recipe library lives in IndexedDB.
const CACHE = "nutristack-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add("/")));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function remember(request, response) {
  if (response.ok || response.type === "opaque") {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(request, copy));
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.pathname.startsWith("/api/")) return;
  const isMealPhoto = url.hostname.endsWith("themealdb.com") && url.pathname.startsWith("/images/");
  if (url.origin !== self.location.origin && !isMealPhoto) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then((r) => remember(new Request("/"), r)).catch(() => caches.match("/")));
    return;
  }
  event.respondWith(
    caches.match(request).then((hit) => hit || fetch(request).then((r) => remember(request, r))),
  );
});
