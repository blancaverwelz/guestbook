-- 0004_gallery_realtime_publication.sql
-- Run this once against the Supabase project (SQL editor or `supabase db push`).
--
-- Enabling RLS on a table does NOT automatically add it to the
-- `supabase_realtime` publication — that's a separate, explicit step.
--
-- `messages` was already fixed for this in Chat 3, but only by hand via the
-- Supabase dashboard's Database > Replication toggle — never captured in a
-- migration. `gallery` never got the same treatment at all, which is why
-- GalleryGrid's realtime subscription (Chat 5) connects successfully but
-- never receives any postgres_changes events — new/approved photos only
-- showed up after a manual refresh.
--
-- Both are added here, guarded by an existence check, so this is safe to
-- run against *this* project (where `messages` is likely already enrolled
-- from the earlier manual fix) as well as a brand-new project set up from
-- scratch (where neither is enrolled yet) — `alter publication ... add
-- table` throws if the table is already a member, so a plain unconditional
-- statement would fail on this project's current state.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'gallery'
  ) then
    alter publication supabase_realtime add table gallery;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table messages;
  end if;
end $$;
