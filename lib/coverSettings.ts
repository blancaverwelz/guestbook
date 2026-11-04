export interface CoverFraming {
  x: number;
  y: number;
  zoom: number;
}

export interface CoverSettings {
  desktop: CoverFraming;
  mobile: CoverFraming;
  overlay: number;
}

export const DEFAULT_COVER_SETTINGS: CoverSettings = {
  desktop: { x: 50, y: 30, zoom: 100 },
  mobile: { x: 50, y: 30, zoom: 100 },
  overlay: 100,
};

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? value as Record<string, unknown>
    : {};
}

function bounded(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function parseFraming(value: unknown, fallback: CoverFraming): CoverFraming {
  const raw = record(value);
  return {
    x: bounded(raw.x, fallback.x, 0, 100),
    y: bounded(raw.y, fallback.y, 0, 100),
    zoom: bounded(raw.zoom, fallback.zoom, 100, 200),
  };
}

/** Old events retain their existing crop; malformed values cannot break the hero. */
export function parseCoverSettings(value: unknown): CoverSettings {
  const raw = record(value);
  return {
    desktop: parseFraming(raw.desktop, DEFAULT_COVER_SETTINGS.desktop),
    mobile: parseFraming(raw.mobile, DEFAULT_COVER_SETTINGS.mobile),
    overlay: bounded(raw.overlay, DEFAULT_COVER_SETTINGS.overlay, 0, 100),
  };
}
