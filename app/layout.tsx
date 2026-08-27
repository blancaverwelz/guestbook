import type { Metadata, Viewport } from "next";
import { MotionConfig } from "framer-motion";
import Footer from "@/components/Footer/Footer";
import ServiceWorkerRegister from "@/components/PWA/ServiceWorkerRegister";
import "./globals.css";

// Used for canonical/OG URL resolution in per-page generateMetadata calls
// (see app/events/[slug]/page.tsx and siblings). Optional — falls back to
// localhost so `next build` never fails in an environment where it isn't
// set yet, but should be set in Vercel env vars before launch for correct
// social-share previews. See README.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// Preconnecting to the Supabase project origin (not per-request, so this
// is fine to compute at module scope) shaves the DNS+TLS handshake off the
// very first image/storage request on a page — most visible on the
// gallery and event-landing pages, which both fetch a cover/thumbnail
// from Supabase Storage as early as possible.
const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
  : null;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Wedding & Birthday Guestbook",
    template: "%s — Guestbook",
  },
  description: "Leave a message and share photos from the celebration.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Lets the background token extend under the iOS status bar/home
  // indicator once a guest installs an event's PWA (see the per-event
  // manifest route) — without this, standalone-mode PWAs get an unstyled
  // black/white bar in the safe-area insets.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#121212" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {supabaseOrigin && (
          <>
            <link rel="preconnect" href={supabaseOrigin} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={supabaseOrigin} />
          </>
        )}
      </head>
      <body className="min-h-screen flex flex-col bg-background text-foreground">
        {/*
          reducedMotion="user" reads prefers-reduced-motion once and, for
          guests with it set, automatically clamps every motion.* animation
          added in this chat (Hero, CTASection, guestbook/gallery
          fade-ins, Lightbox, page transitions) down to an instant/near-
          instant state change instead of skipping the code path entirely
          — one place to satisfy the accessibility pass rather than
          threading a `useReducedMotion()` check through every component.
        */}
        <MotionConfig reducedMotion="user">
          <div className="flex-1">{children}</div>
          <Footer />
        </MotionConfig>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
