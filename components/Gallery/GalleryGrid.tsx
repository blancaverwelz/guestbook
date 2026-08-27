"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import EmptyState from "./EmptyState";
import Lightbox from "./Lightbox";

type GalleryPhoto = {
  id: string;
  thumbnail_url: string;
  image_url: string;
  uploader_name: string | null;
  created_at: string;
};

const PAGE_SIZE = 24;

function GridSkeleton() {
  return (
    <div className="columns-2 gap-3 sm:columns-3 md:columns-4 [column-fill:_balance]">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="mb-3 animate-pulse break-inside-avoid rounded-md bg-muted-foreground/20"
          style={{ height: 120 + (i % 3) * 60 }}
        />
      ))}
    </div>
  );
}

/**
 * Fades a thumbnail in as it actually finishes loading, rather than on
 * mount — a photo whose network fetch is still in flight gets an
 * intentional soft placeholder instead of a blank flash the instant it
 * scrolls into view. `loaded` starts false on every mount, so this also
 * naturally covers newly-approved photos arriving over Realtime.
 */
function GalleryThumbnail({
  photo,
  onOpen,
}: {
  photo: GalleryPhoto;
  onOpen: () => void;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="mb-3 block w-full break-inside-avoid overflow-hidden rounded-md border border-border bg-card focus:outline-none focus:ring-2 focus:ring-accent"
      aria-label={photo.uploader_name ? `View photo from ${photo.uploader_name}` : "View photo"}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: loaded ? 1 : 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <Image
          src={photo.thumbnail_url}
          alt={photo.uploader_name ? `Photo shared by ${photo.uploader_name}` : "Guest photo"}
          width={400}
          height={400}
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
          className="h-auto w-full"
          onLoad={() => setLoaded(true)}
        />
      </motion.div>
    </button>
  );
}

/**
 * Public masonry grid for one event's approved photos. Same read-side shape
 * as Chat 3's GuestbookFeed: explicit status='approved' filter in the query
 * (RLS already enforces this — a mismatch here means RLS is misconfigured,
 * stop and report rather than silently trusting the client filter alone),
 * paginated with infinite scroll, and a realtime subscription so a photo
 * approved by admin while a guest is browsing shows up without a refresh.
 *
 * Grid renders thumbnail_url only. Lightbox (opened on click) is the only
 * place image_url — the full-res original — is ever requested.
 */
export default function GalleryGrid({ eventId }: { eventId: string }) {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const supabaseRef = useRef(createClient());
  const seenIds = useRef<Set<string>>(new Set());
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const fetchPage = useCallback(
    async (cursor: string | null) => {
      const supabase = supabaseRef.current;
      let query = supabase
        .from("gallery")
        .select("id, thumbnail_url, image_url, uploader_name, created_at")
        .eq("event_id", eventId)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (cursor) query = query.lt("created_at", cursor);

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      return data ?? [];
    },
    [eventId]
  );

  // Initial load.
  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchPage(null);
        if (cancelled) return;
        data.forEach((p) => seenIds.current.add(p.id));
        setPhotos(data);
        setHasMore(data.length === PAGE_SIZE);
      } catch {
        if (!cancelled) setError("Couldn't load photos. Please refresh and try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadInitial();
    return () => {
      cancelled = true;
    };
  }, [fetchPage]);

  // Realtime — one channel per event, torn down on unmount. Mirrors
  // useGuestbookFeed: a photo can be inserted already-approved (default
  // status) or arrive later via an admin UPDATE from pending -> approved,
  // and a rejected/deleted photo must disappear from the live grid too.
  //
  // Uses Broadcast (topic `gallery-changes:<eventId>`, populated by the
  // gallery_broadcast_trigger from migration 0005), not postgres_changes.
  // The gallery SELECT policy is scoped to status='approved', which makes
  // postgres_changes silently drop any UPDATE crossing the approved
  // boundary in either direction — Broadcast bypasses that.
  // `private: true` is required here — realtime.broadcast_changes() always
  // routes through Realtime Authorization (see migration 0006), there's no
  // unauthenticated delivery path for it. That policy lives on Supabase's
  // internal realtime.messages table, scoped to this topic prefix only —
  // it does not touch the gallery table's own RLS.
  useEffect(() => {
    const supabase = supabaseRef.current;

    const handleChange = (
      operation: "INSERT" | "UPDATE" | "DELETE",
      newRow: (GalleryPhoto & { status?: string }) | null,
      oldRow: { id?: string } | null
    ) => {
      if (operation === "DELETE") {
        if (oldRow?.id) {
          seenIds.current.delete(oldRow.id);
          setPhotos((prev) => prev.filter((p) => p.id !== oldRow.id));
        }
        return;
      }

      const row = newRow;
      if (!row) return;

      if (row.status !== "approved") {
        if (seenIds.current.has(row.id)) {
          seenIds.current.delete(row.id);
          setPhotos((prev) => prev.filter((p) => p.id !== row.id));
        }
        return;
      }

      if (seenIds.current.has(row.id)) return;
      seenIds.current.add(row.id);

      setPhotos((prev) =>
        [
          {
            id: row.id,
            thumbnail_url: row.thumbnail_url,
            image_url: row.image_url,
            uploader_name: row.uploader_name,
            created_at: row.created_at,
          },
          ...prev,
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      );
    };

    const channel = supabase
      .channel(`gallery-changes:${eventId}`, { config: { private: true } })
      .on("broadcast", { event: "*" }, ({ event, payload }) => {
        const operation = (payload?.operation ?? event) as "INSERT" | "UPDATE" | "DELETE";
        handleChange(
          operation,
          (payload?.record as (GalleryPhoto & { status?: string }) | undefined) ?? null,
          (payload?.old_record as { id?: string } | undefined) ?? null
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || photos.length === 0) return;
    setLoadingMore(true);
    try {
      const cursor = photos[photos.length - 1].created_at;
      const data = await fetchPage(cursor);
      data.forEach((p) => seenIds.current.add(p.id));
      setPhotos((prev) => [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
    } catch {
      setError("Couldn't load more photos.");
    } finally {
      setLoadingMore(false);
    }
  }, [fetchPage, hasMore, loadingMore, photos]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "300px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  if (loading) return <GridSkeleton />;

  if (error && photos.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-foreground">
        {error}
      </div>
    );
  }

  if (photos.length === 0) return <EmptyState />;

  return (
    <div className="flex flex-col gap-3">
      <div className="columns-2 gap-3 sm:columns-3 md:columns-4 [column-fill:_balance]">
        {photos.map((photo, i) => (
          <GalleryThumbnail key={photo.id} photo={photo} onOpen={() => setLightboxIndex(i)} />
        ))}
      </div>

      {hasMore && (
        <div ref={sentinelRef} className="py-4 text-center text-sm text-muted-foreground">
          {loadingMore ? "Loading more…" : ""}
        </div>
      )}

      {error && photos.length > 0 && (
        <p className="text-center text-sm text-muted-foreground">{error}</p>
      )}

      <AnimatePresence>
        {lightboxIndex !== null && (
          <Lightbox
            photos={photos.map((p) => ({
              id: p.id,
              image_url: p.image_url,
              uploader_name: p.uploader_name,
            }))}
            initialIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
