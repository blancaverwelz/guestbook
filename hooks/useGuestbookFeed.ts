"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type GuestbookMessage = {
  id: string;
  name: string;
  message: string;
  created_at: string;
};

const PAGE_SIZE = 20;

/**
 * Read-side feed for a single event's approved messages. Filters
 * status='approved' explicitly in the query (defense in depth — RLS
 * already enforces this; if the two ever disagree, that's RLS
 * misconfiguration to stop and report, not something to work around here).
 *
 * Realtime subscribes to '*' events, not just INSERT: a message is created
 * with status='pending' (Chat 2 default) and only becomes visible here via
 * a later UPDATE when admin approves it. An admin rejecting an
 * already-approved message, or deleting one, must also remove it from the
 * live feed.
 */
export function useGuestbookFeed(eventId: string) {
  const [messages, setMessages] = useState<GuestbookMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const supabaseRef = useRef(createClient());
  const seenIds = useRef<Set<string>>(new Set());

  const fetchPage = useCallback(
    async (cursor: string | null) => {
      const supabase = supabaseRef.current;
      let query = supabase
        .from("messages")
        .select("id, name, message, created_at")
        .eq("event_id", eventId)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (cursor) {
        query = query.lt("created_at", cursor);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      return data ?? [];
    },
    [eventId]
  );

  // Initial load
  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchPage(null);
        if (cancelled) return;
        data.forEach((m) => seenIds.current.add(m.id));
        setMessages(data);
        setHasMore(data.length === PAGE_SIZE);
      } catch {
        if (!cancelled) {
          setError("Couldn't load messages. Please refresh and try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadInitial();
    return () => {
      cancelled = true;
    };
  }, [fetchPage]);

  // Realtime subscription — one channel per event, torn down on unmount.
  //
  // Uses Broadcast (topic `messages-changes:<eventId>`, populated by the
  // messages_broadcast_trigger from migration 0005), not postgres_changes.
  // The messages SELECT policy is scoped to status='approved', which makes
  // postgres_changes silently drop any UPDATE crossing the approved
  // boundary in either direction (pending<->approved, approved<->rejected)
  // — Broadcast bypasses that.
  // `private: true` is required here — realtime.broadcast_changes() always
  // routes through Realtime Authorization (see migration 0006), there's no
  // unauthenticated delivery path for it. That policy lives on Supabase's
  // internal realtime.messages table, scoped to this topic prefix only —
  // it does not touch the messages table's own RLS.
  useEffect(() => {
    const supabase = supabaseRef.current;

    const handleChange = (
      operation: "INSERT" | "UPDATE" | "DELETE",
      newRow: (GuestbookMessage & { status?: string }) | null,
      oldRow: { id?: string } | null
    ) => {
      if (operation === "DELETE") {
        if (oldRow?.id) {
          seenIds.current.delete(oldRow.id);
          setMessages((prev) => prev.filter((m) => m.id !== oldRow.id));
        }
        return;
      }

      const row = newRow;
      if (!row) return;

      if (row.status !== "approved") {
        // Covers reject-after-approve: drop it if it was showing.
        if (seenIds.current.has(row.id)) {
          seenIds.current.delete(row.id);
          setMessages((prev) => prev.filter((m) => m.id !== row.id));
        }
        return;
      }

      if (seenIds.current.has(row.id)) return;
      seenIds.current.add(row.id);

      setMessages((prev) =>
        [
          {
            id: row.id,
            name: row.name,
            message: row.message,
            created_at: row.created_at,
          },
          ...prev,
        ].sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        )
      );
    };

    const channel = supabase
      .channel(`messages-changes:${eventId}`, { config: { private: true } })
      .on("broadcast", { event: "*" }, ({ event, payload }) => {
        const operation = (payload?.operation ?? event) as "INSERT" | "UPDATE" | "DELETE";
        handleChange(
          operation,
          (payload?.record as (GuestbookMessage & { status?: string }) | undefined) ?? null,
          (payload?.old_record as { id?: string } | undefined) ?? null
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    try {
      const cursor = messages[messages.length - 1].created_at;
      const data = await fetchPage(cursor);
      data.forEach((m) => seenIds.current.add(m.id));
      setMessages((prev) => [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
    } catch {
      setError("Couldn't load more messages.");
    } finally {
      setLoadingMore(false);
    }
  }, [fetchPage, hasMore, loadingMore, messages]);

  return { messages, loading, loadingMore, error, hasMore, loadMore };
}
