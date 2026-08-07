"use client";

import { useCallback, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isHeic, convertHeicToJpeg } from "@/lib/heicConvert";
import { compressImage } from "@/lib/imageCompression";

export type GalleryUploadState =
  | "IDLE"
  | "CONVERTING"
  | "COMPRESSING"
  | "UPLOADING"
  | "SUCCESS"
  | "ERROR";

/**
 * `crypto.randomUUID()` is only defined in secure contexts (HTTPS, or
 * `localhost` specifically) per spec. Testing on a real phone against a
 * local dev server means the page is loaded over plain HTTP from a LAN IP
 * (e.g. http://192.168.x.x:3000) — not `localhost` — so on iOS Safari
 * `crypto.randomUUID` is simply absent and calling it throws immediately,
 * before the pipeline even reaches the network. `crypto.getRandomValues`
 * has no such secure-context restriction, so it's the fallback; a
 * `Math.random`-based id is a last-resort fallback for the rare case
 * neither is available. This id is only used to build a unique storage
 * path, never for anything security-sensitive.
 */
function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const MAX_RAW_FILE_MB = 30;
const ACCEPTED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

interface UseGalleryUploadOptions {
  eventId: string;
}

interface UseGalleryUploadReturn {
  state: GalleryUploadState;
  error: string | null;
  file: File | null;
  thumbnailPreviewUrl: string | null;
  selectFile: (file: File) => void;
  retry: () => void;
  reset: () => void;
}

/**
 * State machine: IDLE | CONVERTING | COMPRESSING | UPLOADING | SUCCESS | ERROR
 *
 * Edge cases this guards against:
 * - Duplicate submits: `inFlightRef` is a synchronous ref (same pattern as
 *   useMessageSubmit) so a second selectFile/retry call can't race in even
 *   if it fires before a re-render disables the button.
 * - Silent HEIC failure: conversion is its own explicit CONVERTING stage
 *   through lib/heicConvert.ts, never folded invisibly into compression —
 *   canvas-based compression fails silently on raw HEIC input on many
 *   browsers, which is the most likely real bug in this chat.
 * - Lost photo on failure: the original File lives in `fileRef` (a ref, not
 *   just state) through every stage. On ERROR the guest never has to
 *   reselect from their camera roll — `retry()` replays the pipeline
 *   against that same file.
 * - Status correctness (hotfix): `gallery_requires_approval` is fetched
 *   fresh from the `events` row at UPLOADING time, not passed in as a prop
 *   read once when the gallery page first loaded. A guest can leave the
 *   gallery page open for the whole event; if an admin flips the toggle
 *   on mid-event, a page-load-time value would let every already-open tab
 *   keep inserting as `approved` until the guest manually refreshes. The
 *   fresh read is only ever used to *add* an explicit status: 'pending'
 *   when true — when false, `status` is omitted from the insert entirely
 *   so the table's own default ('approved') applies, mirroring
 *   useMessageSubmit's rule against hardcoding a status that could drift
 *   from the DB default. If the fresh read itself fails, the upload fails
 *   closed (ERROR, retryable) rather than guessing — silently defaulting
 *   to 'approved' on a failed read would bypass moderation exactly when
 *   moderation was just turned on.
 * - Partial failure after upload: if the storage upload succeeds but the
 *   `gallery` insert fails, this surfaces as ERROR and retry() re-runs the
 *   whole pipeline under a fresh random path (no collision risk). That
 *   does leave an orphaned object in storage on that specific failure path
 *   — acceptable for a one-shot event, called out here rather than quietly
 *   accepted. Admin cleanup of orphans is out of scope for this chat.
 */
export function useGalleryUpload({ eventId }: UseGalleryUploadOptions): UseGalleryUploadReturn {
  const [state, setState] = useState<GalleryUploadState>("IDLE");
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(null);
  const inFlightRef = useRef(false);
  const fileRef = useRef<File | null>(null);

  const runPipeline = useCallback(
    async (inputFile: File) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      setError(null);

      try {
        let workingFile = inputFile;

        if (isHeic(inputFile)) {
          setState("CONVERTING");
          workingFile = await convertHeicToJpeg(inputFile);
        }

        setState("COMPRESSING");
        const { full, thumbnail } = await compressImage(workingFile);

        setState("UPLOADING");
        const supabase = createClient();
        const id = generateId();
        const fullPath = `${eventId}/${id}.webp`;
        const thumbPath = `${eventId}/${id}-thumb.webp`;

        const { error: fullUploadError } = await supabase.storage
          .from("gallery")
          .upload(fullPath, full, { contentType: "image/webp", upsert: false });
        if (fullUploadError) throw new Error("Upload failed. Please try again.");

        const { error: thumbUploadError } = await supabase.storage
          .from("gallery")
          .upload(thumbPath, thumbnail, { contentType: "image/webp", upsert: false });
        if (thumbUploadError) throw new Error("Upload failed. Please try again.");

        const { data: fullUrlData } = supabase.storage.from("gallery").getPublicUrl(fullPath);
        const { data: thumbUrlData } = supabase.storage
          .from("gallery")
          .getPublicUrl(thumbPath);

        // Read the event's current approval setting now, not whatever was
        // true when this page first loaded — see the doc comment above.
        const { data: eventRow, error: eventFetchError } = await supabase
          .from("events")
          .select("gallery_requires_approval")
          .eq("id", eventId)
          .single();
        if (eventFetchError || !eventRow) {
          throw new Error("Upload failed. Please try again.");
        }

        const insertPayload: Record<string, unknown> = {
          event_id: eventId,
          image_url: fullUrlData.publicUrl,
          thumbnail_url: thumbUrlData.publicUrl,
        };
        // Only set status explicitly when approval is required. Otherwise
        // leave it unset so the column default ('approved') applies — see
        // the doc comment above.
        if (eventRow.gallery_requires_approval) {
          insertPayload.status = "pending";
        }

        const { error: insertError } = await supabase.from("gallery").insert(insertPayload);
        if (insertError) throw new Error("Upload failed. Please try again.");

        setThumbnailPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(thumbnail);
        });
        setState("SUCCESS");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
        setState("ERROR");
      } finally {
        inFlightRef.current = false;
      }
    },
    [eventId]
  );

  const selectFile = useCallback(
    (inputFile: File) => {
      const accepted = ACCEPTED_TYPES.has(inputFile.type.toLowerCase()) || isHeic(inputFile);
      if (!accepted) {
        setError("Please choose a JPEG, PNG, WebP, or HEIC photo.");
        setState("ERROR");
        return;
      }
      if (inputFile.size > MAX_RAW_FILE_MB * 1024 * 1024) {
        setError(`Photo is too large (max ${MAX_RAW_FILE_MB}MB).`);
        setState("ERROR");
        return;
      }

      fileRef.current = inputFile;
      setFile(inputFile);
      void runPipeline(inputFile);
    },
    [runPipeline]
  );

  const retry = useCallback(() => {
    if (fileRef.current) {
      void runPipeline(fileRef.current);
    }
  }, [runPipeline]);

  const reset = useCallback(() => {
    inFlightRef.current = false;
    fileRef.current = null;
    setFile(null);
    setState("IDLE");
    setError(null);
    setThumbnailPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  return { state, error, file, thumbnailPreviewUrl, selectFile, retry, reset };
}
