import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { createPageReader } from "../lib/guestbook/pageReader";
import { readPage } from "../lib/guestbook/queries";

function backend(fetch: typeof globalThis.fetch) {
  return createClient("http://fixture.invalid", "fixture", {
    auth: { persistSession: false, autoRefreshToken: false }, global: { fetch },
  });
}

const signal = new AbortController().signal;
const event = "test-event";
const newest = { order: "newest", search: "" } as const;

describe("numbered page reads", () => {
  it("fetches the last two records and exact total in one bounded request", async () => {
    const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const params = new URL(String(input)).searchParams;
      expect(params.get("event_id")).toBe("eq.test-event");
      expect(params.get("status")).toBe("eq.approved");
      expect(params.get("offset")).toBe("20");
      expect(params.get("limit")).toBe("10");
      expect(params.get("order")).toBe("created_at.desc,id.desc");
      expect(new Headers(init?.headers).get("prefer")).toContain("count=exact");
      return Response.json([{ id: "two" }, { id: "one" }], { headers: { "content-range": "20-21/22" } });
    });
    const page = await readPage(backend(fetch), event, { ...newest, page: 3 }, signal);
    expect(page).toMatchObject({ rows: [{ id: "two" }, { id: "one" }], pages: 3, total: 22, count: 22 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("counts search matches independently from the archive total", async () => {
    const client = backend(async (input, init) => {
      const params = new URL(String(input)).searchParams;
      if (init?.method === "HEAD") {
        expect(params.has("or")).toBe(false);
        return new Response(null, { headers: { "content-range": "*/22" } });
      }
      expect(params.get("order")).toBe("created_at.asc,id.asc");
      expect(params.get("or")).toContain("name.ilike.");
      return Response.json([{ id: "match" }], { headers: { "content-range": "0-0/1" } });
    });
    const page = await readPage(client, event, { page: 1, search: "match", order: "oldest" }, signal);
    expect(page).toMatchObject({ pages: 1, total: 22, count: 1 });
  });

  it("recovers the current page count when moderation removes the last page", async () => {
    const client = backend(async (_input, init) => init?.method === "HEAD"
      ? new Response(null, { headers: { "content-range": "*/20" } })
      : Response.json({ code: "PGRST103", message: "Requested range not satisfiable" }, { status: 416 }));
    expect(await readPage(client, event, { ...newest, page: 3 }, signal))
      .toMatchObject({ rows: [], pages: 2, total: 20 });
  });
});

// Finish the older network request last, even if the transport ignores abort.
it("keeps page two selected when a page-one refresh returns late", async () => {
  let release!: (response: Response) => void;
  const delayed = new Promise<Response>(resolve => { release = resolve; });
  const payload = (id: string) => Response.json([{ id }], { headers: { "content-range": "0-0/22" } });
  const fetch = vi.fn()
    .mockResolvedValueOnce(payload("initial"))
    .mockReturnValueOnce(delayed)
    .mockResolvedValueOnce(payload("page-two"));
  const client = backend(fetch);
  const show = vi.fn();
  const fail = vi.fn();
  const first = createPageReader(client, event, { ...newest, page: 1 }, show, fail);
  await first.read();
  const refresh = first.read();
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  first.cancel();
  const next = createPageReader(client, event, { ...newest, page: 2 }, show, fail);
  await next.read();
  release(payload("stale-page-one"));
  await refresh;
  expect(show.mock.calls.map(([page]) => page.rows[0].id)).toEqual(["initial", "page-two"]);
  expect(fail).not.toHaveBeenCalled();
});
