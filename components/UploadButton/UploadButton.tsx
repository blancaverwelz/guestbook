"use client";

import { useRef } from "react";
import { CircleAlert, ImagePlus, RotateCcw } from "lucide-react";
import { useGalleryUpload } from "@/hooks/useGalleryUpload";

const stageLabels = {
  CONVERTING: "Converting photo…",
  COMPRESSING: "Compressing photo…",
  UPLOADING: "Uploading…",
};

export function UploadButton({ eventId }: { eventId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { state, error, file, thumbnailPreviewUrl, selectFile, retry, reset } = useGalleryUpload({ eventId });
  const busy = state === "CONVERTING" || state === "COMPRESSING" || state === "UPLOADING";

  return (
    <div className="flex max-w-md flex-col items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        hidden
        disabled={busy}
        onChange={(event) => {
          const picked = event.target.files?.[0];
          event.target.value = "";
          if (picked) {
            if (state === "SUCCESS") reset();
            selectFile(picked);
          }
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-accent-foreground shadow-sm transition-opacity enabled:hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:opacity-60"
      >
        <ImagePlus className="size-4" aria-hidden />
        {busy ? stageLabels[state] : state === "SUCCESS" ? "Add another photo" : "Add a photo"}
      </button>
      <div role="status" className={state === "SUCCESS" ? "flex items-center gap-2 text-sm text-foreground" : "sr-only"}>
        {busy && stageLabels[state]}
        {state === "SUCCESS" && (
          <>
            {thumbnailPreviewUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- Local object URL for the upload preview.
              <img src={thumbnailPreviewUrl} alt="" className="size-12 rounded-md object-cover" />
            )}
            Photo uploaded.
          </>
        )}
      </div>
      {state === "ERROR" && error && (
        <div className="flex flex-col items-center">
          <p role="alert" className="flex items-start gap-2 text-sm text-foreground">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {error}
          </p>
          {file && (
            <button
              type="button"
              onClick={retry}
              className="inline-flex min-h-11 items-center gap-1.5 text-sm text-foreground underline underline-offset-4"
            >
              <RotateCcw className="size-4" aria-hidden />
              Try again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
