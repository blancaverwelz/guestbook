"use client";

import { useEffect, useRef } from "react";
import { ImagePlus, RotateCcw } from "lucide-react";
import { useCoverImageUpload } from "@/hooks/useCoverImageUpload";

interface CoverImageUploaderProps {
  eventId: string;
  /** Currently staged/saved cover image URL, shown as the live preview. */
  currentImageUrl: string | null;
  /** Called with the new public URL once an upload finishes successfully. */
  onUploaded: (url: string) => void;
  /** Disable interaction while the parent form is mid-save. */
  disabled?: boolean;
}

/**
 * Upload-only cover image control. No raw URL input is exposed — the admin
 * can only pick a file from their device. A successful upload stages the
 * new public URL into EventEditor's form state via `onUploaded`; nothing is
 * written to `events.cover_image` here. That only happens when the admin
 * clicks the form's existing "Save changes" button, which is what keeps a
 * failed or abandoned upload from ever overwriting the event's currently
 * working cover image.
 */
export default function CoverImageUploader({
  eventId,
  currentImageUrl,
  onUploaded,
  disabled = false,
}: CoverImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { state, error, file, uploadedUrl, selectFile, retry, reset } = useCoverImageUpload({
    eventId,
  });

  const isBusy = state === "CONVERTING" || state === "COMPRESSING" || state === "UPLOADING";

  const stageLabel =
    state === "CONVERTING"
      ? "Converting image..."
      : state === "COMPRESSING"
      ? "Compressing image..."
      : state === "UPLOADING"
      ? "Uploading..."
      : null;

  // Stage the new URL into the parent form as soon as the upload succeeds,
  // then reset this control back to IDLE so it's ready for another replace
  // without carrying stale internal file/error state.
  useEffect(() => {
    if (state === "SUCCESS" && uploadedUrl) {
      onUploaded(uploadedUrl);
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, uploadedUrl]);

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">Cover image</label>

      {currentImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- Supabase
        // Storage public URL, not guaranteed to be a next/image-configured
        // remote pattern.
        <img
          src={currentImageUrl}
          alt=""
          className="h-40 w-full rounded-md border border-border object-cover"
        />
      ) : (
        <div className="flex h-40 w-full items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
          No cover image set
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        className="hidden"
        disabled={disabled || isBusy}
        onChange={(e) => {
          const picked = e.target.files?.[0];
          // Reset the input value so picking the same file again after an
          // error still fires onChange.
          e.target.value = "";
          if (picked) selectFile(picked);
        }}
      />

      <button
        type="button"
        disabled={disabled || isBusy}
        onClick={() => inputRef.current?.click()}
        className="flex w-fit items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
      >
        <ImagePlus size={16} aria-hidden />
        {isBusy ? stageLabel : currentImageUrl ? "Replace cover image" : "Upload cover image"}
      </button>

      {state === "ERROR" && error && (
        <div className="flex items-center gap-2">
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
          {file && (
            <button
              type="button"
              onClick={retry}
              className="flex items-center gap-1.5 text-sm text-accent underline underline-offset-2 hover:opacity-80"
            >
              <RotateCcw size={14} aria-hidden />
              Try again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
