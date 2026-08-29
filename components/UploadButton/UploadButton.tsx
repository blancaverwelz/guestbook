"use client";

import { useRef } from "react";
import { ImagePlus, RotateCcw } from "lucide-react";
import { useGalleryUpload } from "@/hooks/useGalleryUpload";

interface UploadButtonProps {
  eventId: string;
}

export function UploadButton({ eventId }: UploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { state, error, file, thumbnailPreviewUrl, selectFile, retry, reset } = useGalleryUpload({
    eventId,
  });

  const isBusy = state === "CONVERTING" || state === "COMPRESSING" || state === "UPLOADING";

  const stageLabel =
    state === "CONVERTING"
      ? "Converting photo..."
      : state === "COMPRESSING"
      ? "Compressing photo..."
      : state === "UPLOADING"
      ? "Uploading..."
      : null;

  if (state === "SUCCESS") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-6 text-center">
        {thumbnailPreviewUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- local
          // object URL preview of the guest's own just-uploaded photo, not
          // a remote image next/image would optimize.
          <img
            src={thumbnailPreviewUrl}
            alt="Your uploaded photo"
            className="h-24 w-24 rounded-md object-cover"
          />
        )}
        <p className="text-sm font-medium text-foreground">
          Photo added! It&apos;ll appear in the gallery shortly.
        </p>
        <button
          type="button"
          onClick={reset}
          className="text-sm text-accent underline underline-offset-2 hover:opacity-80"
        >
          Add another photo
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-6">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        className="hidden"
        disabled={isBusy}
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
        disabled={isBusy}
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 font-medium text-accent-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
      >
        <ImagePlus size={18} aria-hidden />
        {isBusy ? stageLabel : "Add a photo"}
      </button>

      {state === "ERROR" && error && (
        <div className="flex flex-col items-center gap-2 text-center">
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
