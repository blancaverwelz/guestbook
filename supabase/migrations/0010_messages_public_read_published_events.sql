-- 0010_messages_public_read_published_events.sql
-- NOT APPLIED ANYWHERE. Requires a product decision (ROADMAP.md R-02) and
-- staging verification before production.
--
-- Why: the 0001 policy "public read approved messages" only checks
-- status = 'approved'. The guest routes refuse unpublished events, but a
-- direct anonymous PostgREST query could still read approved messages that
-- belong to an UNPUBLISHED event. This makes direct reads match the route
-- gate. Admin policy is unchanged. Tightening only; nothing is broadened.
--
-- Rollback: recreate the policy with `using (status = 'approved')`.

drop policy if exists "public read approved messages" on public.messages;

create policy "public read approved messages" on public.messages
  for select
  using (
    status = 'approved'
    and exists (
      select 1
      from public.events e
      where e.id = messages.event_id
        and e.published = true
    )
  );
