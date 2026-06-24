// Service Worker · Dieta Rony Cozzi
// Network-first para HTML/JS/CSS; cache-first para assets estáticos.

const VERSION = "v65-2026-06-24-clean-mobile";
const CACHE_NAME = `dieta-rony-${VERSION}`;
const ASSETS = [
  "./",
  "./index.html",
  "./assets/fonts/fonts.css",
  "./styles.css",
  "./styles.css?v=20260624-clean-mobile",
  "./script.js",
  "./script.js?v=20260624-clean-mobile",
  "./favicon.svg",
  "./manifest.json",
  "./assets/rony-cozzi.jpg",
  "./assets/fonts/plus-jakarta-sans-latin-ext.woff2",
  "./assets/fonts/plus-jakarta-sans-latin.woff2",
  "./assets/fonts/space-grotesk-latin-ext.woff2",
  "./assets/fonts/space-grotesk-latin.woff2",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const accept = event.request.headers.get("accept") || "";
  const isNavigate = event.request.mode === "navigate" || accept.includes("text/html");
  const isApiRequest = isSameOrigin && url.pathname.startsWith("/api/");
  const wantsNoStore = event.request.cache === "no-store" || event.request.cache === "reload";

  if (isApiRequest || wantsNoStore) {
    event.respondWith(fetch(event.request));
    return;
  }

  const isAppFile = isSameOrigin && (
    isNavigate ||
    url.pathname.endsWith("/") ||
    ["/index.html", "/styles.css", "/script.js"].some((path) => url.pathname.endsWith(path))
  );

  if (isAppFile) {
    event.respondWith(
      fetch(new Request(event.request, { cache: "reload" }))
        .then((response) => {
          if (response.ok && isSameOrigin) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
    );
    return;
  }

  // Para requests cross-origin (fonts, etc), evitamos responder con index.html en offline.
  if (!isSameOrigin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => isNavigate ? caches.match("./index.html") : new Response("", { status: 504, statusText: "Offline" }));
    })
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
