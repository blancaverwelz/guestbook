"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Dancing_Script, Cormorant_Garamond } from "next/font/google";
import FloralEngrave from "./FloralEngrave";
import { useAccentColor } from "./AccentColorProvider";
import type { LandingEvent } from "@/types/event";

// Calligraphy face for the "Sign Our Guestbook" signature line — a real
// web font renders cursive letterforms correctly every time, unlike
// LLM-authored SVG bezier paths for script text (see design brief).
const scriptFont = Dancing_Script({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

// Elegant serif for the event's own title/subtitle/date — an invitation
// register, distinct from the body sans used on the rest of the site.
const titleFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

function formatEventDate(isoDate: string | null): string | null {
  if (!isoDate) return null;
  // Parse as UTC noon to sidestep local-timezone date-rollback on a bare
  // YYYY-MM-DD string (new Date("2026-06-14") is midnight UTC, which can
  // display as the previous day in negative-UTC-offset timezones).
  const date = new Date(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

interface HeroProps {
  event: LandingEvent;
}

export default function Hero({ event }: HeroProps) {
  const accent = useAccentColor();
  const formattedDate = formatEventDate(event.event_date);

  return (
    <section className="relative flex min-h-[55vh] w-full items-end overflow-hidden md:min-h-[70vh]">
      {/* Background: cover photo if the host set one, otherwise a soft
          gradient built from this event's own accent color so the hero
          never looks broken/blank for an event without a photo yet. */}
      <div className="absolute inset-0">
        {event.cover_image ? (
          <Image
            src={event.cover_image}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <div
            className="h-full w-full"
            style={{
              background: `radial-gradient(circle at 30% 20%, ${accent.color}33, transparent 60%),
                           radial-gradient(circle at 80% 70%, ${accent.color}22, transparent 55%),
                           var(--background)`,
            }}
          />
        )}
        {/* Gradient scrim built from the theme's own background token, not
            a hardcoded dark overlay — this is what lets a single
            `text-foreground` value stay legible over it in both light and
            dark mode instead of needing separate light/dark text colors. */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/75 to-background/10" />
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.08 } },
        }}
        className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center gap-5 px-6 pb-10 pt-24 text-center text-foreground md:pb-16"
      >
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 16 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
          }}
        >
          <h1
            className={`${titleFont.className} text-4xl font-semibold tracking-wide md:text-6xl`}
          >
            {event.title}
          </h1>
          {event.subtitle && (
            <p className={`${titleFont.className} mt-1 text-lg italic text-muted-foreground md:text-xl`}>
              {event.subtitle}
            </p>
          )}
          {formattedDate && (
            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-muted-foreground md:text-sm">
              {formattedDate}
            </p>
          )}
        </motion.div>

        {/* Signature moment: floral engrave framing the calligraphy CTA
            line. This is the one deliberately ornamented element on the
            page — everything else stays quiet by design. Flex + gap (not
            negative margins) keeps this stable across viewport widths. */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 16 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
          }}
          className="mt-2 flex w-full max-w-md flex-col items-center gap-1"
        >
          <FloralEngrave className="h-10 w-full text-foreground/70 md:h-14" />
          <p className={`${scriptFont.className} px-2 text-3xl leading-tight text-foreground md:text-5xl`}>
            Sign Our Guestbook
          </p>
          <FloralEngrave className="h-10 w-full rotate-180 text-foreground/70 md:h-14" />
        </motion.div>
      </motion.div>
    </section>
  );
}
