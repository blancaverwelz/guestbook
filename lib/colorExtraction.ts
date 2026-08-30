/**
 * Dynamic accent color pipeline for the event landing page.
 *
 * `extractDominantColor` is the only browser-only piece (Canvas API) — it
 * downsamples the cover image, buckets pixels into a coarse color
 * histogram, and returns the most common non-extreme (not near-white/
 * near-black/low-saturation) bucket as a hex string. This is deliberately a
 * simple, dependency-free heuristic per the design brief ("Canvas API
 * getImageData is sufficient, no external service needed") — not a
 * full k-means clustering.
 *
 * Everything else here (hex/rgb conversion, relative luminance, contrast
 * ratio, the accent-resolution policy) is pure and has no DOM dependency,
 * so it can be reasoned about/tested independent of the extraction step or
 * any component.
 */

export interface ResolvedAccent {
  /** The color actually safe to use as a filled surface. */
  color: string;
  /** The text color (`#ffffff` or `#1a1a1a`) that reads on top of `color`. */
  textColor: string;
  /** True if this came from the cover image; false if it's the fallback. */
  isExtracted: boolean;
}

/** Admin-facing accent mode, added in the Chat 13 follow-up. */
export type AccentMode = "automatic" | "custom";

export interface StoredAccent {
  mode: AccentMode;
  /**
   * In "automatic" mode: the configured fallback hex, used only when
   * extraction is unavailable/fails/fails contrast (unchanged Chat 6/7
   * behavior). In "custom" mode: the admin's deliberately chosen override
   * hex, used in place of extraction entirely.
   */
  color: string;
}

const WHITE = "#ffffff";
const NEAR_BLACK = "#1a1a1a"; // matches --foreground in light mode, see globals.css

/**
 * Default champagne-gold fallback — matches the `events.accent_color`
 * column default from migration 0001. Used both as the automatic-mode
 * fallback color when `accent_color` is null/empty, and as the hard safety
 * net if a Custom color itself fails the WCAG AA check (see
 * `resolveStoredAccent` below) — this specific hex is relied on elsewhere
 * (the DB default, generateViewport's server-side theme-color fallback) as
 * "expected to always pass," so it's kept as a named constant rather than
 * re-typed in multiple places.
 */
const DEFAULT_FALLBACK_COLOR = "#B08D57";

const CUSTOM_PREFIX = "custom:";

/**
 * `events.accent_color` (Chat 13 follow-up) — kept as a single text column
 * rather than adding a new `accent_mode` column/migration, per this
 * follow-up's guardrail to prefer the existing field. A bare hex string
 * (or null) means Automatic — this is exactly what every event's
 * `accent_color` already contains today (the Chat 1 seed/default), so
 * every already-published event keeps behaving identically post-deploy:
 * extraction still runs, this value is still only the ultimate fallback.
 * A `custom:#RRGGBB`-prefixed string is a new, unambiguous marker written
 * only when an admin explicitly picks Custom in Event Settings — it can
 * never collide with a legacy value, since no prior code ever wrote
 * anything but a bare hex to this column.
 */
export function parseStoredAccent(raw: string | null): StoredAccent {
  if (!raw) return { mode: "automatic", color: DEFAULT_FALLBACK_COLOR };
  if (raw.startsWith(CUSTOM_PREFIX)) {
    const color = raw.slice(CUSTOM_PREFIX.length);
    return { mode: "custom", color: color || DEFAULT_FALLBACK_COLOR };
  }
  return { mode: "automatic", color: raw };
}

/** Inverse of parseStoredAccent — what EventEditor writes back to `events.accent_color`. */
export function serializeStoredAccent(mode: AccentMode, color: string): string {
  return mode === "custom" ? `${CUSTOM_PREFIX}${color}` : color;
}

