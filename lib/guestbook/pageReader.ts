import type { SupabaseClient } from "@supabase/supabase-js";
import type { GuestbookMessage } from "./pagination";
import { readPage, readVisibleRows, type ArchiveView } from "./queries";

export type PageSnapshot = Awaited<ReturnType<typeof readPage>> & { updated: boolean };

/** A reader belongs to one page, sort and search. Cancel it when that view changes. */
export function createPageReader(
  client: SupabaseClient,
  eventId: string,
  view: ArchiveView,
  onPage: (page: PageSnapshot) => void,
  onError: () => void,
) {
  let controller: AbortController | undefined;
  let displayed: GuestbookMessage[] | undefined;

  async function read() {
    controller?.abort();
    controller = new AbortController();
    const { signal } = controller;
    try {
      const page = await readPage(client, eventId, view, signal);
      if (signal.aborted) return;
      let rows = page.rows;
      let updated = false;
      if (displayed?.length) {
        const fresh = new Map(rows.map(row => [row.id, row]));
        const displaced = displayed.filter(row => !fresh.has(row.id));
        const previousIds = new Set(displayed.map(row => row.id));
        const additions = rows.some(row => !previousIds.has(row.id));

        // Keep the reader's place when an approval shifts page boundaries.
        // A rejection or deletion alone can immediately refill the page.
        if (additions) {
          const verified = displaced.length
            ? await readVisibleRows(client, eventId, view.search, displaced.map(row => row.id), signal)
            : [];
          if (signal.aborted) return;
          if (!displaced.length || verified.length) {
            for (const row of verified) fresh.set(row.id, row);
            rows = displayed.flatMap(row => fresh.get(row.id) ?? []);
            updated = true;
          }
        }
      }
      displayed = rows;
      onPage({ ...page, rows, updated });
    } catch {
      if (!signal.aborted && !displayed) onError();
    }
  }

  return { read, cancel: () => controller?.abort() };
}
