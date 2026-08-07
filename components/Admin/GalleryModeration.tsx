"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { galleryStoragePathFromUrl } from "@/lib/galleryStoragePath";

type GalleryItem = {
  id: string;
  thumbnail_url: string;
  image_url: string;
  uploader_name: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

type RowState = "IDLE" | "DELETING" | "ERROR";

/**
 * Delete-only, per the chat 7 spec ("gallery (delete)" — approve/reject is
 * scoped to messages only, not gallery). Shows every photo for the event
 * regardless of status, since the failure mode that matters here is "an
 * inappropriate photo stays live and visible to all guests" — an admin
 * needs to be able to pull *any* photo, not just ones still pending.
 *
 * Storage delete before DB delete, deliberately: if the DB delete then
 * fails, the row is still there for retry and `storage.remove()` on an
 * already-removed path is a no-op rather than an error, so retrying is
 * safe. The reverse order risks a DB row with a 404'ing image if storage
 * delete fails after the row is gone — worse, since there's then nothing
 * left in the UI to retry from.
 *
 * `galleryStoragePathFromUrl` returning null (URL shape unexpected) skips
 * the storage call and surfaces an error rather than silently deleting
 * only the DB row — a photo disappearing from the admin list while still
 * being reachable by direct URL would defeat the point of this panel.
 */
export default function GalleryModeration({ eventId }: { eventId: string }) {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});
  const inFlightRef = useRef<Set<string>>(new Set());

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("gallery")
      .select("id, thumbnail_url, image_url, uploader_name, status, created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    if (error) {
      setLoadError("Couldn't load gallery photos.");
      setLoading(false);
      return;
    }

    setItems(data ?? []);
    setRowStates({});
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  async function handleDelete(item: GalleryItem) {
    if (inFlightRef.current.has(item.id)) return;
    inFlightRef.current.add(item.id);
    setRowStates((prev) => ({ ...prev, [item.id]: "DELETING" }));

    const fullPath = galleryStoragePathFromUrl(item.image_url);
    const thumbPath = galleryStoragePathFromUrl(item.thumbnail_url);

    if (!fullPath || !thumbPath) {
      inFlightRef.current.delete(item.id);
      setRowStates((prev) => ({ ...prev, [item.id]: "ERROR" }));
      return;
    }

    const supabase = createClient();
    const { error: storageError } = await supabase.storage
      .from("gallery")
      .remove([fullPath, thumbPath]);

    if (storageError) {
      inFlightRef.current.delete(item.id);
      setRowStates((prev) => ({ ...prev, [item.id]: "ERROR" }));
      return;
    }

    const { error: dbError } = await supabase.from("gallery").delete().eq("id", item.id);

    inFlightRef.current.delete(item.id);

    if (dbError) {
      setRowStates((prev) => ({ ...prev, [item.id]: "ERROR" }));
      return;
    }

    setItems((prev) => prev.filter((i) => i.id !== item.id));
    setRowStates((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
  }

  if (loading) {
    return <p className="py-8 text-sm text-muted-foreground">Loading gallery...</p>;
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-start gap-2 py-8">
        <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
        <button
          type="button"
          onClick={() => void fetchItems()}
          className="text-sm font-medium text-accent underline underline-offset-2"
        >
          Try again
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 px-6 py-16 text-center">
        <p className="text-foreground">No photos yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {items.map((item) => {
        const rowState = rowStates[item.id] ?? "IDLE";
        const deleting = rowState === "DELETING";

        return (
          <div
            key={item.id}
            className="flex flex-col gap-2 rounded-lg border border-border bg-card p-2"
          >
            <div className="relative aspect-square overflow-hidden rounded-md bg-muted-foreground/20">
              <Image
                src={item.thumbnail_url}
                alt={item.uploader_name ? `Photo from ${item.uploader_name}` : "Gallery photo"}
                fill
                sizes="(max-width: 640px) 50vw, 25vw"
                className="object-cover"
              />
            </div>

            <div className="flex items-center justify-between gap-1">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  item.status === "approved"
                    ? "bg-accent/20 text-accent"
                    : item.status === "pending"
                      ? "bg-muted-foreground/20 text-muted-foreground"
                      : "bg-red-600/10 text-red-600 dark:text-red-400"
                }`}
              >
                {item.status}
              </span>
              <button
                type="button"
                onClick={() => void handleDelete(item)}
                disabled={deleting}
                aria-label="Delete photo"
                className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 size={12} />
                {deleting ? "..." : "Delete"}
              </button>
            </div>

            {rowState === "ERROR" && (
              <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                Delete failed. Try again.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
