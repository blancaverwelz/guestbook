import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArchiveIntro from "@/components/Guestbook/ArchiveIntro";
import { MessageForm } from "@/components/MessageForm/MessageForm";
import { getEventBySlug } from "@/lib/events";

interface MessagePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: MessagePageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return {};

  const title = event.title.trim();
  return {
    title: title ? `Leave a Message — ${title}` : "Leave a Message",
    description: title ? `Leave a message for ${title}.` : "Leave a message in the guestbook.",
    alternates: { canonical: `/events/${slug}/message` },
    robots: { index: false, follow: true },
  };
}

export default async function MessagePage({ params }: MessagePageProps) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const title = event.title.trim();
  return (
    <main className="archive-stage min-h-screen px-4 pb-16 pt-4 text-foreground sm:px-6 sm:pb-24">
      <div className="mx-auto w-full max-w-xl">
        <ArchiveIntro
          title="Leave a message."
          description={title ? `A wish, a memory, or a few words for ${title}.` : "A wish, a memory, or a few words from today."}
        />
        <MessageForm key={event.id} eventId={event.id} />
      </div>
    </main>
  );
}
