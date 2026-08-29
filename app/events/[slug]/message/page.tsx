import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MessageForm } from "@/components/MessageForm/MessageForm";
import { getEventBySlug } from "@/lib/events";

// Chat 9 hotfix (Issue 2): was a local near-duplicate of this fetcher
// selecting only `id, title`. Now imports the same shared, cache()-wrapped
// fetcher used by the layout (see app/events/[slug]/layout.tsx and
// lib/events.ts) — same request, same cached result, no second Supabase
// round trip, and one fewer copy of this query to keep in sync.

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
