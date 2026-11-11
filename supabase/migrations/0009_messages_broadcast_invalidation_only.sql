-- 0009_messages_broadcast_invalidation_only.sql
-- NOT APPLIED ANYWHERE. Review and test on staging first; production
-- application requires explicit approval (see ROADMAP.md, GB-01 / R-01).
--
-- Why: migration 0005 broadcasts the full old/new `messages` row (name and
-- message body included) for EVERY status transition, and migration 0006
-- authorises anonymous clients to receive that topic prefix. RLS on the
-- table does not apply to Broadcast payloads, so a guest subscribing to
-- `messages-changes:<event-id>` could receive pending/rejected content.
--
-- What this does (forward-only; 0005/0006 are left untouched as history):
--   1. The messages trigger function now sends an INVALIDATION-ONLY
--      payload {operation, id} and only when the change touches the approved
--      set (row is or was 'approved'). Pending inserts and
--      pending<->rejected moves produce no broadcast at all. Clients re-read
--      content through RLS (see hooks/useGuestbookFeed.ts, which ignores
--      payload bodies).
--   2. The anon/authenticated receive policy for message topics is scoped to
--      topics of published events only. The gallery clause is unchanged.
--
-- The existing `messages_broadcast_trigger` keeps calling this function by
-- name, so `create or replace` is sufficient.
--
-- Rollback / forward recovery: re-run the function body from 0005 and the
-- policy from 0006. Old clients (which read payload.record) simply stop
-- receiving row data; the redesigned client does not depend on it.

create or replace function public.broadcast_messages_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_touches_approved boolean;
begin
  if tg_op = 'INSERT' then
    v_touches_approved := new.status = 'approved';
  elsif tg_op = 'DELETE' then
    v_touches_approved := old.status = 'approved';
  else
    v_touches_approved := new.status = 'approved' or old.status = 'approved';
  end if;

  if v_touches_approved then
    perform realtime.send(
      jsonb_build_object(
        'operation', tg_op,
        'id', coalesce(new.id, old.id)
      ),                                                              -- payload: no name/body/status
      tg_op,                                                          -- event
      'messages-changes:' || coalesce(new.event_id, old.event_id)::text, -- topic
      true                                                            -- private channel
    );
  end if;

  return coalesce(new, old);
end;
$$;

drop policy if exists "public can receive gallery and messages broadcast" on "realtime"."messages";

create policy "public can receive gallery and messages broadcast"
on "realtime"."messages"
for select
to anon, authenticated
using (
  extension = 'broadcast'
  and (
    realtime.topic() like 'gallery-changes:%'
    or exists (
      -- Evaluated under the caller's role, so `events` RLS already limits
      -- this to published events.
      select 1
      from public.events e
      where e.published = true
        and realtime.topic() = 'messages-changes:' || e.id::text
    )
  )
);
