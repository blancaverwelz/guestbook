"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { extractDominantColor, resolveAccentColor, type ResolvedAccent } from "@/lib/colorExtraction";

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
  fallbackAccent: string;
  children: React.ReactNode;
}

/**
 * Resolves the accent color once per page (not once per component that
 * needs it). Starts from the contrast-safe fallback immediately — no
 * flash of unstyled content — then swaps to the extracted color if/when
 * extraction succeeds and clears WCAG AA. If there's no cover image, or
 * extraction fails (CORS, decode error, low-contrast result), it just
 * stays on the fallback.
 */
export default function AccentColorProvider({
  coverImage,
  fallbackAccent,
  children,
}: AccentColorProviderProps) {
  const [accent, setAccent] = useState<ResolvedAccent>(() => resolveAccentColor(null, fallbackAccent));

  useEffect(() => {
    if (!coverImage) return;

    let cancelled = false;
    extractDominantColor(coverImage)
      .then((extracted) => {
        if (!cancelled) setAccent(resolveAccentColor(extracted, fallbackAccent));
      })
      .catch(() => {
        // Leave the already-set fallback in place.
      });

    return () => {
      cancelled = true;
    };
  }, [coverImage, fallbackAccent]);

  return <AccentColorContext.Provider value={accent}>{children}</AccentColorContext.Provider>;
}
