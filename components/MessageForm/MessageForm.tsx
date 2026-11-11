"use client";

import { useRef, useState } from "react";
import { CircleAlert, PenLine } from "lucide-react";
import { useMessageSubmit } from "@/hooks/useMessageSubmit";
import fonts from "@/lib/editorialFonts.module.css";
import { MESSAGE_MAX, NAME_MAX } from "@/lib/messageLimits";
import { SuccessState } from "./SuccessState";

const fieldFocus = "rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--note-sign)]";

export function MessageForm({ eventId }: { eventId: string }) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const messageField = useRef<HTMLTextAreaElement>(null);
  const { state, error, submit, reset } = useMessageSubmit({ eventId });
  const isSubmitting = state === "SUBMITTING";

  function startAnotherNote() {
    setName("");
    setMessage("");
    reset();
    requestAnimationFrame(() => messageField.current?.focus());
  }

  if (state === "SUCCESS") return <SuccessState onReset={startAnotherNote} />;

  return (
    <form
      noValidate
      aria-label="Guestbook message"
      onSubmit={(event) => {
        event.preventDefault();
        void submit(name, message);
      }}
    >
      <div className="archive-note px-6 py-7 sm:p-9">
        <textarea
          aria-label="Your message"
          ref={messageField}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={MESSAGE_MAX}
          disabled={isSubmitting}
          required
          aria-describedby="message-count"
          rows={3}
          placeholder="write your message here..."
          className={`${fonts.bodyFace} ${fieldFocus} archive-text block w-full resize-y border border-[color-mix(in_srgb,var(--note-sign)_30%,transparent)] bg-transparent px-4 py-3 text-[1.0625rem] leading-[1.75] placeholder:text-[var(--note-muted)] disabled:opacity-60 sm:text-lg sm:leading-[1.8]`}
        />
        <span id="message-count" className="archive-muted mt-1 block text-right text-xs tabular-nums">{message.length} / {MESSAGE_MAX}</span>

        <div className="mt-3 flex items-center gap-3">
          <span aria-hidden className="archive-sign-bg h-px w-6 shrink-0" />
          <input
            aria-label="Your name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={NAME_MAX}
            disabled={isSubmitting}
            required
            placeholder="Your name"
            className={`${fonts.displayFace} ${fieldFocus} archive-sign min-h-11 min-w-0 flex-1 bg-transparent text-2xl font-medium italic leading-tight placeholder:text-current placeholder:opacity-100 disabled:opacity-60`}
          />
        </div>
      </div>

      {state === "ERROR" && error && (
        <p role="alert" className="mt-4 flex items-start justify-center gap-2 text-sm text-foreground">
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}
      <div className="mt-6 text-center">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-accent-foreground shadow-sm enabled:hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground disabled:opacity-60"
        >
          <PenLine aria-hidden className="size-4" />
          {isSubmitting ? "Sending..." : state === "ERROR" ? "Try again" : "Send message"}
        </button>
      </div>
    </form>
  );
}
