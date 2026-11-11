export type SortOrder = "newest" | "oldest";

export type GuestbookMessage = {
  id: string;
  name: string;
  message: string;
  created_at: string;
};

export const PAGE_SIZE = 10;
export const SEARCH_MAX_LENGTH = 80;

/**
 * Collapses whitespace, bounds length and drops characters that cannot be
 * expressed safely in a PostgREST pattern. `*` is PostgREST's own wildcard
 * alias and cannot be escaped, so it is ignored. Returns "" for "no search".
 */
export function normalizeSearch(raw: string): string {
  return raw
    .replace(/\*/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, SEARCH_MAX_LENGTH)
    .trim();
}

/** Escapes LIKE metacharacters so user input matches literally. */
export function escapeLikePattern(term: string): string {
  return term.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Quotes a value for use inside a PostgREST logical-tree filter. */
export function quotePostgrestValue(value: string): string {
  return `"${value.replace(/[\\"]/g, (c) => `\\${c}`)}"`;
}

/** `or(...)` body matching name or message text, literally and case-insensitively. */
export function buildSearchFilter(term: string): string {
  const pattern = quotePostgrestValue(`%${escapeLikePattern(term)}%`);
  return `name.ilike.${pattern},message.ilike.${pattern}`;
}

/** Always include the endpoints and the current page's immediate neighbours. */
export function pageNumbers(current: number, total: number): number[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [1, current - 1, current, current + 1, total];
  return [...new Set(pages.filter(page => page >= 1 && page <= total))];
}
