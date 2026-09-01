"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { galleryStoragePathFromUrl } from "@/lib/galleryStoragePath";
import { parseStoredAccent, serializeStoredAccent, type AccentMode } from "@/lib/colorExtraction";
import {
  HERO_DECORATIONS,
  parseStoredHeroSettings,
  serializeHeroSettings,
  type HeroSettings,
  type HeroDecoration,
} from "@/lib/heroSettings";
import CoverImageUploader from "./CoverImageUploader";
import HeroFieldEditor from "./HeroFieldEditor";
import type { AdminEvent } from "./types";

type SaveState = "IDLE" | "SAVING" | "SUCCESS" | "ERROR";

interface EventEditorProps {
  event: AdminEvent;
  onUpdated: (updated: AdminEvent) => void;
}

/**
 * `accent_color` (Chat 13 follow-up) is no longer fallback-only. Event
 * Settings now exposes an explicit Automatic/Custom toggle:
 *  - Automatic: unchanged Chat 6/7 behavior — the landing page extracts a
 *    color from `cover_image` client-side and uses it whenever it clears
 *    WCAG AA; the color picker here is just the ultimate fallback for when
 *    there's no cover image or extraction/contrast fails.
 *  - Custom: the color picked here is used on the landing page directly,
 *    taking precedence over extraction (still contrast-checked — see
 *    lib/colorExtraction.ts's `resolveStoredAccent`).
 * Both states are encoded in the single `accent_color` text column (no new
 * `accent_mode` column/migration) — see parseStoredAccent/
 * serializeStoredAccent in lib/colorExtraction.ts for the encoding and why
 * it's fully backward-compatible with every already-published event.
 *
 * Cover image is an upload widget (`CoverImageUploader`), not a pasted URL
 * field. There's still no dedicated event-cover Storage bucket — a new
 * upload uses the existing "gallery" bucket under a `covers/{eventId}/`
 * path prefix rather than a separate bucket, so no migration or RLS change
 * was needed (see CoverImageUploader/useCoverImageUpload doc comments).
 * `CoverImageUploader` only stages the new public URL into `coverImage`
 * state below; it is not written to `events.cover_image` until this form's
 * normal Save, same as every other field here — so an upload failure never
 * touches the row's currently-saved working cover image.
 *
 * If Save succeeds and the previous `event.cover_image` pointed at a
 * Storage object under this bucket (i.e. it wasn't null and
 * `galleryStoragePathFromUrl` can parse it), that now-orphaned object is
 * deleted after the DB update succeeds — never before, and never on a
 * failed save. An upload that's staged but abandoned without ever clicking
 * Save is a rare, low-cost orphan (single admin-facing form, not
 * guest-scale traffic) — accepted rather than adding extra cleanup
 * machinery for it, same tradeoff already made for gallery upload orphans.
 *
 * Form state resets from `event` whenever the selected event changes
 * (AdminDashboard's event selector) or after a successful save — otherwise
 * switching events while mid-edit would silently carry stale field values
 * over to the newly selected event.
 */
