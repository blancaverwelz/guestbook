import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminDashboard from "@/components/Admin/AdminDashboard";
import type { AdminEvent } from "@/components/Admin/types";

/**
 * Replaces the Chat 1 placeholder. Server Component: does its own
 * cookie-based auth check before rendering anything, on top of
 * middleware.ts already redirecting unauthenticated requests away from
 * /admin/*. Belt-and-suspenders is deliberate here, not redundant — this
 * route can approve/reject messages and delete gallery photos/storage
 * objects, so a middleware misconfiguration (matcher typo, edge runtime
 * skip) failing open is exactly the kind of failure worth a cheap second
 * check for.
 *
 * `events` is fetched with the signed-in admin's own cookie-based session
 * (not the service-role client from lib/supabase/server.ts) — RLS's
 * "admin full access events" policy already grants the authenticated role
 * full read access, so there's no need to bypass RLS here. Service role
 * stays reserved for cases that actually need it.
 */
export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: events } = await supabase
    .from("events")
    .select(
      "id, slug, title, subtitle, event_date, cover_image, accent_color, gallery_requires_approval, hero_settings"
    )
    .order("created_at", { ascending: false })
    .returns<AdminEvent[]>();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <AdminDashboard initialEvents={events ?? []} userEmail={user.email ?? ""} />
    </main>
  );
}
