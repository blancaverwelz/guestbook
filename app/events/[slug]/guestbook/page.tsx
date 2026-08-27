import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import GuestbookFeed from "@/components/Guestbook/GuestbookFeed";

// Plain anon-key client, matching app/events/[slug]/message/page.tsx —
// deliberately not lib/supabase/server.ts, which is reserved for admin
// (service-role) routes only.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Wrapped in React's cache() so generateMetadata and the page component
// share one query instead of two.
const getEventBySlug = cache(async function getEventBySlug(slug: string) {
  const { data, error } = await supabase
    .from("events")
    .select("id, title")
    .eq("slug", slug)
    .eq("published", true)
    .single();

  if (error || !data) return null;
  return data;
});

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
