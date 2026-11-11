import { useEffect, useRef } from "react";
import { Check } from "lucide-react";
import fonts from "@/lib/editorialFonts.module.css";

export function SuccessState({ onReset }: { onReset: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);

  return (
    <section className="archive-note px-6 py-7 text-center sm:p-9">
      <Check aria-hidden className="archive-sign mx-auto mb-3 size-6" />
      <h2 ref={heading} tabIndex={-1} aria-describedby="message-confirmation"
        className={`${fonts.displayFace} archive-text text-4xl font-medium`}>
        Thank you for your note.
      </h2>
      <p id="message-confirmation" className="archive-muted mx-auto mt-2 max-w-sm text-sm leading-relaxed">
        Your message has been sent for approval. It will appear in the guestbook once the hosts approve it.
      </p>
      <button type="button" onClick={onReset}
        className="archive-toggle mt-3 min-h-11 rounded-sm px-2 text-sm font-medium underline underline-offset-4">
        Leave another message
      </button>
    </section>
  );
}
