"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo/Logo";
import MessageModeration from "./MessageModeration";
import GalleryModeration from "./GalleryModeration";
import EventEditor from "./EventEditor";
import type { AdminEvent } from "./types";

type Tab = "messages" | "gallery" | "settings";

interface AdminDashboardProps {
  initialEvents: AdminEvent[];
  userEmail: string;
}

/**
 * The `events` table supports many events (unique slug per host/event), so
 * a single hardcoded event_id isn't safe to bake into the moderation
 * panels below — this component owns which event is currently selected
 * and passes eventId down. With exactly one event (the common case for a
 * single wedding/birthday) the selector collapses to a plain label instead
 * of a dropdown with one option.
 *
 * `events` is held in local state (seeded from the server-fetched
 * `initialEvents`) so EventEditor's save can update title/subtitle/etc. in
 * place without a full page reload.
 */
export default function AdminDashboard({ initialEvents, userEmail }: AdminDashboardProps) {
  const router = useRouter();
  const [events, setEvents] = useState<AdminEvent[]>(initialEvents);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(
    initialEvents[0]?.id ?? null
  );
  const [activeTab, setActiveTab] = useState<Tab>("messages");
  const [signingOut, setSigningOut] = useState(false);

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId) ?? null,
    [events, selectedEventId]
  );

  async function handleLogout() {
    if (signingOut) return;
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  function handleEventUpdated(updated: AdminEvent) {
    setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }

  if (events.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 px-4 py-24 text-center">
        <Logo />
        <p className="text-foreground">No events exist yet.</p>
        <p className="text-sm text-muted-foreground">
          Create one directly in Supabase to start moderating it here.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Logo size={28} />
          <div>
            <h1 className="text-lg font-medium text-foreground">Admin dashboard</h1>
            <p className="text-xs text-muted-foreground">{userEmail}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={signingOut}
          className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogOut size={14} />
          {signingOut ? "Signing out..." : "Sign out"}
        </button>
      </header>

      {events.length > 1 && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="event-select" className="text-sm font-medium text-foreground">
            Event
          </label>
          <select
            id="event-select"
            value={selectedEventId ?? ""}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="w-full max-w-sm rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title} ({event.slug})
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedEvent && (
        <>
          <nav className="flex gap-1 border-b border-border">
            {(
              [
                ["messages", "Messages"],
                ["gallery", "Gallery"],
                ["settings", "Event settings"],
              ] as [Tab, string][]
            ).map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "border-accent text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          {activeTab === "messages" && <MessageModeration eventId={selectedEvent.id} />}
          {activeTab === "gallery" && <GalleryModeration eventId={selectedEvent.id} />}
          {activeTab === "settings" && (
            <EventEditor event={selectedEvent} onUpdated={handleEventUpdated} />
          )}
        </>
      )}
    </div>
  );
}
