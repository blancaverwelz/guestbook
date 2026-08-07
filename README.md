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
