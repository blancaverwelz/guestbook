-- 0006_realtime_broadcast_authorization.sql
-- Run this once against the Supabase project (SQL editor or `supabase db push`).
--
-- Follow-up to 0005. `realtime.broadcast_changes()` always delivers through
-- the `realtime.messages` table and always requires Realtime Authorization —
-- there is no unauthenticated/public path for it, regardless of how the
-- client's channel is configured. Without a matching SELECT policy here,
-- the trigger fires and the row lands in `realtime.messages`, but no
-- subscriber is ever authorized to read it back out — which is exactly the
-- symptom observed (channel joins fine, heartbeats keep flowing, no
-- broadcast payloads ever arrive).
--
-- This policy lives on Supabase's internal `realtime.messages` table, NOT
-- on `gallery` or `messages`. It grants read access only to broadcast
-- envelopes on our two known topic prefixes — it does not touch, loosen,
-- or replace the existing RLS policies on the application tables.
--
-- Paired client-side change: the channel config must set `private: true`
-- (required for Realtime to run this authorization check at all).

drop policy if exists "public can receive gallery and messages broadcast" on "realtime"."messages";

create policy "public can receive gallery and messages broadcast"
on "realtime"."messages"
for select
to anon, authenticated
using (
  extension = 'broadcast'
  and (
    realtime.topic() like 'gallery-changes:%'
    or realtime.topic() like 'messages-changes:%'
  )
);
