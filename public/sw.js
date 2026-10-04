/*
 * anima.js service worker — offline support for the installed app.
 *
 * Strategies:
 *   - Page navigations: network first, falling back to the cached copy of
 *     that page, then to the precached /offline page.
 *   - Hashed build assets (/_next/static, fonts, icons): cache first —
 *     their URLs change whenever their content does.
 *   - Registry JSON (/r/*): stale-while-revalidate.
 *   - Everything else (demo video, RSC payloads) goes to the network.
 *
 * Bump VERSION to drop every old cache on the next activation.
 */
const VERSION = "v1";
const PRECACHE = `anima-precache-${VERSION}`;
const RUNTIME = `anima-runtime-${VERSION}`;
const OFFLINE_URL = "/offline";

const PRECACHE_URLS = [
  OFFLINE_URL,
  "/",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
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
            .filter((key) => key !== PRECACHE && key !== RUNTIME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function networkFirstPage(request) {
  const cache = await caches.open(RUNTIME);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return (
      (await cache.match(request)) ||
      (await caches.match(request)) ||
      (await caches.match(OFFLINE_URL))
    );
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(RUNTIME);
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || network;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // Third-party requests (fonts CDN, analytics) are left to the browser.
  if (url.origin !== self.location.origin) return;
  // Range requests (video seeking) can't be served from a whole cached body.
  if (request.headers.has("range")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(?:woff2?|ttf|otf)$/.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (url.pathname.startsWith("/r/")) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
