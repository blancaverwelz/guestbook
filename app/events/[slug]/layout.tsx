import { notFound } from "next/navigation";
import AccentColorProvider from "@/components/Hero/AccentColorProvider";
import Navbar from "@/components/Navbar/Navbar";
import { getEventBySlug } from "@/lib/events";

/**
 * Chat 9 hotfix (Issue 2) — the fix for accent color not propagating past
 * the landing page.
 *
 * Before this layout existed, AccentColorProvider was only ever mounted
 * inside app/events/[slug]/page.tsx (the landing page). The message/
 * guestbook/gallery pages had no provider at all, so useAccentColor()
 * wasn't even callable there, and — more importantly — none of those
 * pages' existing bg-accent/text-accent Tailwind usages ever saw anything
 * but the static globals.css fallback (see AccentColorProvider's own
 * comment for why that's a CSS-variable problem, not just a
 * missing-context problem).
 *
 * Mounting the provider once here, wrapping every route under
 * /events/[slug]/*, fixes both: every child page gets the same resolved
 * accent, from one shared fetch (see lib/events.ts), without each page
 * needing its own copy of this wrapping/fetching logic.
 *
 * Chat 11 — <Navbar> is mounted here too, inside the provider, for the
 * same reason: one persistent guest nav (Event / Message / Guestbook /
 * Gallery) shared by all four core pages instead of four separate copies,
 * and it needs to be inside <AccentColorProvider> to read the resolved
 * accent via useAccentColor() for its active-link color.
 *
 * Chat 13 follow-up — passes the raw `event.accent_color` straight through
 * as `storedAccentColor` instead of pre-resolving a `fallbackAccent`
 * string here. AccentColorProvider now owns parsing it (bare hex =
 * Automatic, `custom:#RRGGBB` = Custom) via `parseStoredAccent` — see that
 * file's doc comment for why this is a single-column encoding rather than
 * a new `accent_mode` DB column/migration.
 *
 * This also centralizes the published/not-found gate for the whole
 * subtree — each page.tsx still has its own defensive `if (!event)
 * notFound()` check (harmless, since getEventBySlug is cache()-deduped —
 * it will already have resolved to the same value here), left in place to
 * keep this a minimal, targeted diff rather than removing "redundant"
 * checks across four files that already worked correctly.
 */
export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event) {
    notFound();
  }

  return (
    <AccentColorProvider coverImage={event.cover_image} storedAccentColor={event.accent_color}>
      <Navbar slug={slug} eventTitle={event.title} />
      {children}
    </AccentColorProvider>
  );
}
