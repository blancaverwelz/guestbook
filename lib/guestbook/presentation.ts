import type { GuestbookMessage } from "./pagination";

/**
 * Pure presentation rules for the archive.
 *
 * Every message is set in the same type at the same size: length never
 * changes a message's typographic weight or implies importance. Notes are
 * only ever as big as their text needs. The composition is a centred axis:
 * a note either stands alone (its width following how much it has to say,
 * capped at a comfortable reading measure) or shares a row with a neighbour
 * of near-identical height. Placement is derived purely from reading order,
 * so DOM order, tab order and visual order are the same chronological
 * sequence.
 *
 * Surface tone (ink / tint / paper) is a rhythm device, not a signal: it is
 * picked from the message id alone — never its length, author or content —
 * and never repeats on adjacent notes, so contrast alternates down the page.
 */

export type NoteTone = "ink" | "tint" | "paper";

export type NoteSize = "brief" | "standard" | "long";

export type Placement = {
  row: "solo" | "pair";
  /** Governs width only (solo) or pairing eligibility; never type size. */
  size: NoteSize;
};

export type ToneMessage = GuestbookMessage & { tone: NoteTone };

export type PresentedMessage = ToneMessage & { placement: Placement };

export type DayParts = {
  weekday: string;
  month: string;
  day: number;
  /** Only present when the day is not in the current year. */
  year: string | null;
  /** Full spoken label, e.g. "Friday, September 12, 2026". */
  full: string;
};

export type DayGroup = {
  /** Local calendar day, YYYY-MM-DD. */
  key: string;
  parts: DayParts;
  messages: PresentedMessage[];
};

export const BRIEF_MAX_CHARS = 110;
export const LONG_MIN_CHARS = 280;
/** Rough characters per line at half-width, used only to compare heights. */
const CHARS_PER_LINE = 44;

export function isBrief(text: string): boolean {
  return text.trim().length <= BRIEF_MAX_CHARS && !text.includes("\n");
}

export function noteSizeOf(text: string): NoteSize {
  const length = text.trim().length;
  if (length >= LONG_MIN_CHARS) return "long";
  return isBrief(text) ? "brief" : "standard";
}

/** Estimated wrapped line count; precise enough to match row neighbours. */
export function estimateLines(text: string): number {
  return text
    .trim()
    .split("\n")
    .reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / CHARS_PER_LINE)), 0);
}

/**
 * Two notes may share a row only if they will be (nearly) the same height:
 * within one line for standard notes, two for brief ones (whose absolute
 * difference is still only a few lines of text).
 */
export function canShareRow(a: string, b: string): boolean {
  const size = noteSizeOf(a);
  if (size === "long" || size !== noteSizeOf(b)) return false;
  const tolerance = size === "brief" ? 2 : 1;
  return Math.abs(estimateLines(a) - estimateLines(b)) <= tolerance;
}

export function localDayKey(isoDate: string): string {
  const d = new Date(isoDate);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

export function formatDayParts(isoDate: string, now: Date = new Date()): DayParts {
  const d = new Date(isoDate);
  return {
    weekday: d.toLocaleDateString(undefined, { weekday: "long" }),
    month: d.toLocaleDateString(undefined, { month: "long" }),
    day: d.getDate(),
    year: d.getFullYear() === now.getFullYear() ? null : String(d.getFullYear()),
    full: d.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
  };
}

export function formatTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatFullDate(isoDate: string): string {
  return new Date(isoDate).toLocaleString(undefined, {
    dateStyle: "long",
    timeStyle: "short",
  });
}

/**
 * Weighted pick list: "paper" (the high-contrast surface) is deliberately the
 * rarest so it stays an accent rather than the dominant look.
 */
export const TONE_WHEEL: readonly NoteTone[] = [
  "ink", "tint", "paper", "ink", "tint", "ink", "paper", "tint",
];

/** FNV-1a: tiny, stable across sessions, good enough for even spread. */
export function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Deterministic tone per message, in reading order. The pick depends only on
 * the id and the previous note's tone, so appending a page never changes
 * tones already on screen.
 */
export function assignTones(messages: GuestbookMessage[]): ToneMessage[] {
  const out: ToneMessage[] = [];
  let previous: NoteTone | null = null;

  for (const message of messages) {
    let index = hashString(message.id) % TONE_WHEEL.length;
    while (TONE_WHEEL[index] === previous) index = (index + 1) % TONE_WHEEL.length;
    const tone = TONE_WHEEL[index];
    out.push({ ...message, tone });
    previous = tone;
  }

  return out;
}

/**
 * Walks one day's messages in reading order. Two adjacent notes of matching
 * height share a row ("pair"), but never two pair rows back to back, so the
 * page keeps breathing instead of settling into a uniform grid. Everything
 * else stands alone on the centre axis.
 */
export function assignPlacements<T extends GuestbookMessage>(
  messages: T[]
): (T & { placement: Placement })[] {
  const out: (T & { placement: Placement })[] = [];
  let previousWasPair = false;

  for (let i = 0; i < messages.length; i++) {
    const current = messages[i];
    const next = messages[i + 1];
    const size = noteSizeOf(current.message);

    if (!previousWasPair && next && canShareRow(current.message, next.message)) {
      out.push(
        { ...current, placement: { row: "pair", size } },
        { ...next, placement: { row: "pair", size } }
      );
      previousWasPair = true;
      i++;
      continue;
    }

    out.push({ ...current, placement: { row: "solo", size } });
    previousWasPair = false;
  }

  return out;
}

/** Groups messages (already in reading order) by local calendar day. */
export function groupByDay(
  messages: GuestbookMessage[],
  now: Date = new Date()
): DayGroup[] {
  const buckets: { key: string; first: string; items: ToneMessage[] }[] = [];

  for (const message of assignTones(messages)) {
    const key = localDayKey(message.created_at);
    const last = buckets[buckets.length - 1];
    if (last && last.key === key) {
      last.items.push(message);
    } else {
      buckets.push({ key, first: message.created_at, items: [message] });
    }
  }

  return buckets.map((b) => ({
    key: b.key,
    parts: formatDayParts(b.first, now),
    messages: assignPlacements(b.items),
  }));
}

export function formatCount(count: number): string {
  return `${count.toLocaleString()} ${count === 1 ? "message" : "messages"}`;
}
