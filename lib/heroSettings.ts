/**
 * Shared type/data module for the per-event Hero "content & typography"
 * settings added in Chat 14. Encoded as a single `events.hero_settings`
 * jsonb column (mirrors the `accent_color` text-column pattern in
 * lib/colorExtraction.ts) rather than one column per field — 4 fields x
 * (visible/fontFamily/fontSize), plus a decoration choice, would be 13 new
 * columns for settings that only ever change together from one form.
 *
 * parseStoredHeroSettings() is defensive on purpose: any event row from
 * before this chat, or a future manually-edited row, may have
 * hero_settings = null/undefined, missing keys, or an out-of-range value
 * (e.g. a hand-typed fontSize not in the curated list). Every field is
 * validated independently against its own curated list and quietly
 * replaced with its default rather than throwing — the public hero page
 * must never 500 because of a malformed settings blob. This mirrors
 * parseStoredAccent's role for accent_color.
 *
 * Never read or write `events.hero_settings` directly anywhere else —
 * always go through parseStoredHeroSettings() (EventEditor, Hero.tsx).
 */

export const HERO_FONT_FAMILIES = [
  "Inter",
  "Playfair Display",
  "Cormorant Garamond",
  "Libre Baskerville",
  "Montserrat",
  "Lora",
  "DM Sans",
  "Great Vibes",
] as const;

export type HeroFontFamily = (typeof HERO_FONT_FAMILIES)[number];

export const HERO_FONT_SIZES = [16, 20, 24, 28, 32, 40, 48, 56, 64] as const;

export type HeroFontSize = (typeof HERO_FONT_SIZES)[number];

export const HERO_DECORATIONS = ["floral", "none"] as const;

export type HeroDecoration = (typeof HERO_DECORATIONS)[number];

export interface HeroFieldSettings {
  visible: boolean;
  fontFamily: HeroFontFamily;
  fontSize: HeroFontSize;
}

export interface HeroGuestbookTextSettings extends HeroFieldSettings {
  content: string;
}

export interface HeroSettings {
  title: HeroFieldSettings;
  subtitle: HeroFieldSettings;
  date: HeroFieldSettings;
  guestbookText: HeroGuestbookTextSettings;
  decoration: HeroDecoration;
}

/**
 * Defaults chosen to match the pre-Chat-14 hardcoded Hero.tsx look as
 * closely as the curated lists allow (also the literal default written by
 * migration 0008, kept in sync manually — see that file):
 *  - title/subtitle/date: "Cormorant Garamond", the invitation-register
 *    serif every event already rendered title/subtitle in.
 *  - guestbookText: "Great Vibes" is the closest curated-list match to the
 *    previous hardcoded Dancing Script calligraphy face — there's no exact
 *    equivalent in the 8-font list, so this is the nearest script/cursive
 *    option, not a literal match.
 *  - Sizes are the closest controlled option to the old fixed Tailwind
 *    classes (title was text-4xl/text-6xl ~36-60px -> 48; subtitle was
 *    text-lg/text-xl ~18-20px -> 20; date was text-xs/text-sm ~12-14px ->
 *    16; guestbook text was text-3xl/text-5xl ~30-48px -> 40).
 * decoration defaults to "floral" because every event already rendered
 * the FloralEngrave flourishes unconditionally before this chat.
 */
export const DEFAULT_HERO_SETTINGS: HeroSettings = {
  title: { visible: true, fontFamily: "Cormorant Garamond", fontSize: 48 },
  subtitle: { visible: true, fontFamily: "Cormorant Garamond", fontSize: 20 },
  date: { visible: true, fontFamily: "Cormorant Garamond", fontSize: 16 },
  guestbookText: {
    visible: true,
    fontFamily: "Great Vibes",
    fontSize: 40,
    content: "Sign Our Guestbook",
  },
  decoration: "floral",
};

function isHeroFontFamily(value: unknown): value is HeroFontFamily {
  return typeof value === "string" && (HERO_FONT_FAMILIES as readonly string[]).includes(value);
}

function isHeroFontSize(value: unknown): value is HeroFontSize {
  return typeof value === "number" && (HERO_FONT_SIZES as readonly number[]).includes(value);
}

function isHeroDecoration(value: unknown): value is HeroDecoration {
  return typeof value === "string" && (HERO_DECORATIONS as readonly string[]).includes(value);
}

function parseFieldSettings(raw: unknown, fallback: HeroFieldSettings): HeroFieldSettings {
  if (typeof raw !== "object" || raw === null) return fallback;
  const r = raw as Record<string, unknown>;
  return {
    visible: typeof r.visible === "boolean" ? r.visible : fallback.visible,
    fontFamily: isHeroFontFamily(r.fontFamily) ? r.fontFamily : fallback.fontFamily,
    fontSize: isHeroFontSize(r.fontSize) ? r.fontSize : fallback.fontSize,
  };
}

/** Parses `events.hero_settings` (raw jsonb, possibly null/malformed) into a fully-populated HeroSettings. */
export function parseStoredHeroSettings(raw: unknown): HeroSettings {
  if (typeof raw !== "object" || raw === null) return DEFAULT_HERO_SETTINGS;
  const r = raw as Record<string, unknown>;

  const guestbookRaw =
    typeof r.guestbookText === "object" && r.guestbookText !== null
      ? (r.guestbookText as Record<string, unknown>)
      : {};

  return {
    title: parseFieldSettings(r.title, DEFAULT_HERO_SETTINGS.title),
    subtitle: parseFieldSettings(r.subtitle, DEFAULT_HERO_SETTINGS.subtitle),
    date: parseFieldSettings(r.date, DEFAULT_HERO_SETTINGS.date),
    guestbookText: {
      ...parseFieldSettings(guestbookRaw, DEFAULT_HERO_SETTINGS.guestbookText),
      content:
        typeof guestbookRaw.content === "string" && guestbookRaw.content.trim() !== ""
          ? guestbookRaw.content
          : DEFAULT_HERO_SETTINGS.guestbookText.content,
    },
    decoration: isHeroDecoration(r.decoration) ? r.decoration : DEFAULT_HERO_SETTINGS.decoration,
  };
}

/**
 * Inverse of parseStoredHeroSettings — what EventEditor writes back to
 * `events.hero_settings`. Structurally a passthrough today, but kept as a
 * named export (rather than handing the settings object to supabase
 * inline) so a future shape change, or normalization like trimming
 * `content`, has exactly one place to happen.
 */
export function serializeHeroSettings(settings: HeroSettings): HeroSettings {
  return {
    ...settings,
    guestbookText: {
      ...settings.guestbookText,
      content:
        settings.guestbookText.content.trim() === ""
          ? DEFAULT_HERO_SETTINGS.guestbookText.content
          : settings.guestbookText.content,
    },
  };
}
