"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  extractDominantColor,
  resolveStoredAccent,
  parseStoredAccent,
  type ResolvedAccent,
} from "@/lib/colorExtraction";

/**
 * Context, not a render-prop. A Server Component (page.tsx) can pass plain
 * JSX as `children` into a Client Component fine — that's the normal
 * Server-inside-Client composition pattern, and Next.js renders the server
 * children first and slots the result in. What it CANNOT do is pass a
 * *function* as children/props across that boundary (RSC has to serialize
 * whatever crosses the Server->Client edge, and functions aren't
 * serializable) — that was the render-prop version's bug. Context sidesteps
 * this: Hero/CTASection pull the resolved accent themselves via
 * `useAccentColor()`, so nothing function-shaped needs to cross the
 * boundary as a prop.
 */
const AccentColorContext = createContext<ResolvedAccent | null>(null);

export function useAccentColor(): ResolvedAccent {
  const ctx = useContext(AccentColorContext);
  if (!ctx) {
    throw new Error("useAccentColor() must be called within an <AccentColorProvider>.");
  }
  return ctx;
}

interface AccentColorProviderProps {
  coverImage: string | null;
  /**
   * Raw `events.accent_color` value, unparsed — Chat 13 follow-up. Renamed
   * from `fallbackAccent` because this can now represent either an
   * automatic-mode fallback or a `custom:`-prefixed override; parsing
   * happens once, here, via `parseStoredAccent`.
   */
  storedAccentColor: string | null;
  children: React.ReactNode;
}

/**
 * Resolves the accent color once per page (not once per component that
 * needs it). Starts from the contrast-safe resolved value synchronously
 * (Custom: the admin's color immediately, no async work needed; Automatic:
 * the fallback) — no flash of unstyled content — then, in Automatic mode
 * only, swaps to the extracted color if/when extraction succeeds and
 * clears WCAG AA. Custom mode never attempts extraction at all: the admin's
 * chosen color takes precedence unconditionally (Chat 13 follow-up), so
 * there's no network/canvas work to skip past, not just a result to ignore.
 *
 * Exposes the resolved accent two ways, deliberately:
 *  1. React context (`useAccentColor()`) for components that need the
 *     literal hex values in JS — Hero/CTASection use this to set inline
 *     styles directly.
 *  2. `--accent`/`--accent-foreground` CSS custom properties on a
 *     wrapping element, for every *other* guest-facing component
 *     (MessageForm, UploadButton, GalleryGrid) that already styles itself
 *     with the `bg-accent`/`text-accent`/`ring-accent`/`border-accent`
 *     Tailwind utilities. Those utilities read the CSS variable, not the
 *     React context — before this hotfix, `--accent` was only ever the
 *     static value from globals.css, so nothing outside Hero/CTASection
 *     ever reflected the resolved per-event color (Chat 9 hotfix, Issue 2).
 *
 * The wrapping div is scoped to whatever this provider wraps — currently
 * the whole `/events/[slug]/*` subtree via the shared layout — not
 * `document.documentElement`. Setting it globally on the document root
 * would leak the last-viewed event's accent into `/admin`, which uses the
 * exact same `bg-accent`/`text-accent` class names for its own static
 * champagne-gold branding and must NOT vary per event.
 */
export default function AccentColorProvider({
  coverImage,
  storedAccentColor,
  children,
}: AccentColorProviderProps) {
  const stored = useMemo(() => parseStoredAccent(storedAccentColor), [storedAccentColor]);
  const [accent, setAccent] = useState<ResolvedAccent>(() => resolveStoredAccent(stored, null));

  useEffect(() => {
    // Custom always wins immediately and never triggers extraction — see
    // doc comment above.
    if (stored.mode === "custom") {
      setAccent(resolveStoredAccent(stored, null));
      return;
    }

    if (!coverImage) {
      setAccent(resolveStoredAccent(stored, null));
      return;
    }

    let cancelled = false;
    extractDominantColor(coverImage)
      .then((extracted) => {
        if (!cancelled) setAccent(resolveStoredAccent(stored, extracted));
      })
      .catch(() => {
        // Leave the already-set fallback in place.
      });

    return () => {
      cancelled = true;
    };
  }, [coverImage, stored]);

  return (
    <AccentColorContext.Provider value={accent}>
      <div
        style={
          {
            "--accent": accent.color,
            "--accent-foreground": accent.textColor,
          } as React.CSSProperties
        }
      >
        {children}
      </div>
    </AccentColorContext.Provider>
  );
}
