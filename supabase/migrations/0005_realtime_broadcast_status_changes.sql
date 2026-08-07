-- 0005_realtime_broadcast_status_changes.sql
-- Run this once against the Supabase project (SQL editor or `supabase db push`).
--
-- Chat 5.3 hotfix. Root cause: `gallery`/`messages` SELECT RLS is scoped to
-- `status = 'approved'`. postgres_changes only delivers a row to a
-- subscriber when that row passes the subscriber's SELECT policy, and for
-- an UPDATE this is checked against both the old and new row image. Any
-- status transition that crosses the approved boundary in EITHER direction
-- (approved->pending, approved->rejected, pending->approved,
-- rejected->approved) therefore fails the check on one side and the event
-- is silently dropped — no client error, it just never arrives. DELETE is
-- unaffected (Postgres does not apply RLS to DELETE), which is why that
-- direction already worked.
--
-- Per product decision: do not broaden the public SELECT policy. Instead,
-- add a second, independent delivery path — Realtime Broadcast triggered
-- from the database — that carries the same before/after row data outside
-- of RLS. Existing RLS policies on `gallery`/`messages` are untouched.
--
-- Note: realtime.broadcast_changes() always routes through
-- realtime.messages and always requires Realtime Authorization — there is
-- no unauthenticated delivery path, public channel or not. See migration
-- 0006 for the required (narrowly-scoped, topic-only) authorization
-- policy and the paired `private: true` client change.

create or replace function public.broadcast_gallery_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform realtime.broadcast_changes(
    'gallery-changes:' || coalesce(new.event_id, old.event_id)::text, -- topic
    tg_op,                                                            -- event
    tg_op,                                                            -- operation
    tg_table_name,                                                    -- table
    tg_table_schema,                                                  -- schema
    new,
    old
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists gallery_broadcast_trigger on public.gallery;
create trigger gallery_broadcast_trigger
after insert or update or delete on public.gallery
for each row execute function public.broadcast_gallery_change();

create or replace function public.broadcast_messages_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform realtime.broadcast_changes(
    'messages-changes:' || coalesce(new.event_id, old.event_id)::text, -- topic
    tg_op,                                                             -- event
    tg_op,                                                             -- operation
    tg_table_name,                                                     -- table
    tg_table_schema,                                                   -- schema
    new,
    old
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists messages_broadcast_trigger on public.messages;
create trigger messages_broadcast_trigger
after insert or update or delete on public.messages
for each row execute function public.broadcast_messages_change();
