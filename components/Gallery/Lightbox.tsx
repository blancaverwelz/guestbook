"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export type LightboxPhoto = {
  id: string;
  image_url: string;
  uploader_name: string | null;
};

type LightboxProps = {
  photos: LightboxPhoto[];
  initialIndex: number;
  onClose: () => void;
};

const SWIPE_THRESHOLD_PX = 50;
const DOUBLE_TAP_MS = 300;
const MAX_ZOOM = 4;

/**
 * Fullscreen photo viewer. image_url (full-res) is used here — thumbnail_url
 * is only for the grid, never fetched into this component. Swipe left/right
 * navigates when not zoomed; pinch (two-finger) zooms in place; a single
 * finger pans while zoomed. Double-tap toggles zoom. Escape/Arrow keys work
 * on desktop.
 */
export default function Lightbox({ photos, initialIndex, onClose }: LightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });

  // Touch bookkeeping lives in refs — none of it needs to trigger re-renders.
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef(1);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const panOriginRef = useRef({ x: 0, y: 0 });
  const swipeStartXRef = useRef<number | null>(null);
  const lastTapRef = useRef(0);

  // Focus management — the grid button that opened this was never actually
  // given up by focus (the lightbox renders as a sibling overlay, not a
  // native <dialog>), so without this a screen reader or keyboard user
  // stays "focused" on a photo grid button sitting underneath a fullscreen
  // overlay. dialogRef gets focus on open; the triggering element (read
  // once, at mount, before anything else can steal focus) gets it back on
  // close.
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    triggerElementRef.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    return () => {
      triggerElementRef.current?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally
    // run once: this captures the pre-open focus target and restores it on
    // unmount, not on every re-render.
  }, []);

  const resetZoom = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  const goTo = useCallback(
    (next: number) => {
      if (next < 0 || next >= photos.length) return;
      setIndex(next);
      resetZoom();
    },
    [photos.length, resetZoom]
  );

  // Body scroll lock while open.
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  // Keyboard nav.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") goTo(index - 1);
      else if (e.key === "ArrowRight") goTo(index + 1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [index, goTo, onClose]);

  function distance(t0: React.Touch, t1: React.Touch) {
    return Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      pinchStartDistRef.current = distance(e.touches[0], e.touches[1]);
      pinchStartScaleRef.current = scale;
      swipeStartXRef.current = null;
    } else if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTapRef.current < DOUBLE_TAP_MS) {
        // Double tap: toggle zoom.
        if (scale > 1) {
          resetZoom();
        } else {
          setScale(2);
        }
        lastTapRef.current = 0;
      } else {
        lastTapRef.current = now;
      }

      if (scale > 1) {
        panStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        panOriginRef.current = translate;
      } else {
        swipeStartXRef.current = e.touches[0].clientX;
      }
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && pinchStartDistRef.current) {
      const newDist = distance(e.touches[0], e.touches[1]);
      const nextScale = Math.min(
        MAX_ZOOM,
        Math.max(1, pinchStartScaleRef.current * (newDist / pinchStartDistRef.current))
      );
      setScale(nextScale);
    } else if (e.touches.length === 1 && panStartRef.current && scale > 1) {
      const dx = e.touches[0].clientX - panStartRef.current.x;
      const dy = e.touches[0].clientY - panStartRef.current.y;
      setTranslate({ x: panOriginRef.current.x + dx, y: panOriginRef.current.y + dy });
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (e.touches.length === 0) {
      pinchStartDistRef.current = null;
      panStartRef.current = null;

      if (swipeStartXRef.current !== null && scale === 1) {
        const endX = e.changedTouches[0]?.clientX ?? swipeStartXRef.current;
        const delta = endX - swipeStartXRef.current;
        if (delta > SWIPE_THRESHOLD_PX) goTo(index - 1);
        else if (delta < -SWIPE_THRESHOLD_PX) goTo(index + 1);
      }
      swipeStartXRef.current = null;

      // Snap back if pinch left scale below 1 somehow, or fully zoomed out.
      if (scale <= 1) resetZoom();
    }
  }

  const photo = photos[index];
  if (!photo) return null;

  return (
    <motion.div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      tabIndex={-1}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="fixed inset-0 z-50 flex flex-col bg-black/95 outline-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm text-white/70">
          {index + 1} / {photos.length}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-full p-2 text-white/90 hover:bg-white/10"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <div
        className="relative flex-1 touch-none overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="relative h-full w-full"
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transition: pinchStartDistRef.current || panStartRef.current ? "none" : "transform 150ms ease-out",
          }}
        >
          {/*
            Fade-on-change lives on this inner wrapper, not the transform
            div above — that div's inline `transform`/`transition` style is
            the pinch/pan/swipe machinery from Chat 5 and is intentionally
            untouched here (guardrail: "do not modify any state logic").
            AnimatePresence + a key on photo.id gives the "zoom" polish
            (fade+scale) purely as a visual layer on top, independent of
            the manual zoom-state transform.
          */}
          <AnimatePresence mode="wait">
            <motion.div
              key={photo.id}
              className="relative h-full w-full"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <Image
                src={photo.image_url}
                alt={photo.uploader_name ? `Photo shared by ${photo.uploader_name}` : "Guest photo"}
                fill
                sizes="100vw"
                className="object-contain"
                priority
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {index > 0 && (
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label="Previous photo"
            className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-black/60 sm:block"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        {index < photos.length - 1 && (
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label="Next photo"
            className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-black/60 sm:block"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
