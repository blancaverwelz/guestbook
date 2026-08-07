import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * Pings Supabase on a schedule (see vercel.json) so the free-tier project
 * never goes 7 days without an API request and auto-pauses — see shared
 * reference doc's "Known failure modes." If that happened between build
 * completion and the actual event date, guests would hit a dead/slow-
 * loading app at the worst possible moment.
 *
 * Deliberately uses the plain anon-key client (`@supabase/supabase-js`
 * directly), the same pattern as the landing page's event fetch — not
 * `lib/supabase/server.ts`. This route has no user session to check (no
 * cookies, no auth), so there's nothing for the cookie-based server client
 * to do here; reaching for it would mean satisfying its `CookieOptions`
 * typing requirement (see shared reference doc) for zero benefit. A trivial
 * read against a public, RLS-readable table is enough to count as an "API
 * request" and reset Supabase's inactivity clock — no service role, no
 * mutation, no admin check needed.
 */
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { error, count } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, eventCount: count ?? 0, timestamp: new Date().toISOString() });
}
