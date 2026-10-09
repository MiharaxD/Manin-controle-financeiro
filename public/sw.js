/* Cache only the generated public application shell; financial data lives in IndexedDB. */
importScripts("/offline-manifest.js");
const CACHE = "manin-shell-" + self.MANIN_SHELL.version;
const ALLOWED = new Set(self.MANIN_SHELL.urls);
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([...ALLOWED]))
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("manin-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin)
    return;
  const path = ALLOWED.has(url.pathname)
    ? url.pathname
    : ALLOWED.has(url.pathname + "/")
      ? url.pathname + "/"
      : null;
  if (!path) return; // Never cache OAuth, Drive, downloads, or arbitrary requests.
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(path);
      if (cached) return cached;
      return fetch(event.request);
    }),
  );
});
