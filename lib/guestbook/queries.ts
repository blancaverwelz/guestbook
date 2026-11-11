import type { SupabaseClient } from "@supabase/supabase-js";
import { buildSearchFilter, PAGE_SIZE, type GuestbookMessage, type SortOrder } from "./pagination";

export type ArchiveView = { page: number; search: string; order: SortOrder };

function approvedRows(client: SupabaseClient, eventId: string, search: string, options: { head?: boolean; count?: "exact" } = {}) {
  let query = client.from("messages").select("id,name,message,created_at", options)
    .eq("event_id", eventId).eq("status", "approved");
  if (search) query = query.or(buildSearchFilter(search));
  return query;
}

async function countRows(client: SupabaseClient, eventId: string, search: string, signal: AbortSignal) {
  const { count, error } = await approvedRows(client, eventId, search, { count: "exact", head: true }).abortSignal(signal);
  if (error) throw error;
  return count ?? 0;
}

export async function readPage(client: SupabaseClient, eventId: string, view: ArchiveView, signal: AbortSignal) {
  const offset = (view.page - 1) * PAGE_SIZE;
  const ascending = view.order === "oldest";
  const [response, archiveCount] = await Promise.all([
    approvedRows(client, eventId, view.search, { count: "exact" })
      .order("created_at", { ascending }).order("id", { ascending })
      .range(offset, offset + PAGE_SIZE - 1).abortSignal(signal),
    view.search ? countRows(client, eventId, "", signal) : null,
  ]);

  // Deleting the final page can make its offset invalid between two reads.
  const { error } = response;
  if (error && !(view.page > 1 && error.code === "PGRST103")) throw error;
  const count = error ? await countRows(client, eventId, view.search, signal) : response.count ?? 0;
  return {
    rows: (response.data ?? []) as GuestbookMessage[],
    count,
    total: archiveCount ?? count,
    pages: Math.max(1, Math.ceil(count / PAGE_SIZE)),
  };
}

/** Verify displaced cards through the same public filters before keeping them on screen. */
export async function readVisibleRows(
  client: SupabaseClient, eventId: string, search: string, ids: string[], signal: AbortSignal
) {
  const { data, error } = await approvedRows(client, eventId, search)
    .in("id", ids).abortSignal(signal);
  if (error) throw error;
  return (data ?? []) as GuestbookMessage[];
}
