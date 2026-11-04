"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import CTASection from "@/components/CTASection/CTASection";
import Hero from "@/components/Hero/Hero";
import AccentColorProvider from "@/components/Hero/AccentColorProvider";
import type { LandingEvent } from "@/types/event";

interface HeroPreviewProps {
  event: LandingEvent & { slug: string };
  device: "desktop" | "mobile";
}

/** A real viewport keeps media queries, vh/vw sizes and typography faithful to the hero. */
export default function HeroPreview({ event, device }: HeroPreviewProps) {
  const host = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [availableWidth, setAvailableWidth] = useState(0);
  const width = device === "desktop" ? 1440 : 390;
  const height = device === "desktop" ? 900 : 844;
  const scale = Math.min(1, availableWidth / width);

  useEffect(() => {
    if (!host.current) return;
    const observer = new ResizeObserver(([entry]) => setAvailableWidth(entry.contentRect.width));
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!target) return;
    const previewDocument = target.ownerDocument;
    const syncStyles = () => {
      previewDocument.head.querySelectorAll("[data-preview-style]").forEach((node) => node.remove());
      document.head.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
        const clone = node.cloneNode(true) as HTMLElement;
        clone.setAttribute("data-preview-style", "");
        previewDocument.head.appendChild(clone);
      });
      previewDocument.documentElement.className = document.documentElement.className;
      previewDocument.documentElement.style.cssText = document.documentElement.style.cssText;
      previewDocument.body.className = document.body.className;
      previewDocument.body.style.margin = "0";
      previewDocument.body.style.overflow = "hidden";
    };
    syncStyles();
    const observer = new MutationObserver(syncStyles);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [target]);

  return (
    <div ref={host} className="w-full min-w-0">
      <div className="relative mx-auto overflow-hidden rounded-md border border-border" style={{ width: width * scale, height: height * scale }}>
        <iframe
          ref={frame}
          title={`${device === "desktop" ? "Desktop" : "Mobile"} cover preview`}
          srcDoc={'<!doctype html><html><head></head><body><div id="preview"></div></body></html>'}
          onLoad={() => setTarget(frame.current?.contentDocument?.getElementById("preview") ?? null)}
          className="absolute left-0 top-0 border-0"
          style={{ width, height, transform: `scale(${scale})`, transformOrigin: "top left", pointerEvents: "none" }}
          tabIndex={-1}
        />
      </div>
      {target && createPortal(
        <AccentColorProvider coverImage={event.cover_image} storedAccentColor={event.accent_color}>
          <main inert className="flex min-h-[100dvh] flex-col bg-background text-foreground">
            <Hero event={event} />
            <CTASection slug={event.slug} />
          </main>
        </AccentColorProvider>,
        target,
      )}
      <p className="mt-2 text-xs text-muted-foreground">Preview at {width} × {height}. Framing varies with screen size and text length.</p>
    </div>
  );
}
