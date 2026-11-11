"use client";

import { Search, X } from "lucide-react";
import type { SortOrder } from "@/lib/guestbook/pagination";

type GuestbookToolbarProps = {
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  order: SortOrder;
  onOrderChange: (order: SortOrder) => void;
  /** Screen-reader status line, e.g. "Showing 20 of 134 messages." */
  statusText: string;
  busy: boolean;
  maxLength: number;
};

const ORDERS: { value: SortOrder; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
];

export default function GuestbookToolbar({
  searchInput,
  onSearchInputChange,
  order,
  onOrderChange,
  statusText,
  busy,
  maxLength,
}: GuestbookToolbarProps) {
  return (
    <div className="mx-auto mb-14 flex w-full max-w-3xl flex-col gap-2 sm:mb-16 sm:flex-row sm:items-end sm:gap-10">
      <div className="relative flex-1 border-b border-border transition-colors focus-within:border-accent">
        <label htmlFor="guestbook-search" className="sr-only">
          Search messages by name or text
        </label>
        <Search
          aria-hidden
          className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          id="guestbook-search"
          type="search"
          value={searchInput}
          onChange={(e) => onSearchInputChange(e.target.value)}
          maxLength={maxLength}
          placeholder="Search by name or message"
          autoComplete="off"
          enterKeyHint="search"
          className="min-h-12 w-full bg-transparent pl-8 pr-10 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {searchInput && (
          <button
            type="button"
            onClick={() => onSearchInputChange("")}
            aria-label="Clear search"
            className="absolute right-0 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-accent"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        )}
      </div>

      <div role="group" aria-label="Sort messages" className="flex items-center gap-7">
        {ORDERS.map(({ value, label }) => {
          const selected = order === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={selected}
              onClick={() => onOrderChange(value)}
              className={`min-h-12 border-b-2 text-sm font-medium tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent ${
                selected
                  ? "border-accent text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <p role="status" aria-live="polite" aria-busy={busy} className="sr-only">
        {statusText}
      </p>
    </div>
  );
}
