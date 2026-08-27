"use client";

import { motion } from "framer-motion";

/**
 * Page-transition fade, scoped to a fade-IN only — not a full
 * enter/exit crossfade.
 *
 * template.tsx (unlike layout.tsx) remounts on every navigation, which is
 * what makes an entrance animation replay per route change; see
 * https://nextjs.org/docs/app/api-reference/file-conventions/template.
 * A true crossfade would need the *old* page to stay mounted and animate
 * out while the new one animates in, but the App Router unmounts the
 * previous template immediately on navigation — there's no exit-animation
 * hook here without reaching for a routing-intercept library, which is
 * out of scope for a cosmetic polish pass. A clean fade-in on arrival
 * still reads as an intentional transition rather than a hard cut, without
 * that added complexity/dependency.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
