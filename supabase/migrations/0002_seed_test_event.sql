-- 0002_seed_test_event.sql
-- Seeds a single published event so /events/test-event renders without error.
insert into events (slug, title, event_type, published)
values ('test-event', 'Test Event', 'other', true)
on conflict (slug) do nothing;
