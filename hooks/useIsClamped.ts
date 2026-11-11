"use client";

import { useEffect, useRef, useState } from "react";

/**
 * One ResizeObserver shared by every observed element. A populated archive
 * renders 100+ notes; an observer apiece would be 100+ observers for a signal
 * that only matters at the moment a note's width changes.
 */
const callbacks = new WeakMap<Element, () => void>();
let sharedObserver: ResizeObserver | null = null;

function observe(element: Element, callback: () => void): () => void {
  sharedObserver ??= new ResizeObserver((entries) => {
    for (const entry of entries) callbacks.get(entry.target)?.();
  });
  callbacks.set(element, callback);
  sharedObserver.observe(element);
  return () => {
    callbacks.delete(element);
    sharedObserver?.unobserve(element);
  };
}

/**
 * True when a line-clamped element is actually cut off at its current width,
 * so "Read full message" only appears when there is something to reveal.
 * Pass enabled=false while expanded (nothing is clamped then).
 */
export function useIsClamped<T extends HTMLElement>(enabled: boolean, content: string) {
  const ref = useRef<T | null>(null);
  const [clamped, setClamped] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;
    // ResizeObserver reports once on observe(), so this also measures at mount.
    return observe(element, () =>
      setClamped(element.scrollHeight > element.clientHeight + 1)
    );
  }, [enabled, content]);

  return [ref, clamped] as const;
}
