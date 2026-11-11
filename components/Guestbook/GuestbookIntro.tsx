import Link from "next/link";
import { PenLine } from "lucide-react";
import ArchiveIntro from "./ArchiveIntro";
import { formatCount } from "@/lib/guestbook/presentation";

type GuestbookIntroProps = {
  eventTitle: string;
  messageHref: string;
  /** Exact approved total; null while loading or unavailable. */
  approvedTotal: number | null;
};

export default function GuestbookIntro({
  eventTitle,
  messageHref,
  approvedTotal,
}: GuestbookIntroProps) {
  return (
    <ArchiveIntro
      title="Words to remember."
      description={
        <>
          Notes, wishes and memories from the people who shared{" "}
          <span className="text-foreground">{eventTitle.trim() || "this day"}</span> with you.
        </>
      }
    >
      <div className="mt-2 flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
        <Link
          href={messageHref}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-accent-foreground shadow-sm transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <PenLine aria-hidden className="h-4 w-4" />
          Leave a message
        </Link>
        {approvedTotal !== null && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {formatCount(approvedTotal)}
            </span>{" "}
            in the archive
          </p>
        )}
      </div>
    </ArchiveIntro>
  );
}
