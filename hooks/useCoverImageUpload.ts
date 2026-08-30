"use client";

import { useCallback, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isHeic, convertHeicToJpeg } from "@/lib/heicConvert";
import { compressImage } from "@/lib/imageCompression";

export type CoverImageUploadState =
  | "IDLE"
  | "CONVERTING"
  | "COMPRESSING"
  | "UPLOADING"
  | "SUCCESS"
  | "ERROR";

/**
 * Same secure-context fallback as useGalleryUpload.ts's generateId — copied
 * locally rather than imported so that file (explicitly off-limits for this
 * task) doesn't need to be touched to export it. Only used to build a
 * unique Storage path, never anything security-sensitive.
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

interface UseCoverImageUploadOptions {
  eventId: string;
}

interface UseCoverImageUploadReturn {
  state: CoverImageUploadState;
  error: string | null;
  file: File | null;
  previewUrl: string | null;
  uploadedUrl: string | null;
  selectFile: (file: File) => void;
  retry: () => void;
  reset: () => void;
}

/**
 * Uploads a single admin-selected cover image to Supabase Storage and
 * returns its public URL. Deliberately does NOT touch the `events` table —
 * EventEditor stages the returned URL into its existing form state and only
 * persists it (along with title/subtitle/accent/etc.) on the form's normal
 * Save, so a failed or abandoned upload never overwrites the event's
 * currently-saved working cover image. This mirrors the "does not
 * overwrite the existing working cover image on failure" requirement
 * without needing its own separate persistence path.
 *
 * Reuses the existing "gallery" Storage bucket rather than a new bucket
 * (no migration/RLS change required — see kickoff notes), but writes under
 * a `covers/{eventId}/{id}.webp` path prefix so cover images never share a
 * folder with guest gallery photos (which are stored at
 * `{eventId}/{id}.webp` — a literal eventId, never the string "covers").
 * Admin gallery moderation deletes by row-stored URL, not folder listing,
 * so this prefix is invisible to and unaffected by that flow.
 *
 * State machine mirrors useGalleryUpload.ts: IDLE | CONVERTING |
 * COMPRESSING | UPLOADING | SUCCESS | ERROR. Only the "full" size from
 * compressImage() is used — a cover image has no grid-thumbnail use case,
 * unlike gallery photos.
 */
export function useCoverImageUpload({
  eventId,
}: UseCoverImageUploadOptions): UseCoverImageUploadReturn {
  const [state, setState] = useState<CoverImageUploadState>("IDLE");
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
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
        const { full } = await compressImage(workingFile);

        setState("UPLOADING");
        const supabase = createClient();
        const id = generateId();
        const path = `covers/${eventId}/${id}.webp`;

        const { error: uploadError } = await supabase.storage
          .from("gallery")
          .upload(path, full, { contentType: "image/webp", upsert: false });
        if (uploadError) throw new Error("Upload failed. Please try again.");

        const { data: urlData } = supabase.storage.from("gallery").getPublicUrl(path);

        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(full);
        });
        setUploadedUrl(urlData.publicUrl);
        setState("SUCCESS");
        return urlData.publicUrl;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
        setState("ERROR");
        return null;
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
        setError("Please choose a JPEG, PNG, WebP, or HEIC image.");
        setState("ERROR");
        return;
      }
      if (inputFile.size > MAX_RAW_FILE_MB * 1024 * 1024) {
        setError(`Image is too large (max ${MAX_RAW_FILE_MB}MB).`);
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
    setUploadedUrl(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  return { state, error, file, previewUrl, uploadedUrl, selectFile, retry, reset };
}
