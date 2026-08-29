import { notFound } from "next/navigation";
import AccentColorProvider from "@/components/Hero/AccentColorProvider";
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
    <AccentColorProvider
      coverImage={event.cover_image}
      fallbackAccent={event.accent_color ?? "#B08D57"}
    >
      {children}
    </AccentColorProvider>
  );
}
