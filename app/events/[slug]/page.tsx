import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Hero from "@/components/Hero/Hero";
import CTASection from "@/components/CTASection/CTASection";
import AccentColorProvider from "@/components/Hero/AccentColorProvider";
import type { LandingEvent } from "@/types/event";

// Same pattern as the Chat 3/5 read routes: stateless anonymous read, plain
// anon-key client (no cookies/session on this guest-facing route), RLS
// already restricts to published rows and `.eq("published", true)` here is
// defense-in-depth, not the actual gate.
async function getEventBySlug(slug: string): Promise<LandingEvent | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase
    .from("events")
    .select("id, title, subtitle, event_date, cover_image, accent_color")
    .eq("slug", slug)
    .eq("published", true)
    .single();

  if (error || !data) return null;
  return data;
}

interface EventLandingPageProps {
  params: Promise<{ slug: string }>;
}

export default async function EventLandingPage({ params }: EventLandingPageProps) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event) {
    notFound();
  }

  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      <AccentColorProvider
        coverImage={event.cover_image}
        fallbackAccent={event.accent_color ?? "#B08D57"}
      >
        <Hero event={event} />
        <CTASection slug={slug} />
      </AccentColorProvider>
    </main>
  );
}
