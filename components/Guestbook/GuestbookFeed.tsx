"use client";

import { useEffect, useRef, useState } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useGuestbookFeed } from "@/hooks/useGuestbookFeed";
import { normalizeSearch, SEARCH_MAX_LENGTH } from "@/lib/guestbook/pagination";
import { formatCount, groupByDay } from "@/lib/guestbook/presentation";
import ArchiveSkeleton from "./ArchiveSkeleton";
import EmptyState from "./EmptyState";
import GuestbookIntro from "./GuestbookIntro";
import GuestbookPagination from "./GuestbookPagination";
import GuestbookToolbar from "./GuestbookToolbar";
import MessageGrid from "./MessageGrid";

type Props = { eventId: string; eventTitle: string; messageHref: string };

export default function GuestbookFeed({ eventId, eventTitle, messageHref }: Props) {
  const [searchInput, setSearchInput] = useState("");
  const search = normalizeSearch(useDebouncedValue(searchInput, 300));
  const { view, setView, data, error } = useGuestbookFeed(eventId);
  const results = useRef<HTMLElement>(null);

  useEffect(() => {
    setView(current => current.search === search ? current : { ...current, search, page: 1 });
  }, [search, setView]);

  function goToPage(page: number) {
    setView(current => ({ ...current, page }));
    results.current?.focus({ preventScroll: true });
    results.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }

  const emptyArchive = data?.total === 0 && !view.search;
  const pageStatus = data && `Page ${view.page} of ${data.pages}`;
  const searchStatus = data && view.search && `${formatCount(data.count)} found for “${view.search}”`;
  const status = error ?? ([searchStatus, pageStatus].filter(Boolean).join(". ") || "Loading messages…");
  const reload = () => setView(current => ({ ...current }));

  return (
    <>
      <GuestbookIntro eventTitle={eventTitle} messageHref={messageHref} approvedTotal={data?.total ?? null} />
      {!emptyArchive && (
        <GuestbookToolbar
          searchInput={searchInput}
          onSearchInputChange={setSearchInput}
          order={view.order}
          onOrderChange={order => setView(current => current.order === order ? current : { ...current, order, page: 1 })}
          statusText={status}
          busy={!data && !error}
          maxLength={SEARCH_MAX_LENGTH}
        />
      )}
      <section ref={results} tabIndex={-1} aria-label="Guestbook messages" className="scroll-mt-24 focus:outline-none">
        {error ? (
          <div role="alert" className="flex flex-col items-center gap-3 text-center">
            <p>{error}</p>
            <button type="button" onClick={reload} className="min-h-11 px-4 underline">Try again</button>
          </div>
        ) : !data ? (
          <ArchiveSkeleton />
        ) : emptyArchive ? (
          <EmptyState variant="archive" messageHref={messageHref} />
        ) : data.count === 0 ? (
          <EmptyState variant="search" query={view.search} onClear={() => setSearchInput("")} />
        ) : (
          <>
            {(searchStatus || data.pages > 1) && (
              <p className="mb-8 text-center text-sm text-muted-foreground">
                {[searchStatus, pageStatus].filter(Boolean).join(" · ")}
              </p>
            )}
            {data.updated && (
              <div className="sticky top-16 z-30 mb-6 flex justify-center">
                <button type="button" onClick={reload} className="min-h-11 rounded-full bg-foreground px-5 text-sm text-background">
                  Show updated page
                </button>
              </div>
            )}
            <MessageGrid groups={groupByDay(data.rows)} />
            <GuestbookPagination page={view.page} pages={data.pages} onPage={goToPage} />
          </>
        )}
      </section>
    </>
  );
}
