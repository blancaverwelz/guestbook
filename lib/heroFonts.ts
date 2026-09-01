import {
  Inter,
  Playfair_Display,
  Cormorant_Garamond,
  Libre_Baskerville,
  Montserrat,
  Lora,
  DM_Sans,
  Great_Vibes,
} from "next/font/google";
import type { HeroFontFamily } from "./heroSettings";

/**
 * One next/font/google loader call per curated font, declared at module
 * scope — required, since next/font's compiler plugin only recognizes
 * loader call sites written literally at module scope, not ones invoked
 * dynamically or conditionally with a runtime argument. This is why an
 * admin's font choice can't be passed straight into a single dynamic
 * `Font({ ... })` call.
 *
 * Runtime selection instead happens by picking which of these
 * pre-generated `.className` values to apply, via HERO_FONT_CLASS_NAMES
 * below. Uses this project's existing font-loading architecture (Chat 1's
 * Hero.tsx already loaded two fonts this same way) — this file just
 * extends it to all 8 curated options and exposes a lookup instead of
 * each component hardcoding which const it wants.
 */
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});
const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});
const libreBaskerville = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  display: "swap",
});
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
const greatVibes = Great_Vibes({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

/** Lookup from a curated HeroFontFamily name to its generated next/font className. */
export const HERO_FONT_CLASS_NAMES: Record<HeroFontFamily, string> = {
  Inter: inter.className,
  "Playfair Display": playfairDisplay.className,
  "Cormorant Garamond": cormorantGaramond.className,
  "Libre Baskerville": libreBaskerville.className,
  Montserrat: montserrat.className,
  Lora: lora.className,
  "DM Sans": dmSans.className,
  "Great Vibes": greatVibes.className,
};
