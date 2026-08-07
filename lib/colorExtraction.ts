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

const WHITE = "#ffffff";
const NEAR_BLACK = "#1a1a1a"; // matches --foreground in light mode, see globals.css

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
