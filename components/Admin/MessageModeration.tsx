"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type PendingMessage = {
  id: string;
  name: string;
  message: string;
  created_at: string;
};

type RowState = "IDLE" | "APPROVING" | "REJECTING" | "ERROR";

/**
 * Pending-only queue, oldest first (FIFO — a message sitting unreviewed
 * the longest is the one most likely to matter if the event is already
 * underway). Approved/rejected messages drop out of view immediately since
 * there's nothing left to action on them here.
 *
 * Per-row state machine: IDLE | APPROVING | REJECTING | ERROR, keyed by
 * message id, plus an `inFlightRef` Set for the synchronous double-submit
 * guard — same pattern as useMessageSubmit/useGalleryUpload, just fanned
 * out per-row instead of a single global flag, so approving one message
 * doesn't block rejecting another at the same time.
 *
 * A row is only removed from local state *after* the DB update confirms
 * success (not optimistically before the request resolves) — approve/
 * reject changing the public guestbook is exactly the kind of state
 * transition the CRUD playbook flags as needing verified-not-assumed
 * success.
 */
export default function MessageModeration({ eventId }: { eventId: string }) {
  const [messages, setMessages] = useState<PendingMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});
  const inFlightRef = useRef<Set<string>>(new Set());

  const fetchPending = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("messages")
      .select("id, name, message, created_at")
      .eq("event_id", eventId)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      setLoadError("Couldn't load pending messages.");
      setLoading(false);
      return;
    }

    setMessages(data ?? []);
    setRowStates({});
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    void fetchPending();
  }, [fetchPending]);

  async function handleAction(id: string, action: "approved" | "rejected") {
    if (inFlightRef.current.has(id)) return;
    inFlightRef.current.add(id);
    setRowStates((prev) => ({
      ...prev,
      [id]: action === "approved" ? "APPROVING" : "REJECTING",
    }));

    const supabase = createClient();
    const { error } = await supabase
      .from("messages")
      .update({ status: action })
      .eq("id", id);

    inFlightRef.current.delete(id);

    if (error) {
      setRowStates((prev) => ({ ...prev, [id]: "ERROR" }));
      return;
    }

    setMessages((prev) => prev.filter((m) => m.id !== id));
    setRowStates((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  if (loading) {
    return <p className="py-8 text-sm text-muted-foreground">Loading pending messages...</p>;
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-start gap-2 py-8">
        <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
        <button
          type="button"
          onClick={() => void fetchPending()}
          className="text-sm font-medium text-accent underline underline-offset-2"
        >
          Try again
        </button>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 px-6 py-16 text-center">
        <p className="text-foreground">No pending messages.</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {messages.map((m) => {
        const rowState = rowStates[m.id] ?? "IDLE";
        const busy = rowState === "APPROVING" || rowState === "REJECTING";

        return (
          <li key={m.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-medium text-foreground">{m.name}</p>
              <time dateTime={m.created_at} className="shrink-0 text-xs text-muted-foreground">
                {new Date(m.created_at).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </time>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">{m.message}</p>

            {rowState === "ERROR" && (
              <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
                Something went wrong. Please try again.
              </p>
            )}

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => void handleAction(m.id, "approved")}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Check size={14} />
                {rowState === "APPROVING" ? "Approving..." : "Approve"}
              </button>
              <button
                type="button"
                onClick={() => void handleAction(m.id, "rejected")}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
              >
                <X size={14} />
                {rowState === "REJECTING" ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
