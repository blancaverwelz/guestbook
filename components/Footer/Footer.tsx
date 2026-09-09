import Logo from "@/components/Logo/Logo";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-background text-foreground">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-6 py-8 text-center text-sm">
        <p>© 2026 Guestbook. All rights reserved.</p>
        <p>
          Designed & Developed by{" "}
          <a
            href="https://blncvr-studios.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-[var(--accent)] transition-colors"
          >
            BLNCVR Studios
          </a>
        </p>
      </div>
    </footer>
  );
}
