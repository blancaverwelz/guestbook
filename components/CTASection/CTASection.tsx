"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { PenLine, BookOpen, Images } from "lucide-react";
import { useAccentColor } from "@/components/Hero/AccentColorProvider";

interface CTASectionProps {
  slug: string;
}

// Shared entrance variant for all three CTAs — motion.div wrappers (not
// motion(Link) directly) because next/link + framer-motion's `motion.create`
// HOC is an extra layer of indirection for no visible difference here: the
// wrapper fully contains the Link, so whileHover/whileTap on the wrapper
// fires from the same pointer events as hovering the link itself.
const item = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
} as const;

export default function CTASection({ slug }: CTASectionProps) {
  const accent = useAccentColor();
  return (
    <motion.section
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } } }}
      className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-6 py-8"
    >
      {/* Row 1 — primary action, full width, alone. Uses the resolved
          (contrast-checked) accent as a filled surface. */}
      <motion.div variants={item} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
        <Link
          href={`/events/${slug}/message`}
          className="flex items-center justify-center gap-2 rounded-lg px-6 py-4 text-base font-medium shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
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
      </motion.div>

      {/* Row 2 — secondary actions, always side-by-side (fixed 2-column
          layout per the design brief — do not collapse to 1 column on
          mobile). Token-styled rather than accent-filled, so there's no
          contrast burden on these two. */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div variants={item} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
          <Link
            href={`/events/${slug}/guestbook`}
            className="flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-5 text-center text-sm font-medium text-foreground transition-colors hover:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <BookOpen className="h-5 w-5" style={{ color: accent.color }} aria-hidden="true" />
            Guestbook
          </Link>
        </motion.div>
        <motion.div variants={item} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
          <Link
            href={`/events/${slug}/gallery`}
            className="flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-5 text-center text-sm font-medium text-foreground transition-colors hover:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Images className="h-5 w-5" style={{ color: accent.color }} aria-hidden="true" />
            Gallery
          </Link>
        </motion.div>
      </div>
    </motion.section>
  );
}
