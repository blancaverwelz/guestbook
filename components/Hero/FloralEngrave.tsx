interface FloralEngraveProps {
  className?: string;
}

/**
 * Line-art floral flourish that frames the "Sign Our Guestbook" calligraphy
 * text. Deliberately thin, single-color stroke work (no fills) so it reads
 * as an engraving rather than a sticker/illustration — per the design
 * brief, the text itself is a real web font, this SVG is ornamentation
 * only.
 *
 * Uses `currentColor` throughout so a parent can set `text-foreground` (or
 * any token) and this stays legible in both light and dark mode without a
 * second color prop to keep in sync.
 *
 * viewBox is wide and short (760x160) so it sits as a horizontal frame
 * above/below a centered line of text, mirrored left/right around the
 * vertical center — one flourish is authored on the left half, then
 * reflected for the right half via a mirrored <use>.
 */
export default function FloralEngrave({ className }: FloralEngraveProps) {
  return (
    <svg
      viewBox="0 0 760 160"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <g id="flourish-half" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        {/* main vine, sweeping outward and up from center */}
        <path d="M380 80 C 330 78, 300 60, 265 66 C 225 73, 205 50, 165 48 C 120 46, 95 62, 55 58" />
        {/* secondary lower tendril curling back under */}
        <path d="M300 84 C 270 96, 250 100, 220 92 C 185 83, 165 98, 130 100" />
        {/* leaves along the main vine — small pointed almonds */}
        <path d="M255 66 C 260 55, 272 52, 280 58 C 273 66, 261 68, 255 66 Z" />
        <path d="M195 55 C 198 43, 210 38, 219 43 C 214 52, 202 56, 195 55 Z" />
        <path d="M135 52 C 136 40, 147 34, 157 38 C 153 47, 142 52, 135 52 Z" />
        <path d="M245 90 C 242 100, 231 105, 222 100 C 227 92, 238 88, 245 90 Z" />
        <path d="M175 96 C 171 106, 160 110, 151 105 C 156 97, 168 93, 175 96 Z" />
        {/* small five-point blossoms, drawn as tiny loops */}
        <g>
          <circle cx="55" cy="58" r="6" />
          <circle cx="55" cy="58" r="1.4" fill="currentColor" stroke="none" />
        </g>
        <g>
          <circle cx="130" cy="100" r="4.5" />
          <circle cx="130" cy="100" r="1.1" fill="currentColor" stroke="none" />
        </g>
        {/* a few loose sprigs trailing off the end */}
        <path d="M55 58 C 40 52, 30 54, 18 46" />
        <path d="M55 58 C 44 66, 34 68, 24 76" />
      </g>

      {/* mirror the same half across the vertical center for right side */}
      <use href="#flourish-half" transform="scale(-1,1) translate(-760,0)" />
    </svg>
  );
}
