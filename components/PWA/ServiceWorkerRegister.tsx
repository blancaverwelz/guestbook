"use client";

import { useEffect } from "react";

/**
 * Registers public/sw.js once on mount. Rendered from the root layout so
 * it runs on every route, but the service worker's own fetch handler only
 * ever caches page/asset requests (see sw.js) — nothing guest-facing here
 * depends on it, it's a pure progressive enhancement.
 *
 * Production-only, deliberately: registering a caching service worker in
 * `next dev` is a well-known footgun — it will happily cache a
 * hot-reloaded chunk and then keep serving that stale chunk after the dev
 * server rebuilds, which looks like a phantom bug in whatever you touch
 * next. Guarding on NODE_ENV keeps local dev on the normal uncached path.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline shell is a progressive enhancement — a failed registration
      // (unsupported browser, blocked by user setting, etc.) should never
      // surface as an error to the guest.
    });
  }, []);

  return null;
}
