// Service Worker · Dieta Rony Cozzi
// Estrategia: network-first para HTML/JS/CSS (siempre versión nueva si hay internet),
// cache-first para assets estáticos (favicon, manifest)

const VERSION = "v9-2026-05-18-shortcuts";
const CACHE_NAME = `dieta-rony-${VERSION}`;
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./script.js",
  "./favicon.svg",
  "./manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const isAppFile = ["/index.html", "/styles.css", "/script.js"].some((path) =>
    url.pathname.endsWith(path) || url.pathname === "/"
  );

  if (isAppFile) {
    // Network-first: intentamos red primero, fallback a cache
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response.ok && url.origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
    );
  } else {
    // Cache-first para assets (favicon, fonts)
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok && url.origin === self.location.origin) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        }).catch(() => caches.match("./index.html"));
      })
    );
  }
});

// Mensaje desde la app para forzar skipWaiting (instalar versión nueva)
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
