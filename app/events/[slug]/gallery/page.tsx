import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { UploadButton } from "@/components/UploadButton/UploadButton";
import ArchiveIntro from "@/components/Guestbook/ArchiveIntro";
import GalleryGrid from "@/components/Gallery/GalleryGrid";
import { getEventBySlug } from "@/lib/events";

interface GalleryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: GalleryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return {};

  const title = event.title.trim();
  return {
    title: title ? `Gallery — ${title}` : "Gallery",
    description: title ? `Photos shared by guests for ${title}.` : "Photos shared by guests.",
    alternates: { canonical: `/events/${slug}/gallery` },
  };
}

export default async function GalleryPage({ params }: GalleryPageProps) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event) notFound();

  const title = event.title.trim();
  return (
    <main className="archive-stage min-h-screen px-4 pb-16 text-foreground sm:pb-24">
      <ArchiveIntro
        compact
        title="The photo album."
        description={title ? `Share a moment you captured at ${title}.` : "Share a moment you captured today."}
      >
        <UploadButton key={event.id} eventId={event.id} />
      </ArchiveIntro>
      <div className="mx-auto w-full max-w-[46rem]">
        <GalleryGrid eventId={event.id} />
      </div>
    </main>
  );
}
