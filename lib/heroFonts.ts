import localFont from "next/font/local";
import type { HeroFontFamily } from "./heroSettings";

/** Bundled font files keep builds independent of Google Fonts responses. */
const inter = localFont({
  src: [
    { path: "./fonts/inter/normal.ttf", weight: "100 900", style: "normal" },
  ],
  display: "swap",
  adjustFontFallback: "Arial",
});

const playfairDisplay = localFont({
  src: [
    { path: "./fonts/playfairdisplay/italic.ttf", weight: "400 900", style: "italic" },
    { path: "./fonts/playfairdisplay/normal.ttf", weight: "400 900", style: "normal" },
  ],
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

const cormorantGaramond = localFont({
  src: [
    { path: "./fonts/cormorantgaramond/italic.ttf", weight: "300 700", style: "italic" },
    { path: "./fonts/cormorantgaramond/normal.ttf", weight: "300 700", style: "normal" },
  ],
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

const libreBaskerville = localFont({
  src: [
    { path: "./fonts/librebaskerville/italic.ttf", weight: "400 700", style: "italic" },
    { path: "./fonts/librebaskerville/normal.ttf", weight: "400 700", style: "normal" },
  ],
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

const montserrat = localFont({
  src: [
    { path: "./fonts/montserrat/normal.ttf", weight: "100 900", style: "normal" },
  ],
  display: "swap",
  adjustFontFallback: "Arial",
});

const lora = localFont({
  src: [
    { path: "./fonts/lora/italic.ttf", weight: "400 700", style: "italic" },
    { path: "./fonts/lora/normal.ttf", weight: "400 700", style: "normal" },
  ],
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

const dmSans = localFont({
  src: [
    { path: "./fonts/dmsans/normal.ttf", weight: "100 1000", style: "normal" },
  ],
  display: "swap",
  adjustFontFallback: "Arial",
});

const greatVibes = localFont({
  src: [
    { path: "./fonts/greatvibes/normal.ttf", weight: "400", style: "normal" },
  ],
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

export const HERO_FONT_CLASS_NAMES: Record<HeroFontFamily, string> = {
  "Inter": inter.className,
  "Playfair Display": playfairDisplay.className,
  "Cormorant Garamond": cormorantGaramond.className,
  "Libre Baskerville": libreBaskerville.className,
  "Montserrat": montserrat.className,
  "Lora": lora.className,
  "DM Sans": dmSans.className,
  "Great Vibes": greatVibes.className,
};
