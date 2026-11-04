"use client";

import type { CSSProperties } from "react";
import typography from "./HeroTypography.module.css";
import CoverPhoto from "./CoverPhoto";
import { motion } from "framer-motion";
import FloralEngrave from "./FloralEngrave";
import { useAccentColor } from "./AccentColorProvider";
import { parseStoredHeroSettings, type HeroFieldSettings } from "@/lib/heroSettings";
import { HERO_FONT_CLASS_NAMES } from "@/lib/heroFonts";
import type { LandingEvent } from "@/types/event";

/**
 * Chat 14: title/subtitle/date/guestbook-text font families and sizes are
 * now admin-configurable per event (see EventEditor), so the two
 * hardcoded next/font/google instances that used to live here
 * (Cormorant Garamond for title/subtitle/date, Dancing Script for the
 * guestbook-text line) have moved into lib/heroFonts.ts, which declares
 * all 8 curated fonts up front and exposes a name -> className lookup —
 * see that file's doc comment for why a single dynamic font call isn't
 * possible with next/font.
 */

/** CSS switches sizes at the same breakpoint as the cover preview. */
function heroFontSizeStyle(settings: HeroFieldSettings): CSSProperties {
  const min = Math.round(settings.fontSize * 0.6);
  return {
    "--hero-desktop-size": `${settings.fontSize}px`,
    "--hero-mobile-size": settings.mobileFontSize === null
      ? `clamp(${min}px, ${min}px + 3vw, ${settings.fontSize}px)`
      : `${settings.mobileFontSize}px`,
  } as CSSProperties;
}

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
  const heroSettings = parseStoredHeroSettings(event.hero_settings);
  const heroTitle = heroSettings.title.content ?? event.title;

  return (
    <section className="relative flex min-h-[42vh] w-full flex-1 items-end overflow-hidden sm:min-h-[52vh] md:min-h-[70vh]">
      <div className="absolute inset-0">
        {event.cover_image ? (
          <CoverPhoto src={event.cover_image} settings={heroSettings.cover} />
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
        <div
          className="absolute inset-0 bg-gradient-to-t from-background via-background/75 to-background/10"
          style={{ opacity: event.cover_image ? heroSettings.cover.overlay / 100 : 1 }}
        />
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
            // Was y:16 / 0.25s — real-device testing found this too subtle
            // to register as an intentional entrance. Bumped toward the
            // top of the original 200–300ms allowance and a slightly
            // larger vertical travel, not a different animation style —
            // still a plain fade/rise, still restrained.
            hidden: { opacity: 0, y: 22 },
            visible: {
              opacity: 1,
              y: 0,
              transition: { duration: 0.3, ease: "easeOut" },
            },
          }}
        >
          {heroSettings.title.visible && (
            <h1
              className={`${typography.text} ${HERO_FONT_CLASS_NAMES[heroSettings.title.fontFamily]} whitespace-pre-line font-semibold tracking-wide`}
              style={heroFontSizeStyle(heroSettings.title)}
            >
              {heroTitle}
            </h1>
          )}
          {heroSettings.subtitle.visible && event.subtitle && (
            <p
              className={`${typography.text} ${HERO_FONT_CLASS_NAMES[heroSettings.subtitle.fontFamily]} mt-1 italic text-muted-foreground`}
              style={heroFontSizeStyle(heroSettings.subtitle)}
            >
              {event.subtitle}
            </p>
          )}
          {heroSettings.date.visible && formattedDate && (
            <p
              className={`${typography.text} ${HERO_FONT_CLASS_NAMES[heroSettings.date.fontFamily]} mt-2 uppercase tracking-[0.2em] text-muted-foreground`}
              style={heroFontSizeStyle(heroSettings.date)}
            >
              {formattedDate}
            </p>
          )}
        </motion.div>

        {/* Signature moment: floral engrave framing the calligraphy CTA
            line. This is the one deliberately ornamented element on the
            page — everything else stays quiet by design. Flex + gap (not
            negative margins) keeps this stable across viewport widths.

            Chat 14: content, font, size are admin-configurable
            (heroSettings.guestbookText); the whole row (flourishes +
            text) is omitted entirely when that field is hidden, so
            turning it off never leaves the two FloralEngrave flourishes
            floating around empty space. When shown, decoration ("floral"
            vs "none") independently controls whether the flourishes
            themselves render around it. */}
        {heroSettings.guestbookText.visible && (
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 22 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.3, ease: "easeOut" },
              },
            }}
            className="mt-2 flex w-full max-w-md flex-col items-center gap-1"
          >
            {heroSettings.decoration === "floral" && (
              <FloralEngrave className="h-10 w-full text-foreground/70 md:h-14" />
            )}
            <p
              className={`${typography.text} ${HERO_FONT_CLASS_NAMES[heroSettings.guestbookText.fontFamily]} px-2 leading-tight text-foreground`}
              style={heroFontSizeStyle(heroSettings.guestbookText)}
            >
              {heroSettings.guestbookText.content}
            </p>
            {heroSettings.decoration === "floral" && (
              <FloralEngrave className="h-10 w-full rotate-180 text-foreground/70 md:h-14" />
            )}
          </motion.div>
        )}
      </motion.div>
    </section>
  );
}
