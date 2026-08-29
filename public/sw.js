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
 *  - Document requests (see isDocumentRequest below): network-first,
 *    falling back to cache. Guests should always see live data (new
 *    messages/photos) when online; cache is a fallback for offline, not a
 *    way to serve stale content over a working connection.
 *  - Everything else same-origin GET (JS/CSS/images/fonts): cache-first,
 *    filling the cache in the background on first fetch. These are
 *    content-hashed or rarely-changing static assets, so cache-first is
 *    safe and avoids a network round-trip on repeat visits.
 *
 * Cross-origin requests (Supabase REST/Storage/Realtime) are left
 * untouched — never intercepted or cached. Caching a moderation-gated
 * photo or a Realtime handshake would be actively wrong, not just
 * unnecessary.
 *
 * Chat 9 hotfix (Issue 4) — "document request" used to mean only
 * `request.mode === "navigate"`. That's correct for a hard reload/typed
 * URL, but Next.js's client-side <Link> navigation (how guests actually
 * move between the landing/message/guestbook/gallery pages in normal use)
 * never issues a navigate-mode request at all — it fetches an RSC payload
 * in the background instead (same pathname, but with a `?_rsc=...` query
 * string, and no `mode: "navigate"`). That request used to fall into the
 * generic cache-first branch and get cached under its `?_rsc=...` URL,
 * which a later real navigate-mode offline reload would never look up
 * (different cache key, no query string) — that mismatch was the entire
 * bug: pages reached only by clicking through the app never had their
 * plain-URL HTML actually cached, so they 404'd offline even though the
 * guest had genuinely "visited" them.
 *
 * The fix has two parts, both needed together:
 *  1. Recognize a document request by its `Accept: text/html` header too,
 *     not just navigate mode — see components/PWA/ServiceWorkerRegister.tsx,
 *     which now fires an explicit same-URL fetch with that header on every
 *     client-side route change, specifically so the SW has something to
 *     cache under the plain pathname (no `?_rsc=`) for pages that were
 *     only ever soft-navigated to.
 *  2. Treat that primer fetch as a document request here, so it gets
 *     cached under the same key a later real navigation would ask for.
 */

const CACHE_NAME = "guestbook-shell-v1";

function isDocumentRequest(request) {
  return request.mode === "navigate" || (request.headers.get("accept") || "").includes("text/html");
}

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

  if (isDocumentRequest(request)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          // Cache under the request's own URL. The primer fetch in
          // ServiceWorkerRegister.tsx deliberately requests the plain
          // pathname (no `?_rsc=`), so this ends up keyed identically to
          // what a later real navigate-mode request for that same page
          // will ask for.
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
