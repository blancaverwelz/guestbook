# Wedding & Birthday Guestbook

Guests leave messages and upload photos at an event's URL; hosts moderate
via an admin panel. This is Chat 1 of a multi-chat build — schema, RLS, and
routing skeleton only. No form logic, styling, or admin auth yet.

## Stack
Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui ·
Supabase (Postgres, Auth, Storage, Realtime) · Vercel.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```
   This generates `package-lock.json` from `package.json` — it wasn't
   possible to produce a real lockfile in the environment this repo was
   assembled in (no network access), so this first `npm install` is doing
   what `create-next-app` would normally have done for you.

2. **Create a Supabase project** at https://supabase.com if you don't have
   one yet.

3. **Set environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   Fill in from Supabase → Project Settings → API:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only — never commit this, never
     prefix it with `NEXT_PUBLIC_`)
   - `NEXT_PUBLIC_SITE_URL` (added Chat 9) — the deployed site's own URL,
     e.g. `https://your-guestbook.vercel.app`. Used only for canonical
     links and Open Graph/Twitter image resolution (`metadataBase` in
     `app/layout.tsx`). Falls back to `http://localhost:3000` if unset, so
     its absence won't break a build — but social-share previews (e.g. a
     link pasted into iMessage/Slack) will resolve image URLs against the
     wrong origin until it's set. Set it in Vercel's env vars before
     sharing any event link publicly.

4. **Run the migration** — in the Supabase dashboard SQL editor, run, in
   order:
   - `supabase/migrations/0001_init.sql` (tables + RLS)
   - `supabase/migrations/0002_seed_test_event.sql` (seeds `test-event` so
     `/events/test-event` has something to render)

   If you use the Supabase CLI instead: `supabase db push`.

5. **Run the dev server**
   ```bash
   npm run dev
   ```
   Visit http://localhost:3000/events/test-event.

## Dark mode

Follows the guest's OS/browser `prefers-color-scheme` automatically — there
is no manual toggle anywhere in the app (`darkMode: 'media'` in
`tailwind.config.ts`, tokens defined as CSS custom properties in
`app/globals.css`). Every later chat shipping visible UI must consume those
tokens/the `dark:` variant instead of hardcoded colors.

## What's in this chat vs. later chats

Built now: repo scaffold, schema + RLS, empty routed pages, dark-mode
tokens, Supabase client helpers.

Not built yet (later chats): `MessageForm`, `Guestbook` feed, `Gallery`
grid + upload pipeline (HEIC conversion, compression, color extraction),
admin auth, `Hero`/`CTASection`, Framer Motion.

*(Everything above described the state as of Chat 1. As of Chat 9, all of
it now exists — see "Motion, PWA & SEO" below for what Chat 9 specifically
added.)*

## Motion, PWA & SEO (Chat 9)

**Framer Motion.** Installed as `framer-motion`. `MotionConfig
reducedMotion="user"` wraps the whole app in `app/layout.tsx` — this is
the single point that makes every animation added in this chat (Hero,
CTASection, guestbook/gallery fade-ins, Lightbox, page transitions)
automatically respect a guest's OS-level "reduce motion" setting, rather
than each component needing its own check. Page-transition fade lives in
`app/template.tsx`, which is a fade-**in** only (not a full crossfade) —
Next's template.tsx convention remounts on every navigation but doesn't
give an exit-animation hook without a routing-intercept library, which
was out of scope for this pass.