// ---------------------------------------------------------------------------
// Color math (pure)
// ---------------------------------------------------------------------------

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;
  const int = parseInt(full, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function srgbChannelToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const R = srgbChannelToLinear(r);
  const G = srgbChannelToLinear(g);
  const B = srgbChannelToLinear(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/** WCAG contrast ratio between two colors, 1 (no contrast) to 21 (max). */
export function contrastRatio(hexA: string, hexB: string): number {
  const lA = relativeLuminance(hexA);
  const lB = relativeLuminance(hexB);
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Whichever of white/near-black text reads better on `bgHex`. */
export function pickReadableTextColor(bgHex: string): string {
  return contrastRatio(bgHex, WHITE) >= contrastRatio(bgHex, NEAR_BLACK) ? WHITE : NEAR_BLACK;
}

const WCAG_AA_NORMAL_TEXT = 4.5;

/**
 * Accent-resolution policy: try the extracted color with its best-contrast
 * text pairing; if that pairing can't clear WCAG AA (4.5:1), fall back to
 * the event's configured accent color (which defaults to champagne gold and
 * is expected to always pass) instead of forcing an unreadable extracted
 * color onto the page.
 */
export function resolveAccentColor(extracted: string | null, fallback: string): ResolvedAccent {
  if (extracted) {
    const textColor = pickReadableTextColor(extracted);
    if (contrastRatio(extracted, textColor) >= WCAG_AA_NORMAL_TEXT) {
      return { color: extracted, textColor, isExtracted: true };
    }
  }
  const fallbackText = pickReadableTextColor(fallback);
  return { color: fallback, textColor: fallbackText, isExtracted: false };
}

/**
 * Mode-aware entry point (Chat 13 follow-up), used by AccentColorProvider
 * in place of calling `resolveAccentColor` directly.
 *
 * - Automatic: unchanged existing policy — try the extracted color, fall
 *   back to `stored.color` (the configured fallback) if extraction is
 *   absent or fails contrast. `extracted` is ignored entirely in Custom
 *   mode; AccentColorProvider skips calling `extractDominantColor` in that
 *   case so this is really "never even attempted," not just "discarded."
 * - Custom: try the admin's chosen color first. If it fails WCAG AA (e.g.
 *   a light color with white-or-black text both under 4.5:1 — rare but
 *   possible for some mid-tone colors), fail safe to the same hard-coded
 *   champagne default used elsewhere, rather than forcing an unreadable
 *   custom color onto every guest's screen. Never silently reinterprets or
 *   adjusts the admin's chosen color (e.g. auto-darkening it) — that would
 *   surprise an admin who explicitly picked a value expecting to see it
 *   used as-is.
 */
export function resolveStoredAccent(stored: StoredAccent, extracted: string | null): ResolvedAccent {
  if (stored.mode === "custom") {
    const textColor = pickReadableTextColor(stored.color);
    if (contrastRatio(stored.color, textColor) >= WCAG_AA_NORMAL_TEXT) {
      return { color: stored.color, textColor, isExtracted: false };
    }
    const fallbackText = pickReadableTextColor(DEFAULT_FALLBACK_COLOR);
    return { color: DEFAULT_FALLBACK_COLOR, textColor: fallbackText, isExtracted: false };
  }
  return resolveAccentColor(extracted, stored.color);
}

// ---------------------------------------------------------------------------
// Extraction (browser-only)
// ---------------------------------------------------------------------------

const SAMPLE_SIZE = 48; // downscale target; plenty for a dominant-color estimate
const BUCKET_STEP = 32; // quantize each channel into 256/32 = 8 buckets/channel

/**
 * Loads `imageUrl`, downsamples it onto an offscreen canvas, and returns the
 * most common non-extreme color as a hex string — or null if extraction
 * isn't possible (SSR, CORS-tainted canvas, decode failure, etc). Callers
 * should treat null the same as "no cover image": fall back to the
 * configured accent color.
 */
export async function extractDominantColor(imageUrl: string): Promise<string | null> {
  if (typeof window === "undefined" || typeof document === "undefined") return null;

  try {
    const img = await loadImage(imageUrl);

    const canvas = document.createElement("canvas");
    canvas.width = SAMPLE_SIZE;
    canvas.height = SAMPLE_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);

    let pixels: Uint8ClampedArray;
    try {
      pixels = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data;
    } catch {
      // Canvas tainted by a cross-origin image without proper CORS headers.
      return null;
    }

    const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const alpha = pixels[i + 3];
      if (alpha < 200) continue; // skip transparent edges

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const lightness = (max + min) / 2 / 255;
      const saturation = max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255));

      // Skip near-white, near-black, and washed-out/grayish pixels — these
      // are almost never what a person would call "the color of this
      // photo" and tend to dominate skies/highlights/shadows by pixel
      // count without being visually representative.
      if (lightness < 0.12 || lightness > 0.92 || saturation < 0.15) continue;

      const key = `${Math.floor(r / BUCKET_STEP)}-${Math.floor(g / BUCKET_STEP)}-${Math.floor(b / BUCKET_STEP)}`;
      const bucket = buckets.get(key);
      if (bucket) {
        bucket.count += 1;
        bucket.r += r;
        bucket.g += g;
        bucket.b += b;
      } else {
        buckets.set(key, { count: 1, r, g, b });
      }
    }

    let best: { count: number; r: number; g: number; b: number } | null = null;
    for (const bucket of buckets.values()) {
      if (!best || bucket.count > best.count) best = bucket;
    }

    if (!best) return null;
    return rgbToHex(best.r / best.count, best.g / best.count, best.b / best.count);
  } catch {
    return null;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image for color extraction"));
    img.src = src;
  });
}
