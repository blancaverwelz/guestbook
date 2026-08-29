"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Registers public/sw.js once on mount, and (Chat 9 hotfix, Issue 4)
 * "primes" the offline cache on every client-side route change.
 *
 * Rendered from the root layout so it runs on every route, but the actual
 * caching decisions live in sw.js's fetch handler — nothing guest-facing
 * here depends on it, it's a pure progressive enhancement.
 *
 * Production-only, deliberately: registering a caching service worker in
 * `next dev` is a well-known footgun — it will happily cache a
 * hot-reloaded chunk and then keep serving that stale chunk after the dev
 * server rebuilds, which looks like a phantom bug in whatever you touch
 * next. Guarding on NODE_ENV keeps local dev on the normal uncached path.
 */
export default function ServiceWorkerRegister() {
  const pathname = usePathname();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline shell is a progressive enhancement — a failed registration
      // (unsupported browser, blocked by user setting, etc.) should never
      // surface as an error to the guest.
    });
  }, []);

  // Chat 9 hotfix (Issue 4) — a guest who reaches /guestbook, /gallery, or
  // /message by clicking through the app (the normal way) never triggers
  // a `mode: "navigate"` request for that page at all: Next's client-side
  // router fetches an RSC payload instead (same path, `?_rsc=...` query
  // string, not navigate mode). sw.js's navigate-mode cache never saw the
  // plain URL, so a later hard reload while offline had nothing to find —
  // "previously visited" pages that were only ever soft-navigated to
  // weren't actually cached under the URL an offline reload would ask for.
  //
  // This effect closes that gap: on every route change, it re-requests
  // the current path itself (not the RSC payload — the plain document,
  // via `Accept: text/html`), which sw.js now recognizes as a document
  // request and caches under the exact URL a later offline navigation
  // will look up. `cache: "no-store"` forces this through to the network
  // (and into the service worker's fetch handler) rather than silently
  // resolving from the browser's own HTTP cache.
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    // Nothing to prime into yet if the SW isn't controlling this page —
    // e.g. the very first moment after registration, before activate's
    // clients.claim() has taken effect. The page that triggered
    // registration was itself a real navigation, so it's already cached
    // correctly by sw.js regardless; this only needs to catch up by the
    // next route change, which is the common case in practice.
    if (!navigator.serviceWorker.controller) return;

    fetch(pathname, {
      cache: "no-store",
      headers: { Accept: "text/html" },
    }).catch(() => {
      // Best-effort priming — a failed fetch here just means this page
      // stays un-primed for offline use, not a user-visible error.
    });
  }, [pathname]);

  return null;
}
