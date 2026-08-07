import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import GuestbookFeed from "@/components/Guestbook/GuestbookFeed";

// Plain anon-key client, matching app/events/[slug]/message/page.tsx —
// deliberately not lib/supabase/server.ts, which is reserved for admin
// (service-role) routes only.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function GuestbookPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { data: event, error } = await supabase
    .from("events")
    .select("id, title")
    .eq("slug", slug)
    .eq("published", true)
    .single();

  if (error || !event) {
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