**PWA — per-event manifest, not a single static one.** There's no
`app/page.tsx` root route (see below), and the app is multi-tenant — several
events can be live at once. A shared `public/manifest.json` would either
404 on `start_url: "/"` or let one event's installed icon launch into a
different event's pages. Instead, `app/events/[slug]/manifest.webmanifest/
route.ts` generates a manifest per event on request, with `start_url` and
`scope` both pinned to `/events/<slug>`, and `name`/`theme_color` pulled
from that event's own data. Each event's landing page links to its own
manifest via `generateMetadata`'s `manifest` field — nothing at the app
root references a manifest at all.

Icons (`public/icon-192.png`, `icon-512.png`, `maskable-icon-512.png`) and
three common-device splash screens (`public/splash/`) were generated from
the existing `Logo.tsx` mark, not hand-designed — swap them for real
branded assets whenever there's design time for it.

**Offline shell.** `public/sw.js` is a small hand-rolled service worker
(network-first for page navigations with a cache fallback, cache-first for
static assets), registered by `components/PWA/ServiceWorkerRegister.tsx`.
**Registers in production builds only** — a service worker in `next dev`
will happily cache a hot-reloaded chunk and keep serving it stale after
the dev server rebuilds, which reads as a phantom bug in whatever you
touch next. Only pages a guest has actually visited will load offline;
this is intentional (see the comment at the top of `sw.js`), not a partial
implementation of something bigger.

**SEO.** `generateMetadata` added to all four event routes (landing,
message, guestbook, gallery) — dynamic `<title>`, description, canonical
link, and (landing page only) Open Graph/Twitter card data using the
event's cover photo when one is set. All four wrap their existing
`getEventBySlug` fetcher in React's `cache()` so `generateMetadata` and the
page component share one Supabase query instead of firing it twice per
request.

**Accessibility.** Beyond the reduced-motion handling above: `Lightbox`
now moves focus into the dialog on open and restores it to the grid button
that triggered it on close — previously neither happened, so a keyboard/
screen-reader user opening a photo stayed "focused" on a button sitting
underneath a fullscreen overlay.

**Performance.** Root layout preconnects to the Supabase project origin
(`<link rel="preconnect">`), shaving the DNS+TLS handshake off the first
Storage image request on the gallery/landing pages. Gallery thumbnails now
fade in on their actual `onLoad` event rather than on mount, avoiding a
blank-then-pop flash while the image is still in flight.

**Not independently verified: the Lighthouse mobile score 95+ success
criterion from the chat spec.** That needs a real Lighthouse run against a
deployed URL (or `next start` + Chrome DevTools locally) — there's no way
to run that from this sandboxed build environment. Worth checking before
calling this chat's success criteria fully met; the [pre-event
checklist](#pre-event-checklist) below is a good place to fold that in.

## Keeping the Supabase project alive

Supabase free-tier projects pause after 7 days with zero API requests. A
Vercel Cron job hits `GET /api/keep-alive` (a trivial, unauthenticated read
against the `events` table) twice a week — see `vercel.json` — well inside
that 7-day window with margin either side. This starts running automatically
once the project is deployed on Vercel with a Pro/paid-tier account (cron
jobs require that); no manual setup beyond deploying. Verify it's actually
firing in the Vercel dashboard under **Project → Cron Jobs**, and check
Supabase's own request logs for the corresponding `events` query on the same
schedule.

Note: a per-IP throttle on the message/gallery submit paths was considered
for this chat but not built. Those inserts go straight from the browser to
Supabase (PostgREST/Storage) via the anon-key client — they never pass
through this Next.js app's `middleware.ts` or any API route, so a
middleware-based throttle would not actually intercept them. Doing this for
real would mean either proxying those inserts through a Next.js route
(app-logic change) or adding a DB-side trigger (schema change) — both out of
scope for an infra-only chat. Moderation (`messages.status` /
`gallery.status` defaulting to pending/approved per event settings) remains
the spam backstop, as already noted in the shared reference doc.

## Pre-event checklist

Run through this 2–3 days before the actual event, not just once at the end
of development:

- [ ] Visit the live site 2–3 days before the event to force it awake (don't
      rely solely on the cron — a manual visit is a cheap double-check).
- [ ] Test message submit **and** photo upload from an actual phone on
      cellular data, not just wifi/desktop.
- [ ] Confirm HEIC upload works on a real iPhone (the most likely place for
      a silent failure — canvas-based compression breaks on raw HEIC if
      `lib/heicConvert.ts` isn't hit first).
- [ ] Confirm admin login and moderation (approve/reject messages and
      photos) work from the host's phone, not just desktop.
- [ ] Check Vercel's Cron Jobs dashboard to confirm `/api/keep-alive` has
      actually been firing on schedule, not just that it's configured.
- [ ] Run Lighthouse (mobile) against the live event landing page and
      confirm a 95+ performance score — this was a Chat 9 success
      criterion that couldn't be verified from the build sandbox; see
      "Motion, PWA & SEO" above.
- [ ] On an actual phone, visit a live event page, use the browser's
      "Add to Home Screen," and confirm the installed icon opens straight
      to that event (not a 404) and shows the right name/icon.
- [ ] With the installed PWA open, enable airplane mode and confirm a
      previously-visited page (e.g. the page you installed from) still
      loads; a never-visited page failing offline is expected, not a bug.

## Verifying RLS manually

Anon key should be able to insert into `messages`/`gallery` but not select
non-approved rows. Quick check via `curl` against the Supabase REST API:

```bash
# insert (should succeed)
curl -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/messages" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"event_id":"<test-event-uuid>","name":"Test","message":"Hello!"}'

# read pending rows (should return empty array, not the row above)
curl "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/messages?status=eq.pending" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY"
```
