"use client";

import { useId, useState } from "react";
import { useIsClamped } from "@/hooks/useIsClamped";
import { HERO_FONT_CLASS_NAMES } from "@/lib/heroFonts";
import {
  formatFullDate,
  formatTime,
  type PresentedMessage,
} from "@/lib/guestbook/presentation";

type MessageCardProps = {
  message: PresentedMessage;
  /** Position in the current render; only used to cap the entrance stagger. */
  index?: number;
};

// Type system: one body size for every message; serif only for the signature.
const bodyFont = HERO_FONT_CLASS_NAMES["Lora"];
const signatureFont = HERO_FONT_CLASS_NAMES["Cormorant Garamond"];

// Beyond a few cards a cascade reads as "loaded", not "staggering".
const MAX_STAGGER_INDEX = 6;
const STAGGER_STEP_S = 0.05;

// Solo width follows how much a note has to say, up to a comfortable measure.
// Full literals so Tailwind can see them.
const SOLO_WIDTH = {
  brief: "md:max-w-md",
  standard: "md:max-w-xl",
  long: "md:max-w-2xl",
} as const;

export default function MessageCard({ message, index = 0 }: MessageCardProps) {
  const { placement, tone } = message;
  const textId = useId();
  const [expanded, setExpanded] = useState(false);
  const [textRef, clamped] = useIsClamped<HTMLParagraphElement>(!expanded, message.message);
  const showToggle = expanded || clamped;

  return (
    <li
      className={`archive-rise ${placement.row === "pair" ? "md:col-span-6" : "md:col-span-12"}`}
      style={{ animationDelay: `${Math.min(index, MAX_STAGGER_INDEX) * STAGGER_STEP_S}s` }}
    >
      <article
        data-tone={tone}
        className={`archive-note w-full px-6 py-7 sm:px-9 sm:py-9 ${
          placement.row === "solo" ? `md:mx-auto ${SOLO_WIDTH[placement.size]}` : ""
        }`}
      >
        <p
          id={textId}
          ref={textRef}
          className={`${bodyFont} archive-text whitespace-pre-wrap break-words text-[1.0625rem] leading-[1.75] sm:text-lg sm:leading-[1.8] ${
            expanded ? "" : "line-clamp-8"
          }`}
        >
          {message.message}
        </p>

        {showToggle && (
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={textId}
            onClick={() => setExpanded((v) => !v)}
            className="archive-toggle mt-2 min-h-11 rounded-md text-sm font-medium underline decoration-2 underline-offset-4"
          >
            {expanded ? "Show less" : "Read full message"}
            <span className="sr-only"> from {message.name}</span>
          </button>
        )}

        <footer className="mt-7 flex items-baseline justify-between gap-4">
          <p className="flex min-w-0 items-center gap-3">
            <span aria-hidden className="archive-sign-bg h-px w-6 shrink-0" />
            <span
              className={`${signatureFont} archive-sign min-w-0 break-words text-[1.375rem] font-medium italic leading-tight`}
            >
              {message.name}
            </span>
          </p>
          <time
            dateTime={message.created_at}
            title={formatFullDate(message.created_at)}
            className="archive-muted shrink-0 text-xs tabular-nums tracking-wide"
          >
            {formatTime(message.created_at)}
          </time>
        </footer>
      </article>
    </li>
  );
}
