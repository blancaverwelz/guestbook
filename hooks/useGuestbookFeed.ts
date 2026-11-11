"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ArchiveView } from "@/lib/guestbook/queries";
import { createPageReader, type PageSnapshot } from "@/lib/guestbook/pageReader";

type Result = { view: ArchiveView; data?: PageSnapshot; error?: string };

export function useGuestbookFeed(eventId: string) {
  const [client] = useState(createClient);
  const [view, setView] = useState<ArchiveView>({ page: 1, search: "", order: "newest" });
  const [result, setResult] = useState<Result | null>(null);
  const refresh = useRef<(() => void) | null>(null);

  useEffect(() => {
    const reader = createPageReader(client, eventId, view, data => {
      if (view.page > data.pages) {
        setView(current => current === view ? { ...view, page: data.pages } : current);
      } else {
        setResult({ view, data });
      }
    }, () => setResult({ view, error: "Couldn’t load messages. Please try again." }));
    refresh.current = reader.read;
    void reader.read();
    return () => {
      refresh.current = null;
      reader.cancel();
    };
  }, [client, eventId, view]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let reconnecting = false;
    function schedule() {
      clearTimeout(timer);
      timer = setTimeout(() => refresh.current?.(), 300);
    }
    const channel = client.channel(`messages-changes:${eventId}`, { config: { private: true } })
      .on("broadcast", { event: "*" }, schedule)
      .subscribe(status => {
        if (status === "SUBSCRIBED") {
          if (reconnecting) schedule();
          reconnecting = false;
        } else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
          reconnecting = true;
        }
      });
    function onVisible() {
      if (document.visibilityState === "visible") schedule();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      void client.removeChannel(channel);
    };
  }, [client, eventId]);

  const current = result?.view === view ? result : null;
  return { view, setView, data: current?.data, error: current?.error };
}
