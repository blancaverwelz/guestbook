"use client";

import Link from "next/link";
import { PenLine, BookOpen, Images } from "lucide-react";
import { useAccentColor } from "@/components/Hero/AccentColorProvider";

interface CTASectionProps {
  slug: string;
}

export default function CTASection({ slug }: CTASectionProps) {
  const accent = useAccentColor();
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-6 py-8">
      {/* Row 1 — primary action, full width, alone. Uses the resolved
          (contrast-checked) accent as a filled surface. */}
      <Link
        href={`/events/${slug}/message`}
        className="flex items-center justify-center gap-2 rounded-lg px-6 py-4 text-base font-medium shadow-sm transition-transform hover:scale-[1.01] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        style={{
          backgroundColor: accent.color,
          color: accent.textColor,
          // outlineColor isn't themeable via Tailwind ring utilities when
          // the ring needs to match a runtime hex, so this is set inline;
          // focus-visible:ring-2 still supplies the ring itself.
          ["--tw-ring-color" as string]: accent.color,
        }}
      >
        <PenLine className="h-5 w-5" aria-hidden="true" />
        Leave a Message
      </Link>

      {/* Row 2 — secondary actions, always side-by-side (fixed 2-column
          layout per the design brief — do not collapse to 1 column on
          mobile). Token-styled rather than accent-filled, so there's no
          contrast burden on these two. */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href={`/events/${slug}/guestbook`}
          className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card px-3 py-5 text-center text-sm font-medium text-foreground transition-colors hover:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <BookOpen className="h-5 w-5" style={{ color: accent.color }} aria-hidden="true" />
          Guestbook
        </Link>
        <Link
          href={`/events/${slug}/gallery`}
          className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card px-3 py-5 text-center text-sm font-medium text-foreground transition-colors hover:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Images className="h-5 w-5" style={{ color: accent.color }} aria-hidden="true" />
          Gallery
        </Link>
      </div>
    </section>
  );
}
