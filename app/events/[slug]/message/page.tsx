import { cache } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import { MessageForm } from "@/components/MessageForm/MessageForm";

/**
 * Stateless, anonymous read of a single published event by slug.
 *
 * Wrapped in React's cache() so generateMetadata and the page component
 * share one query instead of two.
 *
 * This is a guest-facing route with no session/cookies involved, so a plain
 * anon-key client is used here rather than the cookie-aware @supabase/ssr
 * helpers used for the browser client. This is intentionally NOT the
 * service-role client from lib/supabase/server.ts — that's reserved for
 * admin routes only (see Shared Reference). RLS on `events` already
 * restricts reads to published rows; the `.eq("published", true)` below is
 * defense-in-depth, same pattern as the Chat 3/5 read queries.
 */
const getEventBySlug = cache(async function getEventBySlug(slug: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase
    .from("events")
    .select("id, title")
    .eq("slug", slug)
    .eq("published", true)
    .single();

  if (error || !data) return null;
  return data;
});

interface MessagePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: MessagePageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return {};

  return {
    title: `Leave a Message — ${event.title}`,
    description: `Leave a message for ${event.title}.`,
    alternates: { canonical: `/events/${slug}/message` },
    // Guest-submission routes aren't meant to be indexed/shared as
    // destinations in their own right — the landing page is.
    robots: { index: false, follow: true },
  };
}

export default async function MessagePage({ params }: MessagePageProps) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-4 py-16">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-semibold text-foreground">
          Leave a Message
        </h1>
        <p className="text-sm text-muted-foreground">for {event.title}</p>
      </div>
      <MessageForm eventId={event.id} />
    </main>
  );
}
