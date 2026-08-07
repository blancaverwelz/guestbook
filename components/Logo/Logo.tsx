import type { SVGProps } from "react";

interface LogoProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

/**
 * Site mark: a minimal open-book monogram (two facing pages, split at the
 * spine). Pure-polygon geometry, no strokes — verified legible down to
 * 16x16px (favicon size). Same coordinates are used to generate
 * public/favicon.svg and the rasterized PNG favicons, so the mark is
 * identical everywhere it appears.
 *
 * Uses `currentColor`, so it inherits whatever text color the parent sets.
 * Pair with a token-driven class (e.g. `text-foreground` or
 * `text-[var(--accent)]`) rather than a hardcoded hex value, so it stays
 * visible against both light and dark backgrounds.
 */
export default function Logo({ size = 32, ...props }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Guestbook logo"
      {...props}
    >
      <polygon points="4,10 14.5,13 14.5,25 4,21" fill="currentColor" />
      <polygon points="28,10 17.5,13 17.5,25 28,21" fill="currentColor" />
    </svg>
  );
}
