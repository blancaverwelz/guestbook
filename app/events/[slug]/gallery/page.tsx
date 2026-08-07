import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { UploadButton } from "@/components/UploadButton/UploadButton";
import GalleryGrid from "@/components/Gallery/GalleryGrid";

/**
 * Same pattern as the Chat 3 message page: stateless anonymous read of a
 * single published event by slug, plain anon-key client (no cookies/session
 * involved on this guest-facing route). RLS on `events` already restricts
 * reads to published rows; `.eq("published", true)` here is defense in
 * depth, not the actual gate.
 */
async function getEventBySlug(slug: string) {
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
}

interface GalleryPageProps {
  params: Promise<{ slug: string }>;
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
