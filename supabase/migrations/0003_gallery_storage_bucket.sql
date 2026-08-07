-- 0003_gallery_storage_bucket.sql
-- Run this once against the Supabase project (SQL editor or `supabase db push`).
-- Creates the public "gallery" Storage bucket + object-level policies.
-- Does not touch the `gallery` table or its RLS from 0001_init.sql.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gallery',
  'gallery',
  true,
  10485760, -- 10MB, matches Chat 4 spec's upload limit
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do nothing;

-- Mirrors the `gallery` table's own RLS shape: anyone can insert (no guest
-- auth, per product requirement — moderation status is the real backstop,
-- not this policy), public can read, admin has full access.
create policy "public insert gallery objects" on storage.objects
  for insert to public
  with check (bucket_id = 'gallery');

create policy "public read gallery objects" on storage.objects
  for select to public
  using (bucket_id = 'gallery');

create policy "admin full access gallery objects" on storage.objects
  for all to authenticated
  using (bucket_id = 'gallery');
