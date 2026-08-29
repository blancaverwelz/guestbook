import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { UploadButton } from "@/components/UploadButton/UploadButton";
import GalleryGrid from "@/components/Gallery/GalleryGrid";
import { getEventBySlug } from "@/lib/events";

// Chat 9 hotfix (Issue 2): was a local near-duplicate fetcher. Now imports
// the same shared, cache()-wrapped fetcher used by the layout — see
// app/events/[slug]/layout.tsx and lib/events.ts.

interface GalleryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: GalleryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return {};

  return {
    title: `Gallery — ${event.title}`,
    description: `Photos shared by guests for ${event.title}.`,
    alternates: { canonical: `/events/${slug}/gallery` },
  };
}

export default async function GalleryPage({ params }: GalleryPageProps) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-16">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Gallery</h1>
        <p className="text-sm text-muted-foreground">for {event.title}</p>
      </div>

      <div className="mx-auto w-full max-w-xl">
        <UploadButton eventId={event.id} />
      </div>

      <GalleryGrid eventId={event.id} />
    </main>
  );
}
