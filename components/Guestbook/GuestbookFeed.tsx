"use client";

import { useEffect, useRef } from "react";
import { useGuestbookFeed } from "@/hooks/useGuestbookFeed";
import MessageCard from "./MessageCard";
import EmptyState from "./EmptyState";

function MessageSkeleton() {
  return (
    <li className="animate-pulse rounded-lg border border-border bg-card p-4">
      <div className="h-4 w-24 rounded bg-muted-foreground/20" />
      <div className="mt-3 h-3 w-full rounded bg-muted-foreground/20" />
      <div className="mt-2 h-3 w-2/3 rounded bg-muted-foreground/20" />
    </li>
  );
}

type GuestbookFeedProps = {
  eventId: string;
};

export default function GuestbookFeed({ eventId }: GuestbookFeedProps) {
  const { messages, loading, loadingMore, error, hasMore, loadMore } =
    useGuestbookFeed(eventId);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  if (loading) {
    return (
      <ul className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <MessageSkeleton key={i} />
        ))}
      </ul>
    );
  }

  if (error && messages.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-foreground">
        {error}
      </div>
    );
  }

  if (messages.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {messages.map((m) => (
          <MessageCard
            key={m.id}
            name={m.name}
            message={m.message}
            createdAt={m.created_at}
          />
        ))}
      </ul>

      {hasMore && (
        <div ref={sentinelRef} className="py-4 text-center text-sm text-muted-foreground">
          {loadingMore ? "Loading more…" : ""}
        </div>
      )}

      {error && messages.length > 0 && (
        <p className="text-center text-sm text-muted-foreground">{error}</p>
      )}
    </div>
  );
}
