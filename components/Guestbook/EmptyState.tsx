import Link from "next/link";
import { PenLine } from "lucide-react";

type EmptyStateProps =
  | { variant: "archive"; messageHref: string }
  | { variant: "search"; query: string; onClear: () => void };

export default function EmptyState(props: EmptyStateProps) {
  if (props.variant === "search") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-16 text-center">
        <p className="text-foreground">
          No messages match <span className="font-medium">“{props.query}”</span>.
        </p>
        <p className="text-sm text-muted-foreground">
          Try a different name or word.
        </p>
        <button
          type="button"
          onClick={props.onClear}
          className="min-h-11 text-sm font-medium text-foreground underline decoration-accent decoration-2 underline-offset-4"
        >
          Clear search
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border px-6 py-16 text-center">
      <p className="text-lg text-foreground">The first page is still blank.</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Be the first to leave a few words — they&apos;ll appear here once
        they&apos;ve been approved.
      </p>
      <Link
        href={props.messageHref}
        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-accent-foreground hover:opacity-90"
      >
        <PenLine aria-hidden className="h-4 w-4" />
        Leave a message
      </Link>
    </div>
  );
}
