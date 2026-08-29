import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side message submission (Chat 10).
 *
 * This is now the ONLY path that can write to `messages`. Migration 0007
 * drops the old public/anon INSERT policy on that table, so a script
 * hitting PostgREST directly with the anon key gets rejected by RLS, not
 * just skipped past a client-side guard. This route uses the service-role
 * key specifically because it needs to (a) write to `messages` despite RLS
 * now blocking anon inserts, and (b) call the rate-limit function below,
 * which has no anon-reachable policies either.
 *
 * Rate limit: fixed 10-minute window, 3 submissions per IP, enforced
 * atomically in Postgres via `check_and_record_message_submission()` (see
 * migration 0007) so concurrent requests from the same IP can't race past
 * the limit the way a read-then-write check in this route could. IP is
 * taken from `x-forwarded-for` (set by Vercel), falling back to
 * `x-real-ip`, then a fixed placeholder if neither header is present —
 * that placeholder deliberately shares one rate-limit bucket across all
 * such requests rather than skipping the check entirely. The IP is hashed
 * (SHA-256) before it's ever written to the database — the rate-limit
 * table never stores a raw IP.
 *
 * The rate-limit check-and-increment runs BEFORE the message insert, not
 * after: this means a request that passes the rate limit but then fails to
 * insert (e.g. a malformed `eventId`) still consumes one of that IP's 3
 * slots. That's a deliberate fail-closed choice — checking after the
 * insert would let someone dodge the counter by intentionally sending
 * requests that fail to insert.
 *
 * Validation here mirrors the DB CHECK constraints on `messages` (name
 * 1-80 chars, message 1-500 chars) so a bad request fails fast with a
 * friendly error instead of a raw Postgres constraint-violation message —
 * the DB constraints remain the real source of truth regardless.
 *
 * `status` is intentionally omitted from the insert payload so the
 * column's own default ('pending') applies, same rule the old direct-
 * insert code (in useMessageSubmit.ts, before this route existed)
 * followed — moderation-by-default must not be reachable to bypass from
 * here either.
 */

const NAME_MAX = 80;
const MESSAGE_MAX = 500;
const RATE_LIMIT_WINDOW_SECONDS = 600; // 10 minutes
const RATE_LIMIT_MAX_SUBMISSIONS = 3;

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

async function hashIp(ip: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(ip)
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { eventId, name, message } = (body ?? {}) as {
    eventId?: unknown;
    name?: unknown;
    message?: unknown;
  };

  if (typeof eventId !== "string" || eventId.length === 0) {
    return NextResponse.json({ error: "Missing event." }, { status: 400 });
  }

  const trimmedName = typeof name === "string" ? name.trim() : "";
  const trimmedMessage = typeof message === "string" ? message.trim() : "";

  if (trimmedName.length === 0 || trimmedName.length > NAME_MAX) {
    return NextResponse.json(
      { error: "Please enter a valid name." },
      { status: 400 }
    );
  }
  if (trimmedMessage.length === 0 || trimmedMessage.length > MESSAGE_MAX) {
    return NextResponse.json(
      { error: "Please enter a valid message." },
      { status: 400 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const ipHash = await hashIp(getClientIp(request));

  const { data: allowed, error: rateLimitError } = await supabase.rpc(
    "check_and_record_message_submission",
    {
      p_ip_hash: ipHash,
      p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
      p_max_submissions: RATE_LIMIT_MAX_SUBMISSIONS,
    }
  );

  if (rateLimitError) {
    return NextResponse.json(
      { error: "Something went wrong sending your message. Please try again." },
      { status: 500 }
    );
  }

  if (!allowed) {
    return NextResponse.json(
      {
        error:
          "You've sent a few messages already — please wait a few minutes before sending another.",
      },
      { status: 429 }
    );
  }

  // status intentionally omitted — see doc comment above.
  const { error: insertError } = await supabase.from("messages").insert({
    event_id: eventId,
    name: trimmedName,
    message: trimmedMessage,
  });

  if (insertError) {
    return NextResponse.json(
      { error: "Something went wrong sending your message. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