export default function EventEditor({ event, onUpdated }: EventEditorProps) {
  const [title, setTitle] = useState(event.title);
  const [subtitle, setSubtitle] = useState(event.subtitle ?? "");
  const [eventDate, setEventDate] = useState(event.event_date ?? "");
  const [coverImage, setCoverImage] = useState(event.cover_image ?? "");
  const initialAccent = parseStoredAccent(event.accent_color);
  const [accentMode, setAccentMode] = useState<AccentMode>(initialAccent.mode);
  const [accentColor, setAccentColor] = useState(initialAccent.color);
  const [galleryRequiresApproval, setGalleryRequiresApproval] = useState(
    event.gallery_requires_approval
  );
  const [heroSettings, setHeroSettings] = useState<HeroSettings>(
    parseStoredHeroSettings(event.hero_settings)
  );
  const [saveState, setSaveState] = useState<SaveState>("IDLE");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(event.title);
    setSubtitle(event.subtitle ?? "");
    setEventDate(event.event_date ?? "");
    setCoverImage(event.cover_image ?? "");
    const parsedAccent = parseStoredAccent(event.accent_color);
    setAccentMode(parsedAccent.mode);
    setAccentColor(parsedAccent.color);
    setGalleryRequiresApproval(event.gallery_requires_approval);
    setHeroSettings(parseStoredHeroSettings(event.hero_settings));
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
        event_date: eventDate.trim() === "" ? null : eventDate,
        cover_image: coverImage.trim() === "" ? null : coverImage,
        accent_color: serializeStoredAccent(accentMode, accentColor),
        gallery_requires_approval: galleryRequiresApproval,
        hero_settings: serializeHeroSettings(heroSettings),
      })
      .eq("id", event.id)
      .select(
        "id, slug, title, subtitle, event_date, cover_image, accent_color, gallery_requires_approval, hero_settings"
      )
      .single();

    if (updateError || !data) {
      setError("Couldn't save changes. Please try again.");
      setSaveState("ERROR");
      return;
    }

    // Clean up the replaced cover image only now that the DB update has
    // succeeded — never before, and never on a failed save (see doc
    // comment above). `event.cover_image` is the value that was current
    // when this form last reset from props, i.e. the row's previous
    // working image. A pasted-URL leftover from before this feature
    // existed, or any URL outside this bucket, simply won't parse and is
    // left alone rather than guessed at.
    const previousCoverImage = event.cover_image;
    if (previousCoverImage && previousCoverImage !== data.cover_image) {
      const previousPath = galleryStoragePathFromUrl(previousCoverImage);
      if (previousPath) {
        const supabaseCleanup = createClient();
        // Best-effort: a failure here leaves one orphaned Storage object,
        // which does not affect the event's now-saved, working cover image.
        void supabaseCleanup.storage.from("gallery").remove([previousPath]);
      }
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
      <HeroFieldEditor
        label="Event title"
        idPrefix="hero-title"
        settings={heroSettings.title}
        onChange={(next) => setHeroSettings((prev) => ({ ...prev, title: next }))}
        disabled={isSaving}
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
      </HeroFieldEditor>

      <HeroFieldEditor
        label="Event subtitle"
        idPrefix="hero-subtitle"
        settings={heroSettings.subtitle}
        onChange={(next) => setHeroSettings((prev) => ({ ...prev, subtitle: next }))}
        disabled={isSaving}
      >
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
      </HeroFieldEditor>

      <HeroFieldEditor
        label="Event date"
        idPrefix="hero-date"
        settings={heroSettings.date}
        onChange={(next) => setHeroSettings((prev) => ({ ...prev, date: next }))}
        disabled={isSaving}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="event-date" className="text-sm font-medium text-foreground">
            Date
          </label>
          <input
            id="event-date"
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            disabled={isSaving}
            className="rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>
      </HeroFieldEditor>

      <HeroFieldEditor
        label="Hero guestbook text"
        idPrefix="hero-guestbook-text"
        settings={heroSettings.guestbookText}
        onChange={(next) =>
          setHeroSettings((prev) => ({
            ...prev,
            guestbookText: { ...prev.guestbookText, ...next },
          }))
        }
        disabled={isSaving}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="hero-guestbook-text-content" className="text-sm font-medium text-foreground">
            Text
          </label>
          <input
            id="hero-guestbook-text-content"
            type="text"
            value={heroSettings.guestbookText.content}
            onChange={(e) =>
              setHeroSettings((prev) => ({
                ...prev,
                guestbookText: { ...prev.guestbookText, content: e.target.value },
              }))
            }
            disabled={isSaving}
            className="rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>
      </HeroFieldEditor>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="hero-decoration" className="text-sm font-medium text-foreground">
          Hero decoration
        </label>
        <p className="text-xs text-muted-foreground">
          Floral flourishes frame the guestbook text line above the CTAs. Only shown when that
          text is also set to show.
        </p>
        <select
          id="hero-decoration"
          value={heroSettings.decoration}
          onChange={(e) =>
            setHeroSettings((prev) => ({
              ...prev,
              decoration: e.target.value as HeroDecoration,
            }))
          }
          disabled={isSaving}
          className="w-40 rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          {HERO_DECORATIONS.map((option) => (
            <option key={option} value={option}>
              {option === "floral" ? "Floral" : "None"}
            </option>
          ))}
        </select>
      </div>

      <CoverImageUploader
        eventId={event.id}
        currentImageUrl={coverImage.trim() === "" ? null : coverImage}
        onUploaded={(url) => setCoverImage(url)}
        disabled={isSaving}
      />

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Accent color</span>
        <p className="text-xs text-muted-foreground">
          Automatic pulls a color from the cover photo (falling back to the color below if
          there&apos;s no photo, or the extracted color doesn&apos;t pass a contrast check).
          Custom always uses the color you pick here instead.
        </p>

        <div role="radiogroup" aria-label="Accent color mode" className="flex gap-4">
          <label className="flex items-center gap-1.5 text-sm text-foreground">
            <input
              type="radio"
              name="accent-mode"
              checked={accentMode === "automatic"}
              onChange={() => setAccentMode("automatic")}
              disabled={isSaving}
              className="accent-[var(--accent)] disabled:cursor-not-allowed"
            />
            Automatic
          </label>
          <label className="flex items-center gap-1.5 text-sm text-foreground">
            <input
              type="radio"
              name="accent-mode"
              checked={accentMode === "custom"}
              onChange={() => setAccentMode("custom")}
              disabled={isSaving}
              className="accent-[var(--accent)] disabled:cursor-not-allowed"
            />
            Custom
          </label>
        </div>

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
        {accentMode === "automatic" && (
          <p className="text-xs text-muted-foreground">
            This color is only used as the fallback described above — it won&apos;t override a
            successfully extracted cover-photo color. Switch to Custom to force it.
          </p>
        )}
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
