import { describe, expect, it } from "vitest";
import {
  TONE_WHEEL,
  assignPlacements,
  assignTones,
  formatCount,
  formatDayParts,
  groupByDay,
  canShareRow,
  isBrief,
  noteSizeOf,
} from "../lib/guestbook/presentation";
import type { GuestbookMessage } from "../lib/guestbook/pagination";

function msg(id: string, text: string, y = 2026, m = 8, d = 17, h = 12): GuestbookMessage {
  return {
    id,
    name: "Guest",
    message: text,
    created_at: new Date(y, m, d, h, 0, 0).toISOString(),
  };
}

const BRIEF = "Congratulations!";
const LONG = "x".repeat(300);

const MEDIUM_A = "m".repeat(150);
const MEDIUM_B = "n".repeat(170);
const rows = (m: ReturnType<typeof assignPlacements>) => m.map((x) => x.placement.row);

describe("note sizing", () => {
  it("is length-based and treats multi-line notes as at least standard", () => {
    expect(isBrief(BRIEF)).toBe(true);
    expect(isBrief("a".repeat(111))).toBe(false);
    expect(isBrief("two\nlines")).toBe(false);
    expect(noteSizeOf(LONG)).toBe("long");
    expect(noteSizeOf(MEDIUM_A)).toBe("standard");
  });

  it("only pairs notes of the same size and near-equal height", () => {
    expect(canShareRow(BRIEF, "Cheers to love.")).toBe(true);
    expect(canShareRow(MEDIUM_A, MEDIUM_B)).toBe(true);
    expect(canShareRow(BRIEF, MEDIUM_A)).toBe(false);
    expect(canShareRow(LONG, LONG)).toBe(false);
    expect(canShareRow("a".repeat(30), "b".repeat(100))).toBe(true); // brief: 2-line gap is fine
    expect(canShareRow("a".repeat(120), "b".repeat(250))).toBe(false); // standard: 3 vs 6 lines
  });
});

describe("assignPlacements", () => {
  it("never pairs a long note and stands it alone", () => {
    const out = assignPlacements([msg("a", LONG), msg("b", LONG)]);
    expect(rows(out)).toEqual(["solo", "solo"]);
    expect(out.map((m) => m.placement.size)).toEqual(["long", "long"]);
  });

  it("pairs matching neighbours, never two pair rows back to back", () => {
    const out = assignPlacements([1, 2, 3, 4, 5, 6].map((i) => msg(`b${i}`, BRIEF)));
    expect(rows(out)).toEqual(["pair", "pair", "solo", "pair", "pair", "solo"]);
  });

  it("does not pair mismatched neighbours", () => {
    expect(rows(assignPlacements([msg("a", BRIEF), msg("b", MEDIUM_A)]))).toEqual(["solo", "solo"]);
  });

  it("keeps reading order and leaves message text untouched", () => {
    const input = [msg("a", BRIEF), msg("b", BRIEF), msg("c", LONG), msg("d", "hi")];
    const out = assignPlacements(input);
    expect(out.map((m) => m.id)).toEqual(["a", "b", "c", "d"]);
    expect(out.map((m) => m.message)).toEqual(input.map((m) => m.message));
  });

  it("always emits pair rows in twos so a row can never be left with a hole", () => {
    const variants = [BRIEF, MEDIUM_A, MEDIUM_B, LONG, "hi", "two\nlines"];
    for (let n = 1; n <= 60; n++) {
      const input = Array.from({ length: n }, (_, i) =>
        msg(`m${i}`, variants[(i * 7 + (i >> 2)) % variants.length])
      );
      let run = 0;
      for (const m of assignPlacements(input)) {
        if (m.placement.row === "pair") run++;
        else {
          expect(run % 2).toBe(0);
          run = 0;
        }
      }
      expect(run % 2).toBe(0);
    }
  });

  it("is a pure function of the list (same input, same layout)", () => {
    const input = [msg("a", BRIEF), msg("b", LONG), msg("c", BRIEF)];
    expect(assignPlacements(input)).toEqual(assignPlacements(input));
  });
});

describe("assignTones", () => {
  const many = Array.from({ length: 500 }, (_, i) =>
    msg(`id-${i * 7919}`, i % 3 === 0 ? LONG : BRIEF)
  );

  it("never repeats a tone on adjacent notes", () => {
    const tones = assignTones(many).map((m) => m.tone);
    for (let i = 1; i < tones.length; i++) expect(tones[i]).not.toBe(tones[i - 1]);
  });

  it("is deterministic and independent of message text, author and length", () => {
    const a = assignTones([msg("x1", BRIEF), msg("x2", BRIEF)]);
    const b = assignTones([msg("x1", LONG), msg("x2", "completely different")]);
    expect(a.map((m) => m.tone)).toEqual(b.map((m) => m.tone));
  });

  it("does not change tones already shown when a page is appended", () => {
    const first = assignTones(many.slice(0, 20)).map((m) => m.tone);
    const withMore = assignTones(many.slice(0, 40)).map((m) => m.tone);
    expect(withMore.slice(0, 20)).toEqual(first);
  });

  it("uses every tone, with the high-contrast paper tone the rarest", () => {
    const counts = { ink: 0, tint: 0, paper: 0 };
    for (const m of assignTones(many)) counts[m.tone]++;
    expect(counts.ink).toBeGreaterThan(0);
    expect(counts.tint).toBeGreaterThan(0);
    expect(counts.paper).toBeGreaterThan(0);
    expect(counts.paper).toBeLessThan(counts.ink);
    expect(counts.paper / many.length).toBeLessThan(0.35);
    expect(new Set(TONE_WHEEL)).toEqual(new Set(["ink", "tint", "paper"]));
  });
});

describe("groupByDay", () => {
  const now = new Date(2026, 10, 6);

  it("groups by local calendar day and keeps reading order", () => {
    const rows = [
      msg("a", "one", 2026, 8, 18, 20),
      msg("b", "two", 2026, 8, 18, 9),
      msg("c", "three", 2026, 8, 17, 23),
    ];
    const groups = groupByDay(rows, now);
    expect(groups.map((g) => g.messages.map((m) => m.id))).toEqual([["a", "b"], ["c"]]);
    expect(groups[0].key).toBe("2026-09-18");
    expect(groups[0].parts.day).toBe(18);
  });

  it("lays out each day independently", () => {
    const groups = groupByDay(
      [msg("a", LONG, 2026, 8, 18), msg("b", LONG, 2026, 8, 17)],
      now
    );
    expect(groups.map((g) => g.messages[0].placement.row)).toEqual(["solo", "solo"]);
  });

  it("adds the year only for other years", () => {
    expect(formatDayParts(msg("a", "x", 2025, 11, 31).created_at, now).year).toBe("2025");
    expect(formatDayParts(msg("a", "x", 2026, 8, 17).created_at, now).year).toBeNull();
  });
});

describe("formatCount", () => {
  it("pluralises", () => {
    expect(formatCount(1)).toBe("1 message");
    expect(formatCount(0)).toBe("0 messages");
  });
});
