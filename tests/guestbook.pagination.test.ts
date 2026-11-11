import { describe, expect, it } from "vitest";
import { buildSearchFilter, escapeLikePattern, normalizeSearch, pageNumbers } from "../lib/guestbook/pagination";

describe("numbered controls", () => {
  it("lists short archives in full", () => {
    expect(pageNumbers(1, 1)).toEqual([1]);
    expect(pageNumbers(2, 3)).toEqual([1, 2, 3]);
  });

  it("bounds the number of buttons on large archives", () => {
    expect(pageNumbers(1, 101)).toEqual([1, 2, 101]);
    expect(pageNumbers(52, 101)).toEqual([1, 51, 52, 53, 101]);
    expect(pageNumbers(101, 101)).toEqual([1, 100, 101]);
  });
});

describe("search handling", () => {
  it("normalises whitespace, asterisks and length", () => {
    expect(normalizeSearch("  ana   maria ")).toBe("ana maria");
    expect(normalizeSearch("***")).toBe("");
    expect(normalizeSearch("a".repeat(200))).toHaveLength(80);
  });

  it("escapes LIKE wildcards so they match literally", () => {
    expect(escapeLikePattern("100%_done\\")).toBe("100\\%\\_done\\\\");
  });

  it("quotes values so commas, parens and quotes cannot alter the filter", () => {
    const filter = buildSearchFilter('a,b) or (id.eq."x');
    expect(filter).toBe(
      'name.ilike."%a,b) or (id.eq.\\"x%",message.ilike."%a,b) or (id.eq.\\"x%"'
    );
  });

  it("keeps apostrophes, unicode and emoji intact", () => {
    expect(buildSearchFilter("O'Brien 🎉 José")).toContain("O'Brien 🎉 José");
  });
});
