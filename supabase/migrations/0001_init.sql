-- 0001_init.sql
-- Run this once against the Supabase project (SQL editor or `supabase db push`).
-- Do not modify RLS policies here without a dedicated chat — see playbook.

create table events (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  subtitle text,
  event_date date,
  event_type text not null default 'other'
    check (event_type in ('wedding','birthday','other')),
  cover_image text,
  accent_color text default '#B08D57', -- champagne gold fallback
  gallery_requires_approval boolean not null default false,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  message text not null check (char_length(message) between 1 and 500),
  status text not null default 'pending'
    check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create table gallery (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  uploader_name text,
  image_url text not null,
  thumbnail_url text not null,
  status text not null default 'approved'
    check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create index on messages (event_id, status, created_at desc);
create index on gallery (event_id, status, created_at desc);

alter table events enable row level security;
alter table messages enable row level security;
alter table gallery enable row level security;

-- events: public can read published events only; admin (authenticated) can do anything
create policy "public read published events" on events
  for select using (published = true);
create policy "admin full access events" on events
  for all using (auth.role() = 'authenticated');

-- messages: anyone can insert; public can only read approved; admin sees/edits all
create policy "public insert messages" on messages
  for insert with check (true);
create policy "public read approved messages" on messages
  for select using (status = 'approved');
create policy "admin full access messages" on messages
  for all using (auth.role() = 'authenticated');

-- gallery: anyone can insert; public reads approved (or all, if event doesn't require approval)
create policy "public insert gallery" on gallery
  for insert with check (true);
create policy "public read approved gallery" on gallery
  for select using (status = 'approved');
create policy "admin full access gallery" on gallery
  for all using (auth.role() = 'authenticated');
