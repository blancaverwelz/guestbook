"use client";

import { useState } from "react";
import { useMessageSubmit } from "@/hooks/useMessageSubmit";
import { SuccessState } from "./SuccessState";

const NAME_MAX = 80;
const MESSAGE_MAX = 500;

interface MessageFormProps {
  eventId: string;
}

export function MessageForm({ eventId }: MessageFormProps) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const { state, error, submit, reset } = useMessageSubmit({ eventId });

  if (state === "SUCCESS") {
    return (
      <SuccessState
        onReset={() => {
          reset();
          setName("");
          setMessage("");
        }}
      />
    );
  }

  const isSubmitting = state === "SUBMITTING";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(name, message);
      }}
      className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6"
      noValidate
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="guest-name" className="text-sm font-medium text-foreground">
          Your name
        </label>
        <input
          id="guest-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={NAME_MAX}
          disabled={isSubmitting}
          autoComplete="name"
          className="rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
          placeholder="Jane Doe"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="guest-message" className="text-sm font-medium text-foreground">
          Your message
        </label>
        <textarea
          id="guest-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={MESSAGE_MAX}
          disabled={isSubmitting}
          rows={5}
          className="resize-none rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
          placeholder="Wishing you both a lifetime of happiness..."
        />
        <span className="self-end text-xs text-muted-foreground">
          {message.length}/{MESSAGE_MAX}
        </span>
      </div>

      {state === "ERROR" && error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-md bg-accent px-4 py-2 font-medium text-accent-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Sending..." : state === "ERROR" ? "Try again" : "Send message"}
      </button>
    </form>
  );
}
