import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Per-event manifest, not a single static public/manifest.json.
 *
 * There is no app/page.tsx root route (see shared reference — "No root
 * route exists"), so a manifest with `start_url: "/"` would 404 the moment
 * a guest tapped the home-screen icon. More importantly, this app is
 * multi-tenant: several events can be live at once, each with its own
 * slug, title, and accent color. A single shared manifest would mean every
 * event's "Add to Home Screen" install looks and launches identically,
 * and — with a shared `scope` — could let one event's installed PWA
 * navigate into another event's route without a fresh launch. Serving the
 * manifest from a route scoped to `[slug]` fixes both: `start_url`/`scope`
 * point at this event's own subtree, and `name`/`theme_color` reflect this
 * event's own data.
 *
 * Same anon-key/no-cookies read pattern as the other guest-facing routes
 * (see app/events/[slug]/page.tsx) — stateless, RLS already restricts to
 * published rows.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: event } = await supabase
    .from("events")
    .select("title, accent_color")
    .eq("slug", slug)
    .eq("published", true)
    .single();

  // Manifest is served even if the event lookup fails — a 404 here would
  // just mean the browser can't install a home-screen icon, which is a far
  // softer failure than 404ing the page itself. Falls back to generic
  // copy/the champagne-gold default rather than leaking a Supabase error.
  const eventTitle = event?.title ?? "Guestbook";
  const themeColor = event?.accent_color ?? "#b08d57";

  const manifest = {
    name: `${eventTitle} — Guestbook`,
    short_name: eventTitle.length > 12 ? "Guestbook" : eventTitle,
    description: `Leave a message and share photos for ${eventTitle}.`,
    start_url: `/events/${slug}`,
    scope: `/events/${slug}`,
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: themeColor,
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/maskable-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      // Manifest is cheap to regenerate and rarely changes per-request;
      // short cache avoids hammering Supabase on repeat installs without
      // going stale for long if a host edits the event title/color.
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    },
  });
}
