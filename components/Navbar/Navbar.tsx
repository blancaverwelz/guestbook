"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PenLine, BookOpen, Images } from "lucide-react";

interface NavbarProps {
  slug: string;
  eventTitle: string;
}

const links = [
  { href: "", label: "Event", icon: Home },
  { href: "/message", label: "Message", icon: PenLine },
  { href: "/guestbook", label: "Guestbook", icon: BookOpen },
  { href: "/gallery", label: "Gallery", icon: Images },
] as const;

export default function Navbar({ slug, eventTitle }: NavbarProps) {
  const pathname = usePathname();
  const base = `/events/${slug}`;

  if (pathname === base) {
    return null;
  }

  return (
    <header className="safe-area-frame sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <nav
        aria-label={`${eventTitle.trim() || "Event"} navigation`}
        className="mx-auto max-w-3xl px-2 py-1.5 sm:px-4 sm:py-2"
      >
        <ul className="grid grid-cols-4 gap-1 sm:flex sm:justify-center sm:gap-2">
          {links.map(({ href, label, icon: Icon }) => {
            const target = `${base}${href}`;
            const isActive = pathname === target;

            return (
              <li key={href}>
                <Link
                  href={target}
                  aria-current={isActive ? "page" : undefined}
                  className="flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-full px-1 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground aria-[current=page]:bg-accent/15 aria-[current=page]:font-semibold aria-[current=page]:text-foreground sm:flex-row sm:gap-2 sm:px-4 sm:text-sm"
                >
                  <Icon className="size-[18px] shrink-0" aria-hidden="true" />
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
