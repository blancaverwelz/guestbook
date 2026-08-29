import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import type { LandingEvent } from "@/types/event";

/**
 * Single source of truth for "look up a published event by slug," used by
 * app/events/[slug]/layout.tsx and all four page.tsx files under it.
 *
 * Added in the Chat 9 hotfix (Issue 2) — previously each of the four
 * page.tsx files defined its own near-identical copy of this function
 * (message/guestbook/gallery selecting only `id, title`; the landing page
 * selecting the full row). That duplication was directly what let the
 * accent-color propagation bug happen: three of the four pages had no way
 * to know about `cover_image`/`accent_color` at all, because their local
 * copy never selected those columns and there was nowhere shared for
 * accent logic to live. One fetcher, full column set, shared by every
 * consumer — the layout uses it to resolve the accent for the whole
 * `/events/[slug]/*` subtree; each page reuses the same function (and, in
 * the same request, the same React `cache()` result) for its own
 * title/generateMetadata needs.
 *
 * Stateless, anonymous read — no cookies/session on this guest-facing
 * route, deliberately a plain anon-key client rather than the
 * @supabase/ssr helpers or the service-role client (that one's reserved
 * for admin routes only — see Shared Reference). RLS on `events` already
 * restricts reads to published rows; `.eq("published", true)` here is
 * defense-in-depth, not the actual gate.
 */
export const getEventBySlug = cache(async function getEventBySlug(
  slug: string
): Promise<LandingEvent | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase
    .from("events")
    .select("id, title, subtitle, event_date, cover_image, accent_color")
    .eq("slug", slug)
    .eq("published", true)
    .single();

  if (error || !data) return null;
  return data;
});
