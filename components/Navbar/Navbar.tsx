"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PenLine, BookOpen, Images } from "lucide-react";
import { useAccentColor } from "@/components/Hero/AccentColorProvider";

interface NavbarProps {
  slug: string;
  eventTitle: string;
}

/**
 * Persistent guest-facing navigation, mounted once in
 * app/events/[slug]/layout.tsx so it appears — identically — on the
 * landing page and all three core experiences (message/guestbook/gallery).
 *
 * Why here and not per-page: the layout already wraps this whole subtree
 * in <AccentColorProvider> (see layout.tsx's own comment on why — one
 * resolved accent, one fetch, shared by every child). Mounting Navbar
 * inside that same provider means it can call useAccentColor() like
 * CTASection does, so the active-link indicator uses the same per-event
 * resolved accent instead of a second hardcoded color.
 *
 * Deliberately does NOT render on /admin/* — that tree never mounts this
 * layout (see app/admin/... route group), so no exclusion logic is needed
 * here.
 *
 * Also hides itself on the landing page (`pathname === base`) — the
 * landing page already has its own primary CTAs (Hero/CTASection) for
 * these same three destinations, so showing this bar there too was
 * redundant. `eventTitle` is kept as a prop (unused visually now) purely
 * for the nav's aria-label, so screen readers still get "X's event
 * navigation" rather than a generic label.
 */
const links = [
  { href: "", label: "Event", icon: Home },
  { href: "/message", label: "Message", icon: PenLine },
  { href: "/guestbook", label: "Guestbook", icon: BookOpen },
  { href: "/gallery", label: "Gallery", icon: Images },
] as const;

export default function Navbar({ slug, eventTitle }: NavbarProps) {
  const pathname = usePathname();
  const accent = useAccentColor();
  const base = `/events/${slug}`;

  if (pathname === base) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <nav
        aria-label={`${eventTitle} navigation`}
        className="mx-auto flex w-full max-w-3xl items-center justify-center gap-2 px-4 py-2.5"
      >
        <ul className="flex items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => {
            const target = `${base}${href}`;
            const isActive = pathname === target;

            return (
              <li key={href}>
                <Link
                  href={target}
                  aria-current={isActive ? "page" : undefined}
                  className="flex flex-col items-center gap-0.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  style={{
                    color: isActive ? accent.color : "var(--muted-foreground)",
                    ["--tw-ring-color" as string]: accent.color,
                  }}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
