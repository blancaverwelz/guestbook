import type { ReactNode } from "react";
import fonts from "@/lib/editorialFonts.module.css";

type ArchiveIntroProps = {
  title: string;
  description: ReactNode;
  children?: ReactNode;
};

export default function ArchiveIntro({ title, description, children }: ArchiveIntroProps) {
  return (
    <header className="flex flex-col items-center gap-5 pb-8 pt-8 text-center sm:pt-16">
      <p className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
        <span aria-hidden className="h-px w-8 bg-accent" />
        The Guestbook
        <span aria-hidden className="h-px w-8 bg-accent" />
      </p>

      <h1 className={`${fonts.displayFace} text-5xl font-medium leading-[1.05] tracking-tight text-foreground sm:text-7xl`}>
        {title}
      </h1>
      <p className="max-w-md break-words text-base leading-relaxed text-muted-foreground sm:text-lg">
        {description}
      </p>
      {children}

      <div aria-hidden className={`flex w-full max-w-md items-center gap-4 ${children ? "mt-10 sm:mt-14" : "mt-2"}`}>
        <span className="h-px flex-1 bg-gradient-to-r from-transparent to-border" />
        <span className="h-1.5 w-1.5 rotate-45 bg-accent" />
        <span className="h-px flex-1 bg-gradient-to-l from-transparent to-border" />
      </div>
    </header>
  );
}
