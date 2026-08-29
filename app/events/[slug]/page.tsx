import { notFound } from "next/navigation";
import type { Metadata, Viewport } from "next";
import Hero from "@/components/Hero/Hero";
import CTASection from "@/components/CTASection/CTASection";
import { getEventBySlug } from "@/lib/events";

interface EventLandingPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Chat 9 hotfix (Issue 3) — title/description/OG/Twitter stay here in
 * generateMetadata. They depend on the async event fetch, which is exactly
 * why Next 15 streams them into <head> after the initial paint instead of
 * blocking on them — confirmed empirically (see hotfix report) that this
 * still lands correctly in the live DOM after hydration, just not
 * synchronously. That's an acceptable trade for SEO/social-preview tags:
 * search-engine crawlers get them blocking anyway (Next detects bot user
 * agents and forces synchronous metadata for those requests), and a
 * hydration-order delay of a few hundred ms doesn't affect a human reading
 * the page.
 *
 * The PWA manifest link and apple-web-app tags used to live here too, and
 * that was the actual bug: streamed-in-after-hydration is NOT good enough
 * for installability checks (Chrome DevTools' Manifest panel, and more
 * importantly iOS Safari's "Add to Home Screen" detection, both want it
 * present synchronously). Those now render as plain JSX below instead —
 * see the comment on the <link rel="manifest"> tag in the component body.
 */
export async function generateMetadata({
  params,
}: EventLandingPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event) return {};

  const description = event.subtitle
    ? `${event.subtitle} — leave a message and share photos.`
    : "Leave a message and share photos from the celebration.";

  return {
    title: event.title,
    description,
    openGraph: {
      title: event.title,
      description,
      type: "website",
      ...(event.cover_image ? { images: [{ url: event.cover_image }] } : {}),
    },
    twitter: {
      card: event.cover_image ? "summary_large_image" : "summary",
      title: event.title,
      description,
      ...(event.cover_image ? { images: [event.cover_image] } : {}),
    },
    alternates: {
      canonical: `/events/${slug}`,
    },
  };
}

export async function generateViewport({
  params,
}: EventLandingPageProps): Promise<Viewport> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

  // Falls back to the site-wide light/dark tokens (see root layout) when
  // there's no event yet, or no accent set — matches the same
  // fallback-not-guarantee rule documented for events.accent_color
  // elsewhere (the landing page's own on-screen accent can differ, since
  // that one is extracted client-side from the cover photo; browser chrome
  // color has to be decided server-side, so it uses the stored fallback).
  const accent = event?.accent_color ?? "#b08d57";

  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: accent,
  };
}

export default async function EventLandingPage({ params }: EventLandingPageProps) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event) {
    notFound();
  }

  return (
    <>
      {/*
        Chat 9 hotfix (Issue 3) — deliberately plain JSX, not part of the
        generateMetadata object above. Next.js auto-hoists <link>/<meta>
        elements found anywhere in a Server Component's rendered tree up
        into the document <head>, and — unlike the Metadata API's own
        title/OG handling — this path is NOT subject to Next 15's
        streaming-metadata deferral, so it's present in the very first
        HTML response the browser receives. Confirmed by diffing raw
        server responses with and without this change; see the hotfix
        report for the full before/after.

        Keep the manifest URL and start_url/scope logic in sync with
        app/events/[slug]/manifest.webmanifest/route.ts if that route ever
        changes — this is just the <link> that points at it, not a second
        copy of the manifest itself.
      */}
      <link rel="manifest" href={`/events/${slug}/manifest.webmanifest`} />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-title" content={event.title} />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <link
        rel="apple-touch-startup-image"
        href="/splash/splash-1170x2532.png"
        media="(device-width: 390px) and (device-height: 844px)"
      />
      <link
        rel="apple-touch-startup-image"
        href="/splash/splash-1284x2778.png"
        media="(device-width: 428px) and (device-height: 926px)"
      />
      <link
        rel="apple-touch-startup-image"
        href="/splash/splash-1620x2160.png"
        media="(device-width: 810px) and (device-height: 1080px)"
      />

      <main className="flex min-h-screen flex-col bg-background text-foreground">
        <Hero event={event} />
        <CTASection slug={slug} />
      </main>
    </>
  );
}
