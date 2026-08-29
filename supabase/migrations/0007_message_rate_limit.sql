-- 0007_message_rate_limit.sql
-- Run this once against the Supabase project (SQL editor or `supabase db push`).
-- Do not modify RLS policies without a dedicated chat — see playbook.
--
-- Chat 10: server-side abuse protection for message submission.
--
-- 1. Drops the public/anon INSERT policy on `messages`. Message inserts now
--    happen exclusively through app/api/messages/route.ts, which uses the
--    service-role key (bypasses RLS) after applying a per-IP rate limit.
--    Without dropping this policy, the old "public insert messages" policy
--    would still let anyone hit PostgREST directly with the anon key and
--    skip the rate limit entirely — an API route alone is not a real
--    boundary if the database still accepts the same writes from anywhere
--    else. SELECT and admin policies on `messages` are untouched. `gallery`
--    is untouched entirely — its own "public insert gallery" policy stays
--    exactly as-is; gallery uploads still go straight from the browser to
--    Supabase, unchanged, per the approval-workflow design.
drop policy if exists "public insert messages" on messages;

-- 2. Per-IP fixed-window submission counter. One row per distinct IP hash
--    that has ever submitted a message — this does not grow per-submission,
--    only per unique IP, so it stays small for an event-guestbook's scale.
--    `ip_hash` stores a SHA-256 hash of the caller's IP (computed in the API
--    route), never the raw IP, as a light privacy practice.
create table if not exists message_rate_limits (
  ip_hash text primary key,
  window_start timestamptz not null default now(),
  submission_count integer not null default 0
);

alter table message_rate_limits enable row level security;
-- Deliberately zero policies here. With RLS enabled and no policies,
-- anon/authenticated get no access at all — only the service-role client
-- (used exclusively server-side, in the new API route) can reach this
-- table, and only indirectly, through the SECURITY DEFINER function below.

-- 3. Atomic check-and-increment. A naive "SELECT count, then INSERT/UPDATE"
--    from the API route would race under concurrent requests from the same
--    IP (two requests could both read "0 so far" and both proceed) — this
--    single statement does the read, window-reset check, and increment as
--    one atomic upsert, so a burst from one IP can't slip past the limit.
--    Returns true if this submission is within the limit, false if not.
--    Note: the counter still increments even when it returns false (an IP
--    that's already over the limit keeps incrementing until its window
--    rolls over) — that's intentional, it just means the window doesn't
--    get a free early reset from a rejected retry.
create or replace function public.check_and_record_message_submission(
  p_ip_hash text,
  p_window_seconds integer,
  p_max_submissions integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into message_rate_limits (ip_hash, window_start, submission_count)
  values (p_ip_hash, now(), 1)
  on conflict (ip_hash) do update
    set window_start = case
          when message_rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
            then now()
          else message_rate_limits.window_start
        end,
        submission_count = case
          when message_rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
            then 1
          else message_rate_limits.submission_count + 1
        end
  returning submission_count into v_count;

  return v_count <= p_max_submissions;
end;
$$;
