"use client";

import { useCallback, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
 *   re-renders and disables the button. This is the actual duplicate-row
 *   guard; the disabled button is a UX nicety on top of it, not the guard
 *   itself.
 * - Resubmitting after SUCCESS: caller (MessageForm) stops rendering the
 *   submit button once state is SUCCESS, so there's no path back into
 *   submit() without an explicit reset().
 * - Network/insert failure: state moves to ERROR with a message, and the
 *   caller's input text is untouched (this hook never owns or clears the
 *   name/message strings — MessageForm does), so nothing the guest typed is
 *   lost on retry.
 * - Empty / oversized fields: validated client-side before any network call,
 *   matching the DB check constraints (name 1-80 chars, message 1-500 chars).
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

      const supabase = createClient();
      // event_id + name + message only — status is left unset so the DB
      // default ('pending') applies. Don't pass status explicitly here;
      // that would bypass the moderation-by-default behavior if anyone
      // ever edits this call carelessly.
      const { error: insertError } = await supabase.from("messages").insert({
        event_id: eventId,
        name: trimmedName,
        message: trimmedMessage,
      });

      inFlightRef.current = false;

      if (insertError) {
        setError("Something went wrong sending your message. Please try again.");
        setState("ERROR");
        return;
      }

      setState("SUCCESS");
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
