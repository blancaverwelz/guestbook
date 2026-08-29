import { notFound } from "next/navigation";
import type { Metadata } from "next";
import GuestbookFeed from "@/components/Guestbook/GuestbookFeed";
import { getEventBySlug } from "@/lib/events";

// Chat 9 hotfix (Issue 2): was a local near-duplicate fetcher (its own
// `createClient` + `id, title` select). Now imports the same shared,
// cache()-wrapped fetcher used by the layout — see
// app/events/[slug]/layout.tsx and lib/events.ts.

interface GuestbookPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: GuestbookPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return {};

  return {
    title: `Guestbook — ${event.title}`,
    description: `Read messages left for ${event.title}.`,
    alternates: { canonical: `/events/${slug}/guestbook` },
  };
}

export default async function GuestbookPage({ params }: GuestbookPageProps) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-semibold">{event.title} — Guestbook</h1>
        <GuestbookFeed eventId={event.id} />
      </div>
    </main>
  );
}
