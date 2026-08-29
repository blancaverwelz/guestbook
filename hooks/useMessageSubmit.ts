"use client";

import { useCallback, useRef, useState } from "react";

export type MessageSubmitState = "IDLE" | "SUBMITTING" | "SUCCESS" | "ERROR";

const NAME_MAX = 80;
const MESSAGE_MAX = 500;

interface UseMessageSubmitOptions {
  eventId: string;
}

interface UseMessageSubmitReturn {
  state: MessageSubmitState;
  error: string | null;
  submit: (name: string, message: string) => Promise<void>;
  reset: () => void;
}

/**
 * State machine: IDLE | SUBMITTING | SUCCESS | ERROR
 *
 * Edge cases this guards against:
 * - Rapid double-click / duplicate submit: `inFlightRef` is a synchronous
 *   ref, not state, so it blocks a second call even if it fires before React
 *   re-renders and disables the button. This is the duplicate-row guard for
 *   a single browser tab; it is NOT the spam guard (see below).
 * - Resubmitting after SUCCESS: caller (MessageForm) stops rendering the
 *   submit button once state is SUCCESS, so there's no path back into
 *   submit() without an explicit reset().
 * - Network/insert failure: state moves to ERROR with a message, and the
 *   caller's input text is untouched (this hook never owns or clears the
 *   name/message strings — MessageForm does), so nothing the guest typed is
 *   lost on retry.
 * - Empty / oversized fields: validated client-side before any network call,
 *   matching the DB check constraints (name 1-80 chars, message 1-500
 *   chars). This is a fast-fail UX nicety only — the API route below
 *   re-validates the same rules server-side, since client-side checks can
 *   always be skipped by calling the route directly.
 *
 * Server-side abuse protection (Chat 10): the actual insert now happens in
 * app/api/messages/route.ts, not directly against Supabase from the
 * browser. That route applies an atomic per-IP rate limit (3 submissions /
 * 10 minutes — see the route's own comment) before using the service-role
 * key to write the row. The `messages` table's RLS no longer grants
 * anon/public insert at all (migration 0007), so a script hitting
 * PostgREST directly with the anon key gets rejected by RLS — it can't
 * reach the table by skipping this hook or this route. `inFlightRef` above
 * still exists purely as the duplicate-submit guard; the route + RLS
 * change is what actually stops repeated/scripted submissions.
 */
export function useMessageSubmit({
  eventId,
}: UseMessageSubmitOptions): UseMessageSubmitReturn {
  const [state, setState] = useState<MessageSubmitState>("IDLE");
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const submit = useCallback(
    async (name: string, message: string) => {
      if (inFlightRef.current) return;

      const trimmedName = name.trim();
      const trimmedMessage = message.trim();

      if (trimmedName.length === 0) {
        setError("Please enter your name.");
        setState("ERROR");
        return;
      }
      if (trimmedName.length > NAME_MAX) {
        setError(`Name must be ${NAME_MAX} characters or fewer.`);
        setState("ERROR");
        return;
      }
      if (trimmedMessage.length === 0) {
        setError("Please enter a message.");
        setState("ERROR");
        return;
      }
      if (trimmedMessage.length > MESSAGE_MAX) {
        setError(`Message must be ${MESSAGE_MAX} characters or fewer.`);
        setState("ERROR");
        return;
      }

      inFlightRef.current = true;
      setError(null);
      setState("SUBMITTING");

      let succeeded = false;

      try {
        const response = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId,
            name: trimmedName,
            message: trimmedMessage,
          }),
        });

        if (response.ok) {
          succeeded = true;
        } else {
          let serverError =
            "Something went wrong sending your message. Please try again.";
          try {
            const data = await response.json();
            if (typeof data?.error === "string" && data.error.length > 0) {
              serverError = data.error;
            }
          } catch {
            // Response body wasn't JSON — fall back to the generic message.
          }
          setError(serverError);
          setState("ERROR");
        }
      } catch {
        setError("Something went wrong sending your message. Please try again.");
        setState("ERROR");
      } finally {
        inFlightRef.current = false;
      }

      if (succeeded) {
        setState("SUCCESS");
      }
    },
    [eventId]
  );

  const reset = useCallback(() => {
    inFlightRef.current = false;
    setState("IDLE");
    setError(null);
  }, []);

  return { state, error, submit, reset };
}
