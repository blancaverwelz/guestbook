/**
 * Minimal offline shell — NOT a full pre-cache/offline-first PWA.
 *
 * Scope, deliberately: a guest who has already visited a page on a spotty
 * venue wifi connection can reopen it with no network at all. Nothing is
 * pre-cached at install time; pages and assets are cached opportunistically
 * as they're actually visited/fetched, per the Chat 9 spec ("previously
 * visited pages only"). A page never visited before going offline will
 * still fail — that's expected, not a bug.
 *
 * Strategy:
 *  - Navigations (HTML documents): network-first, falling back to cache.
 *    Guests should always see live data (new messages/photos) when online;
 *    cache is a fallback for offline, not a way to serve stale content
 *    over a working connection.
 *  - Everything else same-origin GET (JS/CSS/images/fonts): cache-first,
 *    filling the cache in the background on first fetch. These are
 *    content-hashed or rarely-changing static assets, so cache-first is
 *    safe and avoids a network round-trip on repeat visits.
 *
 * Cross-origin requests (Supabase REST/Storage/Realtime) are left
 * untouched — never intercepted or cached. Caching a moderation-gated
 * photo or a Realtime handshake would be actively wrong, not just
 * unnecessary.
 */

const CACHE_NAME = "guestbook-shell-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only ever handle same-origin GET requests. Everything else (Supabase
  // calls, POST/PUT/DELETE, other origins) passes straight through
  // untouched — the browser's default network handling applies.
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || Response.error()))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        // Only cache successful, basic (same-origin, non-opaque) responses.
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
