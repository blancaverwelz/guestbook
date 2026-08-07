"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AdminEvent } from "./types";

type SaveState = "IDLE" | "SAVING" | "SUCCESS" | "ERROR";

interface EventEditorProps {
  event: AdminEvent;
  onUpdated: (updated: AdminEvent) => void;
}

/**
 * `accent_color` is labeled "Fallback accent color", not "Accent color" —
 * see shared reference doc's "Design system — Accent color". The landing
 * page (Chat 6) auto-extracts a color from `cover_image` client-side and
 * uses that instead whenever it clears WCAG AA contrast; this field only
 * ever renders when there's no cover image or extraction/contrast fails.
 * Labeling it plainly as "Accent color" would make a host who picks a
 * color and doesn't see it used reasonably think the picker is broken.
 *
 * Cover image is a pasted URL, not an upload widget — there's no
 * event-cover Storage bucket in this project (only "gallery", scoped to
 * guest uploads), and standing one up is exactly the kind of
 * storage-dashboard scope the chat 7 spec calls out as post-MVP. A URL
 * field with a live preview covers the stated requirement without it.
 *
 * Form state resets from `event` whenever the selected event changes
 * (AdminDashboard's event selector) or after a successful save — otherwise
 * switching events while mid-edit would silently carry stale field values
 * over to the newly selected event.
 */
export default function EventEditor({ event, onUpdated }: EventEditorProps) {
  const [title, setTitle] = useState(event.title);
  const [subtitle, setSubtitle] = useState(event.subtitle ?? "");
  const [coverImage, setCoverImage] = useState(event.cover_image ?? "");
  const [accentColor, setAccentColor] = useState(event.accent_color ?? "#B08D57");
  const [galleryRequiresApproval, setGalleryRequiresApproval] = useState(
    event.gallery_requires_approval
  );
  const [saveState, setSaveState] = useState<SaveState>("IDLE");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(event.title);
    setSubtitle(event.subtitle ?? "");
    setCoverImage(event.cover_image ?? "");
    setAccentColor(event.accent_color ?? "#B08D57");
    setGalleryRequiresApproval(event.gallery_requires_approval);
    setSaveState("IDLE");
    setError(null);
  }, [event]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (saveState === "SAVING") return;

    setSaveState("SAVING");
    setError(null);

    const supabase = createClient();
    const { data, error: updateError } = await supabase
      .from("events")
      .update({
        title,
        subtitle: subtitle.trim() === "" ? null : subtitle,
        cover_image: coverImage.trim() === "" ? null : coverImage,
        accent_color: accentColor,
        gallery_requires_approval: galleryRequiresApproval,
      })
      .eq("id", event.id)
      .select("id, slug, title, subtitle, cover_image, accent_color, gallery_requires_approval")
      .single();

    if (updateError || !data) {
      setError("Couldn't save changes. Please try again.");
      setSaveState("ERROR");
      return;
    }

    onUpdated(data);
    setSaveState("SUCCESS");
  }

  const isSaving = saveState === "SAVING";

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6"
      noValidate
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="event-title" className="text-sm font-medium text-foreground">
          Title
        </label>
        <input
          id="event-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isSaving}
          required
          className="rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="event-subtitle" className="text-sm font-medium text-foreground">
          Subtitle
        </label>
        <input
          id="event-subtitle"
          type="text"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          disabled={isSaving}
          className="rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="event-cover" className="text-sm font-medium text-foreground">
          Cover image URL
        </label>
        <input
          id="event-cover"
          type="url"
          value={coverImage}
          onChange={(e) => setCoverImage(e.target.value)}
          disabled={isSaving}
          placeholder="https://..."
          className="rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
        />
        {coverImage.trim() !== "" && (
          // Free-text URL, not guaranteed to be a Supabase Storage host —
          // plain <img>, not next/image, so an unlisted domain doesn't
          // throw at runtime.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverImage}
            alt=""
            className="mt-1 h-24 w-full rounded-md border border-border object-cover"
          />
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="event-accent" className="text-sm font-medium text-foreground">
          Fallback accent color
        </label>
        <p className="text-xs text-muted-foreground">
          Only used when there&apos;s no cover photo, or the color auto-extracted from
          the cover photo doesn&apos;t pass a contrast check.
        </p>
        <div className="flex items-center gap-2">
          <input
            id="event-accent"
            type="color"
            value={accentColor}
            onChange={(e) => setAccentColor(e.target.value)}
            disabled={isSaving}
            className="h-9 w-14 cursor-pointer rounded-md border border-border bg-background disabled:cursor-not-allowed disabled:opacity-60"
          />
          <input
            type="text"
            value={accentColor}
            onChange={(e) => setAccentColor(e.target.value)}
            disabled={isSaving}
            className="w-32 rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>
      </div>

      <label className="flex items-center gap-2.5">
        <input
          type="checkbox"
          checked={galleryRequiresApproval}
          onChange={(e) => setGalleryRequiresApproval(e.target.checked)}
          disabled={isSaving}
          className="h-4 w-4 rounded border-border accent-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
        />
        <span className="text-sm font-medium text-foreground">
          New gallery uploads require approval before appearing
        </span>
      </label>

      {saveState === "ERROR" && error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {saveState === "SUCCESS" && (
        <p className="text-sm text-accent">Saved.</p>
      )}

      <button
        type="submit"
        disabled={isSaving}
        className="self-start rounded-md bg-accent px-4 py-2 font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
